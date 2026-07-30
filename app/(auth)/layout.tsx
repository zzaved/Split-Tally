import type { ReactNode } from "react";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { Wordmark } from "@/components/ink/Wordmark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden">
      <BrushStroke
        variant={3}
        className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] opacity-30 md:h-[560px] md:w-[560px]"
      />
      <BrushStroke
        variant={6}
        delay={0.4}
        className="pointer-events-none absolute -bottom-8 -left-24 h-[130px] w-[720px] opacity-25"
      />

      <header className="shell flex h-16 shrink-0 items-center">
        <Wordmark />
      </header>

      <main className="shell relative flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
