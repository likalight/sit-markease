# 7-Minute Live Demo Plan — SIT MarkEase

The self-serve guided-tour overlay is gone, but the **route** it walked is exactly
right for a live pitch — it just needs a presenter driving it instead of a spotlight
UI narrating itself. This plan follows that same route end to end, live, on a real
split screen: **instructor on the left, student on the right, both windows visible
at once**, so the judge watches cause → effect in real time instead of taking your
word for it.

## Setup (before the 7 minutes start)

- **Literal split screen**, two browser windows tiled side by side on one display
  (not tab-switching — the whole point is the judge sees the instructor's action on
  the left and its effect on the right in the same shot).
  - **Left — Instructor.** `/login` → "Continue as Dr. Tan (demo)" → lands on `/review`.
  - **Right — Student.** `/enter/student`, ID `111` → lands on `/submit`.
- Ideally **two presenters**, one per window, talking to each other in character
  ("okay, I've issued it" / "I can see it now") — reads far more like a real
  product than one person alt-tabbing. If it's one presenter, that's fine too;
  just narrate the switch explicitly ("now jumping to the student's screen").
- Know the two demo assessments: **Physics** (formative) and **Math** (summative)
  — real seeded past-paper questions with real sample scripts, not placeholders.
- Reset both assessments to an **unissued** state before you go on stage — the
  whole value of this route is watching something become visible on the right
  the moment it's issued/released on the left. If Physics is already "issued"
  when you start, that beat is gone.
- Confirm `AIMS_FIXTURE_MODE` — fixture mode replays cached AI responses with
  zero network calls (safe against bad venue wifi); live mode actually calls
  the providers (more impressive if the network's solid). Decide in advance,
  don't switch mid-demo.

## The route

This mirrors the two tours' step order exactly — rubric first, then the two
modes diverge, both ending in exam-prep → practice.

### 0:00–0:30 — Cold open
State the problem in one breath before touching either screen: large classes,
handwritten open-ended work, no time to give real feedback. (Problem-Solution
Fit, 30% of the rubric — land this before any UI.)

### 0:30–1:15 — Shared: rubric authoring (Left only)
1. `/assignments` → open either assessment → "Review rubric."
2. On `/assignments/[id]/rubric`: point at one criterion, its weight, its
   levels — editable right here, not baked in at question-creation time.
3. "Issue settings" → assign students → save. State once, for both modes:
   *nothing is visible to a student until this step.*

Do this once, narrate that it's identical machinery for both modes, then
diverge.

### 1:15–3:15 — Formative route (Physics): student self-serve, no gate
Left stays idle/visible; right becomes active.

1. **Right:** `/submit` → Physics card → "Start attempt" → `/work/[id]`.
2. **Right:** "Use sample script" (real photographed script, real pipeline —
   not a mock) → submit. Narrate while it runs: OpenCV line detection → two
   independent model reads cross-checked → SymPy check where checkable.
3. **Right:** back on `/submit`, "Review assessment" → `/feedback` —
   **no instructor touched this.** Point at the source-image-beside-
   transcription pairing first (the trust mechanism), then the mark,
   per-part evidence boxes, misconception card.
4. **Right:** this first attempt is deliberately incomplete (a real
   ran-out-of-time script, one question untouched) — "Revise and resubmit"
   → `/work/[id]` again → this time upload the complete/correct sample
   script → submit → `/submit` → "Review assessment" → improved `/feedback`.
   This is the beat that proves formative has *no ceiling* on retries.
5. **Right:** `/exam-prep` → "Generate practice set" — targets the exact
   gap just diagnosed, freshly generated, SymPy/LLM-verified before it
   ships. Open it, type a real answer, reveal the solution, self-report
   the outcome. This is your Innovation (20%) beat — say so.

### 3:15–5:45 — Summative route (Math): instructor-gated, both screens
1. **Left:** `/assignments` → Math → "Upload a script" → `/assignments/[id]/upload`
   → "Use sample script" (a script covering the whole paper — question
   boundaries detected automatically).
2. **Left:** land on the mapping screen (`/scripts/[id]/mapping`) — check
   which pages belong to which question, "Confirm mapping" → this is what
   triggers real grading.
3. **Left:** `/review` → open the submission → `/review/[id]`. Same
   source-image/transcription pairing the student saw, now with rubric
   criteria + evidence indices + the AI's recommended per-criterion score.
4. **Left:** click "Edit step" on one line the AI wasn't confident about —
   correct it live, watch the score recompute. Proves the human isn't a
   rubber stamp.
5. **Left:** "Approve & next" (keyboard `A` reads well) — repeat until the
   queue's clear. State plainly: this writes `final_grades` **and** an
   `audit_log` row. Nothing reaches the student yet.
6. **Left:** back on `/assignments` → "Release all results" — all approved
   questions release together, not piecemeal.
7. **Right (the payoff shot):** the student's `/submit` now shows "Review
   assessment" for Math — click it → `/feedback`. No resubmit button this
   time (contrast this explicitly against the formative loop): *this is
   the mark, reviewed and released by a human.*
8. **Right:** `/exam-prep` → generate + attempt one more practice item off
   this result, same as the formative close — reinforces it's one shared
   mechanism regardless of mode.

### 5:45–6:30 — Zoom out: architecture and safeguards
No new screen needed. In one breath: zero-cost build, two independent
models on two different vendor families for transcription cross-checking
(not two models from the same family), local embeddings, symbolic
verification, and — the one concrete proof point — a criterion result
without `evidence_step_indices` fails schema validation; that's enforced
in code and a DB constraint, not a prompt asking nicely.

### 6:30–7:00 — Close
One sentence back to the problem statement, one sentence on what's next.
Stop talking. Take questions.

## If something breaks live

- **AI call fails/times out:** fall back to a second pre-seeded submission
  already fully graded — jump straight to its `/feedback` or `/review/[id]`
  instead of narrating a retry.
- **Wifi dies:** this is exactly what `AIMS_FIXTURE_MODE=true` is for —
  decide before you go on, don't switch mid-demo.
- **Wrong persona signed in:** `/enter/student` and `/login` are one click
  away in a fresh tab — don't sign out first, just open a new tab.
- **Running long:** the cut point is step 8 of the summative route (the
  second exam-prep visit) — you've already made the "no resubmit, human
  released it" contrast by step 7, which is the point that matters.

## Why not the old self-serve tour

The guided-tour overlay was built for an unattended visitor clicking through
alone — spotlight tooltips, its own Next buttons, a 15s DOM-removal fallback
timeout between certain steps. All of that is dead weight in a presenter-driven
pitch: a judge isn't self-navigating, they're watching you drive, and the
waiting-for-animated-tooltip beats would only slow the exact route this plan
now walks live, faster, on two real windows you control directly.
