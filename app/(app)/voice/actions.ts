"use server";

import { revalidatePath } from "next/cache";
import { recordActivity } from "@/lib/activity";
import { round2, formatMoney, toDateInput } from "@/lib/format";
import { balancesFor, computePairBalances, scoreStatsFor, type LedgerRows } from "@/lib/ledger";
import { disambiguationQuestion, resolvePerson } from "@/lib/resolve";
import { describeScore, tallyScore } from "@/lib/score";
import { createClient } from "@/lib/supabase/server";
import type { Group, Profile } from "@/lib/types";
import { firstName, normalizeName } from "@/lib/utils";
import { addExpense } from "../groups/actions";

/**
 * The nine clientTools from BUILD.MD §8. Each one is called by the agent
 * mid-conversation and returns a single sentence for it to speak — never a
 * blob of data, because the screen already shows the detail.
 *
 * They all funnel into the same server-side validation the manual forms use,
 * so a spoken expense is exactly as trustworthy as a typed one.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function context() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

/** Everyone this user could plausibly mean: friends plus group members. */
async function knownPeople(supabase: Supabase, userId: string): Promise<Profile[]> {
  const [{ data: friendships }, { data: memberships }] = await Promise.all([
    supabase.from("friendships").select("requester,addressee"),
    supabase.from("group_members").select("group_id,user_id"),
  ]);

  const myGroups = new Set(
    (memberships ?? []).filter((m) => m.user_id === userId).map((m) => m.group_id),
  );

  const ids = new Set<string>();
  for (const f of friendships ?? []) {
    ids.add(f.requester as string);
    ids.add(f.addressee as string);
  }
  for (const m of memberships ?? []) {
    if (myGroups.has(m.group_id)) ids.add(m.user_id as string);
  }
  ids.delete(userId);

  if (ids.size === 0) return [];
  const { data } = await supabase.from("profiles").select("*").in("id", [...ids]);
  return (data as Profile[]) ?? [];
}

async function myGroups(supabase: Supabase): Promise<Group[]> {
  const { data } = await supabase.from("groups").select("*").eq("archived", false);
  return (data as Group[]) ?? [];
}

function findGroup(groups: Group[], name?: string | null): Group | undefined {
  if (!name) return undefined;
  const q = normalizeName(name);
  return (
    groups.find((g) => normalizeName(g.name) === q) ??
    groups.find((g) => normalizeName(g.name).startsWith(q)) ??
    groups.find((g) => normalizeName(g.name).includes(q))
  );
}

async function ledgerRows(supabase: Supabase): Promise<LedgerRows> {
  const [expenses, splits, settlements, claims] = await Promise.all([
    supabase
      .from("expenses")
      .select("id,group_id,paid_by,currency,expense_date,deleted")
      .eq("deleted", false),
    supabase.from("expense_splits").select("expense_id,user_id,share_amount"),
    supabase.from("settlements").select("from_user,to_user,amount,currency,kind,group_id,settled_at"),
    supabase.from("claims").select("debtor_id,holder_id,amount,currency,open,created_at"),
  ]);

  return {
    expenses: (expenses.data as LedgerRows["expenses"]) ?? [],
    splits: (splits.data as LedgerRows["splits"]) ?? [],
    settlements: (settlements.data as LedgerRows["settlements"]) ?? [],
    claims: (claims.data as LedgerRows["claims"]) ?? [],
  };
}

const NO_SESSION = "I lost your session. Log in again and we can carry on.";

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

const PROFILE_FIELDS = ["name", "occupation", "currency", "username"] as const;

export async function saveProfileField(params: {
  field: string;
  value: string;
}): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const field = String(params.field ?? "").toLowerCase().trim();
  const value = String(params.value ?? "").trim();
  if (!value) return "I did not catch that — say it once more?";

  if (PROFILE_FIELDS.includes(field as (typeof PROFILE_FIELDS)[number])) {
    const patch =
      field === "currency" ? { currency: value.toUpperCase().slice(0, 3) } : { [field]: value };
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) return "That did not save. Let's try again.";
    revalidatePath("/dashboard");
    return `Saved your ${field}.`;
  }

  // Anything else — the sharing context, the money goal — lands in the jsonb
  // column so the agent can be given it as context later.
  const { data: profile } = await supabase
    .from("profiles")
    .select("context")
    .eq("id", userId)
    .maybeSingle();

  const merged = { ...((profile?.context as Record<string, unknown>) ?? {}), [field]: value };
  const { error } = await supabase.from("profiles").update({ context: merged }).eq("id", userId);
  if (error) return "That did not save. Let's try again.";
  return `Noted.`;
}

export async function completeOnboarding(params: {
  occupation?: string;
  currency?: string;
  sharing_context?: string;
  goal?: string;
}): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const { data: profile } = await supabase
    .from("profiles")
    .select("context")
    .eq("id", userId)
    .maybeSingle();

  const merged = {
    ...((profile?.context as Record<string, unknown>) ?? {}),
    ...(params.sharing_context ? { sharing: params.sharing_context } : {}),
    ...(params.goal ? { goal: params.goal } : {}),
  };

  await supabase
    .from("profiles")
    .update({
      ...(params.occupation ? { occupation: params.occupation } : {}),
      ...(params.currency ? { currency: params.currency.toUpperCase().slice(0, 3) } : {}),
      context: merged,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", userId);

  revalidatePath("/dashboard");
  return "Your ledger is ready. From now on, just tell me what you spend.";
}

// ---------------------------------------------------------------------------
// People and groups
// ---------------------------------------------------------------------------

export async function addFriend(params: { name: string; email?: string }): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const name = String(params.name ?? "").trim();
  if (!name) return "What should I call them?";

  const people = await knownPeople(supabase, userId);
  const existing = resolvePerson(name, people);
  if (existing.status === "one") {
    return `${firstName(existing.profile.name)} is already on your list.`;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({
      name,
      email: params.email?.trim() || null,
      is_managed: true,
      created_by: userId,
    })
    .select("id,name")
    .single();

  if (error || !profile) return "I could not add them just now.";

  await supabase
    .from("friendships")
    .insert({ requester: userId, addressee: profile.id, status: "accepted" });

  revalidatePath("/friends");
  return `${firstName(profile.name)} is on your list. They are not on Split Tally yet, so I am keeping their tally for you.`;
}

export async function createGroup(params: {
  name: string;
  member_names?: string[];
}): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const name = String(params.name ?? "").trim();
  if (!name) return "What should the group be called?";

  const people = await knownPeople(supabase, userId);
  const memberIds: string[] = [];
  const unknown: string[] = [];

  for (const raw of params.member_names ?? []) {
    const match = resolvePerson(String(raw), people);
    if (match.status === "one") memberIds.push(match.profile.id);
    else if (match.status === "many") return disambiguationQuestion(String(raw), match.candidates);
    else unknown.push(String(raw));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("currency")
    .eq("id", userId)
    .maybeSingle();

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, currency: profile?.currency ?? "USD", created_by: userId })
    .select("id,name")
    .single();

  if (error || !group) return "That group did not save.";

  await supabase
    .from("group_members")
    .insert([...new Set([userId, ...memberIds])].map((id) => ({ group_id: group.id, user_id: id })));

  revalidatePath("/dashboard");

  if (unknown.length) {
    return `${group.name} is set up. I do not know ${unknown.join(" or ")} yet — should I add them as friends?`;
  }
  return `${group.name} is set up with ${memberIds.length + 1} people.`;
}

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

export async function addExpenseTool(params: {
  group_name?: string;
  description: string;
  amount: number;
  paid_by_name?: string;
  /** "equal", or a map of name to amount. */
  split?: string | Record<string, number>;
}): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const groups = await myGroups(supabase);
  if (groups.length === 0) {
    return "You do not have a group yet. Tell me who this is shared with and I will make one.";
  }

  const group = findGroup(groups, params.group_name) ?? (groups.length === 1 ? groups[0] : undefined);
  if (!group) {
    return `Which group is that in — ${groups.slice(0, 3).map((g) => g.name).join(", ")}?`;
  }

  const people = await knownPeople(supabase, userId);
  let paidBy = userId;

  if (params.paid_by_name && normalizeName(params.paid_by_name) !== "me") {
    const match = resolvePerson(params.paid_by_name, people);
    if (match.status === "many") return disambiguationQuestion(params.paid_by_name, match.candidates);
    if (match.status === "none") {
      return `I do not know ${params.paid_by_name} yet — should I add them as a friend?`;
    }
    paidBy = match.profile.id;
  }

  const isMap = params.split && typeof params.split === "object";
  const values: Record<string, number> = {};
  const participants: string[] = [];

  if (isMap) {
    for (const [rawName, amount] of Object.entries(params.split as Record<string, number>)) {
      const match =
        normalizeName(rawName) === "me"
          ? ({ status: "one", profile: { id: userId } } as const)
          : resolvePerson(rawName, people);
      if (match.status === "many") return disambiguationQuestion(rawName, match.candidates);
      if (match.status === "none") return `I do not know ${rawName} yet.`;
      participants.push(match.profile.id);
      values[match.profile.id] = Number(amount);
    }
  }

  const result = await addExpense({
    groupId: group.id,
    description: String(params.description ?? "").trim(),
    amount: Number(params.amount),
    paidBy,
    mode: isMap ? "exact" : "equal",
    values,
    participants: participants.length ? participants : undefined,
    via: "voice",
  });

  if (result.error) return result.error;

  const payerName =
    paidBy === userId ? "you" : firstName(people.find((p) => p.id === paidBy)?.name ?? "they");

  return `Saved: ${params.description}, ${formatMoney(Number(params.amount), group.currency)}, ${payerName} paid, split in ${group.name}.`;
}

export async function getBalances(params: { group_name?: string }): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const rows = await ledgerRows(supabase);
  const groups = await myGroups(supabase);
  const group = findGroup(groups, params.group_name);

  const pairs = computePairBalances(rows, group ? { groupId: group.id } : {});
  const mine = balancesFor(userId, pairs);

  if (mine.length === 0) {
    return group ? `Everyone in ${group.name} is square.` : "You are square with everyone.";
  }

  const people = await knownPeople(supabase, userId);
  const nameOf = (id: string) => firstName(people.find((p) => p.id === id)?.name ?? "someone");

  const owed = mine.filter((b) => b.amount > 0);
  const owing = mine.filter((b) => b.amount < 0);

  const parts: string[] = [];
  if (owed.length) {
    parts.push(
      `${owed
        .slice(0, 3)
        .map((b) => `${nameOf(b.personId)} owes you ${formatMoney(b.amount, b.currency)}`)
        .join(", ")}`,
    );
  }
  if (owing.length) {
    parts.push(
      `you owe ${owing
        .slice(0, 3)
        .map((b) => `${nameOf(b.personId)} ${formatMoney(Math.abs(b.amount), b.currency)}`)
        .join(", ")}`,
    );
  }

  return `${parts.join(", and ")}.`;
}

export async function markSettled(params: {
  from_name?: string;
  to_name?: string;
  amount: number;
  group_name?: string;
}): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const people = await knownPeople(supabase, userId);
  const groups = await myGroups(supabase);

  const resolveSide = (raw?: string) => {
    if (!raw || normalizeName(raw) === "me" || normalizeName(raw) === "i") {
      return { status: "one" as const, profile: { id: userId } };
    }
    return resolvePerson(raw, people);
  };

  const from = resolveSide(params.from_name);
  const to = resolveSide(params.to_name);

  if (from.status === "many") return disambiguationQuestion(params.from_name!, from.candidates);
  if (to.status === "many") return disambiguationQuestion(params.to_name!, to.candidates);
  if (from.status === "none") return `I do not know ${params.from_name} yet.`;
  if (to.status === "none") return `I do not know ${params.to_name} yet.`;

  const group = findGroup(groups, params.group_name) ?? (groups.length === 1 ? groups[0] : undefined);
  if (!group) return "Which group was that payment in?";

  const amount = round2(Number(params.amount));
  if (!Number.isFinite(amount) || amount <= 0) return "How much was it?";

  const { error } = await supabase.from("settlements").insert({
    group_id: group.id,
    from_user: from.profile.id,
    to_user: to.profile.id,
    amount,
    currency: group.currency,
    kind: "settle",
  });

  if (error) return "That payment did not save.";

  const label = (id: string) =>
    id === userId ? "you" : firstName(people.find((p) => p.id === id)?.name ?? "they");

  await recordActivity(supabase, userId, [
    {
      userId,
      type: "settlement",
      payload: {
        from: label(from.profile.id),
        to: label(to.profile.id),
        amount,
        currency: group.currency,
        group: group.name,
      },
    },
  ]);

  revalidatePath("/dashboard");
  return `Recorded: ${label(from.profile.id)} paid ${label(to.profile.id)} ${formatMoney(amount, group.currency)}.`;
}

export async function logCashSpending(params: {
  description: string;
  amount: number;
  category?: string;
}): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const description = String(params.description ?? "").trim();
  const amount = round2(Number(params.amount));
  if (!description) return "What was the cash for?";
  if (!Number.isFinite(amount) || amount <= 0) return "How much was it?";

  const { data: profile } = await supabase
    .from("profiles")
    .select("currency")
    .eq("id", userId)
    .maybeSingle();

  const date = toDateInput();
  const hash = await dedupHash(userId, date, amount, description);

  const { error } = await supabase.from("personal_transactions").insert({
    user_id: userId,
    date,
    description,
    amount,
    direction: "out",
    category: params.category ?? null,
    source: "voice",
    dedup_hash: hash,
  });

  if (error) return "I already have that one.";

  revalidatePath("/money");
  return `Logged ${formatMoney(amount, profile?.currency ?? "USD")} on ${description}.`;
}

/** Same recipe the statement import uses, so voice and vision never duplicate. */
async function dedupHash(userId: string, date: string, amount: number, description: string) {
  const input = `${userId}|${date}|${amount}|${description.trim().toLowerCase()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fixing what is already in the ledger, out loud. Correcting a mistake is
 * exactly the moment people abandon a spreadsheet, so the assistant takes the
 * entry back out and invites the user to restate it in one sentence rather
 * than making them hunt for a row and edit four fields.
 *
 * Only ever touches something this user created themselves.
 */
export async function fixLastEntry(params: { what?: string }): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const [{ data: expenses }, { data: cash }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id,description,amount,currency,group_id,created_at")
      .eq("created_by", userId)
      .eq("deleted", false)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("personal_transactions")
      .select("id,description,amount,created_at")
      .eq("user_id", userId)
      .in("source", ["voice", "manual"])
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const expense = expenses?.[0];
  const transaction = cash?.[0];

  const wantsCash =
    params.what && /cash|spend|spending|transaction/i.test(params.what) && transaction;

  const expenseNewer =
    expense &&
    (!transaction || new Date(expense.created_at) >= new Date(transaction.created_at));

  if (!wantsCash && expense && expenseNewer) {
    await supabase.from("expenses").update({ deleted: true }).eq("id", expense.id);

    const { data: group } = await supabase
      .from("groups")
      .select("name")
      .eq("id", expense.group_id)
      .maybeSingle();

    await recordActivity(supabase, userId, [
      {
        userId,
        type: "expense_removed",
        payload: {
          description: expense.description,
          amount: expense.amount,
          currency: expense.currency,
        },
      },
    ]);

    revalidatePath("/dashboard");
    revalidatePath(`/groups/${expense.group_id}`);

    return `I took "${expense.description}" for ${formatMoney(Number(expense.amount), expense.currency)}${
      group?.name ? ` out of ${group.name}` : ""
    }. Tell me how it should have gone and I will put it back right.`;
  }

  if (transaction) {
    await supabase.from("personal_transactions").delete().eq("id", transaction.id);
    revalidatePath("/money");
    return `I removed "${transaction.description}". Tell me the right version and I will log it again.`;
  }

  return "There is nothing recent of yours to take back out. Which entry is wrong?";
}

// ---------------------------------------------------------------------------
// The Exchange
// ---------------------------------------------------------------------------

export async function listReceivable(params: {
  debtor_name: string;
  amount?: number;
}): Promise<string> {
  const { supabase, userId } = await context();
  if (!userId) return NO_SESSION;

  const people = await knownPeople(supabase, userId);
  const match = resolvePerson(params.debtor_name, people);
  if (match.status === "many") return disambiguationQuestion(params.debtor_name, match.candidates);
  if (match.status === "none") return `I do not know ${params.debtor_name} yet.`;

  const debtor = match.profile;
  const rows = await ledgerRows(supabase);
  const pairs = computePairBalances(rows);
  const owedToMe = balancesFor(userId, pairs).filter(
    (b) => b.personId === debtor.id && b.amount > 0,
  );

  if (owedToMe.length === 0) {
    return `${firstName(debtor.name)} does not owe you anything right now.`;
  }

  const line = owedToMe[0];
  const face = Math.min(round2(Number(params.amount) || line.amount), line.amount);

  const stats = scoreStatsFor(debtor.id, rows);
  const score = tallyScore(stats);

  const { price, discountPct, rationale } = await suggestPrice({
    faceValue: face,
    currency: line.currency,
    debtorName: firstName(debtor.name),
    score,
    settledCount: stats.settledCount,
    avgDays: stats.avgDaysToSettle,
    overdueCount: stats.overdueCount,
  });

  return `${firstName(debtor.name)} owes you ${formatMoney(face, line.currency)}. ${rationale} I would ask ${formatMoney(price, line.currency)} — that is ${discountPct}% off. Open the Exchange and I will fill it in.`;
}

/**
 * Asks /api/price-listing when Anthropic is configured, and falls back to the
 * same clamped arithmetic the route uses so the agent is never left silent.
 */
async function suggestPrice(input: {
  faceValue: number;
  currency: string;
  debtorName: string;
  score: number;
  settledCount: number;
  avgDays: number | null;
  overdueCount: number;
}) {
  const { priceFromStats } = await import("@/lib/pricing");
  return priceFromStats(input);
}

export type { Profile };
