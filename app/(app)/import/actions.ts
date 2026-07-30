"use server";

import { revalidatePath } from "next/cache";
import { round2 } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site";
import type { ParsedTransaction } from "@/lib/types";

export type ReviewRow = ParsedTransaction & {
  dedupHash: string;
  /** Already in the ledger — pre-unchecked and badged in the review table. */
  duplicate: boolean;
};

export type ActionResult = { ok?: string; error?: string; saved?: number };

/** sha256 of `user|date|amount|normalised description` (BUILD.MD §5.6). */
async function dedupHash(userId: string, row: ParsedTransaction) {
  const input = `${userId}|${row.date}|${round2(row.amount)}|${row.description.trim().toLowerCase()}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hashes every parsed row and flags the ones already tallied, so the review
 * table can pre-uncheck them rather than quietly creating a second copy.
 */
export async function markDuplicates(rows: ParsedTransaction[]): Promise<ReviewRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const hashed = await Promise.all(
    rows.map(async (row) => ({ ...row, dedupHash: await dedupHash(user.id, row) })),
  );

  const { data: existing } = await supabase
    .from("personal_transactions")
    .select("dedup_hash")
    .in(
      "dedup_hash",
      hashed.map((r) => r.dedupHash),
    );

  const seen = new Set((existing ?? []).map((r) => r.dedup_hash as string));

  return hashed.map((row) => ({ ...row, duplicate: seen.has(row.dedupHash) }));
}

export async function saveStatementRows(input: {
  rows: ReviewRow[];
  storagePath?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Log in again to save these." };

  const rows = input.rows.filter((r) => r.description.trim() && r.amount > 0);
  if (rows.length === 0) return { error: "Nothing selected." };

  let uploadId: string | null = null;
  if (input.storagePath) {
    const { data } = await supabase
      .from("statement_uploads")
      .insert({
        user_id: user.id,
        storage_path: input.storagePath,
        parsed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    uploadId = data?.id ?? null;
  }

  // Categorise in one batch before writing, so the rows land already filed.
  let categories: string[] = [];
  try {
    const response = await fetch(`${siteUrl()}/api/categorize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ descriptions: rows.map((r) => r.description) }),
    });
    if (response.ok) {
      const data = (await response.json()) as { categories?: string[] };
      categories = data.categories ?? [];
    }
  } catch {
    // Uncategorised is a fine outcome; the user can set them by hand.
  }

  const { error, count } = await supabase
    .from("personal_transactions")
    .upsert(
      rows.map((row, i) => ({
        user_id: user.id,
        date: row.date,
        description: row.description.trim(),
        amount: round2(row.amount),
        direction: row.direction,
        category: categories[i] ?? null,
        source: "statement" as const,
        dedup_hash: row.dedupHash,
        statement_upload_id: uploadId,
      })),
      { onConflict: "user_id,dedup_hash", ignoreDuplicates: true, count: "exact" },
    );

  if (error) return { error: "Those rows did not save. Try again." };

  revalidatePath("/money");
  return { ok: `${count ?? rows.length} added to your ledger.`, saved: count ?? rows.length };
}
