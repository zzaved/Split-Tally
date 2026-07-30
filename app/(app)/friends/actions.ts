"use server";

import { revalidatePath } from "next/cache";
import { recordActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type ActionResult = { ok?: string; error?: string };

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * Way one: search an existing account by email or username and send a request
 * (BUILD.MD §5.4).
 */
export async function sendFriendRequest(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const query = String(formData.get("query") ?? "").trim().toLowerCase();
  const { supabase, user } = await me();
  if (!user) return { error: "Log in again to add friends." };
  if (!query) return { error: "Enter an email address or a username." };

  const { data: found } = await supabase
    .from("profiles")
    .select("*")
    .or(`email.ilike.${query},username.ilike.${query}`)
    .eq("is_managed", false)
    .limit(1);

  const target = (found as Profile[])?.[0];

  if (!target) {
    return {
      error: "Nobody on Split Tally uses that email or username. Send them an invite link instead.",
    };
  }
  if (target.id === user.id) {
    return { error: "That is you." };
  }

  const { data: existing } = await supabase
    .from("friendships")
    .select("id,status")
    .or(
      `and(requester.eq.${user.id},addressee.eq.${target.id}),and(requester.eq.${target.id},addressee.eq.${user.id})`,
    )
    .limit(1);

  if (existing?.length) {
    return {
      error:
        existing[0].status === "accepted"
          ? `You and ${target.name} are already connected.`
          : `There is already a request between you and ${target.name}.`,
    };
  }

  const { error } = await supabase
    .from("friendships")
    .insert({ requester: user.id, addressee: target.id, status: "pending" });

  if (error) return { error: "That request did not go through. Try again." };

  const { data: mine } = await supabase
    .from("profiles")
    .select("name,username")
    .eq("id", user.id)
    .maybeSingle();

  await recordActivity(supabase, user.id, [
    {
      userId: target.id,
      type: "friend_request",
      payload: { name: mine?.name ?? "Someone", username: mine?.username ?? undefined },
    },
  ]);

  revalidatePath("/friends");
  return { ok: `Request sent to ${target.name}.` };
}

export async function respondToRequest(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const accept = String(formData.get("accept") ?? "") === "true";
  const { supabase, user } = await me();
  if (!user) return { error: "Log in again to answer requests." };

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id,requester,addressee,status")
    .eq("id", id)
    .maybeSingle();

  if (!friendship || friendship.addressee !== user.id) {
    return { error: "That request is no longer waiting for you." };
  }

  if (!accept) {
    await supabase.from("friendships").delete().eq("id", id);
    revalidatePath("/friends");
    return { ok: "Request declined." };
  }

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", id);

  if (error) return { error: "That did not go through. Try again." };

  const { data: mine } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  await recordActivity(supabase, user.id, [
    { userId: friendship.requester, type: "friend_accepted", payload: { name: mine?.name } },
  ]);

  revalidatePath("/friends");
  revalidatePath("/dashboard");
  return { ok: "You are connected." };
}

/**
 * Way three, and the one that makes the product usable on day one: add someone
 * who is not on Split Tally by name alone. They can be put in groups and owe
 * money like anyone else; if they later sign up with the same email their
 * history follows them (§5.4).
 */
export async function addManagedFriend(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim() || null;
  const { supabase, user } = await me();
  if (!user) return { error: "Log in again to add friends." };
  if (!name) return { error: "Give them a name — a first name is enough." };

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({ name, email, is_managed: true, created_by: user.id })
    .select("id,name")
    .single();

  if (error || !profile) return { error: "That did not save. Try again." };

  await supabase
    .from("friendships")
    .insert({ requester: user.id, addressee: profile.id, status: "accepted" });

  revalidatePath("/friends");
  return { ok: `${profile.name} is on your list. They are not on Split Tally yet.` };
}

/** Way two: a link that connects the two of you the moment they join. */
export async function createInviteLink(): Promise<ActionResult & { code?: string }> {
  const { supabase, user } = await me();
  if (!user) return { error: "Log in again to create an invite." };

  const { data: existing } = await supabase
    .from("invites")
    .select("code")
    .eq("inviter", user.id)
    .is("used_by", null)
    .limit(1);

  if (existing?.length) return { code: existing[0].code };

  const code = randomCode();
  const { error } = await supabase.from("invites").insert({ code, inviter: user.id });
  if (error) return { error: "Could not create a link right now." };

  revalidatePath("/friends");
  return { code };
}

/** Readable, unambiguous, and short enough to say out loud. */
function randomCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
