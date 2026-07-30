# Progress

Stage numbering follows `BUILD.MD` §11. Every route in §2 exists and the production build is
clean; what remains is listed honestly at the bottom rather than hidden.

## Stage 1 — Ink system and landing ✅

Tokens, the 11–72 type scale, the 4–96 spacing rhythm, and the full component inventory:
`BrushStroke`, `TallyMarks` (+ `TallyLoader`), `Orb` (+ `OrbGlyph`), `Jellyfish` (+ `JellyGlyph`),
`AmountDisplay`, `Card`, `Avatar`, `Field`, `Button`, `EmptyState`, `Reveal`, `Wordmark`,
`ConfirmChips`, `AmbientStroke`. Landing, 404 and the tally-glyph favicon.

## Stage 2 — Schema, seed, auth, shell ✅

Fifteen tables, indexes on every foreign key, RLS on all of them, four `SECURITY DEFINER` helpers
with `EXECUTE` narrowed to `authenticated`, the `statements` storage bucket, the auth trigger and
`claim_managed_profile`.

The seed is arithmetically closed — the balances the app computes are the balances the file
intends, verified by query:

| | |
| --- | --- |
| Barcelona Trip | Paulo owes Ana €50, Kenji owes Marina €40 |
| Apartment 4B | Sofia owes Ana $848, Ana owes Marina $35 |
| Tally Scores | Paulo 48, Kenji 67, Marina 91, Sofia 50 — exactly what `lib/score.ts` recomputes |
| Exchange | 7 open listings across 3 sellers, all backed by real outstanding balances, plus 1 sold |

Auth with email and password only, one-click `/demo`, the app shell (top bar → five bottom tabs
under 768px with hand-drawn glyphs), and the dashboard on real data.

## Stage 3 — Friends, groups, expenses, settling ✅

All three ways to add a friend, including managed friends and the invite link. Groups with the
manual expense form in four split modes (equal, exact, percentages, shares) with a live remainder
that blocks a split which does not add up. Settling with the outstanding amount prefilled.
Min-cash-flow simplification stated in plain English; applying it records suggestions rather than
settling anything.

## Stage 4 — Voice ✅ (needs keys to speak)

`VoiceSheet` with the orb, live captions, italic "on its way to the assistant" line, ConfirmChips
and a persistent text input; `DockedOrb` on every authenticated page; the voice picker and the
spoken onboarding with its manual fallback. Ten client tools wired to server actions, all funnelling
into the same validation the forms use.

Without an agent id the sheet opens and says so calmly, and every path it covers is reachable by
form. **Add `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` and `ELEVENLABS_API_KEY` to hear it.**

## Stage 5 — Statement import and money ✅ (needs an Anthropic key to read images)

`/import`: choose or photograph → compressed to ≤1600px in the browser → private bucket → Anthropic
vision → dedup-hashed review table with duplicates pre-unchecked and badged → batch categorisation
on save. `/money`: cash flow, per-category breakdown in tally marks, budgets filling toward their
cap (vermilion when over), month-by-month list, recent lines, check-in history, and the three AI
insights as a pull-quote labelled "Read by AI".

## Stage 6 — The Exchange and Tally Score ✅

Browse, my listings, the three-step sell flow with AI pricing and a 2–35% clamp enforced
server-side, the listing detail with the score broken down line by line, and the demo purchase
writing the listing, both settlements, the claim and three feed entries in one act.

## Stage 7 — Activity, settings, polish 🟡

Done: `/activity` grouped by day, `/settings`, `/join/[code]`, per-page titles, the tally-glyph
favicon, reduced-motion handling, focus rings, and colour never carrying meaning alone.

---

## Added beyond the spec

- **Currency conversion** (`lib/fx.ts`). Tallies in different currencies fold into one figure at
  the ECB's daily reference rate, with every original currency kept underneath and the rate date
  named. The conversion is labelled a convenience; the ledger stays in the currency it was made in.
- **Correcting by voice** (`fix_last_entry`). Correcting a mistake is where people abandon a
  spreadsheet, so the assistant takes the entry back out and asks for it again in one sentence
  instead of sending anyone hunting for a row.
- **Ambient stroke.** Exactly one brush stroke at a time paints itself behind the app and fades,
  so the interface always has a hand moving in it without becoming noisy.

## Fixed along the way

- `tailwind-merge` read the numeric type scale (`text-12`) as a colour and was dropping
  `text-cream` from primary buttons, leaving navy-on-cobalt. The scale is now declared to it.
- `scoreStatsFor` counted `exchange_transfer` as a settled debt, so a debtor's Tally Score improved
  when somebody else sold their debt. Only `settle` counts now.

## Deliberately deferred

- **Weekly Tally check-in mode is reachable but not yet its own flow.** The dashboard card and the
  `checkin` mode exist in `VoiceSheet`; the card currently routes to `/money`. Wiring it to open
  the sheet in check-in mode directly is a small change in
  `app/(app)/dashboard/page.tsx`.
- **Group rename and archive** have a server action (`renameGroup`) but no UI yet.
- **Account deletion** is described in settings rather than implemented.
- **OG image** — metadata and Twitter card are set, but the cream-and-strokes `opengraph-image` is
  not generated yet.
- **Responsive sweep** has been done at 375 and 1440 on the landing, dashboard, friends, group and
  exchange. `/money` and `/import` have been built to the same rules but not yet photographed at
  both widths.
