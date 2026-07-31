import type { Metadata } from "next";
import Link from "next/link";
import { DOCS_URL } from "@/components/app/DocsLink";
import { Card, SectionHeading } from "@/components/ink/Card";
import { getMyProfile } from "@/lib/data";
import { voiceById, VOICES } from "@/lib/voices";
import { ProfileForm, SignOutButton } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await getMyProfile();
  if (!profile) return null;

  const voice = voiceById(profile.voice_id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
      <SectionHeading eyebrow="Yours" title="Settings" />

      <Card className="p-6 md:p-8">
        <p className="eyebrow text-ink-soft">Profile</p>
        <div className="mt-6">
          <ProfileForm
            name={profile.name}
            username={profile.username ?? ""}
            currency={profile.currency}
          />
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <p className="eyebrow text-ink-soft">Voice</p>
        <p className="mt-4 text-14 text-ink-soft">
          {voice
            ? `The orb speaks as ${voice.name}.`
            : VOICES.some((v) => v.id)
              ? "You have not picked a voice yet."
              : "No voices are configured on this deployment, so the orb uses its default."}
        </p>
        <Link
          href="/onboarding/voice"
          className="mt-3.5 inline-flex py-2.5 text-14 text-cobalt underline underline-offset-4"
        >
          Change the voice
        </Link>
      </Card>

      {/* The header link is hidden on a phone, and this is where somebody
          looks for it there. */}
      <Card className="p-6 md:p-8">
        <p className="eyebrow text-ink-soft">How this was built</p>
        <p className="mt-4 text-14 text-ink-soft">
          Every flow, the AI behind it, the maths behind the Tally Score, and what testing found.
        </p>
        <a
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-3.5 inline-flex py-2.5 text-14 text-cobalt underline underline-offset-4"
        >
          Read the documentation
        </a>
      </Card>

      <Card className="p-6 md:p-8">
        <p className="eyebrow text-ink-soft">Account</p>
        <p className="mt-4 text-14 text-ink-soft">{profile.email ?? "No email on file."}</p>
        <div className="mt-5">
          <SignOutButton />
        </div>
      </Card>

      <Card className="border-vermilion/25 p-6 md:p-8">
        <p className="eyebrow text-vermilion">Danger zone</p>
        <p className="mt-4 text-14 text-ink-soft">
          Deleting your account is not wired up in this build. Everything you have is in your own
          Supabase project, so removing the row removes the person.
        </p>
      </Card>
    </div>
  );
}
