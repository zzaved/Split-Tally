"use server";

import { revalidatePath } from "next/cache";
import { recordActivity } from "@/lib/activity";
import { round2 } from "@/lib/format";
import { balancesFor, computePairBalances, scoreStatsFor, type LedgerRows } from "@/lib/ledger";
import { clampDiscount, localPricing, priceFromDiscount, MAX_DISCOUNT, MIN_DISCOUNT } from "@/lib/pricing";
import { tallyScore } from "@/lib/score";
import { createAdminClient, createClient, hasAdminClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import type { Listing, Profile } from "@/lib/types";
import { firstName } from "@/lib/utils";

export type ActionResult = { ok?: string; error?: string };

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

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

/**
 * Step two of the sell flow: what the AI thinks this tally is worth. Called
 * from the client as the seller picks a receivable.
 */
export async function priceReceivable(input: {
  debtorId: string;
  faceValue: number;
  currency: string;
}): Promise<{
  suggested_price: number;
  discount_pct: number;
  rationale: string;
  source: string;
  error?: string;
}> {
  const { supabase, userId } = await session();
  const fallback = {
    suggested_price: round2(input.faceValue * 0.88),
    discount_pct: 12,
    rationale: "Priced from the debtor's record.",
    source: "local",
  };

  if (!userId) return { ...fallback, error: "Log in again." };

  const { data: debtor } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", input.debtorId)
    .maybeSingle();

  const rows = await ledgerRows(supabase);
  const stats = scoreStatsFor(input.debtorId, rows);
  const score = stats.settledCount > 0 || stats.openAmount > 0
    ? tallyScore(stats)
    : ((debtor as Profile)?.tally_score ?? 50);

  const local = localPricing({
    faceValue: input.faceValue,
    currency: input.currency,
    debtorName: firstName((debtor as Profile)?.name ?? "They"),
    score,
    settledCount: stats.settledCount,
    avgDays: stats.avgDaysToSettle,
    overdueCount: stats.overdueCount,
  });

  // Ask the model through the route, so the prompt lives in exactly one place.
  try {
    const response = await fetch(`${siteUrl()}/api/price-listing`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        face_value: input.faceValue,
        currency: input.currency,
        debtor_name: firstName((debtor as Profile)?.name ?? "They"),
        settled_count: stats.settledCount,
        avg_days_to_settle: stats.avgDaysToSettle,
        open_amount: stats.openAmount,
        overdue_count: stats.overdueCount,
        tally_score: score,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (typeof data.suggested_price === "number") return data;
    }
  } catch {
    // fall through to the local model
  }

  return {
    suggested_price: local.price,
    discount_pct: local.discountPct,
    rationale: local.rationale,
    source: local.source,
  };
}

/** Step three: list it. The 2%–35% clamp is enforced here, not in the form. */
export async function createListing(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const debtorId = String(formData.get("debtorId") ?? "");
  const currency = String(formData.get("currency") ?? "USD");
  const groupId = String(formData.get("groupId") ?? "") || null;
  const faceValue = round2(Number(formData.get("faceValue") ?? 0));
  const askingPrice = round2(Number(formData.get("askingPrice") ?? 0));
  const suggested = Number(formData.get("suggestedPrice") ?? 0) || null;
  const rationale = String(formData.get("rationale") ?? "") || null;

  const { supabase, userId } = await session();
  if (!userId) return { error: "Log in again to list a tally." };
  if (!debtorId || debtorId === userId) return { error: "Pick whose tally you are selling." };
  if (faceValue <= 0) return { error: "That tally has nothing in it." };

  // Never let someone sell more than they are actually owed.
  const rows = await ledgerRows(supabase);
  const owed = balancesFor(userId, computePairBalances(rows)).find(
    (b) => b.personId === debtorId && b.currency === currency && b.amount > 0,
  );

  if (!owed || faceValue > owed.amount + 0.01) {
    return { error: "You cannot list more than that person actually owes you." };
  }

  const discountPct = ((faceValue - askingPrice) / faceValue) * 100;
  if (discountPct < MIN_DISCOUNT - 0.05 || discountPct > MAX_DISCOUNT + 0.05) {
    return {
      error: `The discount has to sit between ${MIN_DISCOUNT}% and ${MAX_DISCOUNT}%. That one is ${discountPct.toFixed(1)}%.`,
    };
  }

  const price = priceFromDiscount(faceValue, clampDiscount(discountPct));

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      seller_id: userId,
      debtor_id: debtorId,
      group_id: groupId,
      currency,
      face_value: faceValue,
      asking_price: price,
      ai_suggested_price: suggested,
      ai_rationale: rationale,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !listing) return { error: "That listing did not save. Try again." };

  const { data: debtor } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", debtorId)
    .maybeSingle();

  await recordActivity(supabase, userId, [
    {
      userId,
      type: "listing_created",
      payload: {
        debtor: debtor?.name,
        face_value: faceValue,
        asking_price: price,
        currency,
      },
    },
  ]);

  revalidatePath("/exchange");
  return { ok: `Listed. ${debtor?.name ?? "Their"} tally is on the Exchange.` };
}

export async function withdrawListing(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const { supabase, userId } = await session();
  if (!userId) return { error: "Log in again." };

  const { error } = await supabase
    .from("listings")
    .update({ status: "withdrawn" })
    .eq("id", id)
    .eq("seller_id", userId)
    .eq("status", "open");

  if (error) return { error: "That listing could not be withdrawn." };

  revalidatePath("/exchange");
  return { ok: "Withdrawn." };
}

/**
 * The purchase (BUILD.MD §5.7). Money is simulated and labelled as such, but
 * the ledger movement is real:
 *
 *   1. the listing is marked sold and the buyer recorded
 *   2. an `exchange_purchase` settlement records buyer → seller consideration
 *   3. an `exchange_transfer` settlement clears the debtor's original debt to
 *      the seller
 *   4. a `claims` row makes the debtor owe the buyer the face value instead
 *   5. all three parties get a feed entry
 *
 * Steps 1, 3, 4 and 5 touch rows the buyer has no policy to write, so this
 * runs on the service-role client after checking ownership in code.
 */
export async function buyListing(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const { supabase, userId } = await session();
  if (!userId) return { error: "Log in again to buy a tally." };

  if (!hasAdminClient()) {
    return {
      error:
        "Buying is switched off on this deployment because the server key is missing. Everything else on the Exchange works.",
    };
  }

  const { data: found } = await supabase.from("listings").select("*").eq("id", id).maybeSingle();
  const listing = found as Listing | null;

  if (!listing) return { error: "That listing is gone." };
  if (listing.status !== "open") return { error: "Someone got there first." };
  if (listing.seller_id === userId) return { error: "That is your own listing." };
  if (listing.debtor_id === userId) return { error: "You cannot buy your own debt." };

  const admin = createAdminClient();
  const soldAt = new Date().toISOString();

  const { error: sellError, data: updated } = await admin
    .from("listings")
    .update({ status: "sold", buyer_id: userId, sold_at: soldAt })
    .eq("id", id)
    .eq("status", "open")
    .select("id")
    .maybeSingle();

  if (sellError || !updated) return { error: "Someone got there first." };

  const { error: ledgerError } = await admin.from("settlements").insert([
    {
      group_id: null,
      from_user: userId,
      to_user: listing.seller_id,
      amount: listing.asking_price,
      currency: listing.currency,
      kind: "exchange_purchase",
      listing_id: listing.id,
      settled_at: soldAt,
    },
    {
      group_id: listing.group_id,
      from_user: listing.debtor_id,
      to_user: listing.seller_id,
      amount: listing.face_value,
      currency: listing.currency,
      kind: "exchange_transfer",
      listing_id: listing.id,
      settled_at: soldAt,
    },
  ]);

  if (ledgerError) {
    // Put the listing back rather than leave a sale with no ledger behind it.
    await admin
      .from("listings")
      .update({ status: "open", buyer_id: null, sold_at: null })
      .eq("id", id);
    return { error: "The ledger did not accept that sale, so nothing changed." };
  }

  await admin.from("claims").insert({
    listing_id: listing.id,
    debtor_id: listing.debtor_id,
    holder_id: userId,
    group_id: listing.group_id,
    currency: listing.currency,
    amount: listing.face_value,
    open: true,
    created_at: soldAt,
  });

  const { data: people } = await admin
    .from("profiles")
    .select("id,name,is_managed")
    .in("id", [listing.seller_id, listing.debtor_id, userId]);

  const nameOf = (personId: string) =>
    (people ?? []).find((p) => p.id === personId)?.name ?? "someone";
  const isManaged = (personId: string) =>
    Boolean((people ?? []).find((p) => p.id === personId)?.is_managed);

  const payload = {
    seller: nameOf(listing.seller_id),
    buyer: nameOf(userId),
    debtor: nameOf(listing.debtor_id),
    face_value: listing.face_value,
    price: listing.asking_price,
    currency: listing.currency,
  };

  const recipients = [listing.seller_id, listing.debtor_id, userId].filter(
    (personId) => !isManaged(personId),
  );

  await admin.from("activity").insert(
    recipients.map((personId) => ({
      user_id: personId,
      actor_id: userId,
      type: "listing_sold",
      payload,
    })),
  );

  revalidatePath("/exchange");
  revalidatePath("/dashboard");
  revalidatePath("/activity");

  return {
    ok: `Bought. ${nameOf(listing.debtor_id)}'s tally is yours now — they owe you ${listing.face_value} ${listing.currency}.`,
  };
}
