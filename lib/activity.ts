import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityType, Json } from "./types";

export type ActivityEntry = {
  /** Whose feed this lands in. */
  userId: string;
  type: ActivityType;
  payload?: Record<string, Json | undefined>;
};

/**
 * Writes feed entries. The activity policy allows writing into anyone's feed
 * as long as you are the actor, which is what lets "Ana added an expense"
 * appear for everyone else in the group.
 *
 * Feed writes are never allowed to fail the action that caused them — if the
 * story of a change does not get recorded, the change itself still stands.
 */
export async function recordActivity(
  supabase: SupabaseClient,
  actorId: string,
  entries: ActivityEntry[],
): Promise<void> {
  const rows = entries
    .filter((e) => e.userId)
    .map((e) => ({
      user_id: e.userId,
      actor_id: actorId,
      type: e.type,
      payload: e.payload ?? {},
    }));

  if (rows.length === 0) return;

  try {
    await supabase.from("activity").insert(rows);
  } catch {
    // Intentionally swallowed — see above.
  }
}

/**
 * Managed profiles have no one reading a feed, so entries addressed to them
 * are dropped before the insert.
 */
export function feedRecipients(
  memberIds: string[],
  isManaged: (id: string) => boolean,
): string[] {
  return memberIds.filter((id) => !isManaged(id));
}
