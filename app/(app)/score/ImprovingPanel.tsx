"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ink/Button";
import { Card } from "@/components/ink/Card";
import { FormMessage } from "@/components/ink/Field";
import { formatDate } from "@/lib/format";
import { HIGH_MARK, LOW_MARK, type ImprovingState } from "@/lib/score";
import { declareImproving, type ActionResult } from "./actions";

/**
 * The "I'm improving" standing.
 *
 * It is deliberately hard to get: the record has to already show a high mark,
 * which means the claim can only be made by somebody who was once reliable. A
 * new account cannot make it, and neither can somebody who has never paid on
 * time. That is what stops it becoming a badge anyone can wear to wave away a
 * bad number.
 */
export function ImprovingPanel({ state, score }: { state: ImprovingState; score: number }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  if (state.status === "active") {
    return (
      <Card className="border-0 bg-cobalt/6 p-6 md:p-8">
        <p className="eyebrow text-cobalt">Improving</p>
        <p className="mt-4 font-display text-28 leading-snug text-navy">
          You are on record as working this back up.
        </p>
        <p className="mt-3 text-14 text-ink-soft">
          Anyone looking at your tallies sees that you reached {state.peak} at your best
          {state.peakOn ? `, in ${formatDate(state.peakOn)}` : ""}, that it has fallen, and that you
          have owned it. Standing since {formatDate(state.since)}.
        </p>
        <p className="mt-5 text-12 text-ink-soft">
          It retires by itself once you are back above {LOW_MARK + 20}. You will not get another
          until your record reaches {HIGH_MARK} again, so this one has to count.
        </p>
      </Card>
    );
  }

  if (state.status === "available") {
    return (
      <Card className="border-0 bg-cream-deep/60 p-6 md:p-8">
        <p className="eyebrow text-cobalt">Available to you</p>
        <p className="mt-4 font-display text-28 leading-snug text-navy">
          You were reliable once. You can say you are getting back there.
        </p>
        <p className="mt-3 text-14 text-ink-soft">
          Your record reached {state.peak}
          {state.peakOn ? ` in ${formatDate(state.peakOn)}` : ""} and is now {score}. Declaring puts
          that fact next to your name for anyone deciding whether to lend to you or to buy one of
          your tallies.
        </p>
        <p className="mt-3 text-14 text-ink-soft">
          It does not raise your score and it does not soften what the numbers say. It adds the one
          piece of context they are missing: that you have done better before.
        </p>

        {result?.error && (
          <div className="mt-5">
            <FormMessage>{result.error}</FormMessage>
          </div>
        )}
        {result?.ok && (
          <div className="mt-5">
            <FormMessage tone="notice">{result.ok}</FormMessage>
          </div>
        )}

        {!result?.ok && (
          <div className="mt-6">
            <Button
              disabled={pending}
              onClick={() => start(async () => setResult(await declareImproving()))}
            >
              {pending ? "Setting…" : "I am working on it"}
            </Button>
            <p className="mt-3 text-12 text-ink-soft">
              You get one. It comes back only if your record climbs to {HIGH_MARK} again and then
              falls, so spending it now means going without if it happens twice.
            </p>
          </div>
        )}
      </Card>
    );
  }

  if (state.reason === "spent") {
    return (
      <Card className="border-0 bg-cream-deep/60 p-6 md:p-8">
        <p className="eyebrow text-ink-soft">Already used</p>
        <p className="mt-4 text-14 text-ink-soft">
          You declared this on {formatDate(state.usedAt)}. It returns when your record reaches{" "}
          {HIGH_MARK} again, which means actually settling on time for a stretch. A second chance
          you have to earn twice is the only kind worth anything to the person reading it.
        </p>
      </Card>
    );
  }

  if (state.reason === "never-high") {
    return (
      <Card className="border-0 bg-cream-deep/60 p-6 md:p-8">
        <p className="eyebrow text-ink-soft">Not available yet</p>
        <p className="mt-4 text-14 text-ink-soft">
          Saying you are improving only means something if you were once reliable, so it unlocks
          once your record has reached {HIGH_MARK}. New accounts do not have it, and neither does
          anyone who has never settled on time.
        </p>
      </Card>
    );
  }

  return null;
}
