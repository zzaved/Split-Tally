import { ButtonLink } from "@/components/ink/Button";
import { Avatar } from "@/components/ink/Card";
import { SignOutButton } from "./SignOutButton";

/**
 * What a signed-in visitor sees on /login or /signup.
 *
 * They get here by pressing a button that says "Log in" or "Create your
 * ledger" while already carrying a session, usually one picked up from the
 * demo. Redirecting them to the dashboard is what the router wants to do and
 * is precisely the wrong answer: the button appears to do nothing. So the page
 * says who they are and offers both ways forward.
 */
export function AlreadySignedIn({
  name,
  email,
  intent,
}: {
  name: string;
  email: string | null;
  intent: "login" | "signup";
}) {
  return (
    <div>
      <p className="eyebrow text-cobalt">Already here</p>
      <h1 className="mt-4 font-display text-40 font-medium text-navy">
        You are signed in as {name}.
      </h1>

      <div className="mt-8 flex items-center gap-3 rounded-card bg-cream-deep/60 px-5 py-4">
        <Avatar name={name} size={40} />
        <div className="min-w-0">
          <p className="truncate text-14 font-medium text-navy">{name}</p>
          {email && <p className="truncate text-12 text-ink-soft">{email}</p>}
        </div>
      </div>

      <p className="mt-6 text-14 text-ink-soft">
        {intent === "signup"
          ? "To make a new ledger you will need to sign out of this one first. Your tallies stay exactly where they are."
          : "To use a different account, sign out of this one first."}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <ButtonLink href="/dashboard" size="lg">
          Go to your ledger
        </ButtonLink>
        <SignOutButton
          label={intent === "signup" ? "Sign out and start fresh" : "Sign out"}
        />
      </div>
    </div>
  );
}
