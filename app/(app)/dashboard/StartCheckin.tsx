"use client";

import { useState } from "react";
import { Button } from "@/components/ink/Button";
import { VoiceSheet } from "@/components/voice/VoiceSheet";

/**
 * Opens the orb straight into check-in mode rather than sending anyone to
 * another page first — the weekly tally is a two-minute conversation, so it
 * should start where the card is (BUILD.MD §5.6).
 */
export function StartCheckin({ voiceId }: { voiceId: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Start the tally</Button>
      <VoiceSheet
        open={open}
        onClose={() => setOpen(false)}
        mode="checkin"
        voiceId={voiceId}
      />
    </>
  );
}
