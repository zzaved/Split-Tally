# Split Tally

**Finance without forms.** Say what you spent and the ledger writes itself. Snap your bank
statement and it reads every line. And when you need the money before your friend can pay, sell
what you are owed on The Exchange.

Built for the AI Designathon at MERGE 2026, category **Design Eng**. `BUILD.MD` is the spec this
repository implements.

---

## The idea

A *split tally* was a stick of notched hazel recording a debt, split lengthways in two: the
creditor kept the thicker half (the *stock*), the debtor kept the *foil*, and only the matching
halves fit together. Creditors who needed money early sold their halves at a discount — the first
market in what people were owed.

Split Tally is that stick, including the market.

---

## Running it

```bash
npm install
cp .env.example .env      # then fill it in — see below
npm run dev               # http://localhost:3000
```

Node 20.9+ is required (Next.js 16).

### 1. Supabase

Create a project, then run the two SQL files in order from the SQL editor:

```
supabase/migration.sql    # tables, indexes, RLS, helper functions, storage bucket
supabase/seed.sql         # the demo account and a season of believable history
```

Then, in **Authentication → Sign In / Providers → Email**, turn **Confirm email** *off*. Without
that, a new signup gets no session and cannot reach the spoken onboarding. (The demo login works
either way.)

Copy the three keys into `.env`:

| Variable | Where |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API keys → publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API keys → `service_role` (**server-only**) |

### 2. Anthropic

`ANTHROPIC_API_KEY` from console.anthropic.com. Powers statement reading, categorisation, listing
prices and the monthly insights. Every call is server-side (`lib/anthropic.ts`), pinned to
`claude-sonnet-4-6`.

Without it the app still runs: statement import says so plainly, listings fall back to the local
pricing model in `lib/pricing.ts`, and insights simply do not render.

### 3. ElevenLabs

Create a Conversational AI agent, paste the system prompt below into it, and register the eleven
client tools. Then set:

```
ELEVENLABS_API_KEY=…                     # server-only: session tokens + voice samples
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=…        # public: the browser opens the session with it
NEXT_PUBLIC_ELEVENLABS_VOICE_COBALT=…    # four voice ids for /onboarding/voice
NEXT_PUBLIC_ELEVENLABS_VOICE_INDIGO=…
NEXT_PUBLIC_ELEVENLABS_VOICE_ULTRAMARINE=…
NEXT_PUBLIC_ELEVENLABS_VOICE_CERULEAN=…
```

The agent needs **conversation overrides** enabled for the TTS voice and for text-only mode — that
is how the chosen voice is applied per session and how the typed fallback works. If overrides are
off, the agent's default voice is used and nothing else changes.

The API key must carry `text_to_speech`, `ElevenAgents: write` (creating the agent and minting
session credentials) and `Voices: read`. Nothing else.

**Two transports, on purpose.** Speaking runs over WebRTC with a short-lived conversation token;
typing runs over a WebSocket with a signed URL. Text over WebRTC connects and then sits on an audio
transport it never uses, and the room drops — a typed conversation should not need a microphone or
a media pipeline at all. `app/api/voice/token/route.ts` picks the transport from `?transport=text`.

Without an agent id the orb still opens, says the assistant is not connected on this deployment,
and points at the forms that do the same work.

### 4. Currency rates

None needed. Conversions use the European Central Bank's daily reference rates via
`api.frankfurter.dev` — no key, no account. If it is unreachable, the dashboard shows the
per-currency figures on their own and says so.

---

## Demo credentials

| Account | Email | Password |
| --- | --- | --- |
| **Ana** (the demo) | `demo@splittally.app` | `tallystick2026` |
| Marina | `marina@splittally.app` | `tallystick2026` |
| Kenji | `kenji@splittally.app` | `tallystick2026` |
| Júlia | `julia@splittally.app` | `tallystick2026` |

**Explore the demo** on the landing page signs straight into Ana's account. Paulo and Sofia are
*managed friends* — people Ana added by name who are not on Split Tally yet.

Logging in as **Marina** or **Kenji** is the quickest way to see the Exchange purchase flow from the
buyer's side, since Ana cannot buy her own listing.

---

## The ElevenLabs agent

### System prompt

> You are the voice of Split Tally, an AI-native app where friends track, split and even trade what
> they owe each other. You are warm, precise and brief — this is a spoken conversation: never more
> than two short sentences per turn. Amounts are numbers; currencies come from context.
>
> ONBOARDING MODE (new user): ask one at a time: (1) what to call them, (2) student, professional
> or something else, (3) default currency, (4) who they usually share expenses with, (5) main money
> goal. After each answer confirm in one sentence — "Got it: you're a student sharing an apartment.
> Is that right?" — and only after confirmation call save_profile_field. After all five, call
> complete_onboarding and say: "Your ledger is ready. From now on, just tell me what you spend."
>
> LEDGER MODE (daily): when the user states an expense, extract description, amount, who paid,
> group, split; confirm the whole thing once; call add_expense. Unknown person → offer add_friend.
> Missing group → offer create_group. Balance questions → get_balances. Payments received →
> mark_settled. Wanting money sooner → offer list_receivable and speak the AI price and rationale.
>
> CHECK-IN MODE (weekly tally): ask exactly three questions: cash or untracked spending this week
> (log each with log_cash_spending); upcoming shared costs; anything to settle or sell. Close with a
> two-sentence recap of their week, then call complete_checkin with that recap.
>
> CORRECTIONS: if the user says something already in the ledger is wrong, never make them go and
> find it. Call fix_last_entry, tell them what you took out, and ask for the correct version in one
> sentence. Speaking a correction should always be faster than editing a row.
>
> Style: never lecture about money. Never read long lists — summarize, the screen shows details. If
> audio fails or the user types, continue seamlessly in text.

### Client tools

Register each of these on the agent. They are implemented in `app/(app)/voice/actions.ts` and
wired up in `components/voice/clientTools.ts`.

| Tool | Parameters | Effect |
| --- | --- | --- |
| `save_profile_field` | `field`, `value` | Onboarding writes |
| `complete_onboarding` | `occupation`, `currency`, `sharing_context`, `goal` | Finalise and redirect |
| `add_friend` | `name`, `email?` | Creates a managed friend |
| `create_group` | `name`, `member_names[]` | Group plus members, by name resolution |
| `add_expense` | `group_name`, `description`, `amount`, `paid_by_name`, `split`, `split_amounts[]` | Writes the expense, returns a spoken summary |
| `get_balances` | `group_name?` | One sentence of balances |
| `mark_settled` | `from_name`, `to_name`, `amount`, `group_name?` | Records a payment |
| `list_receivable` | `debtor_name`, `amount?` | Prices a tally and speaks the rationale |
| `log_cash_spending` | `description`, `amount`, `category?` | Check-in mode → `personal_transactions` |
| `complete_checkin` | `summary` | Stores the two-sentence recap that closes a weekly tally |
| `fix_last_entry` | `what?` | Takes the last entry back out so it can be restated |

---

## How it is built

```
Browser (Next.js 16, React 19, Tailwind 4)
 ├─ Ink on Cream components ............ components/ink/
 ├─ ElevenLabs useConversation ......... components/voice/  ──► ElevenLabs agent
 │        ▲ conversation state drives <Orb>                        │
 │        └─ clientTools ◄──────────────── tool calls ──────────────┘
 ▼
 Server Actions / Route Handlers
 ├─ lib/ledger.ts .... balances, netting, simplification, split maths
 ├─ lib/score.ts ..... the Tally Score
 ├─ lib/pricing.ts ... discount clamp and the local price model
 ├─ lib/fx.ts ........ ECB reference rates
 └─ app/api/ ......... parse-statement · categorize · price-listing · insights → Anthropic
 ▼
 Supabase: Auth · Postgres with RLS on every table · private `statements` bucket
```

### Where the money maths lives

`lib/ledger.ts`, and nowhere else. Balances are pairwise and always computed server-side:

```
X owes Y  =  X's split shares on expenses Y paid
          −  Y's split shares on expenses X paid
          −  payments X made to Y
          +  payments Y made to X
          +  open claims where X is debtor and Y is holder
          −  open claims where Y is debtor and X is holder
```

`exchange_purchase` settlements are deliberately excluded: buying a tally is consideration for an
asset, not a repayment, and must not move the pair balance. `exchange_transfer` **is** included —
that is the row that lifts a debtor's obligation off the original creditor when a claim changes
hands. For the same reason only `settle` counts toward the Tally Score: a debtor's score must not
improve because somebody else sold their debt.

### The four service-role paths

RLS is on for all fifteen tables. Four flows genuinely cannot be expressed as a policy, so they run
on the service-role client inside a server action, with an explicit ownership check in code first:

1. **Invite lookup** (`app/(auth)/join/[code]/page.tsx`) — the visitor has no session yet, so the
   code cannot be read as `authenticated`.
2. **The Exchange purchase** (`app/(app)/exchange/actions.ts`) — one act writes the listing, two
   settlements, a claim and three feed entries, and the buyer has no policy to update a listing
   they do not own. Checked first: the listing is still open, and the buyer is neither the seller
   nor the debtor.
3. **Cross-feed fan-out on a purchase** — the same transaction, writing into the debtor's feed.
4. **Managed-profile claim** (`claim_managed_profile`) — runs immediately after signup, before the
   new user could be authorised to touch the stub's rows. `EXECUTE` is revoked from `anon` and
   `authenticated`; only the service role can call it.

Everything else — every expense, split, settlement, listing, budget and feed entry — goes through
the user's own client and is filtered by policy.

---

## Design system

"Ink on Cream" lives in `app/globals.css` and `components/ink/`. Editorial, hand-painted, no dark
mode, no glassmorphism, and no gradients anywhere except the orb.

- **Colour** — cream `#F4F0E5`, cream-deep `#EBE5D6`, cobalt `#2547C9`, navy `#1B2B6B`, ink-soft
  `#5A679E`, vermilion `#C0391B` (sparing).
- **Type** — Cormorant Garamond for display and every large number; Inter for body and for
  uppercase labels at 0.18em tracking. Scale: 11 / 12 / 14 / 16 / 20 / 28 / 40 / 56 / 72.
- **BrushStroke** — six strokes, each 2–3 offset paths under a turbulence filter, which is what
  makes them read as gouache rather than as vector lines. They draw themselves in on view.
- **AmbientStroke** — exactly one stroke at a time paints itself somewhere behind the app, holds,
  then fades so the next can take its place. Never two at once.
- **Orb** — four screen-blended light pools drifting at different rates over a dark sphere. States
  come from the SDK: idle, listening, thinking, speaking.
- **TallyMarks** — four uprights and a diagonal fifth, hand-wobbled, used for counters, budget
  progress, Tally Scores and the loading state. There are no spinners in this app.

Under `prefers-reduced-motion` strokes render static, the orb only breathes, the jelly floats
gently, and nothing else moves.

---

## Notes and known limits

- **Marketplace settlement is simulated** and labelled "Demo settlement — no real money moves"
  wherever it appears. The ledger movement behind it is real.
- **Live speech captions.** The sheet shows what is on its way to the assistant in italic beneath
  the orb. The SDK streams voice-activity scores continuously but only hands over a transcript once
  an utterance closes, so this reads "listening…" while you speak and then shows the recognised
  sentence for a beat after — not a word-by-word partial.
- **Converted totals are a convenience, not the ledger.** A tally stays in the currency it was made
  in; the combined figure is labelled with the ECB rate date it used.
- **Scores are computed from what the viewer can see.** RLS stops one user writing another user's
  profile, so `profiles.tally_score` is a cache and `lib/scores.ts` recomputes on read wherever the
  history is visible.

See `PROGRESS.md` for what is finished and what is deliberately deferred.
