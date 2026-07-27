---
version: 1.1
name: Stepwise-design-system-SIT
description: >
  Warm-canvas editorial interface for Stepwise, an AI-assisted assessment
  diagnosis tool built at Singapore Institute of Technology. Palette derives
  from SIT's institutional identity — Zest Red and Dynamic Black on a warm
  paper canvas. Structure follows a humanist editorial system: serif display at
  regular weight, one scarce accent, alternating light/dark surface rhythm, plus
  a product-density layer for the review console. Colour is semantic, never
  decorative: it encodes confidence, agreement, and misconception severity.
---

# Stepwise — Design System (SIT palette)

> Product name is a one-line find-replace. If the team prefers "Margin", "Loupe",
> or "AIMS", swap it throughout; nothing else changes.

---

## 0. The governing idea

Most assessment tools look clinical because they were designed as data tools.
Stepwise is a *judgement* tool — a human reads a student's handwriting and
decides. The interface should feel like a well-made book about someone's work,
not a dashboard about a data point.

**Three rules that override everything else:**

1. **Colour is semantic, never decorative.** Every non-neutral colour on screen
   means something: verified, disputed, low-confidence, severity. The instinct to
   "add a pop of colour" is wrong here. If it doesn't encode state, it doesn't ship.
2. **The student's handwriting is the hero.** Every screen showing a script
   subordinates itself to it. No chrome competes with the artefact.
3. **Red is scarce.** SIT's Zest Red is the brand voltage and *only* the brand
   voltage. See §1.2 — this rule exists for a specific reason and breaking it
   breaks the whole semantic system.

---

## 1. Tokens

### 1.1 Colors

```yaml
colors:
  # — Canvas ————————————————————————————————————————————————————————
  # Warm paper, never pure white. Slightly cooler than a coral-based system
  # so the red reads vivid rather than muddy against it.
  canvas:                "#faf8f5"
  surface-soft:          "#f3f0ea"
  surface-card:          "#eae5dc"
  surface-strong:        "#ded8cc"

  # — Dynamic Black — SIT's second brand colour ————————————————————————
  surface-dark:          "#15140f"
  surface-dark-elevated: "#232219"
  surface-dark-soft:     "#1c1b14"

  # — Ink ————————————————————————————————————————————————————————————
  ink:                   "#15140f"
  body:                  "#3a3833"
  body-strong:           "#242320"
  muted:                 "#6a675e"
  muted-soft:            "#8d897d"
  hairline:              "#e2dcd0"
  hairline-soft:         "#eae5dc"
  on-dark:               "#faf8f5"
  on-dark-soft:          "#9c988e"

  # — Zest Red — SIT brand. SCARCE. —————————————————————————————————
  # TODO: replace with the exact value from SIT's official brand guide
  # (singaporetech.edu.sg/identity — Primary Colour Specifications).
  # Every tint below derives from this one value — swap it and the rest cascades.
  primary:               "#e4002b"
  primary-active:        "#b30022"
  primary-soft:          "#fde8ec"
  primary-hairline:      "#f5c2cc"
  on-primary:            "#ffffff"

  # — SEMANTIC SCALE — the heart of the system ——————————————————————————
  # Note: 'disputed' is mulberry, NOT red. Red belongs to the brand.
  verified:              "#3f7d63"   # reads agreed; symbolic check passed
  verified-soft:         "#e3eee8"
  attention:             "#bd7f21"   # misconception detected
  attention-soft:        "#f8eeda"
  disputed:              "#8a3a5c"   # reads disagreed; human required
  disputed-soft:         "#f4e6ec"
  neutral-low:           "#8d897d"   # low confidence, no judgement implied
```

**Why `disputed` is mulberry and not red.** Zest Red is SIT's institutional
identity. If red also means "this is broken," a user cannot distinguish brand
from error, and every screen carrying the SIT mark reads as alarming. Mulberry
sits far enough from the brand red to be unambiguous, reads as serious rather
than decorative, and holds contrast on cream. **Do not "fix" this by making
disputed red.** It is the single most consequential decision in this palette.

**Semantic mapping — memorise this; it is the system:**

| State | Token | Where it appears |
|---|---|---|
| Reads agreed, symbolic check passed | `verified` | Step rail, criterion border, practice badge |
| Misconception detected | `attention` | Step highlight on the script, misconception card |
| Reads disagreed, human required | `disputed` | Step rail, queue row, transcription banner |
| Confidence below threshold | `neutral-low` | Confidence bar fill, muted step text |
| Educator approved | `verified` | Approved chip, queue row check |
| Brand / primary action | `primary` | Wordmark, one primary button per region, CTA band |

**Do not** introduce a sixth semantic colour. New state → map onto an existing
one, or reconsider whether it's genuinely distinct.

### 1.2 Red discipline

Vivid red at scale is fatiguing and reads as "error" by convention. Its scarcity
is what makes it work.

**Red may appear on:** the wordmark, exactly one primary button per view region,
the pre-footer CTA band, the running dot in the pipeline strip, and a
`badge-primary` for genuinely new things.

**Red may not appear on:** step rails, confidence bars, criterion borders,
charts, icons, dividers, hover states, or any status indicator.

If you're reaching for red to signal urgency, you want `attention` (amber) or
`disputed` (mulberry). Not the brand.

### 1.3 Typography

Free substitutes only — zero-cost build, all from Google Fonts.

```yaml
typography:
  display-xl:   { font: "Instrument Serif, Newsreader, serif", size: 56px, weight: 400, lh: 1.05, ls: -1.2px }
  display-lg:   { font: "Instrument Serif, Newsreader, serif", size: 40px, weight: 400, lh: 1.1,  ls: -0.8px }
  display-md:   { font: "Instrument Serif, Newsreader, serif", size: 30px, weight: 400, lh: 1.15, ls: -0.5px }
  display-sm:   { font: "Instrument Serif, Newsreader, serif", size: 24px, weight: 400, lh: 1.2,  ls: -0.3px }

  title-lg:     { font: "Inter, system-ui, sans-serif", size: 20px,   weight: 500, lh: 1.3 }
  title-md:     { font: "Inter, system-ui, sans-serif", size: 17px,   weight: 500, lh: 1.4 }
  title-sm:     { font: "Inter, system-ui, sans-serif", size: 15px,   weight: 500, lh: 1.4 }

  body-md:      { font: "Inter, system-ui, sans-serif", size: 15px,   weight: 400, lh: 1.55 }
  body-sm:      { font: "Inter, system-ui, sans-serif", size: 13.5px, weight: 400, lh: 1.55 }
  caption:      { font: "Inter, system-ui, sans-serif", size: 12.5px, weight: 500, lh: 1.4 }
  caption-caps: { font: "Inter, system-ui, sans-serif", size: 11.5px, weight: 500, lh: 1.4, ls: 1.4px }

  # Product-density additions
  data-sm:      { font: "Inter, system-ui, sans-serif", size: 12.5px, weight: 500, lh: 1.3, tnum: true }
  mono:         { font: "JetBrains Mono, ui-monospace, monospace", size: 13px, weight: 400, lh: 1.6 }
  math:         { font: "KaTeX_Main", size: "inherit" }
```

**Unbreakable rules:**
- Serif at display sizes only, always weight 400. Never bold a serif display —
  it reads as bombastic. More emphasis → bigger, not heavier.
- Sans for everything at title size and below.
- **Tabular figures in all data contexts** (`font-variant-numeric: tabular-nums`).
  Scores that jitter as they change look broken.
- Never render raw LaTeX to a user. KaTeX everywhere.

> If SIT publishes an official digital typeface and you want closer alignment,
> substitute it for Inter in the sans roles. Keep the serif for display — the
> serif/sans split is what stops this looking like a corporate template.

### 1.4 Spacing, radius, elevation

```yaml
spacing:  { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, section: 80 }
rounded:  { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, pill: 9999 }
elevation:
  flat:    "none"
  raised:  "0 1px 2px rgba(21,20,15,0.06)"
  overlay: "0 8px 24px rgba(21,20,15,0.12)"
```

Elevation is scarce. Hairlines do most of the separation work.

---

## 2. Two densities

The most important structural decision. Marketing vocabulary (96px bands, 64px
headlines, hero grids) is wrong for a console where someone processes 70 scripts.

| | **Editorial density** | **Product density** |
|---|---|---|
| Where | Landing page, pitch surface, student feedback view | Review console, upload, dashboard, queue |
| Vertical rhythm | `spacing.section` (80px) between bands | `spacing.lg` (24px) between regions |
| Headlines | `display-lg` / `display-xl` serif | `title-md` sans; `display-sm` serif at most, once |
| Row height | n/a | 36–44px |
| Separation | Generous whitespace | Hairlines, background steps |
| Feel | A well-set page | A quiet, fast instrument |

**The student feedback view is deliberately editorial.** A student reads it once,
carefully, possibly while disappointed. Give it air. The educator console is the
opposite: dense, keyboard-first, built for the fortieth script of the evening.

That contrast is a design argument you can make out loud in the pitch.

---

## 3. Signature components

### `script-viewer` — the emotional core

The student's handwriting on a `surface-dark` backdrop, boxes overlaid.

- Backdrop `surface-dark` (Dynamic Black); the script sits on it like a print on a mat.
- Step regions render as 1.5px rounded rectangles, `rounded.sm`.
- Region colour is **semantic**: `verified` where reads agreed, `attention` where
  a misconception was found, `disputed` where reads diverged. Never `primary`.
- Fill at 8% alpha, stroke full. Never obscure the handwriting.
- Hovering a step row raises its region to 16% fill. The link between panes must
  feel physical.
- Zoom on scroll, pan on drag. No zoom chrome.

**This gets disproportionate polish.** If the boxes don't line up with the
handwriting, nothing else you build matters.

### `step-row`

```
┌─┬─────────────────────────────────────────────────┐
│▍│ 4   ∫ x·e^x dx = (∫x dx)(∫e^x dx)        [0.71] │
└─┴─────────────────────────────────────────────────┘
 │  │    │                                       │
 │  │    KaTeX-rendered, selectable          confidence
 │  step index, data-sm, tabular
 3px semantic rail — verified / attention / disputed
```

- 44px minimum height; grows for multi-line maths.
- Left rail 3px semantic. Fastest-scanning element on screen — an educator reads
  rails before text.
- Confidence as a 3px bar beneath, filled to confidence, in `neutral-low`.
- Inline-editable on click; edit state gets a `primary` focus ring at 15% alpha
  (the one place primary appears in the console body).
- **Disputed variant** expands to show both readings stacked, each with a "use
  this" affordance. Never hide a disagreement behind a click.

### `evidence-chip`

The most important interaction in the product.

- Pill, `rounded.pill`, `surface-card` background, `caption` type, "Step 4".
- Click scrolls the transcription pane to that step *and* pulses its region in
  the viewer.
- This is what makes a mark auditable rather than asserted — the visible form of
  the PRD's "evidence or invalid" rule.

### `criterion-card`

- `canvas` background, hairline border, `rounded.lg`, `spacing.lg` padding.
- Header: criterion name (`title-sm`) + level badge + score (`data-sm`, tabular).
- Justification `body-sm`, `muted`. Evidence chips beneath.
- 3px left border in the semantic colour of the underlying confidence.
- Footer: `Accept` / `Adjust`. Accept is primary **only on the focused card** —
  never render forty red buttons at once.

### `confidence-bar`

- 3px, `rounded.pill`, track `hairline`, fill `neutral-low`.
- **Never coloured by value.** Confidence is not correctness; conflating them
  teaches the educator the wrong thing.

### `misconception-card`

Student-facing. `surface-soft` background, `attention` left rail.

- Name `title-md`, severity as `caption-caps`.
- Explainer `body-md`. Provenance at the bottom in `caption`, `muted`:
  "Lecture 6, slide 12".
- Collapsed by default so feedback isn't a wall.

### `practice-item`

- `canvas` card, hairline, `rounded.lg`.
- Difficulty as a three-segment ramp (scaffold / target / extension), filled
  segments in `verified`.
- Prompt in KaTeX. Hint ladder reveals one at a time in `surface-soft`.
- Solution gated behind an attempt.
- **Verification badge** in `verified` — "Checked symbolically" / "Checked by
  model". Showing your verification is part of the product's argument.
- Provenance in `caption`, `muted`: "Variant of Tutorial 6 Q3".

### `pipeline-strip`

Eight dots, one per stage, joined by a 1px hairline.

- Pending `hairline`; running `primary` with a slow pulse; done `verified`;
  failed `disputed`.
- Stage label appears only under the running dot.
- The one place animation earns its keep, and a justified console appearance of
  red because it marks live activity rather than status.

### `review-queue-row`

- 44px, hairline separator, no card chrome.
- Columns: pseudonym · agreement bar · score (tabular) · flags · status.
- **Sorted lowest-confidence first by default.** The sort order is an ethical
  position — attention goes where judgement is needed. Worth a sentence in the pitch.
- Keyboard-focusable; `Enter` opens.

---

## 4. Keyboard model (non-negotiable for the console)

Someone marking 70 scripts will not reach for a mouse. This is a real
time-saving mechanism and metric M9 depends on it.

| Key | Action |
|---|---|
| `A` | Approve and advance |
| `J` / `K` | Next / previous criterion |
| `1`–`5` | Set level on focused criterion |
| `E` | Edit focused step transcription |
| `S` | Skip, leave in queue |
| `?` | Shortcut overlay |

Persistent quiet hint bar in the console footer. Demoing keyboard-only marking
on stage takes ten seconds and is genuinely impressive.

---

## 5. Do / Don't

### Do
- Anchor on the warm canvas. The tint against Zest Red is what stops this
  reading as a generic red-and-white corporate site.
- Serif display at 400 with negative tracking; sans below.
- Let colour mean something. Every non-neutral colour encodes state.
- Give the script viewer the most polish of anything you build.
- Alternate surface modes on editorial pages: cream → cream-card → black →
  cream → red-callout → black-footer.
- Tabular numerals wherever numbers sit near other numbers.
- One primary action per view region.

### Don't
- Don't use pure white or cool grey for canvas.
- Don't bold the serif. Bigger before heavier.
- **Don't let red escape §1.2.** No red rails, bars, borders, charts, or status.
- Don't make `disputed` red. See §1.1.
- Don't colour the confidence bar by value.
- Don't hide a read disagreement behind a click. Disagreement is the feature.
- Don't apply editorial spacing to the console.
- Don't add hover states beyond what's specified. Default and active only.
- Don't introduce a fourth surface tone or a sixth semantic colour.

---

## 6. Responsive

| Breakpoint | Behaviour |
|---|---|
| < 768px | Console is **desktop-only** — show a polite "open on a larger screen" card. Student views fully responsive and mobile-first: script pinch-zooms, feedback stacks, practice 1-up. |
| 768–1024px | Console collapses to two panes with a script/transcription toggle. Criterion cards stay visible. |
| 1024–1440px | Full three-pane console at 4-4-4. |
| > 1440px | Panes at 3-5-4; editorial content caps at 1160px. |

Students read feedback on phones. Educators mark on laptops. Design for each
rather than compromising both into one grid.

---

## 7. Implementation notes

- Ship tokens as CSS custom properties on `:root`, then map to a Tailwind theme
  extension. Never inline a hex value in a component.
- Google Fonts with `display: swap`. Instrument Serif and Inter only.
- KaTeX CSS must load before first paint of any maths or the layout jumps.
- **Accessibility: every semantic colour needs a redundant non-colour cue** — pair
  each rail with an icon or short text label. A colour-blind educator must be
  able to tell `disputed` from `verified`. Two-minute fix now; awkward question
  from a judge later.
- Contrast: `muted` (#6a675e) on `canvas` passes AA for body text. `muted-soft`
  does not — decorative labels only, never content someone must read.
- `primary` (#e4002b) on white passes AA for large text and UI components but is
  borderline for small body text. Buttons and headings, not paragraphs.

---

## 8. On using SIT's identity

You're an SIT team building for an SIT hackathon, so drawing on the institutional
palette is appropriate and reads as belonging. Two sensible limits:

- **Get the exact Zest Red** from SIT's brand guide rather than shipping the
  approximation above. Every tint in §1.1 derives from that one token, so it's a
  one-value change.
- **Don't reproduce the SIT logo as your product mark.** Build a simple Stepwise
  wordmark in the display serif; if you want the affiliation visible, add a small
  "Built at SIT" line in the footer. A student project shouldn't look like an
  official university product.

---

## 9. Known gaps

- Dark mode unspecified. Don't build it for the hackathon.
- Cohort heatmap needs a sequential scale derived from `attention`; not yet specified.
- Print styles for a marked-script export are out of scope.
- Motion limited to the pipeline pulse and evidence-chip region pulse. Add nothing else.
