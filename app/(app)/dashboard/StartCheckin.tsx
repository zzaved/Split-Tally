"use client";

import { Button } from "@/components/ink/Button";
import { useVoice } from "@/components/voice/VoiceDock";

/**
 * Opens the one orb the app has, pointed at the weekly tally. It used to own a
 * second sheet of its own, which left the docked orb floating on top of the
 * conversation it had just started.
 */
export function StartCheckin() {
  const voice = useVoice();
  return <Button onClick={() => voice.open("checkin")}>Start the tally</Button>;
}
