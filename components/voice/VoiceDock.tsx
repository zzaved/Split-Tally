"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Orb } from "@/components/ink/Orb";
import { VoiceSheet, type VoiceMode } from "./VoiceSheet";

export type VoiceUser = {
  name: string;
  currency: string;
  onboarded: boolean;
  voiceId: string | null;
};

type VoiceContextValue = {
  /** Opens the orb already pointed at a subject. */
  open: (mode: VoiceMode) => void;
  close: () => void;
  isOpen: boolean;
};

const VoiceContext = createContext<VoiceContextValue | null>(null);

/**
 * One orb for the whole app.
 *
 * It used to be two: a docked button with its own sheet, and a second sheet
 * owned by whichever card wanted one. They could not see each other, so
 * starting a weekly tally from the dashboard left the docked orb sitting on
 * top of the conversation it had just opened. A single instance also means a
 * conversation opened from anywhere carries the same context.
 */
export function VoiceDock({
  user,
  children,
}: {
  user: VoiceUser;
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<VoiceMode | null>(null);

  const open = useCallback((next: VoiceMode) => setMode(next), []);
  const close = useCallback(() => setMode(null), []);

  const value = useMemo(
    () => ({ open, close, isOpen: mode !== null }),
    [open, close, mode],
  );

  return (
    <VoiceContext.Provider value={value}>
      {children}

      {mode === null && (
        <button
          type="button"
          onClick={() => open("ledger")}
          aria-label="Talk to Split Tally"
          className="fixed right-5 bottom-24 z-40 rounded-full transition-transform duration-200 hover:scale-105 focus-visible:scale-105 md:right-8 md:bottom-8"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <Orb size={64} state="idle" decorative />
          <span className="sr-only">Open the voice assistant</span>
        </button>
      )}

      <VoiceSheet
        open={mode !== null}
        onClose={close}
        mode={mode ?? "ledger"}
        user={user}
      />
    </VoiceContext.Provider>
  );
}

export function useVoice(): VoiceContextValue {
  const value = useContext(VoiceContext);
  if (!value) {
    throw new Error("useVoice must be used inside the VoiceDock");
  }
  return value;
}
