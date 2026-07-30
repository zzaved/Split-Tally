import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * The signed-in user's client. Every read and write it makes is filtered by
 * the policies in supabase/migration.sql.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // proxy.ts refreshes the session, so this is safe to swallow.
          }
        },
      },
    },
  );
}

/**
 * The service-role client. Bypasses RLS entirely, so it is only used by the
 * four server-action flows documented in README.md, each of which does its own
 * ownership check first:
 *
 *   1. resolving an invite code before the visitor has a session
 *   2. the Exchange purchase transaction, which touches three tables at once
 *   3. writing activity rows into other people's feeds
 *   4. claiming a managed profile straight after signup
 *
 * Never import this from a client component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env — see .env.example.",
    );
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** True when the service role key is configured, for graceful degradation. */
export function hasAdminClient() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
