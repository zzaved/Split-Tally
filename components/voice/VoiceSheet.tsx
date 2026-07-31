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
  SpinnerIcon,
  SendIcon,
  StopIcon,
} from "@/components/ink/Icon";
import { Orb, type OrbState } from "@/components/ink/Orb";
import { cn } from "@/lib/utils";
import { buildClientTools, type ToolEvent } from "./clientTools";

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
 * The first thing said, chosen by what you pressed. A conversation that opens
 * by naming its subject cannot drift into a different one.
 */
const FIRST_MESSAGE: Record<VoiceMode, (name: string) => string> = {
  ledger: (name) => `Hi ${name}. What did you spend?`,
  onboarding: () => "Let's set your ledger up. What should I call you?",
  checkin: (name) =>
    `Hi ${name}, time for your weekly tally. Did you spend any cash this week that would not show up on a statement?`,
};

/**
 * Models sometimes narrate their own planning into a reply. Prompting against
 * it is the real fix and is in the agent's instructions, but a stray line of
 * reasoning should never reach the screen if it slips through.
 */
function withoutReasoning(text: string): string {
  const cut = text.search(REASONING);
  return (cut > 0 ? text.slice(0, cut) : cut === 0 ? "" : text).trim();
}

/**
 * Where a reply stops being speech and starts being thinking out loud.
 *
 * The giveaway is person: the assistant talks *to* someone, so it says "you".
 * The moment a reply refers to "the user", or quotes its own instructions, it
 * has stopped speaking and started explaining itself.
 *
 * Written this way after a test produced "I didn't understand that, Ana. What
 * would you like to do?" immediately followed by three sentences of planning.
 * The old pattern missed it on an apostrophe: it matched "The user is" but not
 * "The user's input".
 */
const REASONING =
  /(The user|My instructions|According to (the )?(onboarding )?instructions|I need to (ask|call|confirm|prompt)|I should (ask|call|confirm|prompt)|So,? I (need|will|should))/;

/**
 * The voice surface. It takes the screen behind a blur rather than sitting in
 * an outlined box, so it is unmistakably the thing you are talking to while the
 * page it is filling in stays visible behind it.
 */
export type VoiceUserContext = {
  name: string;
  currency: string;
  onboarded: boolean;
  voiceId: string | null;
};

export function VoiceSheet({
  open,
  onClose,
  mode = "ledger",
  user,
  fullscreen = false,
}: {
  open: boolean;
  onClose: () => void;
  mode?: VoiceMode;
  /** Who the agent is talking to. Without this it asks a returning user their
      name as though they had just arrived. */
  user: VoiceUserContext;
  /** Onboarding runs the orb full-screen rather than in a sheet. */
  fullscreen?: boolean;
}) {
  return (
    <ConversationProvider>
      <SheetBody open={open} onClose={onClose} mode={mode} user={user} fullscreen={fullscreen} />
    </ConversationProvider>
  );
}

function SheetBody({
  open,
  onClose,
  mode,
  user,
  fullscreen,
}: {
  open: boolean;
  onClose: () => void;
  mode: VoiceMode;
  user: VoiceUserContext;
  fullscreen: boolean;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [hearing, setHearing] = useState(false);
  /**
   * True from asking for the microphone until audio is demonstrably flowing.
   *
   * `setMicMuted` does not await the device: on WebRTC it calls LiveKit's
   * `setMicrophoneEnabled`, which acquires and publishes a track, and the SDK
   * flips `isMuted` to false straight away. The button therefore looked live
   * while nothing was being heard, so anything said in that window was lost
   * and it read as the chat breaking.
   */
  const [micArriving, setMicArriving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const quietTimer = useRef<number | null>(null);
  const arrivingTimer = useRef<number | null>(null);

  /**
   * How loudly you are speaking right now, straight from the agent's own voice
   * activity score.
   *
   * There used to be a second transcriber here, the browser's, running purely
   * to caption your words as you said them. It had to go: the agent already
   * holds the microphone over WebRTC, and Chrome ends its own recogniser at
   * every pause, so restarting it left two consumers fighting over one device
   * and the microphone indicator flickering on and off through the whole
   * conversation. The orb swelling with your voice says the same thing without
   * touching the microphone twice.
   */
  const [level, setLevel] = useState(0);

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
      const clean = source === "user" ? message : withoutReasoning(message);
      if (!clean) return;
      setLines((current) => {
        const from = source === "user" ? ("you" as const) : ("orb" as const);
        const last = current[current.length - 1];
        if (last && last.from === from && last.text === clean) return current;
        return [...current, { from, text: clean }];
      });
    },
    onVadScore: ({ vadScore }) => {
      // Any sound at all is the proof the track is live, and a room is never
      // truly silent. A score of zero is what a track that is still being
      // published reports, so it proves nothing.
      if (vadScore > 0) setMicArriving(false);
      setLevel(vadScore);
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
      setSpoken(false);
      setHearing(false);
      setLevel(0);
      setMicArriving(false);
    },
  });

  const connected = conversation.status === "connected";

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
  }, [lines]);

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

        conversation.startSession({
          ...session,
          textOnly: asText,
          overrides: {
            ...(user.voiceId ? { tts: { voiceId: user.voiceId } } : {}),
            ...(asText ? { conversation: { textOnly: true } } : {}),
            // Opening on the subject you pressed for, rather than a blank
            // "what would you like to do", is the whole point of pressing it.
            agent: { firstMessage: FIRST_MESSAGE[mode](user.name) },
          },
          dynamicVariables: {
            mode,
            user_name: user.name,
            user_currency: user.currency,
            onboarded: user.onboarded ? "yes" : "no",
          },
        });
      } catch {
        setNotice("Voice is unavailable, we can type.");
      } finally {
        setStarting(false);
      }
    },
    [conversation, mode, user],
  );

  function send(text: string) {
    const value = text.trim();
    if (!value || !connected) return;
    setDraft("");
    setLines((current) => [...current, { from: "you", text: value }]);
    conversation.sendUserMessage(value);
  }

  function toggleMic() {
    const turningOn = conversation.isMuted;
    conversation.setMuted(!turningOn);

    if (!turningOn) {
      setMicArriving(false);
      return;
    }

    setMicArriving(true);
    // A ceiling, because a silent room produces no scores and the spinner must
    // not outlive the wait. By then the track is published either way.
    if (arrivingTimer.current) window.clearTimeout(arrivingTimer.current);
    arrivingTimer.current = window.setTimeout(() => setMicArriving(false), 2500);
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
          : "module-panel sm:module-panel--side h-[88dvh] w-full rounded-t-[24px] shadow-ink-lg sm:h-full sm:max-w-md sm:rounded-none sm:rounded-l-[24px]",
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
        <Orb
          size={fullscreen ? "clamp(180px, 40vw, 240px)" : 104}
          state={orbState}
          intensity={level}
          decorative
        />

        {connected && spoken && micArriving && (
          <span className="eyebrow text-ink-soft">Turning the microphone on…</span>
        )}

        {connected && spoken && !conversation.isMuted && !micArriving && (
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
          </div>
        )}

        {starting && <p className="pb-6 text-14 text-ink-soft">Connecting…</p>}

        {/* Outside the not-yet-connected branch, because the notice that
            matters most is the one about the microphone, and refusing the
            microphone drops you into a working text conversation. It used to
            be written into a branch that had already stopped rendering, so
            the microphone button simply vanished and nobody was ever told
            why. */}
        {notice && (
          <p className="mb-4 rounded-card bg-navy/4 px-4 py-3 text-14 text-navy" role="status">
            {notice}
          </p>
        )}

        {lines.length > 0 && (
          <ul className="flex flex-col gap-3 pb-4">
            {lines.map((line, i) => (
              // Marked so a test can tell who said what without reading the
              // styling, which is the sort of thing that changes.
              <li
                key={i}
                data-from={line.from}
                className={line.from === "you" ? "flex justify-end" : ""}
              >
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
                  disabled={micArriving}
                  aria-busy={micArriving}
                  className={cn(
                    "rounded-full p-2.5 transition-colors duration-150",
                    micArriving
                      ? "bg-cobalt/45 text-cream"
                      : conversation.isMuted
                        ? "bg-navy/8 text-ink-soft hover:text-navy"
                        : "bg-cobalt text-cream hover:bg-navy",
                  )}
                >
                  {micArriving ? (
                    <SpinnerIcon title="Turning the microphone on" />
                  ) : conversation.isMuted ? (
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
        className="module-scrim absolute inset-0 bg-navy/20 backdrop-blur-md"
      />
      <div className="relative w-full sm:h-full sm:w-auto">{panel}</div>
    </div>
  );
}
