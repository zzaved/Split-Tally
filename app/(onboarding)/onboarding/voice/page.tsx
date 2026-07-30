import type { Metadata } from "next";
import { getMyProfile } from "@/lib/data";
import { VOICES, voiceById } from "@/lib/voices";
import { VoicePicker } from "./VoicePicker";

export const metadata: Metadata = { title: "Choose a voice" };

export default async function VoicePage() {
  const profile = await getMyProfile();
  if (!profile) return null;

  const current = voiceById(profile.voice_id)?.key ?? null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <div>
        <p className="eyebrow text-cobalt">One thing first</p>
        <h1 className="mt-4 font-display text-40 font-medium text-navy md:text-56">
          Who should keep your tallies?
        </h1>
        <p className="mt-5 max-w-lg text-16 text-ink-soft">
          Tap an orb to hear it. You can change your mind any time in settings.
        </p>
      </div>

      <VoicePicker voices={VOICES} current={current} />
    </div>
  );
}
