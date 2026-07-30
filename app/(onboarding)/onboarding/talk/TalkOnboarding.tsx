"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ink/Button";
import { Card } from "@/components/ink/Card";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ink/Field";
import { VoiceSheet } from "@/components/voice/VoiceSheet";
import { SUPPORTED_CURRENCIES } from "@/lib/format";
import { completeManualOnboarding, type ActionResult } from "./actions";

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Saving…" : "Finish setting up"}
    </Button>
  );
}

/**
 * Spoken onboarding, with the discreet manual path §5.3 requires. The form
 * writes exactly the same five fields the agent's tools write, so nobody is
 * penalised for not wanting to talk.
 */
export function TalkOnboarding({
  voiceId,
  currency,
}: {
  voiceId: string | null;
  currency: string;
}) {
  const [manual, setManual] = useState(false);
  const [state, action] = useActionState<ActionResult, FormData>(completeManualOnboarding, {});

  if (manual) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
        <div>
          <p className="eyebrow text-cobalt">Setting up</p>
          <h1 className="mt-4 font-display text-40 font-medium text-navy">
            Five short things.
          </h1>
        </div>

        <Card className="p-6 md:p-8">
          <form action={action} className="flex flex-col gap-5">
            <Field label="What should we call you" htmlFor="name">
              <Input id="name" name="name" required placeholder="Ana" />
            </Field>

            <Field label="Student, professional, or something else" htmlFor="occupation">
              <Select id="occupation" name="occupation" defaultValue="professional">
                <option value="student">Student</option>
                <option value="professional">Professional</option>
                <option value="other">Something else</option>
              </Select>
            </Field>

            <Field label="Default currency" htmlFor="currency">
              <Select id="currency" name="currency" defaultValue={currency}>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Who you usually share expenses with" htmlFor="sharing">
              <Textarea
                id="sharing"
                name="sharing"
                placeholder="A flat with two friends, plus trips a few times a year."
              />
            </Field>

            <Field label="Your main money goal" htmlFor="goal">
              <Input
                id="goal"
                name="goal"
                placeholder="Stop losing track of what people owe me."
              />
            </Field>

            {state.error && <FormMessage>{state.error}</FormMessage>}

            <div className="flex flex-wrap items-center gap-3">
              <Save />
              <Button type="button" variant="ghost" onClick={() => setManual(false)}>
                Talk instead
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8">
      <div className="text-center">
        <p className="eyebrow text-cobalt">Setting up</p>
        <h1 className="mt-4 font-display text-40 font-medium text-navy md:text-56">
          Let&rsquo;s just talk.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-16 text-ink-soft">
          I&rsquo;ll ask for your microphone so we can talk. You can type instead at any time, and
          everything I say is written on screen.
        </p>
      </div>

      <div className="w-full overflow-hidden rounded-card border border-navy/12 bg-cream shadow-ink">
        <VoiceSheet open mode="onboarding" voiceId={voiceId} onClose={() => {}} fullscreen />
      </div>

      <button
        type="button"
        onClick={() => setManual(true)}
        className="text-14 text-ink-soft underline underline-offset-4 hover:text-navy"
      >
        Skip: set up manually
      </button>
    </div>
  );
}
