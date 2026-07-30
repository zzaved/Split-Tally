"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { signInDemo } from "./actions";

function Inner({ label, variant, size }: { label: string; variant?: "primary" | "secondary"; size?: "sm" | "lg" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} disabled={pending}>
      {pending ? "Opening…" : label}
    </Button>
  );
}

/**
 * Entering the demo is a POST, not a link.
 *
 * It used to be a GET route, which meant Next prefetched it the moment the
 * button scrolled into view and signed the visitor in as the demo account
 * without them pressing anything. Anyone who signed out of their own account
 * landed on the marketing page and was silently put back into Ana's ledger,
 * which made it impossible to reach signup at all.
 *
 * A GET that changes who you are is the bug; the prefetch only exposed it.
 */
export function DemoButton({
  label = "Explore the demo",
  variant = "primary",
  size = "sm",
  className,
}: {
  label?: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <form action={signInDemo} className={className}>
      <Inner label={label} variant={variant} size={size} />
    </form>
  );
}
