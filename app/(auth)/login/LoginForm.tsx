"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { DemoButton } from "../DemoButton";
import { Field, FormMessage, Input } from "@/components/ink/Field";
import { signIn, type AuthResult } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Opening…" : "Log in"}
    </Button>
  );
}

export function LoginForm({ next, demoError }: { next?: string; demoError?: string }) {
  const [state, formAction] = useActionState<AuthResult, FormData>(signIn, {});

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="next" value={next ?? ""} />

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

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Field>

        {(state.error || demoError) && <FormMessage>{state.error ?? demoError}</FormMessage>}

        <Submit />
      </form>

      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-navy/10" />
        <span className="eyebrow text-ink-soft">or</span>
        <span className="h-px flex-1 bg-navy/10" />
      </div>

      <div className="flex flex-col gap-2">
        <DemoButton label="Explore the demo" variant="secondary" size="lg" className="[&>button]:w-full" />
        <p className="text-center text-12 text-ink-soft">
          Ana&rsquo;s account, with a season of tallies already in it.
        </p>
      </div>
    </div>
  );
}
