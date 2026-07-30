"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getLedgerRows } from "@/lib/data";
import { scorePeak, scoreStatsFor } from "@/lib/ledger";
import { HIGH_MARK, improvingState, LOW_MARK, tallyScore } from "@/lib/score";

export type ActionResult = { ok?: string; error?: string };

/**
 * Declares that this person is working their score back up.
 *
 * Every condition is checked here rather than trusted from the form: the
 * record must already show them reaching a high mark, the score must currently
 * be low, and the credit must not already be spent. A client that asks nicely
 * gets nothing it has not earned.
 */
export async function declareImproving(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Log in again." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("improving_since,improving_used_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return { error: "We could not find your profile." };
  if (profile.improving_since) return { error: "You already have this standing." };

  const rows = await getLedgerRows();
  const stats = scoreStatsFor(user.id, rows);
  const score = tallyScore(stats);
  const { peak, on } = scorePeak(user.id, rows, tallyScore);

  const peakSinceUsed = profile.improving_used_at
    ? scorePeak(
        user.id,
        {
          ...rows,
          settlements: rows.settlements.filter(
            (s) => s.settled_at > (profile.improving_used_at as string),
          ),
        },
        tallyScore,
      ).peak
    : null;

  const state = improvingState({
    score,
    peak,
    peakOn: on,
    peakSinceUsed,
    improvingSince: profile.improving_since,
    improvingUsedAt: profile.improving_used_at,
  });

  if (state.status !== "available") {
    if (state.status === "unavailable" && state.reason === "never-high") {
      return {
        error: `This is earned, not given. Your record has to have reached ${HIGH_MARK} at some point before you can say you are working back up to it.`,
      };
    }
    if (state.status === "unavailable" && state.reason === "not-low") {
      return { error: `Your score is not below ${LOW_MARK}. There is nothing to explain.` };
    }
    if (state.status === "unavailable" && state.reason === "spent") {
      return {
        error: `You have used this once already. It comes back when your record reaches ${HIGH_MARK} again.`,
      };
    }
    return { error: "This is not available on your account right now." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ improving_since: now, improving_used_at: now })
    .eq("id", user.id);

  if (error) return { error: "That did not save. Try again." };

  revalidatePath("/score");
  revalidatePath("/dashboard");
  revalidatePath("/exchange");

  return {
    ok: "Standing set. Anyone deciding whether to lend to you will see that you reached a high mark before, and that you have owned the drop.",
  };
}
