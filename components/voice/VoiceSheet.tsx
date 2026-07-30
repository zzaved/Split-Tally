"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ink/Button";
import { ConfirmChips } from "@/components/ink/ConfirmChips";
import { Orb, type OrbState } from "@/components/ink/Orb";
import { cn } from "@/lib/utils";
import { buildClientTools, type ToolEvent } from "./clientTools";

export type VoiceMode = "ledger" | "onboarding" | "checkin";

type Line = { from: "you" | "orb"; text: string };

const OPENERS: Record<VoiceMode, string> = {
  ledger: "Tell me what you spent, or ask what you are owed.",
  onboarding: "Let's set your ledger up. I'll ask five short things.",
  checkin: "Your weekly tally: three questions, about two minutes.",
};

/**
 * The voice surface: a bottom sheet on mobile, a right-hand panel on desktop.
 * It always carries a text input, because the conversation has to survive a
 * loud room, a blocked microphone, or no ElevenLabs agent at all (BUILD.MD §4).
 */
export function VoiceSheet({
  open,
  onClose,
  mode = "ledger",
  voiceId,
  fullscreen = false,
}: {
  open: boolean;
  onClose: () => void;
  mode?: VoiceMode;
  voiceId?: string | null;
  /** Onboarding runs the orb full-screen rather than in a sheet. */
  fullscreen?: boolean;
}) {
  return (
    <ConversationProvider>
      <SheetBody
        open={open}
        onClose={onClose}
        mode={mode}
        voiceId={voiceId}
        fullscreen={fullscreen}
      />
    </ConversationProvider>
  );
}

function SheetBody({
  open,
  onClose,
  mode,
  voiceId,
  fullscreen,
}: {
  open: boolean;
  onClose: () => void;
  mode: VoiceMode;
  voiceId?: string | null;
  fullscreen: boolean;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [textOnly, setTextOnly] = useState(false);
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * What is on its way to the assistant right now, shown in italic under the
   * orb so you can see your own words land before they are acted on. The SDK
   * exposes voice-activity scores continuously but only hands over a
   * transcript once an utterance closes, so this shows "listening" while you
   * speak and then the recognised sentence for a beat after.
   */
  const [live, setLive] = useState<{ text: string; settled: boolean } | null>(null);
  const liveTimer = useRef<number | null>(null);

  const onToolResult = useCallback(
    (event: ToolEvent) => {
      // The ledger changed underneath the page, so pull the fresh numbers.
      router.refresh();
      if (event.tool === "complete_onboarding") {
        window.setTimeout(() => router.push("/dashboard"), 1200);
      }
    },
    [router],
  );

  const conversation = useConversation({
    clientTools: buildClientTools(onToolResult),
    onMessage: ({ message, source }) => {
      setLines((current) => {
        const from = source === "user" ? ("you" as const) : ("orb" as const);
        const last = current[current.length - 1];
        // A typed message is added locally on send; if the SDK ever starts
        // echoing it too, do not show it twice.
        if (last && last.from === from && last.text === message) return current;
        return [...current, { from, text: message }];
      });

      if (source === "user") {
        // Hold the recognised sentence briefly so you can check it went in
        // the way you said it.
        setLive({ text: message, settled: true });
        if (liveTimer.current) window.clearTimeout(liveTimer.current);
        liveTimer.current = window.setTimeout(() => setLive(null), 2600);
      } else {
        setLive(null);
      }
    },
    onVadScore: ({ vadScore }) => {
      if (vadScore > 0.6) {
        setLive((current) => (current?.settled ? current : { text: "listening…", settled: false }));
      }
    },
    onError: (message) => {
      setNotice(
        message?.includes("permission") || message?.includes("NotAllowed")
          ? "I could not reach your microphone, we can type instead."
          : "Voice is unavailable, we can type.",
      );
      setTextOnly(true);
    },
    onDisconnect: () => {
      setNotice(null);
    },
  });

  const status = conversation.status;
  const connected = status === "connected";

  const orbState: OrbState = !connected
    ? "idle"
    : conversation.isSpeaking
      ? "speaking"
      : conversation.mode === "listening"
        ? "listening"
        : "thinking";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  // Close on Escape, the way every sheet should.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const start = useCallback(
    async (asText: boolean) => {
      setStarting(true);
      setNotice(null);

      try {
        const response = await fetch(
          asText ? "/api/voice/token?transport=text" : "/api/voice/token",
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          mode?: string;
          transport?: "webrtc" | "websocket";
          agentId?: string;
          conversationToken?: string;
          signedUrl?: string;
          error?: string;
        };

        if (!response.ok || data.error === "not_configured") {
          setNotice(
            "The assistant is not connected on this deployment. Everything it does is on the page too: record an expense, settle up, or list a tally by hand.",
          );
          setTextOnly(true);
          setStarting(false);
          return;
        }

        if (!asText) {
          // Ask before the SDK does, so the refusal is ours to explain.
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            setNotice("I could not reach your microphone, we can type instead.");
            setTextOnly(true);
            asText = true;
          }
        }

        // Typed conversations run over a WebSocket and never touch the audio
        // pipeline; spoken ones run over WebRTC.
        const session = data.signedUrl
          ? ({ signedUrl: data.signedUrl, connectionType: "websocket" } as const)
          : data.conversationToken
            ? ({ conversationToken: data.conversationToken, connectionType: "webrtc" } as const)
            : ({ agentId: data.agentId!, connectionType: "webrtc" } as const);

        conversation.startSession({
          ...session,
          textOnly: asText,
          overrides: {
            ...(voiceId ? { tts: { voiceId } } : {}),
            ...(asText ? { conversation: { textOnly: true } } : {}),
          },
          dynamicVariables: { mode },
        });
      } catch {
        setNotice("Voice is unavailable, we can type.");
        setTextOnly(true);
      } finally {
        setStarting(false);
      }
    },
    [conversation, mode, voiceId],
  );

  function send(text: string) {
    const value = text.trim();
    if (!value) return;
    setDraft("");

    if (connected) {
      // The SDK does not echo typed messages back through onMessage, so the
      // line is added here — otherwise you press send and nothing appears.
      setLines((current) => [...current, { from: "you", text: value }]);
      conversation.sendUserMessage(value);
    } else {
      setLines((current) => [
        ...current,
        { from: "you", text: value },
        {
          from: "orb",
          text: "I am not connected yet. Press “Start talking” and I will pick this up.",
        },
      ]);
    }
  }

  if (!open) return null;

  const panel = (
    <div
      className={cn(
        "flex flex-col bg-cream",
        fullscreen
          ? "h-full w-full"
          : "h-[85dvh] w-full rounded-t-[20px] border-t border-navy/12 shadow-ink-lg sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-[20px] sm:border-t-0 sm:border-l",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Talk to Split Tally"
    >
      <header className="flex items-center justify-between border-b border-navy/10 px-6 py-4">
        <p className="eyebrow text-ink-soft">
          {mode === "onboarding" ? "Setting up" : mode === "checkin" ? "Weekly tally" : "The orb"}
        </p>
        {!fullscreen && (
          <button
            type="button"
            onClick={onClose}
            className="eyebrow rounded-full px-3 py-1.5 text-ink-soft hover:bg-navy/5 hover:text-navy"
          >
            Close
          </button>
        )}
      </header>

      <div className="flex flex-col items-center gap-4 px-6 py-8">
        <Orb size={fullscreen ? "clamp(180px, 44vw, 260px)" : 96} state={orbState} />
        <p className="text-center text-14 text-ink-soft" aria-live="polite">
          {connected
            ? conversation.isSpeaking
              ? "Speaking"
              : "Listening"
            : starting
              ? "Connecting…"
              : OPENERS[mode]}
        </p>

        {/* Your words, on their way to the assistant. */}
        <p
          className={cn(
            "min-h-6 max-w-sm text-center text-14 italic transition-opacity duration-300",
            live ? "opacity-55" : "opacity-0",
          )}
          aria-live="polite"
        >
          {live?.text ?? ""}
        </p>
      </div>

      {notice && (
        <p className="mx-6 mb-4 rounded-well border border-cobalt/25 bg-cobalt/5 px-3.5 py-3 text-14 text-navy">
          {notice}
        </p>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
        {lines.length === 0 ? (
          <div className="flex flex-col gap-4">
            {/* The reason this product is spoken, stated with the real numbers.
                Speech runs around 150 words a minute; composing text, not
                copying it, runs about 19 on a keyboard and 36 on a phone
                (Karat et al. 1999; mobile figure 2019). Four times, not the
                fifteen the internet likes to claim. */}
            <p className="text-14 text-ink-soft">
              You speak at about <span className="text-navy">150 words a minute</span> and type at
              about <span className="text-navy">36</span>. That is why this is a conversation and
              not a form.
            </p>
            <p className="text-14 text-ink-soft">
              Everything the assistant says is written here too, so you never have to rely on the
              audio.
            </p>
            <p className="text-14 text-ink-soft">
              Something already in the ledger wrong? Just say so, tell me what it should have been
              and I will rebuild it with you, rather than sending you to hunt for the row.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 pb-4">
            {lines.map((line, i) => (
              <li key={i} className={line.from === "you" ? "flex justify-end" : ""}>
                <p
                  className={cn(
                    "max-w-[85%] text-14",
                    line.from === "you"
                      ? "rounded-card border border-navy/12 bg-cream-deep px-3.5 py-2 text-navy"
                      : "text-ink-soft",
                  )}
                >
                  {line.text}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-navy/10 px-6 py-5">
        {connected && (
          <ConfirmChips onPick={(text) => send(text)} className="mb-4" />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            placeholder="…or type instead"
            aria-label="Type to the assistant"
            className="flex-1 rounded-full border border-navy/15 bg-cream px-4 py-2.5 text-14 text-navy placeholder:text-ink-soft/70 focus:border-cobalt focus:ring-2 focus:ring-cobalt/25 focus:outline-none"
          />
          <Button type="submit" size="sm" disabled={!draft.trim()}>
            Send
          </Button>
        </form>

        <div className="mt-4 flex items-center gap-2">
          {connected ? (
            <>
              <Button variant="secondary" size="sm" onClick={() => conversation.endSession()}>
                End
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => conversation.setMuted(!conversation.isMuted)}
              >
                {conversation.isMuted ? "Unmute" : "Mute"}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => start(false)} disabled={starting}>
                {starting ? "Connecting…" : "Start talking"}
              </Button>
              {!textOnly && (
                <Button variant="ghost" size="sm" onClick={() => start(true)} disabled={starting}>
                  Type instead
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (fullscreen) return panel;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-navy/20 backdrop-blur-[1px]"
      />
      <div className="relative w-full sm:h-full sm:w-auto">{panel}</div>
    </div>
  );
}
