"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { Field, FormMessage, Input, Select } from "@/components/ink/Field";
import { SUPPORTED_CURRENCIES } from "@/lib/format";
import { signOut } from "@/app/(auth)/actions";
import { updateProfile, type ActionResult } from "./actions";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function ProfileForm({
  name,
  username,
  currency,
}: {
  name: string;
  username: string;
  currency: string;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(updateProfile, {});

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Name" htmlFor="name">
        <Input id="name" name="name" defaultValue={name} required />
      </Field>

      <Field label="Username" htmlFor="username" hint="How friends find you.">
        <Input id="username" name="username" defaultValue={username} placeholder="ana" />
      </Field>

      <Field
        label="Currency"
        htmlFor="currency"
        hint="Used for your own totals. Group tallies keep their own currency."
      >
        <Select id="currency" name="currency" defaultValue={currency}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.ok && <FormMessage tone="notice">{state.ok}</FormMessage>}

      <div>
        <Save />
      </div>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        Sign out
      </Button>
    </form>
  );
}
