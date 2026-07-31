---
sidebar_position: 2
---

# Setup and deployment

Everything needed to run Split Tally locally, deploy it, and deploy this documentation site. The
target is reproducibility: a judge who follows this page ends up with the same app that is running at
[split-tally-seven.vercel.app](https://split-tally-seven.vercel.app).

Source: [github.com/zzaved/Split-Tally](https://github.com/zzaved/Split-Tally).

## Prerequisites

- **Node 20.9 or newer.** Next.js 16 requires it.
- A **Supabase** project. The free tier is enough.
- An **Anthropic** API key, for statement reading, categorisation, listing prices and the monthly
  insights.
- An **ElevenLabs** account, for the conversational agent, the four onboarding voices and the
  realtime speech to text used by the guided form filler.

Nothing else. Currency conversion needs no account: it reads the European Central Bank's daily
reference rates through `api.frankfurter.dev`.

## Install and run

```bash
git clone https://github.com/zzaved/Split-Tally.git
cd Split-Tally
npm install
cp .env.example .env      # then fill it in, see below
npm run dev               # http://localhost:3000
```

## 1. Supabase

Create a project, then run the two SQL files **in order** from the SQL editor:

```
supabase/migration.sql    # fifteen tables, indexes, RLS, helper functions, the storage bucket
supabase/seed.sql         # the demo account and a season of believable history
```

`migration.sql` creates fifteen tables with row level security enabled on every one of them, an
index on every foreign key, four `SECURITY DEFINER` helper functions with `EXECUTE` narrowed to
`authenticated`, the auth trigger that writes a `profiles` row for each new user,
`claim_managed_profile` with `EXECUTE` revoked from everyone but the service role, and the private
`statements` storage bucket with policies that let a user read and write only inside a folder named
after their own user id.

`seed.sql` is safe to re-run: it opens with a reset block that clears any previous seed. It creates
Ana (the demo account), Marina, Kenji and Júlia as real accounts, Paulo and Sofia as managed
friends, two groups, a settlement history long enough for the scores to be real, seven open listings
and one sold one, twelve personal transactions, two budgets with one deliberately over its cap, a
past check-in, and an activity feed covering every event type.

The seed is arithmetically closed, which means the balances the app computes are the balances the
file intends:

| | |
| --- | --- |
| Barcelona Trip | Paulo owes Ana €50, Kenji owes Marina €40 |
| Apartment 4B | Sofia owes Ana $848, Ana owes Marina $35 |
| Tally Scores | Paulo 48, Kenji 67, Marina 91, Sofia 50, exactly what `lib/score.ts` recomputes |

Then, in **Authentication → Sign In / Providers → Email**, turn **Confirm email** *off*. Without
that, a new signup gets no session and cannot reach the spoken onboarding. The app says so in the
signup form rather than failing silently, and the demo login works either way.

## 2. Environment variables

Table 15 is every variable, and exactly where each one comes from.

<div className="st-figure">

**Table 15: every environment variable and where to get it**

| Variable | Public? | Where it comes from | What needs it |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → Settings → API | Every request. The app cannot render without it |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase → Settings → API keys → publishable | The browser and server clients |
| `SUPABASE_SERVICE_ROLE_KEY` | **no** | Supabase → Settings → API keys → `service_role` | Four flows only, listed below. Bypasses RLS: server only |
| `ANTHROPIC_API_KEY` | **no** | console.anthropic.com | Statement vision, categorisation, listing prices, insights |
| `ELEVENLABS_API_KEY` | **no** | elevenlabs.io → API keys | Session tokens, voice samples, Scribe tokens |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | yes | The agent's page in the ElevenLabs dashboard | The browser opens the conversation with it |
| `NEXT_PUBLIC_ELEVENLABS_VOICE_COBALT` | yes | Any ElevenLabs voice id | The first orb on `/onboarding/voice` |
| `NEXT_PUBLIC_ELEVENLABS_VOICE_INDIGO` | yes | Any ElevenLabs voice id | The second orb |
| `NEXT_PUBLIC_ELEVENLABS_VOICE_ULTRAMARINE` | yes | Any ElevenLabs voice id | The third orb |
| `NEXT_PUBLIC_ELEVENLABS_VOICE_CERULEAN` | yes | Any ElevenLabs voice id | The fourth orb |
| `NEXT_PUBLIC_SITE_URL` | yes | `http://localhost:3000` locally, the deployed domain in production | Invite links, and two server actions that call this app's own API routes |
| `DEMO_EMAIL` | **no** | `demo@splittally.app`, from the seed | The one press "Explore the demo" button |
| `DEMO_PASSWORD` | **no** | `tallystick2026`, from the seed | The same button |

</div>

The service role key bypasses row level security and must never reach the browser. It is used in
exactly four places, each with an explicit ownership check written in code before the call:

1. **Invite lookup** in `/join/[code]`, because the visitor has no session yet and the code cannot be
   read as `authenticated`.
2. **The Exchange purchase**, because one act writes a listing, two settlements, a claim and three
   feed entries, and a buyer has no policy to update a listing they do not own. Checked first: the
   listing is still open, and the buyer is neither the seller nor the debtor.
3. **The cross-feed fan-out on that same purchase**, writing into the debtor's activity feed.
4. **`claim_managed_profile`**, which runs immediately after signup, before the new user could be
   authorised to touch the stub's rows. `EXECUTE` is revoked from `anon` and `authenticated`.

Everything else, every expense, split, settlement, listing, budget and feed entry, goes through the
user's own client and is filtered by policy.

### What still works without each key

Nothing about this app fails with a blank screen. Each missing key degrades in its own documented
way, and the interface says which one is missing rather than pretending. Table 16 is the whole of
it.

<div className="st-figure">

**Table 16: degradation, key by key**

| Missing | What stops | What the user sees |
|---|---|---|
| `ANTHROPIC_API_KEY` | Statement reading, categorisation, AI pricing, insights | Import says statement reading is not switched on; listings fall back to the local pricing model in `lib/pricing.ts` and the chip reads "Priced from their record" instead of "AI fair price"; insights simply do not render |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | The conversation | The orb still opens and says the assistant is not connected on this deployment, then points at the forms that do the same work |
| `ELEVENLABS_API_KEY` | Session tokens, voice samples, Scribe | The browser opens the session with the agent id alone; the voice picker says no voice ids are configured and the agent's default voice is used |
| `speech_to_text` on the ElevenLabs key | Scribe realtime transcription | The guided walk falls back to the browser's own recogniser, which works but cycles the microphone at every pause |
| `SUPABASE_SERVICE_ROLE_KEY` | Invite claims and the Exchange purchase | Signup still works; the managed-profile claim is best effort and never blocks an account |
| `NEXT_PUBLIC_SITE_URL` | Nothing on Vercel | `lib/site.ts` falls back to Vercel's own `VERCEL_URL`. Set it anyway: a custom domain is the one case the fallback cannot guess |

</div>

## 3. Anthropic

`ANTHROPIC_API_KEY` from console.anthropic.com. Every call is server side, routed through
`lib/anthropic.ts`, and pinned in one place to **`claude-sonnet-4-6`**. Four routes use it:

- `POST /api/parse-statement`, vision. The image lives in a private bucket, so the route mints a
  sixty second signed URL, downloads the bytes itself and sends base64. The model never receives a
  URL into storage.
- `POST /api/categorize`, batch. Anything returned that is not one of the eleven allowed categories
  becomes *Other*.
- `POST /api/price-listing`. The 2% to 35% discount clamp is applied server side regardless of what
  the model returns.
- `POST /api/insights`. Exactly three one-sentence observations, rendered as a pull quote labelled
  **Read by AI**.

All four parse defensively: code fences stripped, `JSON.parse` inside a try, a friendly message on
failure rather than an exception in the request path.

## 4. ElevenLabs

Three things have to be set up: the agent, its client tools, and the key's permissions.

### The agent

Create a Conversational AI agent and paste this in as its system prompt:

> You are the voice of Split Tally, an AI-native app where friends track, split and even trade what
> they owe each other. You are warm, precise and brief: this is a spoken conversation, never more
> than two short sentences per turn. Amounts are numbers; currencies come from context.
>
> ONBOARDING MODE (new user): ask one at a time: (1) what to call them, (2) student, professional
> or something else, (3) default currency, (4) who they usually share expenses with, (5) main money
> goal. After each answer confirm in one sentence, "Got it: you're a student sharing an apartment.
> Is that right?", and only after confirmation call save_profile_field. After all five, call
> complete_onboarding and say: "Your ledger is ready. From now on, just tell me what you spend."
>
> LEDGER MODE (daily): when the user states an expense, extract description, amount, who paid,
> group, split; confirm the whole thing once; call add_expense. Unknown person, offer add_friend.
> Missing group, offer create_group. Balance questions, get_balances. Spending questions,
> get_spending. Score questions, get_score. Payments received, mark_settled. Wanting money sooner,
> offer list_receivable and speak the AI price and rationale.
>
> CHECK-IN MODE (weekly tally): ask exactly three questions: cash or untracked spending this week
> (log each with log_cash_spending); upcoming shared costs; anything to settle or sell. Close with a
> two-sentence recap of their week, then call complete_checkin with that recap.
>
> CORRECTIONS: if the user says something already in the ledger is wrong, never make them go and
> find it. Call fix_last_entry, tell them what you took out, and ask for the correct version in one
> sentence. Speaking a correction should always be faster than editing a row.
>
> Style: never lecture about money. Never read long lists, summarize, the screen shows details.
> Mirror the language the user writes in. If audio fails or the user types, continue seamlessly in
> text.

### The client tools

Register all thirteen from Table 17 on the agent. **The names must match exactly.** They are the strings the
browser looks for in `components/voice/clientTools.ts`, and a name that does not match is a tool the
agent will believe it does not have. Every one of them is implemented as a server action in
`app/(app)/voice/actions.ts` and returns a single sentence for the agent to speak, never a blob of
data, because the screen already shows the detail.

<div className="st-figure">

**Table 17: the thirteen client tools, and the names that have to match**

| Tool name | Parameters | What it does |
|---|---|---|
| `save_profile_field` | `field`, `value` | Writes one onboarding answer |
| `complete_onboarding` | `occupation`, `currency`, `sharing_context`, `goal` | Finalises setup and signals the redirect |
| `add_friend` | `name`, `email?` | Creates a managed friend |
| `create_group` | `name`, `member_names[]` | Group plus members, by name resolution |
| `add_expense` | `group_name`, `description`, `amount`, `paid_by_name`, `split`, `split_amounts[]` | Writes the expense, its splits and the feed entry |
| `get_balances` | `group_name?` | One sentence of who owes whom |
| `get_spending` | `group_name?` | Your share and the group total, per currency. A different question from balances |
| `get_score` | `person_name?` | The reading of a Tally Score, not the bare number |
| `mark_settled` | `from_name`, `to_name`, `amount`, `group_name?` | Records a payment |
| `list_receivable` | `debtor_name`, `amount?` | Prices a tally and speaks the rationale |
| `log_cash_spending` | `description`, `amount`, `category?` | Check-in mode, writes `personal_transactions` |
| `complete_checkin` | `summary` | Stores the two sentence recap that closes a weekly tally |
| `fix_last_entry` | `what?` | Takes the last entry back out so it can be restated |

</div>

### Overrides and permissions

Enable **conversation overrides** in the agent's security settings, for the TTS voice and for
text-only mode. That is how the voice chosen at onboarding is applied per session, and how the typed
fallback works. If overrides are off, the agent's default voice is used and nothing else changes.

The API key needs exactly four permissions, and nothing else:

- `text_to_speech`, for the four voice samples and for the guided walk's spoken questions
- `ElevenAgents: write`, for minting session credentials
- `Voices: read`
- `speech_to_text`, for the realtime Scribe token the guided walk uses

### Two transports, on purpose

Speaking runs over **WebRTC** with a short lived conversation token. Typing runs over a **WebSocket**
with a signed URL. `app/api/voice/token/route.ts` picks the transport from `?transport=text`.

This is not a preference. Text over WebRTC connects and then sits on an audio transport it never
uses, and the room drops. A typed conversation should not need a microphone or a media pipeline at
all.

The guided form filler is a separate concern and uses **Scribe** (`scribe_v2_realtime`) rather than
the agent, because no agent is running during a walk and Scribe can hold one socket and one
microphone stream for the whole form. Two details there fail quietly if they drift: `useScribe` only
captures audio when it is given a `microphone` option, and realtime has its own models, so passing
the batch `scribe_v1` gets the socket closed by the server in a message the SDK does not recognise
and no error callback fires. Any close the app did not ask for now falls back to the browser rather
than sitting there listening to nothing.

## 5. Demo credentials

Four accounts come out of the seed, listed in Table 18.

<div className="st-figure">

**Table 18: seeded accounts on the live deployment**

| Account | Email | Password | Useful for |
| --- | --- | --- | --- |
| **Ana** (the demo) | `demo@splittally.app` | `tallystick2026` | Everything. This is what "Explore the demo" opens |
| Marina | `marina@splittally.app` | `tallystick2026` | The Exchange from the buyer's side, since Ana cannot buy her own listing |
| Kenji | `kenji@splittally.app` | `tallystick2026` | A second buyer, and a mid-range Tally Score |
| Júlia | `julia@splittally.app` | `tallystick2026` | A smaller ledger, seen from the other side |

</div>

**Explore the demo** on the landing page signs straight into Ana's account. It is a form POST rather
than a link, deliberately: a GET that signs you in gets prefetched by the router the moment the
button scrolls into view, which silently put anyone who had just signed out back into the demo
account and made signup unreachable.

Paulo and Sofia are managed friends, people Ana added by name who are not on Split Tally.

## 6. Deploying the app to Vercel

```bash
vercel --prod
```

Three things are easy to get wrong, and all three were hit while shipping this:

1. **`vercel.json` pins the framework to Next.js.** A project created against an empty repository has
   nothing to auto-detect, falls back to the static preset, and fails with *No Output Directory named
   "public" found*. This app has no `public/` directory because it needs none.
2. **A green deploy is not a working one.** Vercel builds this fine with no environment variables at
   all, and then every page answers 500, because `proxy.ts` needs Supabase on every request. Paste
   the whole of `.env` into the project's environment variables before the first real visit.
3. **Change `NEXT_PUBLIC_SITE_URL` to the deployed domain.** Two server actions call this app's own
   API routes through it. Without it, on a deployment where the fallback cannot guess, they reach for
   localhost, fail, and silently drop to the local pricing model: working, but never asking the model
   anything.

Then in Supabase, set **Authentication → URL Configuration → Site URL** to the same domain, so
confirmation and recovery links point at the deployment rather than at localhost.

## 7. Deploying this documentation site

The documentation is a Docusaurus 3.10 site living in `documentation/`. It is published to GitHub
Pages by a workflow that runs on every push touching that directory.

Locally:

```bash
cd documentation
npm install
npm start          # http://localhost:3000, hot reload
npm run build      # static output in documentation/build
npm run serve      # serve the built output to check it as it will ship
```

The site uses `@docusaurus/theme-mermaid`, which is what renders every flowchart on this site as a
diagram rather than as a code block.

### The workflow

`.github/workflows/deploy-docs.yml` builds the site and hands the artifact to GitHub Pages. It needs
no deploy key and no `gh-pages` branch: `actions/deploy-pages` publishes the uploaded artifact
directly. To reproduce it on a fork, this is the whole file:

```yaml
name: Deploy documentation to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - "documentation/**"
      - ".github/workflows/deploy-docs.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: documentation
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: documentation/package-lock.json
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: documentation/build

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Switching it on

1. In the repository, **Settings → Pages → Build and deployment → Source**, choose **GitHub Actions**.
   Not "Deploy from a branch": this workflow uploads an artifact rather than pushing to `gh-pages`.
2. Push anything under `documentation/`, or run the workflow by hand from the Actions tab.
3. The first successful run prints the published URL in the `deploy` job's summary.

Two configuration values in `docusaurus.config.ts` have to agree with where the site is being served
from, or every internal link and every image breaks with a 404: `url` is the origin
(`https://zzaved.github.io`) and `baseUrl` is the repository path with both slashes
(`/Split-Tally/`). Every image on this site is referenced as an absolute path from the static
directory, for example `/img/screens/dashboard.png`, and Docusaurus prefixes `baseUrl` at build time.
Getting `baseUrl` wrong is the single most common way a Pages deployment of a Docusaurus site builds
green and serves blank.
