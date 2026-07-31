---
sidebar_position: 1
---

# Split Tally

**Finance without forms.** Say what you spent, and the ledger writes itself.

<div className="st-figure">

**Figure 1: The landing page at 1440px, brush strokes drawing themselves in and the Tally Jelly floating in the hero**

![The Split Tally landing page painting itself in, the wordmark, the headline "Finance without forms", and the jellyfish mascot drifting beside it](/img/screens/landing-hero.gif)

</div>

🚀 **[Open the live app](https://split-tally-seven.vercel.app)**: the landing page needs no
account, and "Explore the demo" signs straight into a seeded ledger with a season of history in it.

Built solely by **[Pablo Azevedo](https://github.com/zzaved)** (`zzaved`) for the
**AI Designathon @ MERGE 2026**, category **DESIGN ENG: deliver AI-native UX end to end, through
implementation**. Source: **[github.com/zzaved/Split-Tally](https://github.com/zzaved/Split-Tally)**.

## What this is, in one paragraph

Split Tally is a shared-expense ledger where talking is the way you write to it. You press the orb,
say "I paid 62 for lunch with Paulo, split it", the assistant reads the whole thing back in one
sentence, and on "yes" it writes an `expenses` row, the matching `expense_splits` and an `activity`
entry through the same server action the manual form uses. It reads a photograph of your bank
statement into dated, categorised rows you tick off. It prices what you are owed and lets you sell
it to another user, so a receivable you cannot collect this month becomes cash today. Fifteen
Postgres tables with row level security on every one of them, thirteen client tools on a live
ElevenLabs agent, four Anthropic routes pinned to `claude-sonnet-4-6`, and one thing that is
simulated: the money movement at the end of an Exchange purchase, labelled "Demo settlement: no
real money moves" on the screen where it happens. The ledger movement behind that purchase is real.

## Watch the demo

{/* Demo video embed: paste the YouTube id here once the recording is uploaded. */}

## Try it yourself

The landing page has a one-tap demo. If you would rather sign in by hand, or see the Exchange from
the buyer's side, use Table 1.

<div className="st-figure">

**Table 1: Demo accounts on the live deployment**

| Account | Email | Password | Useful for |
|---|---|---|---|
| **Ana** (the demo) | `demo@splittally.app` | `tallystick2026` | Everything. This is what "Explore the demo" opens. |
| Marina | `marina@splittally.app` | `tallystick2026` | Buying a listing, since Ana cannot buy her own |
| Kenji | `kenji@splittally.app` | `tallystick2026` | A second buyer, and a mid-range Tally Score |
| Júlia | `julia@splittally.app` | `tallystick2026` | A smaller ledger, seen from the other side |

</div>

Paulo and Sofia are *managed friends*: people Ana added by name who have no account. They can be
put in groups, owe money and be sold, which is what makes the demo hold together.

<div className="st-figure">

**Figure 2: Ana's dashboard on the seeded account, with the balances, the Weekly Tally card and the docked orb**

![The Split Tally dashboard showing what Ana is owed and what she owes in serif figures, her groups, the weekly tally prompt, and the orb docked in the bottom right corner](/img/screens/dashboard.png)

</div>

## Where the name comes from

A *split tally* was a stick of hazel with a debt notched across it, then split lengthways in two.
The creditor kept the thicker half, the *stock*. The debtor kept the *foil*. The grain of the wood
ran through both, so only the two original halves fitted back together, and neither party could
add a notch after the fact without the other's half giving them away. It was a receipt that could
not be forged by either side because neither side held all of it.

The part that matters here is what happened next. A creditor who needed money before the debtor
could pay would sell the stock at a discount to somebody willing to wait, and the debt moved with
it: whoever held the stock was owed. Notched sticks changed hands in England for around seven
hundred years, which makes them history's first market in what people were owed.

Split Tally revives the stick and the market. The ledger is the tally. The Tally Score is the
question a buyer of a stock has always had to answer, which is whether this particular person
actually pays. The Exchange is the discount.

## What to read next

- **[Problem and Solution](/docs/problem-and-solution)**: why splitting money with friends is
  forms, what the incumbents get wrong, and the three moves that answer it.
- **[Judging Alignment](/docs/judging-alignment)**: one section per criterion, with the file paths
  and numbers behind each claim. Start here if you are grading.
- **[AI Integration](/docs/how-it-works/ai-integration)**: every AI touchpoint, the model, the
  transport, and what it writes to the ledger.
- **[Architecture](/docs/how-it-works/architecture)**: routes, server actions, the two ElevenLabs
  transports, and where the service-role client is used.
- **[The Ledger](/docs/how-it-works/the-ledger)**: the pairwise balance arithmetic, netting, the
  Tally Score, and what an Exchange sale does to all three.
- **[User Flows](/docs/using-it/user-flows)**: every screen, walked through.
- **[Setup and Deployment](/docs/using-it/setup-and-deployment)**: run it yourself.
- **[Design System](/docs/project/design-system)**: "Ink on Cream", the strokes, the tally marks
  and the orb.
- **[Quality](/docs/project/quality)**: the QA pass, what it found, and what was fixed.
- **[Roadmap](/docs/project/roadmap)** and **[Team](/docs/project/team)**.
