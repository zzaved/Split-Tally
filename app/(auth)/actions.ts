"use server";

import { redirect } from "next/navigation";
import { createAdminClient, createClient, hasAdminClient } from "@/lib/supabase/server";

export type AuthResult = { error?: string; notice?: string };

function safeNext(next: string | null | undefined) {
  // Only ever redirect within this app.
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function signIn(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "Enter your email and password to continue." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "That email and password do not match an account." };
  }

  redirect(next);
}

/** One click into the seeded account (BUILD.MD §5.1). */
export async function signInDemo(): Promise<AuthResult> {
  const email = process.env.DEMO_EMAIL;
  const password = process.env.DEMO_PASSWORD;

  if (!email || !password) {
    return { error: "The demo account is not configured. Set DEMO_EMAIL and DEMO_PASSWORD." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      error: "The demo account is not there yet. Run supabase/seed.sql against your project.",
    };
  }

  redirect("/dashboard");
}

export async function signUp(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const inviteCode = String(formData.get("invite") ?? "").trim();

  if (!email || !password) {
    return { error: "Enter an email and a password to create your ledger." };
  }
  if (password.length < 8) {
    return { error: "Use at least eight characters so the password holds up." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  const userId = data.user?.id;

  if (userId) {
    // Best effort, exactly as §5.4 allows: if someone already added this
    // person as a managed friend, fold that history into the real account.
    if (hasAdminClient()) {
      try {
        const admin = createAdminClient();
        await admin.rpc("claim_managed_profile", { new_user: userId, signup_email: email });

        if (inviteCode) {
          const { data: invite } = await admin
            .from("invites")
            .select("code,inviter,used_by")
            .eq("code", inviteCode)
            .maybeSingle();

          if (invite && !invite.used_by && invite.inviter !== userId) {
            await admin
              .from("friendships")
              .upsert(
                { requester: invite.inviter, addressee: userId, status: "accepted" },
                { onConflict: "requester,addressee" },
              );
            await admin.from("invites").update({ used_by: userId }).eq("code", inviteCode);
            await admin.from("activity").insert([
              {
                user_id: invite.inviter,
                actor_id: userId,
                type: "friend_accepted",
                payload: { via: "invite" },
              },
            ]);
          }
        }
      } catch {
        // A failed claim never blocks a signup; the account is still usable.
      }
    }
  }

  // With email confirmation switched on, signUp returns no session.
  if (!data.session) {
    return {
      notice:
        "Check your inbox and confirm the address, then log in. If you are running this locally, turn off email confirmation in Supabase → Authentication → Sign In / Providers.",
    };
  }

  redirect("/onboarding/voice");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
