"use client";

import { useEffect, useState } from "react";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { OrbGlyph } from "@/components/ink/Orb";
import { TallyLoader } from "@/components/ink/TallyMarks";

/**
 * Three observations about the month, rendered as an editorial pull-quote and
 * labelled so nobody mistakes them for something a person wrote (BUILD.MD §5.6).
 * Fetched after paint so the page never waits on a model.
 */
export function Insights({
  month,
  currency,
  income,
  spend,
  byCategory,
  budgets,
}: {
  month: string;
  currency: string;
  income: number;
  spend: number;
  byCategory: Record<string, number>;
  budgets: Record<string, number>;
}) {
  const [state, setState] = useState<"loading" | "ready" | "off">("loading");
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/insights", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            month,
            currency,
            income,
            spend,
            by_category: byCategory,
            budgets,
          }),
        });

        const data = (await response.json()) as { insights?: string[] };
        if (cancelled) return;

        if (data.insights?.length) {
          setInsights(data.insights);
          setState("ready");
        } else {
          setState("off");
        }
      } catch {
        if (!cancelled) setState("off");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month, currency, income, spend, byCategory, budgets]);

  if (state === "off") return null;

  return (
    <section className="relative overflow-hidden rounded-card border border-navy/10 bg-cream-deep/50 p-8 md:p-10">
      <BrushStroke
        variant={2}
        className="pointer-events-none absolute -top-2 -right-6 h-16 w-48 opacity-30"
      />

      <p className="eyebrow relative flex items-center gap-2 text-cobalt">
        <OrbGlyph className="size-3" title="Written by AI" />
        Read by AI
      </p>

      {state === "loading" ? (
        <div className="mt-8">
          <TallyLoader lines={["Reading your month…", "Counting the strokes…"]} />
        </div>
      ) : (
        <ul className="relative mt-6 flex flex-col gap-5">
          {insights.map((insight, i) => (
            <li key={i} className="font-display text-28 leading-snug text-navy">
              {insight}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
