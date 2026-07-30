import type { Metadata } from "next";
import { getMyProfile } from "@/lib/data";
import { TalkOnboarding } from "./TalkOnboarding";

export const metadata: Metadata = { title: "Set up by talking" };

export default async function TalkPage() {
  const profile = await getMyProfile();
  if (!profile) return null;

  return (
    <TalkOnboarding
      voiceId={profile.voice_id}
      currency={profile.currency}
      name={profile.name}
    />
  );
}
