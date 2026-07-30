import type { Metadata } from "next";
import Link from "next/link";
import { getMyProfile } from "@/lib/data";
import { AlreadySignedIn } from "../AlreadySignedIn";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

const DEMO_MESSAGES: Record<string, string> = {
  unconfigured: "The demo account is not configured yet. Set DEMO_EMAIL and DEMO_PASSWORD in .env.",
  missing: "The demo account is not in this database yet. Run supabase/seed.sql against it.",
};

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string; demo?: string }>;
}) {
  const { next, demo } = await props.searchParams;

  // A visitor who already has a session usually got here from the demo. Say so
  // rather than bouncing them somewhere they did not ask to go.
  const profile = await getMyProfile();
  if (profile) {
    return <AlreadySignedIn name={profile.name} email={profile.email} intent="login" />;
  }

  return (
    <div>
      <p className="eyebrow text-cobalt">Welcome back</p>
      <h1 className="mt-4 font-display text-40 font-medium text-navy">Open your ledger.</h1>

      <div className="mt-10">
        <LoginForm next={next} demoError={demo ? DEMO_MESSAGES[demo] : undefined} />
      </div>

      <p className="mt-8 text-14 text-ink-soft">
        No ledger yet?{" "}
        <Link href="/signup" className="text-cobalt underline underline-offset-4">
          Create one
        </Link>
        .
      </p>
    </div>
  );
}
