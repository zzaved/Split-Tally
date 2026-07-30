import type { Metadata } from "next";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { ButtonLink } from "@/components/ink/Button";
import { Jellyfish } from "@/components/ink/Jellyfish";
import { Wordmark } from "@/components/ink/Wordmark";

export const metadata: Metadata = {
  title: "Nothing tallied here",
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <BrushStroke
        variant={3}
        className="absolute -top-24 -right-20 h-[420px] w-[420px] opacity-30"
      />

      <header className="shell flex h-16 shrink-0 items-center">
        <Wordmark />
      </header>

      <main className="shell relative flex flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
        <Jellyfish size={150} strokeWidth={6} />
        <p className="eyebrow text-cobalt">404</p>
        <h1 className="font-display text-40 font-medium text-navy md:text-56">
          Nothing tallied here.
        </h1>
        <p className="max-w-md text-16 text-ink-soft">
          This page does not exist. The jelly has checked both halves of the stick.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/dashboard">Go to your dashboard</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Back to the landing page
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
