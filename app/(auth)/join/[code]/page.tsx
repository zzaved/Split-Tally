import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ink/Button";
import { Jellyfish } from "@/components/ink/Jellyfish";
import { createAdminClient, createClient, hasAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "You have been invited" };

/**
 * An invite link (BUILD.MD §5.4). The visitor has no session yet, so the code
 * is resolved on the service-role client — one narrow read of `invites` and
 * the inviter's name, nothing else.
 */
export default async function JoinPage(props: { params: Promise<{ code: string }> }) {
  const { code } = await props.params;

  // Already signed in? Then this link is not for you; go to your own ledger.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  let inviterName: string | null = null;
  let used = false;

  if (hasAdminClient()) {
    const admin = createAdminClient();
    const { data: invite } = await admin
      .from("invites")
      .select("code,inviter,used_by")
      .eq("code", code)
      .maybeSingle();

    if (invite) {
      used = Boolean(invite.used_by);
      const { data: inviter } = await admin
        .from("profiles")
        .select("name")
        .eq("id", invite.inviter)
        .maybeSingle();
      inviterName = inviter?.name ?? null;
    }
  }

  const valid = Boolean(inviterName) && !used;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <Jellyfish size={120} strokeWidth={6} />

      {valid ? (
        <>
          <p className="eyebrow text-cobalt">An invitation</p>
          <h1 className="font-display text-40 font-medium text-navy">
            {inviterName} wants to keep tallies with you.
          </h1>
          <p className="max-w-sm text-14 text-ink-soft">
            Create your ledger and the two of you are connected the moment you join, no request to
            accept, nothing to look up.
          </p>
          <ButtonLink href={`/signup?invite=${encodeURIComponent(code)}`} size="lg" className="mt-2">
            Create my ledger
          </ButtonLink>
        </>
      ) : (
        <>
          <p className="eyebrow text-cobalt">Invitation</p>
          <h1 className="font-display text-40 font-medium text-navy">
            {used ? "This link has been used." : "This link is not valid."}
          </h1>
          <p className="max-w-sm text-14 text-ink-soft">
            {used
              ? "Someone already joined with it. Ask for a fresh one, or make your own ledger."
              : "Ask whoever sent it for a new link, or start your own ledger and add them yourself."}
          </p>
          <ButtonLink href="/signup" size="lg" className="mt-2">
            Create my ledger
          </ButtonLink>
        </>
      )}

      <Link href="/login" className="text-14 text-cobalt underline underline-offset-4">
        I already have one
      </Link>
    </div>
  );
}
