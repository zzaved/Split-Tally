/**
 * All balance math lives here (BUILD.MD §6). Nothing in the UI recomputes a
 * balance; nothing the client sends is trusted. The functions in the first
 * half are pure and take a snapshot of rows; the server helpers underneath
 * fetch that snapshot and hand it over.
 *
 * The model is pairwise. Between two people, in one currency:
 *
 *   X owes Y  =  X's split shares on expenses Y paid
 *             −  Y's split shares on expenses X paid
 *             −  payments X made to Y
 *             +  payments Y made to X
 *             +  open claims where X is the debtor and Y the holder
 *             −  open claims where Y is the debtor and X the holder
 *
 * `exchange_purchase` settlements are excluded: buying a tally on the Exchange
 * is consideration for an asset, not a repayment, so it must not move the pair
 * balance. `exchange_transfer` is included — that is the row that lifts the
 * debtor's obligation off the original creditor when the claim changes hands.
 */

import type { Claim, Expense, ExpenseSplit, Settlement } from "./types";
import { daysBetween, parseDateOnly, round2, splitEqually } from "./format";

export type LedgerRows = {
  expenses: Pick<Expense, "id" | "group_id" | "paid_by" | "currency" | "expense_date" | "deleted">[];
  splits: ExpenseSplit[];
  settlements: Pick<
    Settlement,
    "from_user" | "to_user" | "amount" | "currency" | "kind" | "group_id" | "settled_at"
  >[];
  claims: Pick<Claim, "debtor_id" | "holder_id" | "amount" | "currency" | "open" | "created_at">[];
};

/** Positive `amount` means `debtor` owes `creditor`. */
export type PairBalance = {
  debtor: string;
  creditor: string;
  currency: string;
  amount: number;
  /** Date of the oldest expense still contributing, for the overdue rule. */
  since: string | null;
};

const key = (a: string, b: string, currency: string) =>
  a < b ? `${a}|${b}|${currency}` : `${b}|${a}|${currency}`;

/**
 * Every non-zero pair balance in the snapshot. Amounts under a cent are
 * dropped so rounding noise never surfaces as "owes 0".
 */
export function computePairBalances(
  rows: LedgerRows,
  opts: { groupId?: string } = {},
): PairBalance[] {
  const expenseById = new Map(rows.expenses.map((e) => [e.id, e]));
  // signed[key] is what the alphabetically-first id owes the second.
  const signed = new Map<string, number>();
  const oldest = new Map<string, string>();

  const add = (a: string, b: string, currency: string, aOwesB: number, date?: string | null) => {
    if (a === b) return;
    const k = key(a, b, currency);
    const flip = a < b ? 1 : -1;
    signed.set(k, (signed.get(k) ?? 0) + aOwesB * flip);
    if (date) {
      const current = oldest.get(k);
      if (!current || date < current) oldest.set(k, date);
    }
  };

  for (const split of rows.splits) {
    const expense = expenseById.get(split.expense_id);
    if (!expense || expense.deleted) continue;
    if (opts.groupId && expense.group_id !== opts.groupId) continue;
    if (split.user_id === expense.paid_by) continue;
    add(split.user_id, expense.paid_by, expense.currency, Number(split.share_amount), expense.expense_date);
  }

  for (const s of rows.settlements) {
    if (s.kind === "exchange_purchase") continue;
    if (opts.groupId && s.group_id !== opts.groupId) continue;
    add(s.from_user, s.to_user, s.currency, -Number(s.amount));
  }

  for (const c of rows.claims) {
    if (!c.open) continue;
    // A claim is not scoped to the group ledger view; it is a standing
    // obligation between two people, so group-filtered views skip it.
    if (opts.groupId) continue;
    add(c.debtor_id, c.holder_id, c.currency, Number(c.amount), c.created_at.slice(0, 10));
  }

  const out: PairBalance[] = [];
  for (const [k, value] of signed) {
    const rounded = round2(value);
    if (Math.abs(rounded) < 0.01) continue;
    const [first, second, currency] = k.split("|");
    out.push(
      rounded > 0
        ? { debtor: first, creditor: second, currency, amount: rounded, since: oldest.get(k) ?? null }
        : {
            debtor: second,
            creditor: first,
            currency,
            amount: -rounded,
            since: oldest.get(k) ?? null,
          },
    );
  }
  return out;
}

export type CounterpartyBalance = {
  personId: string;
  currency: string;
  /** Positive when they owe you, negative when you owe them. */
  amount: number;
  since: string | null;
};

/** What each other person nets out to, from `userId`'s point of view. */
export function balancesFor(userId: string, pairs: PairBalance[]): CounterpartyBalance[] {
  const out: CounterpartyBalance[] = [];
  for (const p of pairs) {
    if (p.debtor === userId) {
      out.push({ personId: p.creditor, currency: p.currency, amount: -p.amount, since: p.since });
    } else if (p.creditor === userId) {
      out.push({ personId: p.debtor, currency: p.currency, amount: p.amount, since: p.since });
    }
  }
  return out;
}

export type Totals = Record<string, { owedToYou: number; youOwe: number }>;

/** The two headline numbers on the dashboard, one pair per currency. */
export function totalsFor(userId: string, pairs: PairBalance[]): Totals {
  const totals: Totals = {};
  for (const b of balancesFor(userId, pairs)) {
    totals[b.currency] ??= { owedToYou: 0, youOwe: 0 };
    if (b.amount > 0) totals[b.currency].owedToYou = round2(totals[b.currency].owedToYou + b.amount);
    else totals[b.currency].youOwe = round2(totals[b.currency].youOwe - b.amount);
  }
  return totals;
}

/** Each member's net position inside one group, in the group's currency. */
export function groupNets(
  rows: LedgerRows,
  groupId: string,
  memberIds: string[],
): Record<string, number> {
  const pairs = computePairBalances(rows, { groupId });
  const nets: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  for (const p of pairs) {
    if (p.debtor in nets) nets[p.debtor] = round2(nets[p.debtor] - p.amount);
    if (p.creditor in nets) nets[p.creditor] = round2(nets[p.creditor] + p.amount);
  }
  return nets;
}

export type Transfer = { from: string; to: string; amount: number };

/**
 * Minimum cash flow: repeatedly match the largest debtor to the largest
 * creditor until everyone is square. Greedy, and not provably optimal in
 * every case, but it is what "instead of six transfers, two" means in
 * practice and it always terminates with correct balances.
 */
export function simplifyDebts(nets: Record<string, number>): Transfer[] {
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];

  for (const [id, net] of Object.entries(nets)) {
    const rounded = round2(net);
    if (rounded < -0.005) debtors.push({ id, amount: -rounded });
    else if (rounded > 0.005) creditors.push({ id, amount: rounded });
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].amount, creditors[j].amount));
    if (amount > 0.005) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount });

    debtors[i].amount = round2(debtors[i].amount - amount);
    creditors[j].amount = round2(creditors[j].amount - amount);

    if (debtors[i].amount <= 0.005) i++;
    if (creditors[j].amount <= 0.005) j++;
  }

  return transfers;
}

// ---------------------------------------------------------------------------
// Tally Score inputs
// ---------------------------------------------------------------------------

export type ScoreStats = {
  settledCount: number;
  avgDaysToSettle: number | null;
  overdueCount: number;
  openAmount: number;
};

/**
 * The repayment history behind one person's Tally Score. See lib/score.ts for
 * the definition of "days to settle" this implements.
 */
export function scoreStatsFor(
  personId: string,
  rows: LedgerRows,
  now: Date = new Date(),
): ScoreStats {
  const expenseById = new Map(rows.expenses.map((e) => [e.id, e]));

  // Expense dates this person had a share in, per group.
  const sharedDatesByGroup = new Map<string, string[]>();
  for (const split of rows.splits) {
    if (split.user_id !== personId) continue;
    const expense = expenseById.get(split.expense_id);
    if (!expense || expense.deleted) continue;
    const list = sharedDatesByGroup.get(expense.group_id) ?? [];
    list.push(expense.expense_date);
    sharedDatesByGroup.set(expense.group_id, list);
  }
  for (const list of sharedDatesByGroup.values()) list.sort();

  // Only a real repayment counts toward the score. `exchange_purchase` is a
  // buyer paying a seller, and `exchange_transfer` is bookkeeping that moves an
  // obligation to its new holder — crediting the debtor for either would mean
  // their score improved because somebody else sold their debt.
  const payments = rows.settlements.filter(
    (s) => s.from_user === personId && s.kind === "settle",
  );

  const gaps: number[] = [];
  for (const payment of payments) {
    if (!payment.group_id) continue;
    const dates = sharedDatesByGroup.get(payment.group_id);
    if (!dates?.length) continue;

    const paidOn = payment.settled_at.slice(0, 10);
    let latest: string | null = null;
    for (const d of dates) {
      if (d <= paidOn) latest = d;
      else break;
    }
    if (!latest) continue;
    gaps.push(daysBetween(parseDateOnly(latest), parseDateOnly(paidOn)));
  }

  const pairs = computePairBalances(rows);
  let overdueCount = 0;
  let openAmount = 0;
  for (const p of pairs) {
    if (p.debtor !== personId) continue;
    openAmount = round2(openAmount + p.amount);
    if (p.since && daysBetween(parseDateOnly(p.since), now) > 30) overdueCount++;
  }

  return {
    settledCount: payments.length,
    avgDaysToSettle: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
    overdueCount,
    openAmount,
  };
}

// ---------------------------------------------------------------------------
// Split helpers — used by the manual expense form and by `add_expense`
// ---------------------------------------------------------------------------

export type SplitMode = "equal" | "exact" | "percent" | "shares";

/**
 * Turn a split specification into per-person amounts that sum to `total`
 * exactly. Remainder cents go to the earliest members rather than vanishing.
 */
export function resolveSplit(
  total: number,
  memberIds: string[],
  mode: SplitMode,
  values: Record<string, number> = {},
): Record<string, number> {
  if (memberIds.length === 0) return {};

  if (mode === "equal") {
    const shares = splitEqually(total, memberIds.length);
    return Object.fromEntries(memberIds.map((id, i) => [id, shares[i]]));
  }

  if (mode === "exact") {
    return Object.fromEntries(memberIds.map((id) => [id, round2(values[id] ?? 0)]));
  }

  // percent and shares are both weighted splits; percent just happens to be
  // the case where the weights are meant to add up to 100.
  const weights = memberIds.map((id) => Math.max(0, values[id] ?? 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return resolveSplit(total, memberIds, "equal");

  const cents = Math.round(total * 100);
  const raw = weights.map((w) => (w / sum) * cents);
  const floored = raw.map(Math.floor);
  let remainder = cents - floored.reduce((a, b) => a + b, 0);

  // Hand the leftover cents to whoever was rounded down hardest.
  const order = raw
    .map((value, i) => ({ i, frac: value - floored[i] }))
    .sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floored[i] += 1;
    remainder--;
  }

  return Object.fromEntries(memberIds.map((id, i) => [id, floored[i] / 100]));
}

/** What is still unallocated, so the form can show a live remainder. */
export function splitRemainder(
  total: number,
  mode: SplitMode,
  values: Record<string, number>,
): number {
  const entered = Object.values(values).reduce((a, b) => a + (Number(b) || 0), 0);
  if (mode === "exact") return round2(total - entered);
  if (mode === "percent") return round2(100 - entered);
  return 0;
}
