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

## Stage 7 — Activity, settings, polish ✅

`/activity` grouped by day, `/settings`, `/join/[code]`, per-page titles, the tally-glyph favicon,
the OG image, reduced-motion handling, focus rings, and colour never carrying meaning alone.

## Deployed

Live at **https://split-tally-seven.vercel.app**, swept in production at 1440 and 375: no console
errors, nothing over HTTP 400, no horizontal overflow on any of the nine routes. The demo login
lands on the dashboard.

Both AI paths verified against the deployment rather than assumed:

- `/api/price-listing` answered `source: "ai"` — a real Anthropic response pricing Paulo's €50 at
  25% off and citing his score, his 19-day average and his two overdue tallies. The 2–35% clamp
  held.
- The agent connected and read the live ledger: *"Paulo owes you €50, Sofia owes you $848, and you
  owe Marina $35."*

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
- **The Tally Score, read rather than displayed.** A number is not a judgement, so `lib/score.ts`
  now turns it into one: a band, a confidence, a lending note and a buying note. The band
  distinguishes `unproven` from `mixed`, because 50 is both the starting value and a middling
  result and an interface must never pass off the first as the second. The expense form warns you
  about whoever is about to owe you — only when you are the one paying, and only when the record
  says something. The listing detail compares the discount on offer against what the debtor's own
  history prices it at.
- **Return on bought tallies** on the dashboard: what you paid against what you are owed, per
  currency, labelled "if they all pay" — it is a position until the debtor settles, not a profit.
- **The score, readable and improvable.** `/score` shows the dial, the arithmetic behind it, every
  settlement with how long it took, every debt still open with how long it has sat, and what each
  concrete action would add. The tips are computed from the formula, so none of them promises more
  than it can deliver.
- **The "I'm improving" standing.** Earned rather than given: only a record that already reached 80
  can claim it, only while the score is below 50, spent once, and returned only by climbing back to
  80 and falling again. The peak is replayed from the ledger rather than stored, so every reader
  gets the same answer. `/exchange` carries a legend documenting every state.
- **Filling a form by talking.** The orb rings the field it is asking about with a hand-drawn loop,
  says the question aloud, writes what it hears into the real input, reads it back, and moves on
  once you confirm. Wired into onboarding, the expense form and group creation. Deliberately not
  driven by the conversational agent: a known list of fields is better walked deterministically,
  because then the order, the confirmation and the value that lands in each input are guaranteed
  rather than hoped for, and it costs nothing per turn.
- **Live captions** from the browser's own recogniser, so the words appear as they are said. The
  agent transcribes separately and that version reaches the ledger. ElevenLabs Scribe (`useScribe`)
  would be more accurate at the cost of a second microphone stream and a second bill for audio the
  agent is already transcribing.
- **The reason for speaking, with the real numbers.** ~150 words a minute spoken against ~36 typed
  on a phone (Karat et al. 1999 measured 19 wpm composing on a keyboard). Roughly four times, not
  the fifteen the claim usually gets inflated to.

## Fixed along the way

- Text mode ran over WebRTC, which connects and then drops the room because nothing ever uses the
  audio transport. Typing now runs over a WebSocket with a signed URL and needs no microphone.
- A typed message only appeared in the transcript if the SDK echoed it back, which it does not — so
  you pressed send and nothing happened. The line is added locally now.
- `app/(app)/voice/actions.ts` ended with `export type { Profile }`. A `"use server"` file may only
  export async functions, and the transform turned it into a runtime re-export that threw
  `ReferenceError: Profile is not defined` on every tool call.
- Vercel treated the project as a static site and failed with *No Output Directory named "public"
  found*. A project connected to an empty repository has nothing to auto-detect; `vercel.json` now
  pins the framework so the next person to connect it does not hit the same wall.
- Two server actions called this app's own API routes through `NEXT_PUBLIC_SITE_URL`, which on a
  deployment without that variable would reach for localhost, fail, and silently fall back to the
  local pricing model — working, but never asking the model anything.
- The listing card's identity block carried `min-w-0`, so on a narrow card it shrank to nothing
  instead of pushing the "AI fair price" chip onto its own line, and the chip landed on top of the
  debtor's name.
- `tailwind-merge` read the numeric type scale (`text-12`) as a colour and was dropping
  `text-cream` from primary buttons, leaving navy-on-cobalt. The scale is now declared to it.
- `scoreStatsFor` counted `exchange_transfer` as a settled debt, so a debtor's Tally Score improved
  when somebody else sold their debt. Only `settle` counts now.

## Copy convention

No em dashes in user-facing text: a colon where what follows explains, a comma where it is an
aside. Applied across every route, action message and agent reply.

## Deliberately deferred

- **Group rename and archive** have a server action (`renameGroup`) but no UI yet.
- **Netting is decided by whoever created the group.** The `groups` update policy is creator-only,
  so any other member gets a plain explanation rather than a switch that does nothing. Letting any
  member flip it would mean a policy change, not a UI one.
- **Account deletion** is described in settings rather than implemented.
- **Responsive sweep** has been done at 375 and 1440 on the landing, dashboard, friends, group and
  exchange. `/money` and `/import` have been built to the same rules but not yet photographed at
  both widths.
