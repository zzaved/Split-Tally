"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_CURRENCIES } from "@/lib/format";

export type ActionResult = { ok?: string; error?: string };

export async function updateProfile(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const currency = String(formData.get("currency") ?? "USD");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Log in again to change your profile." };

  if (!name) return { error: "A name is the one thing we need." };
  if (username && !/^[a-z0-9_.-]{2,30}$/.test(username)) {
    return { error: "Usernames can use letters, numbers, dots, dashes and underscores." };
  }
  if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    return { error: "Pick one of the supported currencies." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ name, username: username || null, currency })
    .eq("id", user.id);

  if (error) {
    return {
      error: error.code === "23505" ? "That username is taken." : "That did not save. Try again.",
    };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: "Saved." };
}

export async function saveVoice(voiceId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Log in again." };

  const { error } = await supabase
    .from("profiles")
    .update({ voice_id: voiceId })
    .eq("id", user.id);

  if (error) return { error: "That voice did not save." };

  revalidatePath("/settings");
  return { ok: "Voice saved." };
}
