import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExpenseRow } from "@/components/app/ExpenseRow";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { Avatar, Card } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { formatDate, formatMoney } from "@/lib/format";
import {
  computePairBalances,
  groupNets,
  simplifyDebts,
  type LedgerRows,
  type Transfer,
} from "@/lib/ledger";
import { coverVariantFor } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data";
import type { Expense, ExpenseSplit, Group, Profile, Settlement } from "@/lib/types";
import { DeleteExpense } from "./DeleteExpense";
import { ExpenseForm } from "./ExpenseForm";
import { SettleForm } from "./SettleAndSimplify";
import { SettleMode } from "./SettleMode";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data } = await supabase.from("groups").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Group" };
}

export default async function GroupPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const me = await getMyProfile();
  if (!me) return null;

  const { data: group } = await supabase.from("groups").select("*").eq("id", id).maybeSingle();
  if (!group) notFound();
  const theGroup = group as Group;

  const { data: memberRows } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", id);
  const memberIds = (memberRows ?? []).map((r) => r.user_id as string);

  const [{ data: profileRows }, { data: expenseRows }, { data: settlementRows }] =
    await Promise.all([
      supabase.from("profiles").select("*").in("id", memberIds.length ? memberIds : [me.id]),
      supabase
        .from("expenses")
        .select("*")
        .eq("group_id", id)
        .eq("deleted", false)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("settlements")
        .select("*")
        .eq("group_id", id)
        .order("settled_at", { ascending: false }),
    ]);

  const members = ((profileRows as Profile[]) ?? []).sort((a, b) =>
    a.id === me.id ? -1 : b.id === me.id ? 1 : a.name.localeCompare(b.name),
  );
  const expenses = (expenseRows as Expense[]) ?? [];
  const settlements = (settlementRows as Settlement[]) ?? [];

  const expenseIds = expenses.map((e) => e.id);
  const { data: splitRows } = expenseIds.length
    ? await supabase.from("expense_splits").select("*").in("expense_id", expenseIds)
    : { data: [] as ExpenseSplit[] };
  const splits = (splitRows as ExpenseSplit[]) ?? [];

  const rows: LedgerRows = {
    expenses: expenses.map((e) => ({
      id: e.id,
      group_id: e.group_id,
      paid_by: e.paid_by,
      currency: e.currency,
      expense_date: e.expense_date,
      deleted: e.deleted,
    })),
    splits,
    settlements,
    claims: [],
  };

  const nets = groupNets(rows, id, memberIds);

  // Two answers to "who pays whom": the literal debts, and the same debts with
  // any circle untangled. The group's own setting decides which one it lives by.
  const direct: Transfer[] = computePairBalances(rows, { groupId: id }).map((p) => ({
    from: p.debtor,
    to: p.creditor,
    amount: p.amount,
  }));
  const netted = simplifyDebts(nets);
  const active = theGroup.simplify_debts ? netted : direct;

  const outstanding: Record<string, number> = {};
  for (const t of active) outstanding[`${t.from}|${t.to}`] = t.amount;

  const names = new Map(members.map((m) => [m.id, m.name]));
  const sharesByExpense = new Map<string, Map<string, number>>();
  for (const s of splits) {
    const map = sharesByExpense.get(s.expense_id) ?? new Map();
    map.set(s.user_id, Number(s.share_amount));
    sharesByExpense.set(s.expense_id, map);
  }

  return (
    <div className="flex flex-col gap-12">
      {/* ---- Header ------------------------------------------------- */}
      <header className="relative overflow-hidden">
        <BrushStroke
          variant={coverVariantFor(theGroup.id)}
          className="pointer-events-none absolute -top-6 right-0 h-24 w-64 opacity-30"
        />
        <div className="relative">
          <p className="eyebrow text-cobalt">
            {theGroup.currency}
            {theGroup.archived && " · Archived"}
          </p>
          <h1 className="mt-4 font-display text-40 font-medium text-navy md:text-56">
            {theGroup.name}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div className="flex -space-x-2">
              {members.map((m) => (
                <Avatar key={m.id} name={m.name} size={34} managed={m.is_managed} />
              ))}
            </div>
            <span className="flex items-center gap-2 text-14 text-ink-soft">
              <TallyMarks
                count={expenses.length}
                size="sm"
                tone="soft"
                label={`${expenses.length} expenses`}
              />
              {expenses.length} {expenses.length === 1 ? "expense" : "expenses"}
            </span>
          </div>
        </div>
      </header>

      {/* ---- Member balances ---------------------------------------- */}
      <section>
        <p className="eyebrow text-ink-soft">Where everyone stands</p>
        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m) => {
            const net = nets[m.id] ?? 0;
            return (
              <li key={m.id} className="border-t border-navy/10 pt-4">
                <p className="flex items-center gap-2 text-14 text-navy">
                  <Avatar name={m.name} size={26} managed={m.is_managed} />
                  {m.id === me.id ? "You" : m.name}
                </p>
                <p className="eyebrow mt-3 text-ink-soft">
                  {net > 0 ? "Is owed" : net < 0 ? "Owes" : "Settled"}
                </p>
                <div className="mt-1">
                  <AmountDisplay
                    value={Math.abs(net)}
                    currency={theGroup.currency}
                    size="md"
                    tone={net > 0 ? "positive" : net < 0 ? "negative" : "neutral"}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Main ---------------------------------------------------- */}
      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
        <div className="flex flex-col gap-8">
          <Card className="p-6 md:p-8">
            <p className="eyebrow text-ink-soft">Add an expense</p>
            <p className="mt-2 text-12 text-ink-soft">
              Or tap the orb and just say it — same ledger, fewer fields.
            </p>
            <div className="mt-6">
              <ExpenseForm
                groupId={theGroup.id}
                currency={theGroup.currency}
                members={members}
                meId={me.id}
              />
            </div>
          </Card>

          <section>
            <p className="eyebrow text-ink-soft">Expenses</p>
            {expenses.length === 0 ? (
              <Card className="mt-4">
                <EmptyState
                  title="Nothing tallied yet"
                  copy="Add the first expense above, or tell the orb what you spent and it will land here."
                />
              </Card>
            ) : (
              <Card className="mt-4 px-6">
                <ul>
                  {expenses.map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      payer={members.find((m) => m.id === expense.paid_by)}
                      yourShare={sharesByExpense.get(expense.id)?.get(me.id) ?? null}
                      action={
                        expense.created_by === me.id ? <DeleteExpense id={expense.id} /> : undefined
                      }
                    />
                  ))}
                </ul>
              </Card>
            )}
          </section>

          {settlements.length > 0 && (
            <section>
              <p className="eyebrow text-ink-soft">Payments</p>
              <Card className="mt-4 px-6">
                <ul>
                  {settlements.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-4 border-b border-navy/8 py-3.5 last:border-0"
                    >
                      <span className="text-14 text-navy">
                        {names.get(s.from_user) ?? "Someone"} paid{" "}
                        {names.get(s.to_user) ?? "someone"}
                        {s.kind !== "settle" && (
                          <span className="eyebrow ml-2 text-ink-soft">
                            {s.kind === "exchange_purchase" ? "Exchange" : "Reassigned"}
                          </span>
                        )}
                      </span>
                      <span className="flex items-baseline gap-3">
                        <span className="text-12 text-ink-soft">{formatDate(s.settled_at)}</span>
                        <span className="tabular font-display text-20 text-navy">
                          {formatMoney(s.amount, s.currency)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </div>

        <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:h-fit">
          <Card className="p-6">
            <p className="eyebrow text-ink-soft">Settle up</p>
            <div className="mt-5">
              <SettleForm
                groupId={theGroup.id}
                currency={theGroup.currency}
                members={members}
                meId={me.id}
                outstanding={outstanding}
              />
            </div>
          </Card>

          <SettleMode
            groupId={theGroup.id}
            currency={theGroup.currency}
            enabled={theGroup.simplify_debts}
            canToggle={theGroup.created_by === me.id}
            direct={direct}
            netted={netted}
            names={names}
          />
        </div>
      </div>
    </div>
  );
}
