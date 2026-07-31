---
sidebar_position: 1
---

# Ink on Cream

The design system has one rule underneath all the others: **nothing in Split Tally may look like
fintech**. No dark mode. No glassmorphism. No terracotta. No pure white, no grey text, and no
gradients anywhere except inside the orb, where the gradient is the point.

What replaced it is a Mediterranean menu: cream paper, cobalt ink, a serif that takes money
seriously, and a hand that is visibly a hand. Every stroke on every screen is an SVG path pushed
around by a turbulence filter, drawn in on view, and then still. The identity is not a logo applied
to a template. It is the way the interface is built.

It lives in two places and nowhere else: `app/globals.css` for the tokens and the motion, and
`components/ink/` for the fifteen components that use them.

## The palette

Six colours. Six, for the entire product, and Table 19 is all of them.

<div className="st-figure">

**Table 19: the colour tokens, read from `app/globals.css`**

| Token | Value | What it is for |
|---|---|---|
| `--color-cream` | `#F4F0E5` | The page. Never white |
| `--color-cream-deep` | `#EBE5D6` | Cards and wells, one step down from the page |
| `--color-cobalt` | `#2547C9` | Every stroke, the primary button, and "owed to you" |
| `--color-navy` | `#1B2B6B` | Text. Never grey |
| `--color-ink-soft` | `#5A679E` | Secondary text, still in the blue family |
| `--color-vermilion` | `#C0391B` | "You owe", overdue, destructive. Used sparingly and never decoratively |
| `--color-orb-cobalt` | `#2547C9` | The orb's aurora |
| `--color-orb-cyan` | `#35C8E8` | The orb's aurora |
| `--color-orb-violet` | `#3A1F9E` | The orb's aurora |

</div>

Three of those are the orb's, and they exist as separate tokens precisely because the orb is the one
sanctioned exception to the no-gradients rule. Nothing else in the product is allowed to reach for
them.

Two consequences of a six colour palette are worth stating, because both are decisions rather than
side effects. Borders are not a colour: they are `color-mix(in srgb, var(--color-navy) 10%,
transparent)`, so a hairline is the text colour thinned rather than a grey nobody chose. And shadows
never exceed 0.06 opacity, tinted navy rather than black, so a card lifts off the page without
looking like it was pasted on.

Colour is never the only signal. "Owed to you" is cobalt *and* says "is owed"; "you owe" is vermilion
*and* says "owes". A screenshot of this app in greyscale loses nothing but prettiness.

<div className="st-figure">

**Figure 39: the palette, six colours and the three that belong only to the orb**

![Nine colour swatches painted as brush strokes on a cream ground, labelled cream, cream deep, cobalt, navy, ink soft and vermilion, with the three orb gradient colours set apart below them, each with its hex value in letter-spaced capitals](/img/brand/palette.png)

</div>

## The type

Two families, and a hard division of labour between them.

**Cormorant Garamond**, at 500 and 600, carries display text and every large number. That second half
matters more than the first: money in this app is set in a serif at 40 to 72 pixels, and it is the
single most recognisable thing about a Split Tally screenshot. Balances are not data points. They are
the headline.

**Inter** carries body text at 400, and labels at 500 in uppercase with `0.18em` of tracking. Those
labels are everywhere: eyebrows above sections, navigation, the caption under a tally mark, the
status line under the orb. They are what stops a page of serif numbers from feeling like a wedding
invitation.

Table 20 is the scale, and where each step actually lands.

<div className="st-figure">

**Table 20: the type scale, and where each step is actually used**

| Step | Family | Used for |
|---|---|---|
| 11 | Inter 500, uppercase, 0.18em | Eyebrows, nav, chips, tab labels |
| 12 | Inter 400 or 500 | Hints, timestamps, the small print under a figure |
| 14 | Inter 400 | Body text inside cards, rows, transcripts |
| 16 | Inter 400 | Page body, landing paragraphs |
| 20 | Cormorant 500 | Per-row amounts, check-in summaries, guided questions |
| 28 | Cormorant 500 | Card headings, section titles, secondary amounts |
| 40 | Cormorant 500 | Page titles at mobile width |
| 56 | Cormorant 600 | Page titles, hero headline at mobile width |
| 72 | Cormorant 600 | The hero headline |

</div>

Two utilities do the work that a scale alone cannot.

`tabular` sets lining tabular figures, so a column of amounts lines up on the decimal point rather
than shimmering as the digits change.

`amount-xl` and `amount-hero` are fluid: `clamp(1.875rem, 9vw, 3.5rem)` and `clamp(2.25rem, 11vw,
4.5rem)`. They were fixed at 56 and 72 pixels, which is right on a laptop and wrong on a phone. A
four figure total already ran off a 375px screen and took the whole body into horizontal scroll. The
lower bound keeps the number emphatic; the upper bound is the size it always was. That fix came out
of the QA pass and is documented in [Quality](./quality).

<div className="st-figure">

**Figure 40: the type scale, Cormorant Garamond for money and Inter for everything that labels it**

![A type specimen on cream, the number 1,248.00 set large in Cormorant Garamond above a descending scale of sizes, with letter-spaced uppercase Inter labels beside each step naming where it is used](/img/brand/type-scale.png)

</div>

## Brush strokes

`<BrushStroke>` is six hand-painted cobalt marks: a long wavy sweep, a short thick underline swash, a
big corner arc, a loose enclosure that sits behind a balance, a diagonal slash cluster (the tally's
fifth mark, blown up), and a wide double wave.

Each one is two or three offset paths at descending opacity, under an `feTurbulence` and
`feDisplacementMap` filter. That layering is the whole trick. One path with a wobble filter reads as a
vector line that someone broke. Two or three offset paths at 0.85, 0.5 and 0.32 opacity, all
displaced by the same noise field, read as gouache: the edges are ragged, the density varies along
the stroke, and where they overlap the colour deepens the way wet paint does.

They draw themselves in when they enter the viewport, via `stroke-dasharray` and `stroke-dashoffset`
on a `pathLength={1}` path, over 1.2 seconds, with each layer delayed 0.09 seconds behind the one
before it. Then they are static. The rule they follow is that they are used **large and asymmetric**:
bleeding off a hero corner, under a headline, behind a number, never as a tidy decorative divider
centred on the page.

`<AmbientStroke>` is the same component running behind the app shell, at 13% opacity, over a 13
second cycle: one mark at a time paints itself somewhere behind the page, holds, and fades so the next
placement can take over. Never two at once. The interface always has a hand moving in it and never
becomes noisy.

<div className="st-figure">

**Figure 41: the six brush strokes painting themselves in, each two or three offset paths under a turbulence filter**

![Six cobalt brush strokes on cream drawing themselves in one after another, a long wave, a short underline swash, a corner arc, a loose enclosure, a diagonal slash and a wide double wave, their edges ragged rather than geometric](/img/brand/brush-strokes.gif)

</div>

## Tally marks

`<TallyMarks>` is the brand's unit of counting: four wobbled uprights and a diagonal fifth, exactly as
notched into a stick. Three different wobbles are cycled by position, so no two neighbouring marks are
identical.

It does five jobs, which is why it earns its place:

- **Counters.** How many expenses a group holds, how many friends are waiting.
- **Proportional fills.** Spending per category on `/money`, scaled against the largest.
- **Budget progress.** Marks fill toward the cap, and turn vermilion past it.
- **Tally Scores.** Five clusters of twenty points each, so a score reads as a quantity of marks
  before it reads as a number.
- **Loading.** `<TallyLoader>` draws marks one by one, clears, and starts again, under a rotating
  status line. **There is not one spinner in this product.**

Beyond five groups it stops drawing and prints a remainder, because twenty-six marks in a row stops
being legible and starts being a texture. Marks that are counted but not yet reached are drawn as
ghosts at 0.16 opacity, so a budget shows its cap as well as its consumption.

<div className="st-figure">

**Figure 42: tally marks doing five jobs, from a counter to a budget to a Tally Score**

![Rows of hand-drawn tally marks, four uprights and a diagonal fifth in each group, shown counting expenses, filling a budget toward a faint ghosted cap, turning vermilion where it is exceeded, and clustered into a Tally Score](/img/brand/tally-marks.png)

</div>

## The orb, and its aurora

The orb is the only gradient in the product, and it is built to look like weather rather than like a
loading indicator.

A dark sphere, `radial-gradient(circle at 50% 52%, #241463, #0E0930)`, with four light pools
floating over it:

1. a conic gradient sweeping cobalt into cyan into violet, blurred at 10% of the orb's size;
2. a cyan radial pool at 34% 30%, screen blended;
3. a violet radial pool at 70% 70%, screen blended;
4. a cobalt radial pool at 64% 22%, screen blended.

Screen blending is what makes them read as aurora rather than as one averaged gradient. Each pool
drifts on its own keyframe at 15, 21 and 27 seconds, folding a rotation together with a translation
and a change of scale, at periods that do not divide into each other, so the light never repeats the
same arrangement.

Every dimension is derived from `--orb-size`, so one component serves 52 pixels in the guided walk,
64 as the docked button, 104 in the sheet and `clamp(180px, 40vw, 240px)` full screen in onboarding,
with the blur radii, the inner shadows and the drift amplitudes all scaling with it.

Four states come from the SDK, and each one is a different behaviour rather than a different colour:

- **idle**: breathes at 6 seconds, 2.2% of scale.
- **listening**: breathes faster, at 3.4 seconds, and grows three expanding rings. It also carries
  `--orb-level`, the agent's own voice activity score, straight into `transform: scale(1 + level *
  0.13)` with a 90ms transition. The orb swells while you talk.
- **thinking**: every aurora layer's duration drops, so the light churns.
- **speaking**: pulses at 0.82 seconds.

That listening behaviour replaced something. A second transcriber used to run alongside the agent
purely to caption speech live, which meant two consumers fighting over one microphone: Chrome ends
its recogniser at every pause, restarting it cycles the device, and the browser's recording indicator
flickers on and off through the whole conversation. The orb swelling with your voice says "I can hear
you" more immediately than a word ever did, costs nothing, and touches the microphone zero extra
times.

One WebKit detail is baked in because it fails visibly without it: Safari does not reliably clip a
screen-blended child to a rounded `overflow: hidden` box, which left a purple square sitting behind
the sphere on iOS. A radial `mask-image` clips it for certain, and `translateZ(0)` pushes the whole
thing onto its own layer so the blend resolves against the sphere rather than against the page.

`<OrbGlyph>` is the same palette compressed into a 14 pixel dot. It marks everything the assistant
created: voice expenses, statement rows, AI prices. A judge has to be able to see the AI, so the AI
is labelled everywhere it touched something.

<div className="st-figure">

**Figure 43: the orb in its four states, idle, listening with the voice driving its scale, thinking, and speaking**

![An aurora sphere in blues and violet cycling through four behaviours: breathing slowly when idle, swelling with expanding rings while listening, churning faster while thinking, and pulsing while speaking](/img/brand/orb-states.gif)

</div>

## The Tally Jelly

The mascot is a jellyfish, drawn in exactly the same ink language as everything else. Never pixel
art, never a 3D render, never a sticker.

Its bell is two curved strokes and a wavy hem. Its tentacles are **exactly five**: four wavy uprights
and a diagonal fifth. It is a tally mark that swims. It draws itself in over about a second, then
floats, with each tentacle swaying on its own duration between 4.2 and 5.2 seconds so the movement
never syncs up.

It appears in the landing hero, in empty states, on the 404, and as a glyph beside the wordmark and
in the favicon.

<div className="st-figure">

**Figure 44: the Tally Jelly, whose five tentacles are a tally mark that swims**

![A cobalt line-drawn jellyfish on cream, its bell made of two curved strokes and a wavy hem, with four wavy vertical tentacles and a fifth crossing them diagonally, drifting gently](/img/brand/tally-jelly.png)

</div>

## The score dial

`<ScoreDial>` is an open ring with the number sitting in the gap and the band name underneath.

The arc is built from real SVG arc commands rather than a dash pattern on a rotated circle. The dash
approach has to be told the circumference, and gets the start angle and the cap positions wrong the
moment either changes. It starts at 225 degrees and sweeps 270, which leaves the gap at the bottom
where the eye expects a gauge to open, and a second lighter pass runs just inside the main arc to give
it a painted edge rather than a flat one.

The colour comes from the band, not from the number, and that distinction is the important one. A
score of 50 with no settled history reads as **No record yet** in ink-soft. A score of 50 with a
genuinely mixed record reads as **Mixed record**. Those two 50s mean opposite things to anyone
deciding whether to lend, and the dial refuses to present an absence of information as a measurement.
The band name lives under the ring rather than inside it, because at any size worth using it does not
fit in the middle without colliding with the stroke.

<div className="st-figure">

**Figure 45: the score dial across three bands, the ring's colour coming from the record rather than from the number**

![Three open ring dials side by side on cream, one reading 91 in cobalt labelled "Settles fast", one reading 50 in ink soft labelled "No record yet", one reading 48 in vermilion labelled "Slow payer"](/img/brand/score-dial.png)

</div>

## The wobbly highlight ring

`<Highlight>` is the component the guided walk uses to point at the field it is asking about, and it
is the clearest single example of what "Ink on Cream" means in practice.

Software boxes things. People circle them. So this is a loop, not a box: a path with per-corner
wobble offsets, round caps, a turbulence displacement so no two sides are quite parallel, and an
overshoot at the end where the pen carries past the point it started from. Two passes, one at 3px and
0.85 opacity and one at 1.4px and 0.4 opacity offset by a pixel and a half, so it has the weight of a
real mark.

It is anchored to a live element through a `ResizeObserver` and scroll and resize listeners, so it
follows the field through scrolling, through a keyboard opening on a phone, and through a layout
change. The QA pass measured it tracking its target to within a thousandth of a pixel.

The wobble is seeded by the step index, so consecutive fields are not ringed identically. Two
questions in a row look like two circles somebody drew, not one circle that moved.

<div className="st-figure">

**Figure 46: the hand-drawn ring, a loop with an overshoot rather than a box, following the field being filled**

![A cobalt ring drawn by hand around a form input, its sides not quite parallel, its corners rounded unevenly and its end overshooting where it closes, redrawn around the next field as the walk moves on](/img/brand/highlight-ring.gif)

</div>

## Motion

Motion in this product is either a stroke being drawn, a thing arriving, or the orb being alive.
Nothing decorates. Table 21 is every animation in the system, beside what reduced motion does to it.

<div className="st-figure">

**Table 21: every animation in the system, and what reduced motion does to it**

| Motion | Normally | Under `prefers-reduced-motion: reduce` |
|---|---|---|
| Brush strokes | Draw in over 1.2s on entering view, layers 0.09s apart | Rendered complete, no animation |
| Tally marks | Draw one by one, 0.34s each, 0.075s apart | Rendered complete, no animation |
| Ambient stroke | One stroke paints in over 5.5s, holds, fades, 13s cycle | The draw-in is disabled, so it fades in and out only |
| Orb aurora | Four pools drifting at 15s, 20s, 21s, 27s | Frozen |
| Orb body | Breathes; faster while listening, pulses while speaking | Breathes only, slowed to 7s, in every state |
| Orb ripple rings | Expand and fade every 1.9s | Static at 0.28 opacity |
| The Tally Jelly | Floats at 5.4s, tentacles sway at 4.2 to 5.2s | Floats at 9s, tentacles still |
| Content rise-in | 10px up, 0.7s, on entering view | No transform, no fade, content just present |
| Sheets and panels | Scrim fades over 0.22s, panel rises 14px over 0.32s | No animation, they appear |
| Skeletons | A highlight slides across, 1.5s | Static block |

</div>

Reduced motion is honoured by disabling animations, not by hiding elements. Every stroke, every tally
mark and every ring is still there, drawn complete. Somebody who cannot tolerate movement gets the
same interface, finished.

Three rules govern the rest:

**Nothing that moves delays a word.** The sheet's entrance is 0.32 seconds, short enough that the
first thing the assistant says is never waiting behind an animation.

**Movement carries information or it does not happen.** The orb's aura only stirs while it is
genuinely picking you up. The ripple rings appear only in the listening state. The budget marks fill
because a number changed.

**Transitions are 150 to 200 milliseconds.** Hovers, colour changes, the netting switch. Long enough
to see, short enough not to feel operated.

## Copy

The copy is part of the design system, and it has a rule that is unusual enough to be worth stating
plainly.

**There is not one em dash in this product.** Not in a button, not in an error, not in a spoken
reply, not in a table. Where an em dash would have gone, the sentence takes a colon when what follows
explains, and a comma when it is an aside. It is a small discipline and it changes the register: an em
dash is a writer clearing their throat, and an app that has been talked to should not clear its
throat.

The rest:

- **Buttons say what they do.** "Record expense", "List for sale", "Settle up", "Record the payment",
  "Snap a statement". Not "Submit", not "Continue", not "Get started".
- **Errors explain and direct.** *"Couldn't read this one, try a clearer screenshot."* *"The split has
  to add up before it saves."* *"That email and password do not match an account."* Never a vague
  apology and never a code.
- **No exclamation marks.**
- **No marketing adjectives.** Nothing in this app is seamless, powerful or effortless.
- **Numbers instead of adjectives.** "Three questions, about two minutes." "€4.50 still to allocate."
  "2 tallies open past a month, minus 10."
- **Absence is said out loud.** An empty state is an invitation, not an error: *"A group is anything
  you share costs on: a flat, a trip, a dinner club."* And an unknown is named as an unknown: *"That
  is not a red flag, it is an absence of information."*
- **The uncomfortable thing goes in the same sentence as the feature.** The Exchange purchase reads
  *"Demo settlement: no real money moves"* on the screen where it happens, not in a footnote.

## Accessibility

- Focus rings are visible, cobalt, at 2px with a 2px offset, applied through `:focus-visible` on the
  root so every control has one without opting in.
- Colour never carries meaning alone.
- The orb is `aria-hidden` where a caption beside it already says the state, and carries a label
  where it does not.
- Every input has a real label; the tally marks carry a text label wherever they encode a number, and
  are marked decorative wherever they do not.
- Tap targets at 375px are at least 40 pixels. Three of them were not, and the QA pass caught it: the
  fix grows the padding and pulls the layout back with a negative margin, so the target grows without
  the design moving.
- A skip link sits at the top of every authenticated page.
