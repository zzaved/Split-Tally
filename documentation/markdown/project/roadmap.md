# Roadmap

Split Tally was built to a fixed deadline against a spec with seven stages in it. All seven shipped,
and the production build is clean. What follows is the other half of that sentence: what was left
out, why, and what would come next.

Everything on this page is a line that was drawn on purpose. Nothing here is a surprise found
afterwards.

:::note[Why a roadmap belongs in the documentation]
A submission that only lists what it built is asking to be trusted. A submission that also lists what
it did not build, and can say why for each item, is offering something to check. The second is worth
more, and it is cheaper to write honestly than to write around.
:::

## Deliberately not built

**Table 24: what is not built yet, and the reason in each case**

| Not built | Why not | What it would take |
|---|---|---|
| **Removing a friend** | Found by the QA pass rather than planned. Removing a friend has to decide what happens to shared groups and to open balances, and that decision is not a UI question | A rule for what a removal does to an outstanding balance, then a policy and a control |
| **Adding a member to an existing group** | Members are chosen when the group is created, by form or by voice. Adding one afterwards changes who can read every expense already in it | An insert policy scoped to the creator, plus a decision about retroactive visibility |
| **Editing an expense** | Delete is a soft delete and is wired up; edit is not. Speaking a correction through `fix_last_entry` covers the same need faster, so the form-based edit lost its argument | An edit path that recomputes the splits and writes a corrective feed entry |
| **Netting decided by anyone but the group's creator** | The `groups` update policy is creator-only. Letting any member flip it is a policy change, not a UI one, and it silently rearranges other people's balances | A member-level policy on that one column, or a vote |
| **Selling part of a receivable** | The sell flow lists the whole free balance for a debtor and currency. Partial listings need the ledger to track which slice of a debt a claim covers | A slice on the `claims` row, and reconciliation when a debtor pays less than the face value |
| **Account deletion** | Described in the settings danger zone rather than implemented. Deleting a person who appears in other people's splits is a data question with real consequences for their ledgers | An anonymisation path that keeps the arithmetic intact for everyone else |
| **Real settlement rails** | Out of scope for a designathon, and the honest thing is to say so rather than to fake a payment sheet | A payment provider, and everything that comes with holding money |
| **Email or push notifications** | The `activity` table drives an in-app feed only. A notification system is a product of its own | A delivery layer and a preferences model |
| **Group deletion** | Archiving exists; deleting does not, and that is deliberate. The expenses inside a group still count toward everybody's balances and scores, so removing it would quietly rewrite other people's ledgers | Nothing. This one is not planned |

**Figure 53: what a group's creator can change, and the sentence everyone else gets instead of a control that does nothing**

![A group page sidebar showing the "This group" card with rename and put-away controls, and beneath it the "Who pays whom" card where a non-creator sees the current mode stated in words with the line "Only whoever created the group can change this"](../static/img/screens/group-settings.png)

**Figure 54: the settings danger zone, saying plainly that account deletion is not wired up in this build**

![The settings page with a card outlined in vermilion headed "Danger zone", its text reading that deleting an account is not wired up in this build and that everything lives in the reader's own Supabase project](../static/img/screens/settings.png)

## What comes next, in order

**1. The `/score` page latency.** It stayed near ten seconds on desktop even warm, and it is the one
figure from the QA pass that did not improve with the fixes around it. It is first because it is a
measured defect on a page that carries the product's most distinctive idea. Root-cause it on a quiet
server before drawing any conclusion about the other routes.

**2. The first conversational turn.** 7.5 seconds under load. That is the moment somebody decides
whether talking is the calm way to use the app, so it is worth more attention than any later turn.
Warming the session before the orb is pressed is the obvious first thing to try.

**3. Removing a friend, and adding a member to a group.** Both are gaps the QA pass walked into, and
both are policy work rather than interface work. They are grouped because they share the same
question: what happens to a balance when the relationship that produced it goes away.

**4. Partial listings.** Selling half of what you are owed is the thing a real receivables market
does, and the ledger is one column away from supporting it. This is the largest genuinely new feature
on the list.

**5. Speaking in more languages.** Text already mirrors whatever language you write in, and the
prompt was fixed during the QA pass to stop answering Portuguese in English. The voice model is
English-only, so spoken Portuguese is approximate. Swapping in a multilingual voice makes the spoken
path as good as the typed one.

**6. `/money` and `/import` photographed at 375 and 1440.** Both were built to the same responsive
rules as everything else and neither was checked at both widths with a screenshot. The rest of the
app was.

**7. A second look at the score formula.** It is deliberately simple and deliberately legible: start
at 50, two points a settlement, a bonus for speed, a penalty for age. That legibility is the point, so
any change has to keep a person able to reproduce the number by hand. Weighting by amount rather than
by count is the obvious candidate and would have to survive that test.

## Known limitations

These are true of the shipped app right now. Every one of them is also stated in the interface, in
the place where it matters.

- **The marketplace payment is simulated.** It is labelled **"Demo settlement: no real money moves"**
  on the confirmation where it happens. The ledger movement behind it is real: a purchase writes the
  listing, two settlements, a claim and three feed entries, and the balances that result are computed
  by the same code as every other balance.
- **Converted totals are a convenience, not the ledger.** A tally stays in the currency it was made
  in. The combined figure on the dashboard is a courtesy, labelled with the ECB rate date it used,
  and if `api.frankfurter.dev` is unreachable the dashboard shows the per-currency figures on their
  own and says so.
- **Live speech captions are not word by word.** The SDK streams voice-activity scores continuously
  but only hands over a transcript once an utterance closes, so the sheet reads "listening…" while
  you speak and shows the recognised sentence for a beat afterwards. The orb swelling with your voice
  is what fills that gap, and it does it without a second microphone consumer.
- **Tally Scores are computed from what the viewer can see.** Row level security stops one user
  writing another user's profile, so `profiles.tally_score` is a cache and `lib/scores.ts` recomputes
  on read wherever the history is visible. Two people can therefore see slightly different scores for
  the same third person, which is the correct behaviour for a system where nobody is allowed to read
  a ledger they are not part of.
- **The managed-profile claim is best effort.** If it fails, the signup still succeeds and the
  account is usable; the history simply stays on the stub. A failed claim never blocks anyone from
  getting in.
- **Four flows run on the service-role client.** Each is listed in
  [Setup and deployment](../using-it/setup-and-deployment), each has an explicit ownership check
  written in code before the call, and each exists because the flow genuinely cannot be expressed as a
  policy. Everything else goes through the user's own client.
- **Test data is still on the demo account.** The QA pass left three managed contacts and four test
  groups behind. Groups can now be put away through the interface; the contacts cannot be removed
  yet, which is why removing a friend is on the list above.
- **Voice is English.** The agent mirrors the language in text and speaks English.
