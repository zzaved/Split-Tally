# SPLIT TALLY — MASTER BUILD SPEC (Claude Code)

You are building **Split Tally**, my submission to the AI Designathon @ MERGE 2026, category **DESIGN ENG — deliver AI-native UX end-to-end, through implementation**. This document is the single source of truth. Follow it exactly; where something is unspecified, decide in the spirit of §0 and §3.

All user-facing copy is in **English**. Never invent API keys — read from `.env`, generate `.env.example`. Deliver `README.md` (setup, ElevenLabs agent config, demo credentials), `supabase/migration.sql`, `supabase/seed.sql`.

---

## 0. Judging alignment — every decision serves these

| Criterion | Weight | What it means for the build |
|---|---|---|
| AI Integration | 30% | AI is the interface, not a feature. Voice creates data; vision reads statements; AI prices the marketplace, categorizes, nets debts, and interviews the user. Every AI touchpoint must be visible and labeled in the UI (small orb glyph on AI-created items). |
| Innovation & UX | 30% | The rewrite of Splitwise: zero-form flows, spoken onboarding, statement snap, tradeable IOUs. The hand-painted "Ink on Cream" identity must be unmistakable — no fintech clichés. |
| Speed & Quality | 20% | Polish over surface area. No broken states. Every screen has designed empty/loading/error states. Perfect at 375px and 1440px. |
| Feasibility | 20% | Only shipping tech: Next.js, Supabase, ElevenLabs, Anthropic. The only simulated thing is marketplace payment (clearly labeled "Demo settlement"). |

**Thesis: finance without forms.** Brand story: medieval English *split tally sticks* — notched wood recording a debt, split in two: creditor kept the *stock*, debtor the *foil*; only matching halves fit together, and creditor halves were traded and discounted — history's first receivables market. Split Tally revives this, including the trading.

---

## 1. Product definition — the day-to-day loop

Personas: **Ana** (26, professional, splits an apartment and travels with friends) and her circle (some on the app, some not — "managed friends"). Her loop:

1. **Morning**: opens dashboard → sees "Owed to you 240 / You owe 35", a Weekly Tally card, recent activity.
2. **Lunch with Paulo**: taps the docked orb, says *"I paid 62 for lunch with Paulo, split it."* Agent confirms in one sentence → expense saved → balances update live.
3. **Sunday**: snaps a screenshot of her bank app statement → Split Tally parses, dedupes, categorizes → she confirms → her personal cash-flow and budgets update.
4. **Weekly Tally (the interview)**: the orb interviews her — cash spending not on statements, upcoming shared costs, debts to settle → answers become data and a 2-sentence recap.
5. **Needs cash now**: Paulo owes her 50 from Barcelona but is broke this month → she lists the IOU on The Exchange; AI suggests 46 based on Paulo's Tally Score → Marina buys it (demo settlement) → Ana is paid today, Marina now holds Paulo's tally.

Everything in this loop must work in the shipped app (marketplace payment simulated).

---

## 2. Information architecture

Route table (Next.js App Router):

| Route | Auth | Purpose |
|---|---|---|
| `/` | public | Landing |
| `/signup`, `/login` | public | Auth + "Explore the demo" one-click seeded login |
| `/join/[code]` | public | Friend-invite link → signup with auto-friendship |
| `/onboarding/voice` | auth | Choose one of 4 voices |
| `/onboarding/talk` | auth | Spoken onboarding (manual fallback link) |
| `/dashboard` | auth | Home: balances, groups, Weekly Tally card, activity preview |
| `/friends` | auth | Friends list, requests, add/invite, managed friends |
| `/groups/[id]` | auth | Group ledger, expenses, settle, simplify |
| `/import` | auth | Statement snap → review → save |
| `/money` | auth | Personal finance: cash flow, budgets, insights, check-in history |
| `/exchange` | auth | Marketplace browse + my listings |
| `/exchange/[id]` | auth | Listing detail + buy |
| `/activity` | auth | Full activity feed |
| `/settings` | auth | Profile, voice, currency, sign out |
| `not-found` | — | 404 with the Tally Jelly |

Authenticated shell: top bar (wordmark + nav: Dashboard · Friends · Exchange · Money · Activity) collapsing to a bottom tab bar on mobile (5 tabs, letter-spaced caps labels), plus the **docked orb FAB** (bottom-right, above the tab bar on mobile) on every authed page.

---

## 3. System architecture

```
Browser (Next.js client)
 ├─ UI components (React + Tailwind, "Ink on Cream" system)
 ├─ ElevenLabs useConversation (WebRTC audio) ──────────► ElevenLabs Agent
 │        ▲ conversation state drives <Orb>                    │
 │        └─ clientTools (JS callbacks) ◄── tool calls ────────┘
 │                 │ invoke
 ▼                 ▼
 Server Actions / Route Handlers (Node, service-role Supabase where needed)
 ├─ ledger.ts  (balances, netting, score)      ├─ /api/parse-statement ─► Anthropic (vision)
 ├─ friends.ts (requests, invites, managed)    ├─ /api/price-listing  ─► Anthropic
 ├─ expenses.ts, groups.ts, listings.ts        ├─ /api/insights       ─► Anthropic
 │                                             └─ /api/categorize     ─► Anthropic
 ▼
 Supabase: Auth (email+pass) · Postgres (RLS) · Storage (bucket `statements`)
```

Key data-flow sequences to implement exactly:

**Voice expense**: user speech → agent extracts {description, amount, payer, group, split} → agent asks one confirmation → on "yes", agent calls clientTool `add_expense` → client invokes server action → server resolves names (§5.4), validates, writes `expenses` + `expense_splits` + `activity` → returns summary string → agent speaks it. UI toast + live balance refresh (router.refresh or optimistic update).

**Statement import**: file → client compresses to ≤1600px JPEG → upload to Storage → `/api/parse-statement` (signed URL → Anthropic vision) → JSON transactions → server computes dedup hash per row and flags existing → client review table → "Add selected" → server action writes `personal_transactions` + calls `/api/categorize` in batch → budgets recompute.

**Listing pricing**: seller picks a receivable → server gathers debtor stats from `settlements`/`expense_splits` → `/api/price-listing` → {suggested_price, discount_pct, rationale} → seller adjusts within clamps → `listings` row.

**Buy (demo)**: buyer confirms → transaction: listing `status='sold'`, `buyer_id` set; ledger reassignment rows written (§5.7); activity entries for all three parties.

---

## 4. Design system — "Ink on Cream" (source of truth)

Editorial, hand-painted Mediterranean-menu aesthetic. NOT a fintech look: no dark mode, no glassmorphism, no gradients outside the orb, no terracotta, no pure white, no gray text.

**Tokens** (`globals.css` CSS variables + Tailwind config):
- Color: `--cream #F4F0E5` (bg) · `--cream-deep #EBE5D6` (cards) · `--cobalt #2547C9` (strokes, primary, "owed to you") · `--navy #1B2B6B` (text) · `--ink-soft #5A679E` (secondary text) · `--vermilion #C0391B` (you-owe, overdue, destructive — sparing).
- Type: **Cormorant Garamond** 500/600 for display + all large numbers (48–72px balances are a signature); **Inter** 500 UPPERCASE 11–12px tracking 0.18em for labels/eyebrows/nav; Inter 400 body. Type scale: 12 / 14 / 16 / 20 / 28 / 40 / 56 / 72.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 40 / 64 / 96. Desktop section padding ≥96px vertical (56px mobile). Max width 1100px. Borders 1px navy/10%; shadows ≤0.06 opacity.

**Component inventory** (build first, in `/components/ink/`):
- `<BrushStroke variant={1..6} className>` — inline SVG hand-painted cobalt strokes (wavy, imperfect; layer 2–3 offset paths at opacity .85/.5 for gouache texture). Draw-in on view via stroke-dasharray/offset ~1.2s ease-out; static after. Respect `prefers-reduced-motion`. Used LARGE and asymmetric: hero corners, dividers, behind balance numbers.
- `<TallyMarks count max?>` — hand-drawn vertical strokes in groups of 4 + diagonal 5th. Counters, bullets, budget progress, loader (marks draw one by one).
- `<Orb size state>` — CSS/canvas aurora sphere, blues only (cobalt→cyan→deep violet), layered radial+conic gradients, blur, slow rotation + breathing. States from SDK: `idle | listening (ripple rings) | thinking (faster swirl) | speaking (pulse)`. Sizes: 280 hero / 96 sheet / 64 FAB.
- `<Jellyfish>` — the mascot, same ink language (NOT pixel art): bell of 1–2 curved strokes, exactly five tally-mark tentacles (4 wavy verticals + 1 diagonal). Draw-in, then idle float (bob + tentacle sway, CSS). Landing hero, empty states, 404, glyph beside wordmark.
- `<AmountDisplay value currency tone>` — serif money; cobalt positive / vermilion negative; tabular-ish alignment.
- `<VoiceSheet>` — bottom sheet (mobile) / right panel (desktop) with orb 96px, live agent captions, user transcript, ConfirmChips, and persistent text input "…or type instead" feeding the same conversation.
- `<ConfirmChips>` — "Yes" / "Fix that" pills; clicking sends the text into the conversation.
- Cards/rows: `<GroupCard> <ExpenseRow> <ListingCard> <FriendRow> <ActivityItem> <BudgetRow>`, each with designed hover/empty/skeleton states.
- `<EmptyState illustration copy cta>` — jelly or strokes + one inviting sentence + one action.

**Copy voice**: plain, warm, specific. Buttons say what they do ("Record expense", "List for sale", "Settle up"). Errors explain and direct, never apologize vaguely. No exclamation marks.

---

## 5. Feature specifications

### 5.1 Auth & demo access
Supabase email+password. Signup collects only email+password (everything else comes from the spoken onboarding — that's the point). `/login` includes **"Explore the demo"** → signs into seeded `demo@splittally.app`. `/join/[code]`: validates `invites.code`, then signup; on success creates accepted friendship with the inviter and lands on `/dashboard` with a toast "You and Ana are now connected."

### 5.2 Voice selection (`/onboarding/voice`)
Four orbs (2×2 mobile / row desktop), distinct blue-family gradients, names in caps beneath: **COBALT · INDIGO · ULTRAMARINE · CERULEAN**. Click → plays a sample line ("Hi — I'm Cobalt. Let's keep your tallies.") via ElevenLabs TTS → select → save `profiles.voice_id`. Config in `lib/voices.ts` with placeholder ElevenLabs voice IDs I will swap.

### 5.3 Spoken onboarding (`/onboarding/talk`)
Full-screen orb; mic pre-permission line ("I'll ask for your microphone so we can talk. You can type instead at any time."). Agent asks one at a time: name → occupation (student/professional/other) → default currency → who they share expenses with → main money goal. After each answer: on-screen line *"I understood: … — is that right?"* + ConfirmChips. Tools write as the conversation goes. Completion → agent: "Your ledger is ready. From now on, just tell me what you spend." → `/dashboard`. Discreet "Skip — set up manually" → one compact form writing the same fields.

### 5.4 Friends (`/friends`) — Splitwise-grade
Three ways to add:
1. **Search** existing users by email/username → sends request (`friendships.status='pending'`) → recipient sees it in Activity + Friends and accepts/declines.
2. **Invite link**: generate `/join/CODE` (row in `invites`), copy button; note under it: "They'll be your friend the moment they join."
3. **Managed friend (just a name)** — critical for demo and real UX: add "Paulo" with optional email; creates `profiles` row with `is_managed=true, created_by=me`. Managed friends can be added to groups and owe/be owed like anyone. Badge "Not on Split Tally yet · invite". **Claim path (v1 simple)**: if someone signs up with an email matching a managed profile created for them, migrate that managed profile's memberships/splits to the new account inside a transaction, then delete the managed row (implement as `claim_managed_profile()` SQL function; acceptable to run best-effort).
Friends list shows per-friend net balance across all shared groups + Tally Score tallies. Voice: "add my friend Marina" → agent calls `add_friend({name, email?})` → managed friend created, spoken confirmation.

**Name resolution rule (used by all voice tools)**: normalize (lowercase, strip accents) → match against my friends + members of my groups by first-name prefix → exactly one match: proceed; multiple: agent asks "Which Paulo — Paulo M. or Paulo R.?"; zero: agent offers "I don't know Paulo yet — add them as a friend?"

### 5.5 Groups & expenses (`/groups/[id]`)
- Create group (name; cover = deterministic BrushStroke variant seeded from id). Add members from friends. Creator can rename/archive.
- **Manual expense form** (must exist — it's the fallback and the contrast that makes voice look magical): description, amount + currency (default group currency), date (default today), paid by (member select), split: **equal | exact amounts | percentages | shares** with live remainder validation; category auto-suggested (§7) but editable.
- **Voice expense**: docked orb anywhere or "Speak it" in group. Agent extracts, confirms once, calls `add_expense`. Items created by voice/statement carry a small orb/paper glyph in lists (AI visibility).
- Edit/delete own expenses (soft delete → activity entry "removed a tally").
- Group header: per-member net balances (serif amounts), `<TallyMarks>` counting expenses, member initials in cream circles.
- **Settle up**: pick who→whom, amount prefilled with outstanding, record `settlements`; balances and Tally Scores update.
- **Simplify debts**: min-cash-flow netting — compute each member's net; greedily match largest debtor to largest creditor until all zero; show before/after in plain English ("Instead of 6 transfers, 2: Kenji pays Ana 40; Paulo pays Marina 15.") with "Apply" writing suggested settlements as pending suggestions (not auto-settled).

### 5.6 Personal finance (`/import` + `/money`)
- **Statement snap** (`/import`): drag-drop or camera capture → Storage → parse (§7) → review table: checkbox per row, editable date/description/amount/direction, duplicate rows pre-unchecked and badged "Already tallied" (dedup hash = sha256 of `user|date|amount|normalized description`) → "Add selected". Tally-mark loader with rotating lines ("Reading your statement…", "Counting the strokes…").
- **Cash flow** (`/money`): current month in/out totals (big serif), simple bar-less month list (numbers, not chart junk), per-category breakdown with TallyMarks proportional fills.
- **Budgets**: monthly amount per category, set in UI or by voice ("keep my food budget at 400"). Progress = tally marks filling toward the cap; over budget → vermilion.
- **Weekly Tally — the interview**: dashboard card appears when `checkins.last > 7 days` ("It's been a week. Let's tally up — 2 minutes."). Opens VoiceSheet in check-in mode: agent asks (1) cash/untracked spending this week, (2) upcoming shared costs, (3) anything to settle or list on the Exchange. Answers create transactions/reminders via tools; ends with a spoken 2-sentence recap, stored in `checkins.summary` and shown in `/money` history.
- **Monthly insight**: `/api/insights` generates exactly 3 one-sentence observations from the user's data ("Groceries ran 18% over your budget."), rendered as an editorial pull-quote block, labeled "Read by AI".

### 5.7 The Exchange (`/exchange`)
- Top explainer strip: "Since the 1100s, tallies have been traded. Sell what you're owed. Get paid today."
- **Listing lifecycle**: `open → sold | withdrawn`. Sellers see "My listings" tab.
- **Sell flow (3 steps)**: (1) pick one of your receivables (list computed from net pair balances ≥ a minimum, grouped by debtor); (2) AI price — `/api/price-listing` returns suggested price + one-sentence rationale ("Paulo settles in ~4 days on average — an 8% discount is fair."), seller adjusts within **2%–35% discount clamp**; (3) confirm → listed. Voice path: "sell Paulo's 50" → agent walks the same steps conversationally.
- **Listing card**: debtor initial + Tally Score tallies, face value, asking price, discount %, "AI fair price" chip, days open.
- **Buy**: confirm sheet labeled **"Demo settlement — no real money moves"** → transaction: mark sold; write ledger reassignment: settlement from buyer→seller (purchase, `kind='exchange_purchase'`) and reassignment of the debtor's obligation to the buyer (`claims` row: debtor now owes buyer face value; original pair balance cleared via offsetting settlement `kind='exchange_transfer'`). Activity entries for seller ("You sold Paulo's tally to Marina for 46"), buyer, and debtor ("Your 50 tally is now held by Marina").
- **Tally Score (0–100)**, `lib/score.ts`, transparent: start 50; +2 per settled debt (cap +30); avg days-to-settle ≤7 → +15, ≤14 → +8; −5 per debt open >30 days (cap −25); clamp 0–100. Display as up to five 20-point tally clusters. Recompute on settlement writes.

### 5.8 Activity & notifications
`activity` table drives dashboard preview and `/activity` (grouped by day). Types: expense_added (via voice/manual/statement glyphs), settlement, friend_request, friend_accepted, listing_created, listing_sold, checkin_done, simplify_applied. In-app only; no email/push.

### 5.9 Settings
Name, username, currency, change voice (links to the 4 orbs), sign out. Danger zone: delete account (soft).

---

## 6. Data model (`supabase/migration.sql`) — write it fully

```sql
-- profiles: real users AND managed friends
create table profiles (
  id uuid primary key default gen_random_uuid(),         -- equals auth.uid() for real users
  is_managed boolean not null default false,
  created_by uuid references profiles(id),               -- owner of a managed profile
  name text not null, username text unique, email text,
  dob date, occupation text, currency text not null default 'USD',
  voice_id text, context jsonb default '{}'::jsonb,      -- goals, sharing context
  tally_score int not null default 50,
  created_at timestamptz default now()
);
create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references profiles(id),
  addressee uuid not null references profiles(id),
  status text not null check (status in ('pending','accepted')) default 'pending',
  created_at timestamptz default now(), unique (requester, addressee)
);
create table invites (
  code text primary key, inviter uuid not null references profiles(id),
  used_by uuid references profiles(id), created_at timestamptz default now()
);
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null, currency text not null default 'USD',
  created_by uuid not null references profiles(id),
  archived boolean default false, created_at timestamptz default now()
);
create table group_members (
  group_id uuid references groups(id), user_id uuid references profiles(id),
  primary key (group_id, user_id)
);
create table expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id),
  description text not null, amount numeric(12,2) not null check (amount > 0),
  currency text not null, category text,
  paid_by uuid not null references profiles(id),
  created_by uuid not null references profiles(id),
  created_via text not null check (created_via in ('voice','manual','statement')),
  expense_date date not null default current_date,
  deleted boolean default false, created_at timestamptz default now()
);
create table expense_splits (
  expense_id uuid references expenses(id), user_id uuid references profiles(id),
  share_amount numeric(12,2) not null, primary key (expense_id, user_id)
);
create table settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id),
  from_user uuid not null references profiles(id), to_user uuid not null references profiles(id),
  amount numeric(12,2) not null, kind text not null default 'settle'
    check (kind in ('settle','exchange_purchase','exchange_transfer')),
  settled_at timestamptz default now()
);
create table listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references profiles(id),
  debtor_id uuid not null references profiles(id),
  group_id uuid references groups(id),
  face_value numeric(12,2) not null, asking_price numeric(12,2) not null,
  ai_suggested_price numeric(12,2), ai_rationale text,
  status text not null default 'open' check (status in ('open','sold','withdrawn')),
  buyer_id uuid references profiles(id), created_at timestamptz default now(), sold_at timestamptz
);
create table claims (  -- who currently holds a debtor's obligation after a sale
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id),
  debtor_id uuid not null references profiles(id), holder_id uuid not null references profiles(id),
  amount numeric(12,2) not null, open boolean default true, created_at timestamptz default now()
);
create table statement_uploads (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id),
  storage_path text not null, parsed_at timestamptz
);
create table personal_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id),
  date date not null, description text not null, amount numeric(12,2) not null,
  direction text not null check (direction in ('in','out')),
  category text, source text not null check (source in ('statement','manual','voice')),
  dedup_hash text not null, statement_upload_id uuid references statement_uploads(id),
  unique (user_id, dedup_hash)
);
create table budgets (
  user_id uuid references profiles(id), category text, monthly_amount numeric(12,2) not null,
  primary key (user_id, category)
);
create table checkins (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles(id),
  summary text, created_at timestamptz default now()
);
create table activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),          -- whose feed
  actor_id uuid references profiles(id), type text not null,
  payload jsonb not null default '{}'::jsonb, created_at timestamptz default now()
);
```

Indexes on all FKs and `(user_id, created_at)` for feeds. **RLS on every table**; pattern: real users read/write rows they own; group data readable by group members; managed profiles writable by `created_by`; listings readable by all authenticated. Write the policies out; where a policy would take >30 min, allow a documented server-action path using the service-role client with explicit ownership checks in code (note each case in README).

Balance math in `lib/ledger.ts` only (pairwise nets from splits + settlements ± claims), computed server-side, never trusted from the client.

---

## 7. Anthropic routes — verbatim prompts (model `claude-sonnet-4-6`, server-side only)

- `POST /api/parse-statement` → vision message: *"This is a screenshot of a bank statement or banking app. Extract every visible transaction. Respond with ONLY valid JSON, no prose, no code fences: {"transactions":[{"date":"YYYY-MM-DD","description":string,"amount":number,"direction":"in"|"out"}]}. If the year is not visible assume the current year. If you cannot read the image, respond {"transactions":[]}."* — strip fences defensively, `JSON.parse` in try/catch; friendly UI error on failure ("Couldn't read this one — try a clearer screenshot.").
- `POST /api/categorize` (batch) → *"Categorize each transaction into exactly one of: Food & Drink, Groceries, Transport, Housing, Utilities, Entertainment, Travel, Health, Shopping, Income, Other. ONLY JSON: {"categories":[...same order...]}."*
- `POST /api/price-listing` → input: face_value, currency, debtor stats {settled_count, avg_days_to_settle, open_amount, overdue_count, tally_score}. Prompt: *"You price a small personal IOU for resale between friends. Given the debtor's repayment stats, propose a fair discounted price. Discount must be between 2% and 35%. ONLY JSON: {"suggested_price":number,"discount_pct":number,"rationale":"one plain sentence citing the stats"}."* Clamp server-side regardless.
- `POST /api/insights` → input: month aggregates. *"Write exactly 3 one-sentence observations about this person's month, specific and numeric, no advice-column tone. ONLY JSON: {"insights":[s1,s2,s3]}."*

---

## 8. ElevenLabs agent

`useConversation` (`@elevenlabs/react`) with **clientTools**, each invoking a server action:

| Tool | Params | Effect |
|---|---|---|
| `save_profile_field` | field, value | Onboarding writes |
| `complete_onboarding` | occupation, currency, sharing_context, goal | Finalize + redirect signal |
| `add_friend` | name, email? | Managed friend (§5.4) |
| `create_group` | name, member_names[] | Group + members via name resolution |
| `add_expense` | group_name, description, amount, paid_by_name, split ("equal" or map) | §5.5; returns spoken summary |
| `get_balances` | group_name? | Balance summary string for the agent to speak |
| `mark_settled` | from_name, to_name, amount, group_name? | Settlement |
| `list_receivable` | debtor_name, amount? | Starts sell flow, returns AI price to speak |
| `log_cash_spending` | description, amount, category? | Check-in mode → personal_transactions |

Voice: set via **conversation overrides** with the user's `voice_id` (README: enable overrides in agent security settings; fall back to agent default voice if unavailable). Connection errors → VoiceSheet switches to text mode with a calm notice ("Voice is unavailable — we can type.").

**Agent system prompt** (put in README as a copy-paste block for the ElevenLabs dashboard):

> You are the voice of Split Tally, an AI-native app where friends track, split and even trade what they owe each other. You are warm, precise and brief — this is a spoken conversation: never more than two short sentences per turn. Amounts are numbers; currencies come from context.
> ONBOARDING MODE (new user): ask one at a time: (1) what to call them, (2) student, professional or something else, (3) default currency, (4) who they usually share expenses with, (5) main money goal. After each answer confirm in one sentence — "Got it: you're a student sharing an apartment. Is that right?" — and only after confirmation call save_profile_field. After all five, call complete_onboarding and say: "Your ledger is ready. From now on, just tell me what you spend."
> LEDGER MODE (daily): when the user states an expense, extract description, amount, who paid, group, split; confirm the whole thing once; call add_expense. Unknown person → offer add_friend. Missing group → offer create_group. Balance questions → get_balances. Payments received → mark_settled. Wanting money sooner → offer list_receivable and speak the AI price and rationale.
> CHECK-IN MODE (weekly tally): ask exactly three questions: cash or untracked spending this week (log each with log_cash_spending); upcoming shared costs; anything to settle or sell. Close with a two-sentence recap of their week.
> Style: never lecture about money. Never read long lists — summarize, the screen shows details. If audio fails or the user types, continue seamlessly in text.

---

## 9. Seed data (`supabase/seed.sql`) — must make the demo believable

Demo account `demo@splittally.app` (password in README) as **Ana**. Managed/auxiliary profiles: **Paulo** (slow payer: avg 21 days, 1 overdue → score ~48), **Marina** (fast: avg 3 days → score ~90), **Kenji** (~14 days → score ~70), **Sofia** (new → 50).
- Group **Barcelona Trip** (EUR): 10 expenses (flights split by shares, dinners, museum, taxi, groceries) with mixed payers; net: Paulo owes Ana 50; Kenji owes Marina 40.
- Group **Apartment 4B** (USD): rent, utilities, cleaning; a 6-entry settlement history trail (so scores/averages are real).
- Exchange: 7 open listings across sellers at 4–22% discounts, each with an AI rationale sentence; 1 sold listing for history.
- Ana: 1 parsed statement upload (12 personal transactions across categories), budgets for Food & Drink 400 and Groceries 300 (one slightly over → vermilion state visible), 1 past check-in summary, activity feed covering all types.

---

## 10. Non-functional

- Responsive matrix: test 375 / 768 / 1440. Bottom tabs on <768px.
- `prefers-reduced-motion`: strokes render static, orb breathes only, jelly floats gently or is static.
- Accessibility: visible focus rings (cobalt), labels on all inputs, captions for all spoken agent output (already required), color never the only signal (owed/you-owe also worded).
- Security: service-role key server-only; Storage bucket private with signed URLs; RLS as §6; API routes validate session.
- Meta: titles per page, OG image (cream + strokes + wordmark), favicon = tally glyph.
- No console errors; loading via skeletons or tally loader, never spinners-with-nothing.

## 11. Build order — stop anywhere, ship polished

1. Ink system (tokens, fonts, BrushStroke, TallyMarks, Orb visuals, Jellyfish) + Landing. Landing must be stunning on mobile+desktop before anything else.
2. Migration + seed + auth + demo login + Dashboard rendering seeded data + app shell/tabs.
3. Friends (all three add paths) + Groups + manual expenses + settle + simplify.
4. ElevenLabs: voice picker, spoken onboarding, docked orb with add_expense/get_balances (+ text fallback everywhere).
5. Statement import + `/money` (cash flow, budgets) + categorize.
6. Exchange (sell with AI price, browse, demo buy, claims ledger) + Tally Score.
7. Weekly Tally check-in + insights + Activity page + Settings + OG/meta + final 375/1440 polish pass.

After each stage: run, click through every route, fix all errors before continuing. Keep a `PROGRESS.md` noting stage status and anything intentionally deferred.

## 12. Demo checklist (what the judges will see)

Voice expense end-to-end · spoken onboarding · statement snap → parsed rows · Simplify explanation · Exchange sell with AI rationale + demo buy · Weekly Tally card · strokes drawing in on the landing · jelly floating in the hero · flawless mobile layout. Every one of these must work on the deployed Vercel URL with the demo account.
