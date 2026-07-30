import "server-only";

import { cache } from "react";
import { createClient } from "./supabase/server";
import type {
  Activity,
  Budget,
  Checkin,
  Claim,
  Expense,
  ExpenseSplit,
  Friendship,
  Group,
  GroupMember,
  Listing,
  PersonalTransaction,
  Profile,
  Settlement,
} from "./types";
import type { LedgerRows } from "./ledger";

/**
 * Server-side reads. Everything here goes through the user's own client, so
 * the policies in supabase/migration.sql decide what comes back — these
 * functions never widen access on their own.
 *
 * Wrapped in React's `cache` so one render pass hits the database once even
 * when several components ask for the same thing.
 */

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile) ?? null;
});

/** Everyone this user can see: friends, managed friends, and group members. */
export const getKnownProfiles = cache(async (): Promise<Profile[]> => {
  const user = await getUser();
  if (!user) return [];

  const supabase = await createClient();

  const [{ data: friendships }, { data: memberships }] = await Promise.all([
    supabase.from("friendships").select("requester,addressee,status"),
    supabase.from("group_members").select("group_id,user_id"),
  ]);

  const myGroups = new Set(
    ((memberships as GroupMember[]) ?? [])
      .filter((m) => m.user_id === user.id)
      .map((m) => m.group_id),
  );

  const ids = new Set<string>([user.id]);
  for (const f of (friendships as Friendship[]) ?? []) {
    ids.add(f.requester);
    ids.add(f.addressee);
  }
  for (const m of (memberships as GroupMember[]) ?? []) {
    if (myGroups.has(m.group_id)) ids.add(m.user_id);
  }

  const { data } = await supabase.from("profiles").select("*").in("id", [...ids]);
  return ((data as Profile[]) ?? []).sort((a, b) => a.name.localeCompare(b.name));
});

/** A name-keyed lookup, for rendering rows without another round trip. */
export async function getProfileMap(): Promise<Map<string, Profile>> {
  const profiles = await getKnownProfiles();
  return new Map(profiles.map((p) => [p.id, p]));
}

export const getMyGroups = cache(async (): Promise<Group[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("*")
    .order("archived", { ascending: true })
    .order("created_at", { ascending: false });
  return (data as Group[]) ?? [];
});

export const getGroupMembers = cache(async (): Promise<GroupMember[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("group_members").select("*");
  return (data as GroupMember[]) ?? [];
});

/**
 * The snapshot lib/ledger.ts computes from. One fetch per table; RLS already
 * limits each to the groups this user belongs to.
 */
export const getLedgerRows = cache(async (): Promise<LedgerRows> => {
  const supabase = await createClient();

  const [expenses, splits, settlements, claims] = await Promise.all([
    supabase
      .from("expenses")
      .select("id,group_id,paid_by,currency,expense_date,deleted")
      .eq("deleted", false),
    supabase.from("expense_splits").select("expense_id,user_id,share_amount"),
    supabase
      .from("settlements")
      .select("from_user,to_user,amount,currency,kind,group_id,settled_at"),
    supabase.from("claims").select("debtor_id,holder_id,amount,currency,open,created_at"),
  ]);

  return {
    expenses: (expenses.data as LedgerRows["expenses"]) ?? [],
    splits: (splits.data as ExpenseSplit[]) ?? [],
    settlements: (settlements.data as LedgerRows["settlements"]) ?? [],
    claims: (claims.data as LedgerRows["claims"]) ?? [],
  };
});

export const getFriendships = cache(async (): Promise<Friendship[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Friendship[]) ?? [];
});

export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*")
    .eq("group_id", groupId)
    .eq("deleted", false)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  return (data as Expense[]) ?? [];
}

export async function getSplitsForExpenses(expenseIds: string[]): Promise<ExpenseSplit[]> {
  if (expenseIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("expense_splits")
    .select("*")
    .in("expense_id", expenseIds);
  return (data as ExpenseSplit[]) ?? [];
}

export async function getGroupSettlements(groupId: string): Promise<Settlement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settlements")
    .select("*")
    .eq("group_id", groupId)
    .order("settled_at", { ascending: false });
  return (data as Settlement[]) ?? [];
}

export async function getActivity(limit = 50): Promise<Activity[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activity")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Activity[]) ?? [];
}

export const getListings = cache(async (): Promise<Listing[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Listing[]) ?? [];
});

export async function getListing(id: string): Promise<Listing | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  return (data as Listing) ?? null;
}

export const getPersonalTransactions = cache(async (): Promise<PersonalTransaction[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("personal_transactions")
    .select("*")
    .order("date", { ascending: false });
  return (data as PersonalTransaction[]) ?? [];
});

export const getBudgets = cache(async (): Promise<Budget[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("budgets").select("*").order("category");
  return (data as Budget[]) ?? [];
});

export const getCheckins = cache(async (): Promise<Checkin[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkins")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Checkin[]) ?? [];
});

export const getMyClaims = cache(async (): Promise<Claim[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("claims").select("*").eq("open", true);
  return (data as Claim[]) ?? [];
});
