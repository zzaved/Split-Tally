"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ink/Button";
import { ConfirmChips } from "@/components/ink/ConfirmChips";
import { Highlight } from "@/components/ink/Highlight";
import { CloseIcon, MicIcon } from "@/components/ink/Icon";
import { Orb } from "@/components/ink/Orb";
import { cn } from "@/lib/utils";
import { useDictation } from "./useDictation";
import { VOICES } from "@/lib/voices";

export type FillStep = {
  /** The form control this step fills. */
  name: string;
  /** Spoken and shown above the field. */
  question: string;
  /** Turns what was heard into what the field should hold. */
  parse?: (heard: string) => string;
  /** Optional check; return a message to ask again. */
  validate?: (value: string) => string | null;
};

type Phase = "idle" | "asking" | "listening" | "confirming" | "done";

/**
 * Fills a real form by talking, one field at a time.
 *
 * Deliberately not driven by the conversational agent. An agent is the right
 * tool for open-ended input, where the shape of the answer is unknown; a known
 * list of fields is better walked deterministically, because then the order,
 * the confirmation and the value that lands in each input are all guaranteed
 * rather than hoped for. It also costs nothing per turn.
 *
 * The voice you hear is still the one chosen at onboarding: questions are
 * spoken through the same ElevenLabs proxy the voice picker uses. Answers come
 * from the browser's recogniser, so the words appear as they are said.
 */
export function GuidedFill({
  steps,
  formRef,
  voiceId,
  intro,
  onFinish,
}: {
  steps: FillStep[];
  formRef: React.RefObject<HTMLFormElement | null>;
  voiceId?: string | null;
  /** Said once before the first question, so nobody is surprised. */
  intro: string;
  onFinish?: () => void;
}) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const dictation = useDictation();
  const step = steps[index];

  // Somebody who skipped the voice picker, including the demo account, still
  // gets spoken to: fall back to the first voice the deployment has configured.
  const speakingVoice = voiceId || VOICES.find((v) => v.id)?.id || null;

  const speak = useCallback(
    async (text: string) => {
      if (!speakingVoice) return;
      try {
        audioRef.current?.pause();
        const audio = new Audio(
          `/api/voice/sample?voice=${encodeURIComponent(speakingVoice)}&text=${encodeURIComponent(text)}`,
        );
        audioRef.current = audio;
        await audio.play();
      } catch {
        // No audio is fine: every question is on screen as well.
      }
    },
    [speakingVoice],
  );

  /** Points the ring at the current field and scrolls it into view. */
  const focusField = useCallback(() => {
    const form = formRef.current;
    if (!form || !step) return;
    const el = form.elements.namedItem(step.name) as HTMLElement | null;
    if (!el) return;
    setTarget(el);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [formRef, step]);

  useEffect(() => {
    if (!active) return;
    focusField();
  }, [active, index, focusField]);

  const ask = useCallback(async () => {
    if (!step) return;
    setPhase("asking");
    setHeard("");
    setError(null);
    // Clear the caption rather than restarting the recogniser: one microphone
    // session covers the whole walk.
    dictation.clear();
    await speak(step.question);
    setPhase("listening");
    dictation.start();
  }, [step, speak, dictation]);

  const begin = useCallback(async () => {
    setActive(true);
    setIndex(0);
    await speak(intro);
    await ask();
  }, [ask, intro, speak]);

  const stop = useCallback(() => {
    dictation.stop();
    audioRef.current?.pause();
    setActive(false);
    setPhase("idle");
    setTarget(null);
  }, [dictation]);

  /** Writes into the real input, the way a person typing would. */
  const write = useCallback(
    (value: string) => {
      const form = formRef.current;
      if (!form || !step) return;
      const el = form.elements.namedItem(step.name) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      if (!el) return;

      const next =
        el instanceof HTMLSelectElement
          ? ([...el.options].find(
              (o) =>
                o.value.toLowerCase() === value.toLowerCase() ||
                o.text.toLowerCase().includes(value.toLowerCase()),
            )?.value ?? el.value)
          : value;

      // Assigning `el.value` on a controlled input is not enough: React caches
      // the previous value on the node and treats the change as a no-op, so the
      // field visibly fills and then snaps back on the next render. Going
      // through the prototype's own setter updates that cache too.
      const prototype =
        el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : el instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;

      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) setter.call(el, next);
      else el.value = next;

      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    },
    [formRef, step],
  );

  const capture = useCallback(() => {
    const raw = dictation.interim.trim();
    if (!raw) return;

    const value = step?.parse ? step.parse(raw) : raw;
    const complaint = step?.validate?.(value) ?? null;

    if (complaint) {
      setError(complaint);
      dictation.clear();
      setPhase("listening");
      return;
    }

    setHeard(value);
    write(value);
    setPhase("confirming");
    void speak("Is that right?");
  }, [dictation, step, write, speak]);

  const next = useCallback(async () => {
    if (index + 1 >= steps.length) {
      setPhase("done");
      dictation.stop();
      setTarget(null);
      await speak("That is everything. Have a look and save it when you are happy.");
      setActive(false);
      onFinish?.();
      return;
    }
    setIndex((i) => i + 1);
    // The effect repoints the ring; ask once it has.
    window.setTimeout(() => void ask(), 250);
  }, [index, steps.length, dictation, speak, onFinish, ask]);

  // A pause of about a second and a half ends the answer, the way it would in
  // conversation. Nobody should have to press a button to stop talking.
  useEffect(() => {
    if (phase !== "listening" || !dictation.interim) return;
    const id = window.setTimeout(capture, 1500);
    return () => window.clearTimeout(id);
  }, [phase, dictation.interim, capture]);

  // Held in a ref because `stop` is rebuilt on every render: `useDictation`
  // returns a fresh object each time, so an effect keyed on `stop` would run
  // its cleanup constantly and switch the panel off the moment it appeared.
  const stopRef = useRef(stop);
  stopRef.current = stop;
  useEffect(() => () => stopRef.current(), []);

  if (!active) {
    return (
      <Button type="button" variant="secondary" onClick={begin}>
        <MicIcon className="size-4" />
        Fill this in by talking
      </Button>
    );
  }

  return (
    <>
      <Highlight target={target} seed={index} />

      {/* The prompt rides just under the field being filled, so the question
          and the answer are in the same place on screen. */}
      <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-6">
        <div className="flex w-full max-w-md flex-col gap-3 rounded-[20px] bg-cream p-5 shadow-ink-lg">
          <div className="flex items-start gap-4">
            <Orb
              size={52}
              state={phase === "listening" ? "listening" : phase === "asking" ? "speaking" : "idle"}
              intensity={phase === "listening" && dictation.interim ? 1 : 0}
              decorative
            />
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-ink-soft">
                Question {index + 1} of {steps.length}
              </p>
              <p className="mt-1.5 font-display text-20 leading-snug text-navy">
                {step?.question}
              </p>
            </div>
            <button
              type="button"
              onClick={stop}
              className="rounded-full p-1.5 text-ink-soft hover:bg-navy/5 hover:text-navy"
            >
              <CloseIcon title="Stop filling in by voice" />
            </button>
          </div>

          {error && <p className="text-14 text-vermilion">{error}</p>}

          {phase === "listening" && (
            <p
              className={cn(
                "min-h-6 text-14 italic",
                dictation.interim ? "text-navy" : "text-ink-soft/70",
              )}
              aria-live="polite"
            >
              {dictation.interim || (dictation.supported ? "Listening…" : "Type it in instead.")}
            </p>
          )}

          {phase === "confirming" && (
            <div className="flex flex-col gap-3">
              <p className="text-14 text-navy">
                I put down <span className="font-medium">{heard}</span>.
              </p>
              <ConfirmChips
                options={["Yes", "Say it again"]}
                onPick={(pick) => {
                  if (pick === "Yes") void next();
                  else void ask();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
