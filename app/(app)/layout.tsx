import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BottomTabs, TopNav } from "@/components/app/Nav";
import { SessionWatch } from "@/components/app/SessionWatch";
import { VoiceDock } from "@/components/voice/VoiceDock";
import { AmbientStroke } from "@/components/ink/AmbientStroke";
import { Avatar } from "@/components/ink/Card";
import { Wordmark } from "@/components/ink/Wordmark";
import { getMyProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <SessionWatch />
      <AmbientStroke />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-cobalt focus:px-4 focus:py-2 focus:text-14 focus:text-cream"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-navy/10 bg-cream/90 backdrop-blur-[2px]">
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Wordmark href="/dashboard" size="sm" />
            <TopNav />
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3 transition-colors duration-150 hover:bg-navy/5"
          >
            <span className="hidden text-14 text-ink-soft sm:inline">{profile.name}</span>
            <Avatar name={profile.name} size={32} />
            <span className="sr-only">Settings</span>
          </Link>
        </div>
      </header>

      <VoiceDock
        user={{
          name: profile.name,
          currency: profile.currency,
          onboarded: Boolean(profile.onboarded_at),
          voiceId: profile.voice_id,
        }}
      >
        <main id="main" className="shell w-full flex-1 pt-8 pb-32 md:pb-24">
          {children}
        </main>
      </VoiceDock>

      <BottomTabs />
    </div>
  );
}
