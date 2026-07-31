"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { signOut } from "./actions";

function Inner({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" size="lg" pending={pending}>
      {pending ? "Signing out…" : label}
    </Button>
  );
}

export function SignOutButton({ label = "Sign out" }: { label?: string }) {
  return (
    <form action={signOut}>
      <Inner label={label} />
    </form>
  );
}
