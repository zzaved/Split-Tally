"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ink/Button";
import { FormMessage } from "@/components/ink/Field";
import { saveVoice } from "@/app/(app)/settings/actions";
import type { Voice } from "@/lib/voices";
import { cn } from "@/lib/utils";

/**
 * Four orbs, one per voice, each in its own blue-family gradient (§5.2).
 * Choosing one plays its sample line; confirming saves it to the profile.
 */
export function VoicePicker({ voices, current }: { voices: Voice[]; current: string | null }) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [picked, setPicked] = useState<string | null>(current);
  const [playing, setPlaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const configured = voices.filter((v) => v.id);

  async function choose(voice: Voice) {
    setPicked(voice.key);
    setError(null);

    if (!voice.id) return;

    setPlaying(voice.key);
    try {
      audioRef.current?.pause();
      const audio = new Audio(
        `/api/voice/sample?voice=${encodeURIComponent(voice.id)}&text=${encodeURIComponent(voice.sample)}`,
      );
      audioRef.current = audio;
      audio.onended = () => setPlaying(null);
      audio.onerror = () => setPlaying(null);
      await audio.play();
    } catch {
      setPlaying(null);
    }
  }

  function confirm() {
    const voice = voices.find((v) => v.key === picked);
    if (!voice?.id) {
      router.push("/onboarding/talk");
      return;
    }

    startTransition(async () => {
      const result = await saveVoice(voice.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/onboarding/talk");
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <ul className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
        {voices.map((voice) => {
          const active = picked === voice.key;
          return (
            <li key={voice.key} className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={() => choose(voice)}
                aria-pressed={active}
                className={cn(
                  "relative rounded-full transition-transform duration-200",
                  active ? "scale-105" : "hover:scale-105",
                )}
              >
                <span
                  className={cn(
                    "voice-orb [--voice-orb-size:104px] sm:[--voice-orb-size:124px]",
                    active && "ring-2 ring-cobalt ring-offset-4 ring-offset-cream",
                    playing === voice.key && "animate-pulse",
                  )}
                  style={
                    {
                      "--voice-pool-a": voice.poolA,
                      "--voice-pool-b": voice.poolB,
                    } as React.CSSProperties
                  }
                >
                  <span className="voice-orb-aurora" style={{ background: voice.gradient }} />
                  <span className="voice-orb-pool voice-orb-pool--1" />
                  <span className="voice-orb-pool voice-orb-pool--2" />
                  <span className="voice-orb-gloss" />
                </span>
                <span className="sr-only">
                  {voice.name} — {voice.description}
                </span>
              </button>

              <span className="text-center">
                <span className="eyebrow block text-navy">{voice.name}</span>
                <span className="mt-1.5 block text-12 text-ink-soft">{voice.description}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {configured.length === 0 && (
        <FormMessage tone="notice">
          No voice ids are configured on this deployment, so the orb will use the agent&rsquo;s
          default voice. Everything else works exactly the same.
        </FormMessage>
      )}

      {error && <FormMessage>{error}</FormMessage>}

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={confirm} disabled={pending || !picked}>
          {pending ? "Saving…" : "Use this voice"}
        </Button>
        <Button variant="ghost" size="lg" onClick={() => router.push("/onboarding/talk")}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
