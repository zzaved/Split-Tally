/**
 * Row shapes for the tables in supabase/migration.sql. Hand-maintained rather
 * than generated so the app has one small, readable vocabulary.
 */

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type CreatedVia = "voice" | "manual" | "statement";
export type SettlementKind = "settle" | "exchange_purchase" | "exchange_transfer";
export type ListingStatus = "open" | "sold" | "withdrawn";
export type Direction = "in" | "out";
export type TransactionSource = "statement" | "manual" | "voice";
export type FriendshipStatus = "pending" | "accepted";

export type ActivityType =
  | "expense_added"
  | "expense_removed"
  | "settlement"
  | "friend_request"
  | "friend_accepted"
  | "listing_created"
  | "listing_sold"
  | "checkin_done"
  | "simplify_applied";

/** The eleven categories the assistant is allowed to choose from (§7). */
export const CATEGORIES = [
  "Food & Drink",
  "Groceries",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Travel",
  "Health",
  "Shopping",
  "Income",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Profile = {
  id: string;
  is_managed: boolean;
  created_by: string | null;
  name: string;
  username: string | null;
  email: string | null;
  dob: string | null;
  occupation: string | null;
  currency: string;
  voice_id: string | null;
  context: Json;
  tally_score: number;
  onboarded_at: string | null;
  deleted: boolean;
  created_at: string;
};

export type Friendship = {
  id: string;
  requester: string;
  addressee: string;
  status: FriendshipStatus;
  created_at: string;
};

export type Invite = {
  code: string;
  inviter: string;
  used_by: string | null;
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  currency: string;
  created_by: string;
  archived: boolean;
  simplify_debts: boolean;
  created_at: string;
};

export type GroupMember = { group_id: string; user_id: string; joined_at: string };

export type Expense = {
  id: string;
  group_id: string;
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  paid_by: string;
  created_by: string;
  created_via: CreatedVia;
  expense_date: string;
  deleted: boolean;
  created_at: string;
};

export type ExpenseSplit = { expense_id: string; user_id: string; share_amount: number };

export type Settlement = {
  id: string;
  group_id: string | null;
  from_user: string;
  to_user: string;
  amount: number;
  currency: string;
  kind: SettlementKind;
  listing_id: string | null;
  settled_at: string;
};

export type Listing = {
  id: string;
  seller_id: string;
  debtor_id: string;
  group_id: string | null;
  currency: string;
  face_value: number;
  asking_price: number;
  ai_suggested_price: number | null;
  ai_rationale: string | null;
  status: ListingStatus;
  buyer_id: string | null;
  created_at: string;
  sold_at: string | null;
};

export type Claim = {
  id: string;
  listing_id: string | null;
  debtor_id: string;
  holder_id: string;
  group_id: string | null;
  currency: string;
  amount: number;
  open: boolean;
  created_at: string;
};

export type StatementUpload = {
  id: string;
  user_id: string;
  storage_path: string;
  parsed_at: string | null;
  created_at: string;
};

export type PersonalTransaction = {
  id: string;
  user_id: string;
  date: string;
  description: string;
  amount: number;
  direction: Direction;
  category: string | null;
  source: TransactionSource;
  dedup_hash: string;
  statement_upload_id: string | null;
  created_at: string;
};

export type Budget = {
  user_id: string;
  category: string;
  monthly_amount: number;
  created_at: string;
};

export type Checkin = { id: string; user_id: string; summary: string | null; created_at: string };

export type Activity = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: ActivityType;
  payload: Record<string, Json | undefined>;
  created_at: string;
};

/** A parsed statement row before the user has confirmed it. */
export type ParsedTransaction = {
  date: string;
  description: string;
  amount: number;
  direction: Direction;
};
