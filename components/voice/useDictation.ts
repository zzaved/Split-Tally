"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Live captions of your own speech, word by word, using the browser's own
 * recogniser.
 *
 * The agent runs its own transcription and that is the one that reaches the
 * ledger, but it only hands a sentence over once you stop talking. This runs
 * alongside purely so the screen keeps up with your mouth: it is a caption,
 * never the source of truth, and it is replaced by the agent's transcript the
 * moment that arrives.
 *
 * ElevenLabs Scribe (`useScribe`) would do the same job with better accuracy,
 * at the cost of a second microphone stream and a second bill for audio the
 * agent is already transcribing. Worth switching to if the caption ever needs
 * to be authoritative; not worth it to keep a line of text moving.
 *
 * Chrome, Edge and Safari support this. Firefox does not, so `supported` is
 * false there and the caption simply never appears.
 */

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionLikeEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionLikeEvent = {
  resultIndex: number;
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean; length: number }>;
};

function recogniser(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function useDictation({ lang = "en-US" }: { lang?: string } = {}) {
  const [supported, setSupported] = useState(false);
  const [interim, setInterim] = useState("");
  const [running, setRunning] = useState(false);
  const ref = useRef<Recognition | null>(null);
  const wanted = useRef(false);

  useEffect(() => {
    setSupported(recogniser() !== null);
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    setRunning(false);
    setInterim("");
    try {
      ref.current?.stop();
    } catch {
      // Already stopped; nothing to undo.
    }
    ref.current = null;
  }, []);

  const start = useCallback(() => {
    if (ref.current) return;
    const instance = recogniser();
    if (!instance) return;

    wanted.current = true;
    instance.continuous = true;
    instance.interimResults = true;
    instance.lang = lang;

    instance.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setInterim(text.trim());
    };

    // The recogniser stops itself after a pause. Restart while the session is
    // still open, otherwise captions die after the first sentence.
    instance.onend = () => {
      if (!wanted.current) return;
      try {
        instance.start();
      } catch {
        setRunning(false);
      }
    };

    instance.onerror = () => setInterim("");

    try {
      instance.start();
      ref.current = instance;
      setRunning(true);
    } catch {
      ref.current = null;
      setRunning(false);
    }
  }, [lang]);

  useEffect(() => () => stop(), [stop]);

  /** Called when the agent's own transcript lands, so the caption gives way. */
  const clear = useCallback(() => setInterim(""), []);

  return { supported, interim, running, start, stop, clear };
}
