import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Create your ledger" };

export default async function SignupPage(props: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await props.searchParams;

  return (
    <div>
      <p className="eyebrow text-cobalt">First tally</p>
      <h1 className="mt-4 font-display text-40 font-medium text-navy">Create your ledger.</h1>
      <p className="mt-5 text-14 text-ink-soft">
        An email and a password is all we need. Everything else — your name, your currency, who you
        share costs with — you tell the orb out loud in the next minute.
      </p>

      <div className="mt-10">
        <SignupForm invite={invite} />
      </div>

      <p className="mt-8 text-14 text-ink-soft">
        Already have one?{" "}
        <Link href="/login" className="text-cobalt underline underline-offset-4">
          Log in
        </Link>
        .
      </p>
    </div>
  );
}
