"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { Card } from "@/components/ink/Card";
import { Field, FormMessage, Input } from "@/components/ink/Field";
import { cn } from "@/lib/utils";
import { addManagedFriend, createInviteLink, sendFriendRequest, type ActionResult } from "./actions";

type Tab = "search" | "invite" | "managed";

const TABS: { id: Tab; label: string }[] = [
  { id: "search", label: "Search" },
  { id: "managed", label: "By name" },
  { id: "invite", label: "Invite link" },
];

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

export function AddFriend({ siteUrl }: { siteUrl: string }) {
  const [tab, setTab] = useState<Tab>("search");

  return (
    <Card className="p-6 md:p-8">
      <p className="eyebrow text-ink-soft">Add someone</p>

      <div
        role="tablist"
        aria-label="How to add a friend"
        className="mt-5 flex gap-1 rounded-full border border-navy/10 bg-cream p-1"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "eyebrow flex-1 rounded-full px-3 py-2 transition-colors duration-150",
              tab === t.id ? "bg-cobalt text-cream" : "text-ink-soft hover:text-navy",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "search" && <SearchPanel />}
        {tab === "managed" && <ManagedPanel />}
        {tab === "invite" && <InvitePanel siteUrl={siteUrl} />}
      </div>
    </Card>
  );
}

function SearchPanel() {
  const [state, action] = useActionState<ActionResult, FormData>(sendFriendRequest, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Email or username" htmlFor="query">
        <Input id="query" name="query" placeholder="marina@splittally.app" required />
      </Field>
      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.ok && <FormMessage tone="notice">{state.ok}</FormMessage>}
      <Submit label="Send request" pendingLabel="Sending…" />
    </form>
  );
}

function ManagedPanel() {
  const [state, action] = useActionState<ActionResult, FormData>(addManagedFriend, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Name" htmlFor="name" hint="A first name is enough.">
        <Input id="name" name="name" placeholder="Paulo" required />
      </Field>
      <Field
        label="Email (optional)"
        htmlFor="managed-email"
        hint="If they ever sign up with this address, their whole history moves across."
      >
        <Input id="managed-email" name="email" type="email" placeholder="paulo@example.com" />
      </Field>
      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.ok && <FormMessage tone="notice">{state.ok}</FormMessage>}
      <Submit label="Add them" pendingLabel="Adding…" />
    </form>
  );
}

function InvitePanel({ siteUrl }: { siteUrl: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const link = code ? `${siteUrl}/join/${code}` : null;

  async function generate() {
    setBusy(true);
    setError(null);
    const result = await createInviteLink();
    setBusy(false);
    if (result.error) setError(result.error);
    if (result.code) setCode(result.code);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copying is blocked in this browser. Select the link and copy it by hand.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!link ? (
        <>
          <p className="text-14 text-ink-soft">
            A link anyone can open. They will be your friend the moment they join.
          </p>
          {error && <FormMessage>{error}</FormMessage>}
          <Button type="button" onClick={generate} disabled={busy}>
            {busy ? "Creating…" : "Create an invite link"}
          </Button>
        </>
      ) : (
        <>
          <Field label="Your invite link">
            <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          </Field>
          <p className="text-12 text-ink-soft">
            They will be your friend the moment they join.
          </p>
          {error && <FormMessage>{error}</FormMessage>}
          <Button type="button" variant="secondary" onClick={copy}>
            {copied ? "Copied" : "Copy link"}
          </Button>
        </>
      )}
    </div>
  );
}
