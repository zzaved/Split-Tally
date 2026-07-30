"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordActivity } from "@/lib/activity";
import { round2, toDateInput } from "@/lib/format";
import { computePairBalances, groupNets, resolveSplit, simplifyDebts, type SplitMode } from "@/lib/ledger";
import { scoreStatsFor } from "@/lib/ledger";
import { tallyScore } from "@/lib/score";
import { createClient } from "@/lib/supabase/server";
import type { CreatedVia, Profile } from "@/lib/types";
import type { LedgerRows } from "@/lib/ledger";

export type ActionResult = { ok?: string; error?: string };

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function membersOf(supabase: Supabase, groupId: string): Promise<Profile[]> {
  const { data: rows } = await supabase
    .from("group_members")
    .select("user_id")
    .eq("group_id", groupId);

  const ids = (rows ?? []).map((r) => r.user_id as string);
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids);
  return (profiles as Profile[]) ?? [];
}

/** Feed entries never go to managed profiles — nobody is reading them. */
function realMembers(members: Profile[]) {
  return members.filter((m) => !m.is_managed);
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function createGroup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD");
  const memberIds = formData.getAll("members").map(String).filter(Boolean);

  const { supabase, user } = await session();
  if (!user) return { error: "Log in again to create a group." };
  if (!name) return { error: "Give the group a name — where are these costs from?" };

  const { data: group, error } = await supabase
    .from("groups")
    .insert({ name, currency, created_by: user.id })
    .select("id")
    .single();

  if (error || !group) return { error: "That group did not save. Try again." };

  const ids = [...new Set([user.id, ...memberIds])];
  const { error: memberError } = await supabase
    .from("group_members")
    .insert(ids.map((id) => ({ group_id: group.id, user_id: id })));

  if (memberError) return { error: "The group was created but the members did not save." };

  revalidatePath("/dashboard");
  redirect(`/groups/${group.id}`);
}

export async function renameGroup(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const archived = formData.get("archived") === "true";

  const { supabase, user } = await session();
  if (!user) return { error: "Log in again." };
  if (!name) return { error: "A group needs a name." };

  const { error } = await supabase
    .from("groups")
    .update({ name, archived })
    .eq("id", groupId)
    .eq("created_by", user.id);

  if (error) return { error: "Only the person who created the group can change it." };

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { ok: "Saved." };
}

/**
 * Turns the netted view on or off for a group (BUILD.MD §5.5, extended).
 *
 * With it on, a ring of debts cancels: if you owe Pedro 5, Pedro owes Júlia 5
 * and Júlia owes you 5, nobody owes anybody. With it off the group shows the
 * literal pairwise debts, because plenty of people would rather hand the money
 * to the person they actually borrowed it from.
 *
 * Any member can flip it, and the change lands in everyone's feed — a setting
 * that quietly rearranges what people owe should never be silent.
 */
export async function toggleSimplifyMode(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const groupId = String(formData.get("groupId") ?? "");
  const enabled = String(formData.get("enabled") ?? "") === "true";

  const { supabase, user } = await session();
  if (!user) return { error: "Log in again." };

  const members = await membersOf(supabase, groupId);
  if (!members.some((m) => m.id === user.id)) {
    return { error: "You are not in that group." };
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id,name,created_by")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return { error: "That group is not one of yours." };

  // The groups policy only lets the creator update the row, so anyone else
  // flipping it goes nowhere — say so plainly rather than failing silently.
  if (group.created_by !== user.id) {
    return { error: "Only whoever created the group can change how it settles." };
  }

  const { error } = await supabase
    .from("groups")
    .update({ simplify_debts: enabled })
    .eq("id", groupId);

  if (error) return { error: "That did not save. Try again." };

  const { data: me } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  await recordActivity(
    supabase,
    user.id,
    realMembers(members).map((m) => ({
      userId: m.id,
      type: "simplify_applied" as const,
      payload: { group: group.name, mode: enabled ? "on" : "off", by: me?.name },
    })),
  );

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return {
    ok: enabled
      ? "Netted settling is on. Debts that go in a circle now cancel out."
      : "Netted settling is off. Everyone pays the person they actually owe.",
  };
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export type AddExpenseInput = {
  groupId: string;
  description: string;
  amount: number;
  currency?: string;
  category?: string | null;
  paidBy: string;
  date?: string;
  mode: SplitMode;
  /** Per-member amounts, percentages or share counts, depending on the mode. */
  values?: Record<string, number>;
  /** Who the expense is split between; defaults to every member. */
  participants?: string[];
  via?: CreatedVia;
};

/**
 * The one path every expense takes — the manual form, the voice tool and a
 * statement row all end up here, so validation lives in exactly one place.
 */
export async function addExpense(input: AddExpenseInput): Promise<ActionResult & { id?: string }> {
  const { supabase, user } = await session();
  if (!user) return { error: "Log in again to record an expense." };

  const description = input.description.trim();
  const amount = round2(Number(input.amount));

  if (!description) return { error: "What was it for? A couple of words is enough." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "The amount has to be above zero." };

  const { data: group } = await supabase
    .from("groups")
    .select("id,name,currency")
    .eq("id", input.groupId)
    .maybeSingle();

  if (!group) return { error: "That group is not one of yours." };

  const members = await membersOf(supabase, input.groupId);
  const memberIds = new Set(members.map((m) => m.id));

  if (!memberIds.has(user.id)) return { error: "You are not in that group." };
  if (!memberIds.has(input.paidBy)) return { error: "Whoever paid has to be in the group." };

  const participants = (input.participants?.length ? input.participants : members.map((m) => m.id))
    .filter((id) => memberIds.has(id));

  if (participants.length === 0) return { error: "Pick at least one person to split this with." };

  const shares = resolveSplit(amount, participants, input.mode, input.values ?? {});
  const total = round2(Object.values(shares).reduce((a, b) => a + b, 0));

  if (Math.abs(total - amount) > 0.01) {
    return { error: `The split adds up to ${total}, not ${amount}.` };
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      group_id: input.groupId,
      description,
      amount,
      currency: input.currency ?? group.currency,
      category: input.category ?? null,
      paid_by: input.paidBy,
      created_by: user.id,
      created_via: input.via ?? "manual",
      expense_date: input.date || toDateInput(),
    })
    .select("id")
    .single();

  if (error || !expense) return { error: "That expense did not save. Try again." };

  const { error: splitError } = await supabase.from("expense_splits").insert(
    Object.entries(shares).map(([userId, share]) => ({
      expense_id: expense.id,
      user_id: userId,
      share_amount: share,
    })),
  );

  if (splitError) {
    await supabase.from("expenses").delete().eq("id", expense.id);
    return { error: "The split did not save, so the expense was rolled back." };
  }

  const payer = members.find((m) => m.id === input.paidBy);
  await recordActivity(
    supabase,
    user.id,
    realMembers(members).map((m) => ({
      userId: m.id,
      type: "expense_added" as const,
      payload: {
        description,
        amount,
        currency: input.currency ?? group.currency,
        group: group.name,
        via: input.via ?? "manual",
        paid_by: payer?.name,
      },
    })),
  );

  revalidatePath(`/groups/${input.groupId}`);
  revalidatePath("/dashboard");

  return { ok: `${description} for ${amount} is in.`, id: expense.id };
}

export async function addExpenseForm(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const mode = (String(formData.get("mode") ?? "equal") as SplitMode) ?? "equal";
  const participants = formData.getAll("participants").map(String);

  const values: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("value:")) values[key.slice(6)] = Number(value) || 0;
  }

  return addExpense({
    groupId: String(formData.get("groupId") ?? ""),
    description: String(formData.get("description") ?? ""),
    amount: Number(formData.get("amount") ?? 0),
    category: (String(formData.get("category") ?? "") || null) as string | null,
    paidBy: String(formData.get("paidBy") ?? ""),
    date: String(formData.get("date") ?? ""),
    mode,
    values,
    participants,
    via: "manual",
  });
}

/** Soft delete, so the feed can still say "removed a tally". */
export async function deleteExpense(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const { supabase, user } = await session();
  if (!user) return { error: "Log in again." };

  const { data: expense } = await supabase
    .from("expenses")
    .select("id,group_id,description,amount,currency,created_by")
    .eq("id", id)
    .maybeSingle();

  if (!expense) return { error: "That expense is already gone." };
  if (expense.created_by !== user.id) {
    return { error: "Only whoever added an expense can remove it." };
  }

  const { error } = await supabase.from("expenses").update({ deleted: true }).eq("id", id);
  if (error) return { error: "That did not go through. Try again." };

  const members = await membersOf(supabase, expense.group_id);
  await recordActivity(
    supabase,
    user.id,
    realMembers(members).map((m) => ({
      userId: m.id,
      type: "expense_removed" as const,
      payload: {
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
      },
    })),
  );

  revalidatePath(`/groups/${expense.group_id}`);
  revalidatePath("/dashboard");
  return { ok: "Removed." };
}

// ---------------------------------------------------------------------------
// Settling
// ---------------------------------------------------------------------------

export async function settleUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const groupId = String(formData.get("groupId") ?? "");
  const fromUser = String(formData.get("fromUser") ?? "");
  const toUser = String(formData.get("toUser") ?? "");
  const amount = round2(Number(formData.get("amount") ?? 0));

  const { supabase, user } = await session();
  if (!user) return { error: "Log in again to record a payment." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "The amount has to be above zero." };
  if (fromUser === toUser) return { error: "Those are the same person." };

  const { data: group } = await supabase
    .from("groups")
    .select("id,name,currency")
    .eq("id", groupId)
    .maybeSingle();
  if (!group) return { error: "That group is not one of yours." };

  const members = await membersOf(supabase, groupId);
  const ids = new Set(members.map((m) => m.id));
  if (!ids.has(fromUser) || !ids.has(toUser)) {
    return { error: "Both people have to be in the group." };
  }

  const { error } = await supabase.from("settlements").insert({
    group_id: groupId,
    from_user: fromUser,
    to_user: toUser,
    amount,
    currency: group.currency,
    kind: "settle",
  });

  if (error) return { error: "That payment did not save. Try again." };

  const from = members.find((m) => m.id === fromUser);
  const to = members.find((m) => m.id === toUser);

  await recordActivity(
    supabase,
    user.id,
    realMembers(members).map((m) => ({
      userId: m.id,
      type: "settlement" as const,
      payload: {
        from: from?.name,
        to: to?.name,
        amount,
        currency: group.currency,
        group: group.name,
      },
    })),
  );

  await refreshScores(supabase, user.id, [fromUser, toUser]);

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  revalidatePath("/friends");
  return { ok: `Recorded: ${from?.name ?? "they"} paid ${to?.name ?? "them"} ${amount}.` };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function ledgerRowsForGroup(supabase: Supabase, groupId: string): Promise<LedgerRows> {
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id,group_id,paid_by,currency,expense_date,deleted")
    .eq("group_id", groupId)
    .eq("deleted", false);

  const ids = (expenses ?? []).map((e) => e.id as string);

  const [{ data: splits }, { data: settlements }] = await Promise.all([
    ids.length
      ? supabase.from("expense_splits").select("expense_id,user_id,share_amount").in("expense_id", ids)
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("settlements")
      .select("from_user,to_user,amount,currency,kind,group_id,settled_at")
      .eq("group_id", groupId),
  ]);

  return {
    expenses: (expenses as LedgerRows["expenses"]) ?? [],
    splits: (splits as LedgerRows["splits"]) ?? [],
    settlements: (settlements as LedgerRows["settlements"]) ?? [],
    claims: [],
  };
}

/**
 * Refreshes the cached score for whoever we are allowed to write: ourselves,
 * and the managed friends we created. Everyone else's score is recomputed on
 * read by lib/scores.ts.
 */
async function refreshScores(supabase: Supabase, userId: string, personIds: string[]) {
  const { data: writable } = await supabase
    .from("profiles")
    .select("id,is_managed,created_by")
    .in("id", personIds);

  const allowed = (writable ?? []).filter(
    (p) => p.id === userId || (p.is_managed && p.created_by === userId),
  );
  if (allowed.length === 0) return;

  const [{ data: expenses }, { data: splits }, { data: settlements }] = await Promise.all([
    supabase.from("expenses").select("id,group_id,paid_by,currency,expense_date,deleted").eq("deleted", false),
    supabase.from("expense_splits").select("expense_id,user_id,share_amount"),
    supabase.from("settlements").select("from_user,to_user,amount,currency,kind,group_id,settled_at"),
  ]);

  const rows: LedgerRows = {
    expenses: (expenses as LedgerRows["expenses"]) ?? [],
    splits: (splits as LedgerRows["splits"]) ?? [],
    settlements: (settlements as LedgerRows["settlements"]) ?? [],
    claims: [],
  };

  for (const person of allowed) {
    const score = tallyScore(scoreStatsFor(person.id, rows));
    await supabase.from("profiles").update({ tally_score: score }).eq("id", person.id);
  }
}
