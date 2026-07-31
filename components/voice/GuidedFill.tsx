"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ink/Button";
import { ConfirmChips } from "@/components/ink/ConfirmChips";
import { Highlight } from "@/components/ink/Highlight";
import { CloseIcon, MicIcon } from "@/components/ink/Icon";
import { Orb } from "@/components/ink/Orb";
import { cn } from "@/lib/utils";
import { useLiveTranscript } from "./useLiveTranscript";
import { useVoiceUser } from "./VoiceDock";

export type FillStep = {
  /** The form control this step fills, and the step's key. */
  name: string;
  /** Spoken and shown above the field. A function when it depends on state. */
  question: string | (() => string);
  /** Turns what was heard into what the field should hold. */
  parse?: (heard: string) => string;
  /** Optional check; return a message to ask again. */
  validate?: (value: string) => string | null;
  /**
   * Where the answer goes, for a step that is not a form control: a slider
   * held in React state, or a choice that runs a function. Defaults to writing
   * the form control named `name`.
   */
  apply?: (value: string) => void;
  /** What the ring points at. Defaults to that same control. */
  anchor?: () => HTMLElement | null;
  /** How the confirmation reads, when the stored value is not what you'd say. */
  describe?: (value: string) => string;
  /**
   * Held before asking, for a step that depends on something still arriving,
   * such as a price the AI is still working out. Nobody should be asked to
   * adjust a number that is not on screen yet.
   */
  ready?: () => boolean;
};

type Phase = "idle" | "waiting" | "asking" | "listening" | "confirming" | "done";

/** A question can depend on state that only exists once the walk is running. */
function wording(question: FillStep["question"]): string {
  return typeof question === "function" ? question() : question;
}

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
  label,
  onFinish,
}: {
  steps: FillStep[];
  /** Omitted by flows whose steps all carry their own `apply`. */
  formRef?: React.RefObject<HTMLFormElement | null>;
  /** Only passed during onboarding, which runs outside the app shell. */
  voiceId?: string | null;
  /** Said once before the first question, so nobody is surprised. */
  intro: string;
  /** Overrides the button copy where "fill this in" is the wrong verb. */
  label?: string;
  onFinish?: () => void;
}) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const dictation = useLiveTranscript();
  const step = steps[index];

  // Steps close over the state of the render that built them. A walk outlives
  // several renders, so waiting on `ready` or writing through `apply` has to
  // read the current versions or it would ask about a price that has since
  // arrived and write into a setter nobody is listening to.
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  });
  const current = useCallback(() => stepsRef.current[index], [index]);

  // The voice this person actually chose. Reading it from the dock rather than
  // from a prop is what stopped every form that forgot to pass it from quietly
  // reverting to the first voice on the list.
  const dockUser = useVoiceUser();
  const speakingVoice = voiceId ?? dockUser?.voiceId ?? null;

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
    if (!step) return;
    const el =
      step.anchor?.() ??
      ((formRef?.current?.elements.namedItem(step.name) ?? null) as HTMLElement | null);
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
    setHeard("");
    setError(null);

    // Wait for whatever this step depends on, rather than asking about a
    // number that is not on screen yet.
    if (current()?.ready && !current()!.ready!()) {
      setPhase("waiting");
      const arrived = await new Promise<boolean>((resolve) => {
        const id = window.setInterval(() => {
          if (current()?.ready?.() !== false) {
            window.clearInterval(id);
            resolve(true);
          }
        }, 200);
        window.setTimeout(() => {
          window.clearInterval(id);
          resolve(false);
        }, 20000);
      });

      // If it never arrived, say so and stand down.
      //
      // This used to carry on and ask the question anyway, with the fallback
      // wording, and then finish with "That is everything, have a look and
      // save it" while the screen was still reading "Reading Paulo's
      // record…" with no price and nothing to save. Claiming to be done is
      // worse than admitting the wait.
      if (!arrived) {
        dictation.stop();
        audioRef.current?.pause();
        setTarget(null);
        setActive(false);
        setPhase("idle");
        await speak("That is taking longer than it should. I will leave it on screen for you.");
        return;
      }
    }

    setPhase("asking");
    // Clear the caption rather than restarting the recogniser: one microphone
    // session covers the whole walk.
    dictation.clear();
    await speak(wording(current()?.question ?? step.question));
    setPhase("listening");
    void dictation.start();
  }, [step, speak, dictation, current]);

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
      const live = current();
      if (live?.apply) {
        live.apply(value);
        return;
      }

      const form = formRef?.current;
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
    [formRef, step, current],
  );

  const capture = useCallback(() => {
    const raw = dictation.text.trim();
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
    if (phase !== "listening" || !dictation.text) return;
    const id = window.setTimeout(capture, 1500);
    return () => window.clearTimeout(id);
  }, [phase, dictation.text, capture]);

  // Held in a ref because `stop` is rebuilt on every render: `useDictation`
  // returns a fresh object each time, so an effect keyed on `stop` would run
  // its cleanup constantly and switch the panel off the moment it appeared.
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });
  useEffect(() => () => stopRef.current(), []);

  if (!active) {
    return (
      <Button type="button" variant="secondary" onClick={begin}>
        <MicIcon className="size-4" />
        {label ?? "Fill this in by talking"}
      </Button>
    );
  }

  return (
    <>
      <Highlight target={target} seed={index} />

      {/* The prompt rides just under the field being filled, so the question
          and the answer are in the same place on screen. */}
      <div className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-6">
        <div className="module-panel flex w-full max-w-md flex-col gap-3 rounded-[20px] bg-cream p-5 shadow-ink-lg">
          <div className="flex items-start gap-4">
            <Orb
              size={52}
              state={
                phase === "listening"
                  ? "listening"
                  : phase === "asking" || phase === "waiting"
                    ? "speaking"
                    : "idle"
              }
              intensity={phase === "listening" && dictation.text ? 1 : 0}
              decorative
            />
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-ink-soft">
                Question {index + 1} of {steps.length}
              </p>
              <p className="mt-1.5 font-display text-20 leading-snug text-navy">
                {step ? wording(step.question) : ""}
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

          {phase === "waiting" && (
            <p className="text-14 text-ink-soft italic" aria-live="polite">
              One moment, working that out…
            </p>
          )}

          {phase === "listening" && (
            <p
              className={cn(
                "min-h-6 text-14 italic",
                dictation.text ? "text-navy" : "text-ink-soft/70",
              )}
              aria-live="polite"
            >
              {dictation.text || (dictation.supported ? "Listening…" : "Type it in instead.")}
            </p>
          )}

          {phase === "confirming" && (
            <div className="flex flex-col gap-3">
              <p className="text-14 text-navy">
                I put down <span className="font-medium">{step?.describe?.(heard) ?? heard}</span>.
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
