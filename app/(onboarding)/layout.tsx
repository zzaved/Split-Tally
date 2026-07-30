import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { Wordmark } from "@/components/ink/Wordmark";
import { getMyProfile } from "@/lib/data";

/**
 * Onboarding runs outside the app shell: no tabs, no docked orb, nothing but
 * the orb you are talking to (BUILD.MD §5.3).
 */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <BrushStroke
        variant={3}
        className="pointer-events-none absolute -top-32 -right-32 h-[460px] w-[460px] opacity-25 md:h-[600px] md:w-[600px]"
      />
      <BrushStroke
        variant={6}
        delay={0.5}
        className="pointer-events-none absolute -bottom-10 -left-24 h-[140px] w-[760px] opacity-20"
      />

      <header className="shell flex h-16 shrink-0 items-center">
        <Wordmark href={null} />
      </header>

      <main className="shell relative flex flex-1 flex-col justify-center py-10">{children}</main>
    </div>
  );
}
