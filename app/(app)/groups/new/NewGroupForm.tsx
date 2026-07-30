"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { Avatar } from "@/components/ink/Card";
import { EmptyState } from "@/components/ink/EmptyState";
import { Field, FormMessage, Input, Select } from "@/components/ink/Field";
import { ButtonLink } from "@/components/ink/Button";
import { SUPPORTED_CURRENCIES } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { createGroup, type ActionResult } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Creating…" : "Create group"}
    </Button>
  );
}

export function NewGroupForm({
  friends,
  defaultCurrency,
}: {
  friends: Profile[];
  defaultCurrency: string;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(createGroup, {});

  return (
    <form action={action} className="flex flex-col gap-6">
      <Field label="Name" htmlFor="name" hint="Where the costs come from: a flat, a trip, a table.">
        <Input id="name" name="name" placeholder="Barcelona Trip" required autoFocus />
      </Field>

      <Field label="Currency" htmlFor="currency">
        <Select id="currency" name="currency" defaultValue={defaultCurrency}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <p className="eyebrow text-ink-soft">Who is in it</p>

        {friends.length === 0 ? (
          <EmptyState
            illustration="strokes"
            title="No friends to add yet"
            copy="You can make the group now and add people later, or add a friend first — a first name is enough."
            action={
              <ButtonLink href="/friends" variant="secondary" size="sm">
                Add a friend
              </ButtonLink>
            }
            className="py-10"
          />
        ) : (
          <ul className="mt-4 flex flex-col">
            {friends.map((friend) => (
              <li key={friend.id} className="border-b border-navy/8 py-3 last:border-0">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    name="members"
                    value={friend.id}
                    className="size-4 accent-[var(--color-cobalt)]"
                  />
                  <Avatar name={friend.name} size={30} managed={friend.is_managed} />
                  <span className="text-14 text-navy">{friend.name}</span>
                  {friend.is_managed && (
                    <span className="eyebrow text-ink-soft">Not on Split Tally yet</span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {state.error && <FormMessage>{state.error}</FormMessage>}

      <div>
        <Submit />
      </div>
    </form>
  );
}
