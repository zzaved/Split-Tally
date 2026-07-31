"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { Card } from "@/components/ink/Card";
import { FormMessage } from "@/components/ink/Field";
import { renameGroup, type ActionResult } from "../actions";

function Save({ label, archived }: { label: string; archived: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="secondary"
      name="archived"
      value={archived ? "true" : "false"}
      pending={pending}
    >
      {label}
    </Button>
  );
}

/**
 * Renaming and putting a group away.
 *
 * The action for both has existed since the beginning and was never wired to
 * anything, which meant a group created by mistake stayed on the dashboard for
 * good: no rename, no archive, no delete, nothing. A QA pass left three test
 * groups behind precisely because there was no way to clear them.
 *
 * Archived rather than deleted, because the expenses inside still count toward
 * everybody's balances and score. Removing the group would quietly rewrite
 * other people's ledgers, which is not the creator's to do.
 */
export function GroupSettings({
  groupId,
  name,
  archived,
  canEdit,
}: {
  groupId: string;
  name: string;
  archived: boolean;
  canEdit: boolean;
}) {
  const [state, action] = useActionState<ActionResult, FormData>(renameGroup, {});
  const [open, setOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-ink-soft">This group</p>
          <p className="mt-1.5 text-14 text-ink-soft">
            {archived
              ? "Put away. It stays out of your lists, and the tallies inside still count."
              : "Rename it, or put it away when the trip is over."}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "Change"}
        </Button>
      </div>

      {open && (
        <form action={action} className="mt-5 flex flex-wrap items-end gap-3">
          <input type="hidden" name="groupId" value={groupId} />

          <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
            <span className="eyebrow text-ink-soft">Name</span>
            <input
              name="name"
              defaultValue={name}
              className="rounded-well border border-navy/15 bg-cream px-3 py-2 text-14 focus:border-cobalt focus:ring-2 focus:ring-cobalt/25 focus:outline-none"
            />
          </label>

          {/* Both are submit buttons carrying `archived`, because only the
              button that was pressed submits its value. A hidden field of the
              same name would win on order and the toggle would never fire. */}
          <Save label="Save the name" archived={archived} />

          <button
            type="submit"
            name="archived"
            value={archived ? "false" : "true"}
            className="eyebrow rounded-full px-3 py-2.5 text-ink-soft transition-colors duration-150 hover:bg-navy/6 hover:text-navy"
          >
            {archived ? "Bring it back" : "Put it away"}
          </button>

          {state.error && <FormMessage>{state.error}</FormMessage>}
          {state.ok && <FormMessage tone="notice">{state.ok}</FormMessage>}
        </form>
      )}
    </Card>
  );
}
