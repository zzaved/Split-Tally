"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { Field, FormMessage, Input } from "@/components/ink/Field";
import { signUp, type AuthResult } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" pending={pending}>
      {pending ? "Creating…" : "Create my ledger"}
    </Button>
  );
}

export function SignupForm({ invite }: { invite?: string }) {
  const [state, formAction] = useActionState<AuthResult, FormData>(signUp, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="invite" value={invite ?? ""} />

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" hint="Eight characters or more.">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="••••••••"
        />
      </Field>

      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.notice && <FormMessage tone="notice">{state.notice}</FormMessage>}

      <Submit />
    </form>
  );
}
