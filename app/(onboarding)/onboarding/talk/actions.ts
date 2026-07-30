"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SUPPORTED_CURRENCIES } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok?: string; error?: string };

/**
 * The manual path through onboarding. It writes the same five fields the
 * agent's `save_profile_field` and `complete_onboarding` tools write, so the
 * two routes leave the profile in an identical state (BUILD.MD §5.3).
 */
export async function completeManualOnboarding(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const occupation = String(formData.get("occupation") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD");
  const sharing = String(formData.get("sharing") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Log in again to finish setting up." };

  if (!name) return { error: "What should we call you?" };
  if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    return { error: "Pick one of the supported currencies." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      occupation: occupation || null,
      currency,
      context: { sharing, goal },
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return { error: "That did not save. Try again." };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
