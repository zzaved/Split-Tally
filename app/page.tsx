import type { Metadata } from "next";
import { AmountDisplay } from "@/components/ink/AmountDisplay";
import { BrushStroke } from "@/components/ink/BrushStroke";
import { ButtonLink } from "@/components/ink/Button";
import { Avatar, Card } from "@/components/ink/Card";
import { Jellyfish } from "@/components/ink/Jellyfish";
import { Orb, OrbGlyph } from "@/components/ink/Orb";
import { Reveal } from "@/components/ink/Reveal";
import { TallyMarks } from "@/components/ink/TallyMarks";
import { Wordmark } from "@/components/ink/Wordmark";

export const metadata: Metadata = {
  title: "Split Tally — finance without forms",
};

export default function LandingPage() {
  return (
    <>
      <LandingHeader />
      <main id="main">
        <Hero />
        <LedgerBand />
        <ThreeWays />
        <OrbSection />
        <ExchangeSection />
        <WeeklyTallySection />
        <ClosingCta />
      </main>
      <LandingFooter />
    </>
  );
}

/* ------------------------------------------------------------------ */

function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy/8 bg-cream/85 backdrop-blur-[2px]">
      <div className="shell flex h-16 items-center justify-between">
        <Wordmark />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/demo" variant="primary" size="sm">
            <span className="sm:hidden">Demo</span>
            <span className="hidden sm:inline">Explore the demo</span>
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Strokes, used large and asymmetric. */}
      <BrushStroke
        variant={3}
        className="absolute -top-28 -right-28 h-[360px] w-[360px] opacity-40 md:-top-40 md:-right-40 md:h-[560px] md:w-[560px]"
      />
      <BrushStroke
        variant={6}
        delay={0.5}
        className="absolute -bottom-6 -left-24 h-[120px] w-[680px] opacity-30 md:-left-16 md:h-[160px] md:w-[900px]"
      />

      <div className="shell relative grid items-center gap-12 pt-16 pb-20 md:grid-cols-[1.1fr_0.9fr] md:gap-16 md:pt-24 md:pb-28">
        <div>
          <Reveal>
            <p className="eyebrow text-cobalt">A spoken ledger for friends</p>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-6 font-display text-56 font-semibold text-navy md:text-72">
              Finance
              <br />
              without{" "}
              <span className="relative inline-block">
                forms.
                <BrushStroke
                  variant={2}
                  delay={0.9}
                  className="absolute -bottom-4 -left-3 h-8 w-[112%] opacity-80"
                />
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-10 max-w-lg text-16 text-ink-soft">
              Say what you spent. Split Tally writes the ledger, keeps everyone square, and —
              when you need the money before your friend can pay — lets you sell what you are
              owed.
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <ButtonLink href="/demo" size="lg">
                Explore the demo
              </ButtonLink>
              <ButtonLink href="/signup" variant="secondary" size="lg">
                Create your ledger
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.32}>
            <p className="mt-10 flex items-center gap-3 text-14 text-ink-soft">
              <TallyMarks count={5} size="sm" />
              One tap into a demo account with a season of tallies in it.
            </p>
          </Reveal>
        </div>

        <div className="relative flex justify-center md:justify-end">
          <Jellyfish
            size="clamp(220px, 58vw, 320px)"
            className="relative"
            strokeWidth={5}
            title="The Tally Jelly, the Split Tally mascot"
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const SAMPLE_ROWS = [
  { who: "Paulo", what: "Lunch at Can Pep", amount: 31, ai: true },
  { who: "Marina", what: "Museum tickets", amount: 18, ai: false },
  { who: "Kenji", what: "Taxi from the airport", amount: -14, ai: true },
];

function LedgerBand() {
  return (
    <section className="section-y border-y border-navy/8 bg-cream-deep/45">
      <div className="shell grid gap-12 md:grid-cols-2 md:gap-16">
        <Reveal className="relative">
          <BrushStroke
            variant={4}
            className="absolute top-4 -left-8 h-[150px] w-[290px] opacity-30 md:w-[320px]"
          />
          <div className="relative">
            <p className="eyebrow text-ink-soft">Owed to you</p>
            <div className="mt-3">
              <AmountDisplay value={240} currency="EUR" size="hero" tone="positive" />
            </div>
            <p className="eyebrow mt-8 text-ink-soft">You owe</p>
            <div className="mt-3">
              <AmountDisplay value={35} currency="EUR" size="lg" tone="negative" />
            </div>
            <p className="mt-8 max-w-sm text-14 text-ink-soft">
              One number for what is coming to you, one for what is going out. The colour is
              never the only signal — the words say it too.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-navy/10 px-6 py-4">
              <p className="eyebrow text-ink-soft">Barcelona Trip</p>
              <TallyMarks count={10} size="sm" tone="soft" label="10 expenses" />
            </div>
            <ul>
              {SAMPLE_ROWS.map((row) => (
                <li
                  key={row.who}
                  className="flex items-center gap-4 border-b border-navy/8 px-6 py-4 last:border-0"
                >
                  <Avatar name={row.who} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-14 font-medium text-navy">
                      {row.what}
                      {row.ai && <OrbGlyph className="size-3" title="Recorded by voice" />}
                    </p>
                    <p className="text-12 text-ink-soft">
                      {row.amount > 0 ? `${row.who} owes you` : `You owe ${row.who}`}
                    </p>
                  </div>
                  <AmountDisplay value={row.amount} currency="EUR" size="sm" />
                </li>
              ))}
            </ul>
          </Card>
          <p className="mt-4 flex items-center gap-2 text-12 text-ink-soft">
            <OrbGlyph className="size-3" title="AI marker" />
            This glyph marks everything the assistant created.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const WAYS = [
  {
    eyebrow: "Speak it",
    title: "Tell it what you spent",
    copy: "“I paid 62 for lunch with Paulo, split it.” One question back, then it is in the ledger and the balances move.",
    variant: 1 as const,
    marks: 3,
  },
  {
    eyebrow: "Snap it",
    title: "Photograph your statement",
    copy: "Screenshot your banking app. Split Tally reads every line, skips the ones it already has, and files them by category.",
    variant: 5 as const,
    marks: 4,
  },
  {
    eyebrow: "Trade it",
    title: "Sell what you are owed",
    copy: "Waiting on 50 from someone who is broke this month? List the tally. Someone else buys it and you are paid today.",
    variant: 2 as const,
    marks: 5,
  },
];

function ThreeWays() {
  return (
    <section className="section-y">
      <div className="shell">
        <Reveal>
          <p className="eyebrow text-cobalt">The whole product</p>
          <h2 className="mt-5 max-w-2xl font-display text-40 font-medium text-navy md:text-56">
            Three things, and none of them is a form.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {WAYS.map((way, i) => (
            <Reveal key={way.eyebrow} delay={0.08 * i}>
              <article className="relative h-full">
                <BrushStroke
                  variant={way.variant}
                  delay={0.2 + i * 0.15}
                  className="h-14 w-32 opacity-70"
                />
                <p className="eyebrow mt-6 text-cobalt">{way.eyebrow}</p>
                <h3 className="mt-4 font-display text-28 font-medium text-navy">{way.title}</h3>
                <p className="mt-4 text-14 text-ink-soft">{way.copy}</p>
                <div className="mt-6">
                  <TallyMarks count={way.marks} size="sm" tone="soft" />
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const TRANSCRIPT = [
  { from: "you" as const, text: "I paid 62 for lunch with Paulo, split it." },
  { from: "orb" as const, text: "Lunch, 62 euros, you paid, split with Paulo. Save it?" },
  { from: "you" as const, text: "Yes." },
  { from: "orb" as const, text: "Saved. Paulo owes you 31." },
];

function OrbSection() {
  return (
    <section className="section-y border-y border-navy/8 bg-cream-deep/45">
      <div className="shell grid items-center gap-14 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
        <Reveal className="flex justify-center">
          <Orb size="clamp(200px, 52vw, 280px)" state="listening" decorative />
        </Reveal>

        <Reveal delay={0.1}>
          <p className="eyebrow text-cobalt">The orb</p>
          <h2 className="mt-5 font-display text-40 font-medium text-navy md:text-56">
            You talk. It writes the ledger.
          </h2>
          <p className="mt-6 max-w-lg text-16 text-ink-soft">
            The orb is docked on every screen. It listens, confirms once, and writes — friends,
            groups, expenses, settlements, budgets. If the room is loud or the microphone is
            blocked, type into the same conversation and nothing else changes.
          </p>

          <ul className="mt-10 space-y-3">
            {TRANSCRIPT.map((line, i) => (
              <li
                key={i}
                className={line.from === "you" ? "flex justify-end" : "flex items-start gap-3"}
              >
                {line.from === "orb" && (
                  <span className="mt-1.5">
                    <OrbGlyph className="size-3.5" title="Assistant" />
                  </span>
                )}
                <p
                  className={
                    line.from === "you"
                      ? "max-w-sm rounded-card border border-navy/12 bg-cream px-4 py-2.5 text-14 text-navy"
                      : "max-w-md text-14 text-ink-soft"
                  }
                >
                  {line.text}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ExchangeSection() {
  return (
    <section className="section-y">
      <div className="shell grid gap-14 md:grid-cols-2 md:gap-16">
        <Reveal>
          <p className="eyebrow text-cobalt">Since the 1100s</p>
          <h2 className="mt-5 font-display text-40 font-medium text-navy md:text-56">
            A tally was a stick of wood, split in two.
          </h2>
          <div className="mt-8 space-y-5 text-16 text-ink-soft">
            <p>
              England kept its debts in notched hazel. The creditor kept the thicker half — the
              stock — and the debtor kept the foil. Only the matching halves fit together, so
              neither side could quietly re-cut the story.
            </p>
            <p>
              Creditors who needed money early sold their halves at a discount. That was the
              first market in what people were owed.
            </p>
            <p className="font-display text-28 leading-tight text-navy">
              Split Tally is that stick, including the market.
            </p>
          </div>
          <BrushStroke variant={1} delay={0.3} className="mt-10 h-10 w-72 opacity-60" />
        </Reveal>

        <Reveal delay={0.1} className="flex items-center">
          <Card className="w-full p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name="Paulo Ramos" size={40} />
                <div>
                  <p className="text-14 font-medium text-navy">Paulo owes this tally</p>
                  <div className="mt-1 flex items-center gap-2">
                    <TallyMarks
                      count={2}
                      max={5}
                      size="sm"
                      tone="soft"
                      label="Tally Score 48 out of 100"
                    />
                    <span className="text-12 text-ink-soft">Tally Score 48</span>
                  </div>
                </div>
              </div>
              <span className="eyebrow flex items-center gap-1.5 rounded-full border border-cobalt/30 px-2.5 py-1 text-cobalt">
                <OrbGlyph className="size-2.5" title="AI price" />
                AI fair price
              </span>
            </div>

            <div className="mt-6 flex items-end justify-between border-t border-navy/10 pt-6">
              <div>
                <p className="eyebrow text-ink-soft">Face value</p>
                <p className="tabular mt-1 font-display text-28 text-ink-soft line-through decoration-vermilion/50">
                  €50
                </p>
              </div>
              <div className="text-right">
                <p className="eyebrow text-ink-soft">Asking</p>
                <div className="mt-1">
                  <AmountDisplay value={46} currency="EUR" size="md" tone="positive" />
                </div>
              </div>
            </div>

            <p className="mt-5 text-14 text-ink-soft">
              “Paulo settles in about 21 days on average — an 8% discount is fair.”
            </p>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-12 text-ink-soft">Open for 3 days</span>
              <ButtonLink href="/exchange" variant="secondary" size="sm">
                See the Exchange
              </ButtonLink>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function WeeklyTallySection() {
  return (
    <section className="section-y border-y border-navy/8 bg-cream-deep/45">
      <div className="shell max-w-3xl text-center">
        <Reveal>
          <p className="eyebrow text-cobalt">The weekly tally</p>
          <h2 className="mt-5 font-display text-40 font-medium text-navy md:text-56">
            Two minutes, once a week.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-16 text-ink-soft">
            The orb asks three questions: the cash you spent that never reaches a statement, what
            is coming up, and who you should settle with. Your answers become entries — not a
            form you had to remember to fill.
          </p>
          <div className="mt-10 flex justify-center">
            <TallyMarks count={3} max={3} size="lg" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function ClosingCta() {
  return (
    <section className="section-y relative overflow-hidden">
      <BrushStroke variant={6} className="absolute top-6 -left-20 h-[130px] w-[760px] opacity-25" />
      <div className="shell relative flex flex-col items-center text-center">
        <Reveal>
          <Jellyfish size={120} className="opacity-80" strokeWidth={6} />
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-8 font-display text-40 font-medium text-navy md:text-56">
            Your ledger is one sentence away.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/demo" size="lg">
              Explore the demo
            </ButtonLink>
            <ButtonLink href="/signup" variant="secondary" size="lg">
              Create your ledger
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function LandingFooter() {
  return (
    <footer className="border-t border-navy/10 bg-cream-deep/40 py-12">
      <div className="shell flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <Wordmark size="sm" />
        <p className="text-12 text-ink-soft">
          Built for the AI Designathon at MERGE 2026. Marketplace settlement is simulated.
        </p>
      </div>
    </footer>
  );
}
