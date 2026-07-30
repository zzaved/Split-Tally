"use client";

import { CommitStrategy, useScribe } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDictation } from "./useDictation";

/**
 * Live transcription for the guided form filler.
 *
 * Prefers ElevenLabs Scribe, which holds one microphone stream and one socket
 * for the whole session and streams partials as you speak. That matters more
 * than accuracy here: the browser's own recogniser ends itself at every pause,
 * and restarting it cycles the microphone, which shows up as the indicator
 * flickering on and off through every question.
 *
 * Scribe is affordable in this context precisely because no agent is running.
 * In the agent conversation it would be a second bill for audio the agent
 * already transcribes, which is why the sheet does not use it.
 *
 * Falls back to the browser recogniser when the key lacks `speech_to_text`,
 * so the flow still works, just less smoothly.
 */
export function useLiveTranscript() {
  const [token, setToken] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [committed, setCommitted] = useState("");
  const wanted = useRef(false);

  const browser = useDictation();

  // Read through a ref inside Scribe's callbacks: the SDK may hold the callback
  // it was given on the first render, and by then a stale `browser` would be
  // pointing at a recogniser nobody is watching.
  const browserRef = useRef(browser);
  useEffect(() => {
    browserRef.current = browser;
  });

  const scribe = useScribe({
    autoConnect: false,
    // Realtime has its own models. `scribe_v1` is the batch one and the socket
    // rejects it, so this must not drift back to whatever the docs show for
    // file transcription.
    modelId: "scribe_v2_realtime",
    /**
     * Without this Scribe runs in manual mode and waits to be fed audio, so
     * `connect` throws and the whole thing falls back to the browser without
     * ever having tried. Handing it the microphone is what lets it own a
     * single stream for the session, which is the entire point of using it.
     */
    microphone: { echoCancellation: true, noiseSuppression: true },
    // End of utterance is decided server-side, so nothing here has to stop and
    // restart the microphone to notice a pause.
    commitStrategy: CommitStrategy.VAD,
    vadSilenceThresholdSecs: 1.2,
    onCommittedTranscript: ({ text }) => setCommitted((prev) => `${prev} ${text}`.trim()),
    onError: () => setFallback(true),
    onAuthError: () => setFallback(true),
    /**
     * The socket can also die without either callback firing: the server sends
     * a message the SDK does not recognise, logs it, and closes. That looked
     * exactly like listening forever with nothing being heard, which is worse
     * than the flicker this replaced. Any close we did not ask for hands the
     * rest of the form to the browser.
     */
    onDisconnect: () => {
      if (!wanted.current) return;
      setFallback(true);
      browserRef.current.start();
    },
  });

  const start = useCallback(async () => {
    wanted.current = true;

    if (fallback) {
      browser.start();
      return;
    }

    try {
      const response = await fetch("/api/voice/scribe-token", { cache: "no-store" });
      if (!response.ok) {
        setFallback(true);
        browser.start();
        return;
      }
      const data = (await response.json()) as { token?: string };
      if (!data.token) {
        setFallback(true);
        browser.start();
        return;
      }
      setToken(data.token);
      await scribe.connect({ token: data.token });
    } catch {
      setFallback(true);
      browser.start();
    }
  }, [fallback, browser, scribe]);

  const stop = useCallback(() => {
    wanted.current = false;
    setCommitted("");
    if (fallback) browser.stop();
    else scribe.disconnect();
  }, [fallback, browser, scribe]);

  /** Empties the caption between fields without touching the microphone. */
  const clear = useCallback(() => {
    setCommitted("");
    browser.clear();
  }, [browser]);

  useEffect(() => {
    return () => {
      if (wanted.current) stop();
    };
    // Intentionally once: this is the unmount guard, not a reaction to state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const text = fallback
    ? browser.interim
    : `${committed} ${scribe.partialTranscript ?? ""}`.trim();

  return {
    text,
    start,
    stop,
    clear,
    /** True while a real stream is open, either engine. */
    live: fallback ? browser.running : scribe.isConnected,
    /** Which engine ended up being used, for the copy to be honest about it. */
    engine: fallback ? ("browser" as const) : ("scribe" as const),
    supported: fallback ? browser.supported : true,
    token,
  };
}
