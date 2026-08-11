# 7-Minute Live Demo Plan — SIT MarkEase

The self-serve guided-tour overlay is gone, but the **route** it walked is exactly
right for a live pitch — it just needs a presenter driving it instead of a spotlight
UI narrating itself. One screen, one presenter: you toggle between the instructor
and student view with a single click (a small "Switch to student view →" /
"Switch to instructor view →" pill fixed in the bottom-right corner, on every
educator/student page — `src/components/demo-role-switcher.tsx`, wired to the
existing `switchRoleAction`), full-screen each time so the room can actually read
the rubric criteria and transcription text. No split screen — with one projector,
halving the screen makes the review console (already dense) unreadable from the
back of the room.

## Setup (before the 7 minutes start)

- One browser window, full screen. You'll toggle roles with the corner pill —
  it signs you straight into the other role and lands you on `/submit` (student)
  or `/review` (instructor), no retyping credentials, no separate tab.
- Know the two demo assessments: **Physics** (formative) and **Math** (summative)
  — real seeded past-paper questions with real sample scripts, not placeholders.
- Run `npm run reset-demo` (needs `AIMS_CONFIGURE_DEMO=true`) to put both
  assessments back to **draft/unissued** with the roster still assigned — the
  whole value of this route is watching something become visible on the student
  side the moment it's issued/released on the instructor side. If either
  assessment is already "open" when you start, that beat is gone.
- Then, still before you're on stage: sign in as Dr. Tan, open Math → "Upload a
  script" → "Use sample script" → confirm mapping, and **leave it unapproved**.
  That's the real ungraded submission the review-queue beat needs — running
  OCR + grading live from a cold upload is 20–40s of dead air, so pre-seed it.
- Confirm `AIMS_FIXTURE_MODE` — fixture mode replays cached AI responses with
  zero network calls (safe against bad venue wifi); live mode actually calls
  the providers (more impressive if the network's solid). Decide in advance,
  don't switch mid-demo.

## The route

Full journey, live, for both modes — not a highlight reel. The only thing
skipped is the OCR/mapping wait on the Math upload (pre-seeded above, nothing
to watch); every click a judge would actually want to see stays live.

### 0:00–0:30 — Cold open
State the problem in one breath before touching the screen: large classes,
handwritten open-ended work, no time to give real feedback. (Problem-Solution
Fit, 30% of the rubric — land this before any UI.)

### 0:30–1:15 — Shared: rubric authoring (as instructor)
1. `/assignments` → open either assessment → "Review rubric."
2. On `/assignments/[id]/rubric`: point at one criterion, its weight, its
   levels — editable right here, not baked in at question-creation time.
3. "Issue settings" → confirm the roster → save. State once, for both modes:
   *nothing is visible to a student until this step.*

Do this once, narrate that it's identical machinery for both modes, then
diverge.

### 1:15–3:15 — Formative route (Physics): student self-serve, no gate
Click **"Switch to student view →"** to hand off.

1. `/submit` → Physics card → "Start attempt" → `/work/[id]`.
2. "Use sample script" (real photographed script, real pipeline — not a
   mock) → submit. Narrate while it runs: OpenCV line detection → two
   independent model reads cross-checked → SymPy check where checkable.
3. Back on `/submit`, "Review assessment" → `/feedback` — **no instructor
   touched this.** Point at the source-image-beside-transcription pairing
   first (the trust mechanism), then the mark, per-part evidence boxes,
   misconception card.
4. This first attempt is deliberately incomplete (a real ran-out-of-time
   script, one question untouched) — "Revise and resubmit" → `/work/[id]`
   again → this time upload the complete/correct sample script → submit →
   `/submit` → "Review assessment" → improved `/feedback`. This is the beat
   that proves formative has *no ceiling* on retries.
5. `/exam-prep` → "Generate practice set" — targets the exact gap just
   diagnosed, freshly generated, SymPy/LLM-verified before it ships. Open
   it, type a real answer, reveal the solution, self-report the outcome.
   This is your Innovation (20%) beat — say so.

### 3:15–5:45 — Summative route (Math): instructor-gated
Click **"Switch to instructor view →"** to hand back.

1. `/review` → open the pre-seeded Math submission → `/review/[id]`. Same
   source-image/transcription pairing the student saw, now with rubric
   criteria + evidence indices + the AI's recommended per-criterion score.
2. Click "Edit step" on one line the AI wasn't confident about — correct it
   live, watch the score recompute. Proves the human isn't a rubber stamp.
3. "Approve & next" (keyboard `A` reads well) — repeat until the queue's
   clear. State plainly: this writes `final_grades` **and** an `audit_log`
   row. Nothing reaches the student yet.
4. Back on `/assignments` → "Release all results" — all approved questions
   release together, not piecemeal.
5. Click **"Switch to student view →"** — the payoff shot. `/submit` now
   shows "Review assessment" for Math → click it → `/feedback`. No resubmit
   button this time (contrast this explicitly against the formative loop):
   *this is the mark, reviewed and released by a human.*
6. `/exam-prep` → generate + attempt one more practice item off this
   result, same as the formative close — reinforces it's one shared
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
- **Wrong persona signed in:** the corner switcher pill signs you into the
  other role in one click — no need to sign out first.
- **Running long:** the cut point is step 6 of the summative route (the
  second exam-prep visit) — you've already made the "no resubmit, human
  released it" contrast by step 5, which is the point that matters.

## Why not split screen

With one projector, splitting the screen halves the space the review
console and script viewer get — and those are already dense (rubric
criteria, transcription text, source image side by side). A judge in the
back row can't read either half. Toggling full-screen, one click each way
via the corner switcher, keeps every screen legible and still lets you make
the same "watch this happen on the other side" moment — just sequentially
instead of simultaneously.

## Why not the old self-serve tour

The guided-tour overlay was built for an unattended visitor clicking through
alone — spotlight tooltips, its own Next buttons, a 15s DOM-removal fallback
timeout between certain steps. All of that is dead weight in a presenter-driven
pitch: a judge isn't self-navigating, they're watching you drive, and the
waiting-for-animated-tooltip beats would only slow the exact route this plan
now walks live, faster, full-screen, one click at a time.
