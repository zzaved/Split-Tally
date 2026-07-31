"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Notices when the session ends somewhere else.
 *
 * Signing out in one tab left every other open tab sitting there fully
 * rendered: the previous person's name, their avatar and their balances, still
 * on screen and still clickable. Server navigation was correctly refused, so a
 * nav click simply did nothing, which is the worst of both, and the numbers
 * stayed readable to whoever was standing there next.
 *
 * Supabase broadcasts auth changes to every tab sharing the storage, so the
 * only thing missing was somebody listening. Deliberately only acts on the way
 * out: refreshing on sign in would fire on first mount too.
 */
export function SessionWatch() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/login");
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  return null;
}
