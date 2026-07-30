"use server";

import { revalidatePath } from "next/cache";
import { round2 } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

export type ActionResult = { ok?: string; error?: string };

export async function setBudget(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const category = String(formData.get("category") ?? "").trim();
  const amount = round2(Number(formData.get("amount") ?? 0));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Log in again to set a budget." };

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return { error: "Pick one of the categories." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "A budget has to be above zero." };
  }

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category, monthly_amount: amount },
      { onConflict: "user_id,category" },
    );

  if (error) return { error: "That budget did not save." };

  revalidatePath("/money");
  return { ok: `${category} is capped at ${amount} a month.` };
}

export async function removeBudget(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const category = String(formData.get("category") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Log in again." };

  await supabase.from("budgets").delete().eq("user_id", user.id).eq("category", category);
  revalidatePath("/money");
  return { ok: "Removed." };
}
