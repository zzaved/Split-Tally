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

## Stage 4 — Voice ✅ (live)

`VoiceSheet` with the orb, live captions, italic "on its way to the assistant" line, ConfirmChips
and a persistent text input; `DockedOrb` on every authenticated page; the voice picker and the
spoken onboarding with its manual fallback. Eleven client tools wired to server actions, all funnelling
into the same validation the forms use.

The agent is created and wired. Verified end to end against the real ledger:

> **you** — What am I owed right now?
> **orb** — Paulo owes you €50, and Sofia owes you $848. You owe Marina $35.

> **you** — I paid 62 euros for lunch with Paulo in Barcelona Trip, split it equally.
> **orb** — You paid 62 euros for lunch with Paulo in the Barcelona Trip group, split equally. Is that right?
> **you** — Yes.
> **orb** — Got it. I've added 62 euros for lunch in the Barcelona Trip group, split equally.

The written row came back `created_via='voice'` with four split rows summing to exactly 62.00, and
was then removed so the seeded balances stay as documented.

Without an agent id the sheet still opens, says so calmly, and every path it covers stays reachable
by form.

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
- **Netted settling, as a group setting** (`groups.simplify_debts`). A ring of debts cancels: if
  you owe Pedro 5, Pedro owes Júlia 5 and Júlia owes you 5, nobody owes anybody. It is a switch
  rather than the default, because plenty of people would rather hand the money to the person they
  actually borrowed it from, and a balance that quietly rearranges itself is not something to opt
  anyone into. Flipping it lands in every member's feed. Verified on a three-way ring: literal
  shows three transfers of $5, netted shows nobody owing anything.
- **OG image** — cream, cobalt strokes, the jelly and the wordmark, generated at build time.

## Fixed along the way

- Text mode ran over WebRTC, which connects and then drops the room because nothing ever uses the
  audio transport. Typing now runs over a WebSocket with a signed URL and needs no microphone.
- A typed message only appeared in the transcript if the SDK echoed it back, which it does not — so
  you pressed send and nothing happened. The line is added locally now.
- `app/(app)/voice/actions.ts` ended with `export type { Profile }`. A `"use server"` file may only
  export async functions, and the transform turned it into a runtime re-export that threw
  `ReferenceError: Profile is not defined` on every tool call.
- `tailwind-merge` read the numeric type scale (`text-12`) as a colour and was dropping
  `text-cream` from primary buttons, leaving navy-on-cobalt. The scale is now declared to it.
- `scoreStatsFor` counted `exchange_transfer` as a settled debt, so a debtor's Tally Score improved
  when somebody else sold their debt. Only `settle` counts now.

## Deliberately deferred

- **Group rename and archive** have a server action (`renameGroup`) but no UI yet.
- **Netting is decided by whoever created the group.** The `groups` update policy is creator-only,
  so any other member gets a plain explanation rather than a switch that does nothing. Letting any
  member flip it would mean a policy change, not a UI one.
- **Account deletion** is described in settings rather than implemented.
- **Responsive sweep** has been done at 375 and 1440 on the landing, dashboard, friends, group and
  exchange. `/money` and `/import` have been built to the same rules but not yet photographed at
  both widths.
