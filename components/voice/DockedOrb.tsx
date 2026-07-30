"use client";

import { useState } from "react";
import { Orb } from "@/components/ink/Orb";
import { VoiceSheet } from "./VoiceSheet";

/**
 * The docked orb (BUILD.MD §2): bottom-right on every authenticated page, and
 * lifted above the tab bar on mobile so it never covers a destination.
 */
export function DockedOrb({ voiceId }: { voiceId?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Talk to Split Tally"
          className="fixed right-5 bottom-24 z-40 rounded-full transition-transform duration-200 hover:scale-105 focus-visible:scale-105 md:right-8 md:bottom-8"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <Orb size={64} state="idle" decorative />
          <span className="sr-only">Open the voice assistant</span>
        </button>
      )}

      <VoiceSheet open={open} onClose={() => setOpen(false)} voiceId={voiceId} />
    </>
  );
}
