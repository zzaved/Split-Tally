"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ink/Button";
import { ConfirmChips } from "@/components/ink/ConfirmChips";
import {
  CloseIcon,
  KeyboardIcon,
  MicIcon,
  MicOffIcon,
  SendIcon,
  StopIcon,
} from "@/components/ink/Icon";
import { Orb, type OrbState } from "@/components/ink/Orb";
import { cn } from "@/lib/utils";
import { buildClientTools, type ToolEvent } from "./clientTools";
import { useDictation } from "./useDictation";

export type VoiceMode = "ledger" | "onboarding" | "checkin";

type Line = { from: "you" | "orb"; text: string };

/**
 * What the orb is about to do, said before it starts rather than discovered
 * afterwards. Opening a conversation with no stated purpose is what makes
 * people hesitate at the first turn.
 */
const OPENERS: Record<VoiceMode, { title: string; detail: string }> = {
  ledger: {
    title: "Tell me what you spent.",
    detail:
      "Say it the way you would to a friend. I will work out the amount, who paid and how to split it, and I confirm once before anything is written.",
  },
  onboarding: {
    title: "Let's set your ledger up.",
    detail:
      "I will ask five short things, one at a time: what to call you, what you do, your currency, who you share costs with, and what you are trying to sort out.",
  },
  checkin: {
    title: "Your weekly tally.",
    detail:
      "Three questions, about two minutes: the cash you spent, what is coming up, and who you should settle with.",
  },
};

/**
 * The voice surface. It takes the screen behind a blur rather than sitting in
 * an outlined box, so it is unmistakably the thing you are talking to while the
 * page it is filling in stays visible behind it.
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
  const [starting, setStarting] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [hearing, setHearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const quietTimer = useRef<number | null>(null);

  // Live captions come from the browser's own recogniser so the screen keeps up
  // with your mouth. The agent transcribes separately and that is the version
  // that reaches the ledger; this is a caption and gives way the moment the
  // real transcript arrives.
  const dictation = useDictation();

  const onToolResult = useCallback(
    (event: ToolEvent) => {
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
      dictation.clear();
      setLines((current) => {
        const from = source === "user" ? ("you" as const) : ("orb" as const);
        const last = current[current.length - 1];
        if (last && last.from === from && last.text === message) return current;
        return [...current, { from, text: message }];
      });
    },
    onVadScore: ({ vadScore }) => {
      if (vadScore > 0.55) {
        setHearing(true);
        if (quietTimer.current) window.clearTimeout(quietTimer.current);
        quietTimer.current = window.setTimeout(() => setHearing(false), 600);
      }
    },
    onError: (message) => {
      setNotice(
        message?.includes("permission") || message?.includes("NotAllowed")
          ? "I could not reach your microphone, we can type instead."
          : "Voice is unavailable, we can type.",
      );
    },
    onDisconnect: () => {
      dictation.stop();
      setSpoken(false);
      setHearing(false);
    },
  });

  const connected = conversation.status === "connected";
  const live = spoken && !conversation.isMuted ? dictation.interim : "";

  // The aura only stirs while it is genuinely picking you up, so the movement
  // carries information instead of running the whole time.
  const orbState: OrbState = !connected
    ? "idle"
    : conversation.isSpeaking
      ? "speaking"
      : hearing
        ? "listening"
        : "idle";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, live]);

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
          agentId?: string;
          conversationToken?: string;
          signedUrl?: string;
          error?: string;
        };

        if (!response.ok || data.error === "not_configured") {
          setNotice(
            "The assistant is not connected on this deployment. Everything it does is on the page too: record an expense, settle up, or list a tally by hand.",
          );
          setStarting(false);
          return;
        }

        if (!asText) {
          // Ask before the SDK does, so the refusal is ours to explain.
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            setNotice("I could not reach your microphone, we can type instead.");
            asText = true;
          }
        }

        // Typing runs over a WebSocket and never touches the audio pipeline;
        // speaking runs over WebRTC.
        const session = data.signedUrl
          ? ({ signedUrl: data.signedUrl, connectionType: "websocket" } as const)
          : data.conversationToken
            ? ({ conversationToken: data.conversationToken, connectionType: "webrtc" } as const)
            : ({ agentId: data.agentId!, connectionType: "webrtc" } as const);

        setSpoken(!asText);
        if (!asText) dictation.start();

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
      } finally {
        setStarting(false);
      }
    },
    [conversation, dictation, mode, voiceId],
  );

  function send(text: string) {
    const value = text.trim();
    if (!value || !connected) return;
    setDraft("");
    setLines((current) => [...current, { from: "you", text: value }]);
    conversation.sendUserMessage(value);
  }

  function toggleMic() {
    const nextMuted = !conversation.isMuted;
    conversation.setMuted(nextMuted);
    if (nextMuted) dictation.stop();
    else dictation.start();
  }

  if (!open) return null;

  const opener = OPENERS[mode];
  const lastFromOrb = lines.length > 0 && lines[lines.length - 1].from === "orb";

  const panel = (
    <div
      className={cn(
        "flex flex-col bg-cream",
        fullscreen
          ? "h-full w-full"
          : "h-[88dvh] w-full rounded-t-[24px] shadow-ink-lg sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-[24px]",
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Talk to Split Tally"
    >
      <header className="flex items-center justify-between px-6 py-4">
        <p className="eyebrow text-ink-soft">
          {mode === "onboarding" ? "Setting up" : mode === "checkin" ? "Weekly tally" : "The orb"}
        </p>
        {!fullscreen && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-soft transition-colors duration-150 hover:bg-navy/5 hover:text-navy"
          >
            <CloseIcon title="Close" />
          </button>
        )}
      </header>

      <div className="flex flex-col items-center gap-4 px-6 pb-6">
        <Orb size={fullscreen ? "clamp(180px, 40vw, 240px)" : 104} state={orbState} decorative />

        {connected && spoken && !conversation.isMuted && (
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full transition-colors duration-150",
                hearing ? "bg-vermilion motion-safe:animate-pulse" : "bg-navy/20",
              )}
            />
            <span className="eyebrow text-ink-soft">
              {conversation.isSpeaking ? "Speaking" : hearing ? "Hearing you" : "Listening"}
            </span>
          </span>
        )}

        {connected && conversation.isMuted && (
          <span className="eyebrow text-ink-soft">Microphone off. Type below.</span>
        )}
      </div>

      {/* ---- The conversation --------------------------------------- */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6">
        {!connected && !starting && (
          <div className="flex flex-col gap-3 pb-6">
            <p className="font-display text-28 leading-snug text-navy">{opener.title}</p>
            <p className="text-14 text-ink-soft">{opener.detail}</p>
            {notice && <p className="mt-2 text-14 text-navy">{notice}</p>}
          </div>
        )}

        {starting && <p className="pb-6 text-14 text-ink-soft">Connecting…</p>}

        {lines.length > 0 && (
          <ul className="flex flex-col gap-3 pb-4">
            {lines.map((line, i) => (
              <li key={i} className={line.from === "you" ? "flex justify-end" : ""}>
                <p
                  className={cn(
                    "max-w-[85%] text-14",
                    line.from === "you"
                      ? "rounded-card bg-cream-deep px-3.5 py-2 text-navy"
                      : "text-ink-soft",
                  )}
                >
                  {line.text}
                </p>
              </li>
            ))}
          </ul>
        )}

        {/* Your words, as you are saying them. */}
        {live && (
          <p className="pb-4 text-right text-14 italic text-ink-soft/70" aria-live="polite">
            {live}
          </p>
        )}
      </div>

      {/* ---- Controls ----------------------------------------------- */}
      <div className="px-6 pt-3 pb-5">
        {connected ? (
          <>
            {lastFromOrb && <ConfirmChips onPick={send} className="mb-3" />}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
              className="flex items-center gap-2"
            >
              {spoken && (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={cn(
                    "rounded-full p-2.5 transition-colors duration-150",
                    conversation.isMuted
                      ? "bg-navy/8 text-ink-soft hover:text-navy"
                      : "bg-cobalt text-cream hover:bg-navy",
                  )}
                >
                  {conversation.isMuted ? (
                    <MicOffIcon title="Turn the microphone on" />
                  ) : (
                    <MicIcon title="Turn the microphone off" />
                  )}
                </button>
              )}

              <input
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                placeholder="…or type instead"
                aria-label="Type to the assistant"
                className="min-w-0 flex-1 rounded-full bg-navy/5 px-4 py-2.5 text-14 text-navy placeholder:text-ink-soft/70 focus:bg-cream focus:ring-2 focus:ring-cobalt/30 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-full p-2.5 text-cobalt transition-colors duration-150 hover:bg-cobalt/10 disabled:opacity-35"
              >
                <SendIcon title="Send" />
              </button>

              <button
                type="button"
                onClick={() => conversation.endSession()}
                className="rounded-full p-2.5 text-ink-soft transition-colors duration-150 hover:bg-vermilion/10 hover:text-vermilion"
              >
                <StopIcon title="End the conversation" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="lg" onClick={() => start(false)} disabled={starting}>
              <MicIcon className="size-4" />
              {starting ? "Connecting…" : "Talk"}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => start(true)} disabled={starting}>
              <KeyboardIcon className="size-4" />
              Type
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (fullscreen) return panel;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end">
      {/* The page stays legible behind the blur, so it is obvious which screen
          the orb is filling in rather than feeling like a jump elsewhere. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-navy/20 backdrop-blur-md"
      />
      <div className="relative w-full sm:h-full sm:w-auto">{panel}</div>
    </div>
  );
}
