# QA map

Everything worth testing in Split Tally, grouped so the groups do not overlap
and nothing falls between them. Each line is a check with a verdict, so this
doubles as the record of what was actually run rather than what was intended.

Two viewports throughout: **1440x900** and **375x812**. A pass on one is not a
pass.

The standard the AI is held to is not accuracy alone. The competition brief is
that talking should be the calm way to use the app, so a correct answer that
arrives after eight silent seconds is a failure, and so is one that makes a
person repeat themselves.

---

## A. Entering and leaving

| # | Check |
|---|---|
| A1 | Sign up with a new email, land in onboarding |
| A2 | Onboarding: name, currency, voice, then dashboard |
| A3 | Sign out, land somewhere sensible with nothing personal left on screen |
| A4 | Sign in again with the same account, see the same data |
| A5 | Demo entry, then sign out, then reach signup without being bounced back |
| A6 | Protected route while signed out redirects rather than erroring |
| A7 | Browser back after sign out does not show the previous account's ledger |
| A8 | Wrong password, unknown email: the message says what to do next |
| A9 | Two tabs, sign out in one, act in the other |

## B. Shell and layout

| # | Check |
|---|---|
| B1 | Every route renders at both viewports with no body horizontal scroll |
| B2 | The orb never covers a control, and hides while the sheet is open |
| B3 | Bottom navigation clears the safe area on mobile |
| B4 | No console errors or failed requests on any route |
| B5 | Long names and large amounts do not overlap or clip |
| B6 | Tap targets at 375px are at least 40px |

## C. The ledger

| # | Check |
|---|---|
| C1 | Create a group, it appears with the right members |
| C2 | Add an expense: equal, exact and shares splits each land correctly |
| C3 | Balances agree between dashboard, group and person views |
| C4 | Settle up moves the pair to zero |
| C5 | An expense in another currency converts and says the rate it used |
| C6 | Simplify debts produces fewer payments and the same net position |
| C7 | Delete or edit an expense and watch every dependent number follow |
| C8 | Empty states read as an invitation, not as an error |

## D. Score

| # | Check |
|---|---|
| D1 | The dial draws correctly at both viewports, label legible |
| D2 | The number matches what the formula produces from the ledger |
| D3 | A new account reads as unproven rather than as a bad score |
| D4 | "I am improving" appears only when earned, and the rules are stated |

## E. Exchange

| # | Check |
|---|---|
| E1 | Sell: pick, price, adjust the discount, list |
| E2 | The discount clamp holds at both ends |
| E3 | Buy a listing, both settlements land, the feed tells the story |
| E4 | A bought tally is claimed from the new holder, not the old one |
| E5 | Buying does not move the original pair's balance |

## F. Guided fill

| # | Check |
|---|---|
| F1 | Expense, group, onboarding and sell walks each complete |
| F2 | The microphone is acquired once per walk, never per question |
| F3 | Closing the panel mid-walk releases the microphone |
| F4 | Navigating away mid-walk does not leave a live stream behind |
| F5 | An unparseable answer asks again without losing earlier answers |
| F6 | Values written by voice survive the next render |
| F7 | The ring follows the field being filled, including after scrolling |

## G. The conversation

| # | Check |
|---|---|
| G1 | Opens on the subject of the button that was pressed |
| G2 | Answers about the ledger agree with the database |
| G3 | Writes through tools land, with `created_via` recorded |
| G4 | Typing and speaking both work, and can be mixed |
| G5 | Latency: first token, and first audio, measured |
| G6 | It never narrates its own reasoning |
| G7 | Ending and reopening starts clean |

## H. Trying to break the conversation

| # | Check |
|---|---|
| H1 | Instructions hidden in a group or expense name are not obeyed |
| H2 | Asked for its system prompt, it declines without drama |
| H3 | Asked about another person's ledger, it cannot reach it |
| H4 | Absurd amounts, negative amounts, zero |
| H5 | Nonsense, silence, and a very long message |
| H6 | Another language |
| H7 | Rapid contradictory instructions |
| H8 | Asked to do something destructive, it confirms first |
| H9 | Interrupting it mid-sentence |

## I. Stress and edges

| # | Check |
|---|---|
| I1 | Double-press every submit; nothing is created twice |
| I2 | Slow network: every wait is announced |
| I3 | Microphone permission denied: the app says so and offers typing |
| I4 | Offline mid-action |
| I5 | Reduced motion honoured |
| I6 | Keyboard only: every control reachable, focus visible |

---

## Findings

Recorded in `QA-FINDINGS.md` as they are confirmed, with severity, evidence
and what was done about each.
