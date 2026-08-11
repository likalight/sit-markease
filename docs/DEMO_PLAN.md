# 7-Minute Slot Plan — SIT MarkEase (2 min pitch + 5 min demo)

Two minutes of deck, five minutes of live product — not seven minutes of
slides with a demo squeezed onto the end. The deck (`src/app/page.tsx`) is
7 slides, ~15–20s each: Title → Background+Problem → Solution → Anticipated
Impact → Scalability → Feasibility (+ one line on LMS integration) → Close.
Everything the old, longer deck spent 8 slides showing as static
screenshots (the Read/Score/Teach journey, the Attempt→Feedback→Practice
loop) got cut as *slides* — not deleted, still real content in
`src/lib/pitch/content.ts` and `src/lib/homepage/content.ts` — because the
next five minutes show that exact story live and interactively. Walking
through screenshots of it first just spends the clock twice on the same
beat.

The demo itself: one screen, one presenter, toggling between the instructor
and student view with a single click (a small "Switch to student view →" /
"Switch to instructor view →" pill fixed in the bottom-right corner, on
every educator/student page — `src/components/demo-role-switcher.tsx`,
wired to the existing `switchRoleAction`), full-screen each time so the
room can actually read the rubric criteria and transcription text. No split
screen — with one projector, halving the screen makes the review console
(already dense) unreadable from the back of the room.

## Setup (before you start)

- One browser window, full screen, sitting on the deck's title slide
  (`/`) when you begin talking.
- You'll toggle roles with the corner pill during the demo half — it signs
  you straight into the other role and lands you on `/submit` (student) or
  `/review` (instructor), no retyping credentials, no separate tab.
- Know the two demo assessments: **Physics** (formative) and **Math**
  (summative) — real seeded past-paper questions with real sample scripts,
  not placeholders.
- Run `npm run reset-demo` (needs `AIMS_CONFIGURE_DEMO=true`) to put both
  assessments back to **draft/unissued** with the roster still assigned —
  the whole value of the route is watching something become visible on the
  student side the moment it's issued/released on the instructor side. If
  either assessment is already "open" when you start, that beat is gone.
- Then, still before you're on stage: sign in as Dr. Tan, open Math →
  "Upload a script" → "Use sample script" → confirm mapping, and **leave it
  unapproved**. That's the real ungraded submission the review-queue beat
  needs — running OCR + grading live from a cold upload is 20–40s of dead
  air, so pre-seed it.
- Confirm `AIMS_FIXTURE_MODE` — fixture mode replays cached AI responses
  with zero network calls (safe against bad venue wifi); live mode
  actually calls the providers (more impressive if the network's solid).
  Decide in advance, don't switch mid-demo.

## 0:00–2:00 — The deck

Click or scroll through all 7 slides at a natural talking pace — the
eyebrow on each one already shows "N / 07" so you always know how much is
left. Roughly:
- **Title** (10s): let it land, don't over-narrate the headline.
- **Background + Problem** (25s): institutional context, then the 4
  problem bullets plus the 94.92% stat — this is Problem-Solution Fit, 30%
  of the rubric, land it early.
- **Solution** (20s): the one-sentence mechanism (two independent AI reads
  cross-check each other, a human approves every mark) plus the 3 solution
  cards.
- **Anticipated Impact** (25s): the student/instructor before-after, close
  on the "compounds every week" line.
- **Scalability** (15s): many disciplines, one pipeline — let the
  discipline pills speak for themselves.
- **Feasibility** (25s): "this is the live app, not a mockup," the honest
  "not yet measured at classroom scale" line (say it plainly, it reads as
  rigor not weakness), then the one-line LMS/Brightspace mention.
- **Close** (10s): "Let's see it live" — click **"Try it as an
  instructor →"**, which is also your handoff into the demo below.

## 2:00–7:00 — The live demo

Full journey, live, for both modes — not a highlight reel, and no padding
at the end either: every minute goes to a feature, nothing is reserved for
a wrap-up speech. The only thing skipped is the OCR/mapping wait on the
Math upload (pre-seeded above, nothing to watch); every click a judge
would actually want to see stays live.

### 2:00–3:00 — Shared: rubric authoring + feedback style (as instructor)
1. `/assignments` → open either assessment → "Review rubric."
2. On `/assignments/[id]/rubric`: point at one criterion, its weight, its
   levels — editable right here, not baked in at question-creation time.
3. "Issue settings" → confirm the roster. Then the new bit: **"Feedback
   style."** *"This is the instructor's call, per assessment, not the
   student's — how much of the answer the AI is allowed to give away."*
   Point at the three options: Socratic (guiding questions only, never
   states the answer), Guided (names the mistake and explains it, still
   withholds the correct working), Reveal (shows the correct working and
   final answer outright). Leave Physics on **Guided** for now → save.
   State once, for both modes: *nothing is visible to a student until this
   step.*

Do this once, narrate that the roster/rubric machinery is identical for
both modes, then diverge.

### 3:00–4:15 — Formative route (Physics): student self-serve, no gate
Click **"Switch to student view →"** to hand off.

1. `/submit` → Physics card → "Start attempt" → `/work/[id]`.
2. "Use sample script" (real photographed script, real pipeline — not a
   mock) → submit. Narrate while it runs: OpenCV line detection → pix2text
   + AWS Textract feed independent OCR hints into one multimodal model
   read, which reports its own per-step confidence → SymPy check where
   checkable.
3. Back on `/submit`, "Review assessment" → `/feedback` — **no instructor
   touched this.** Point at the source-image-beside-transcription pairing
   first (the trust mechanism), then the mark, per-part evidence boxes,
   misconception card. Notice the feedback explains the mistake but
   doesn't hand over the fix — that's the Guided mode you just set.
4. This first attempt is deliberately incomplete (a real ran-out-of-time
   script, one question untouched) — "Revise and resubmit" → `/work/[id]`
   again → this time upload the complete/correct sample script → submit →
   `/submit` → "Review assessment" → improved `/feedback`. This is the beat
   that proves formative has *no ceiling* on retries.
5. `/exam-prep` → "Generate practice set" — targets the exact gap just
   diagnosed, freshly generated, SymPy/LLM-verified before it ships. Open
   it, type a real answer, reveal the solution, self-report the outcome.
   This is your Innovation (20%) beat — say so.

### 4:15–4:45 — Instructor beat: choosing Reveal for Math
Click **"Switch to instructor view →"**.

`/assignments` → Math → "Issue settings" → **Feedback style** → **Reveal**
→ save. *"This is a final exam — the class won't revisit it, so I want
students shown the correct working directly, not left to re-derive it.
That's a teaching decision, and now it's one click, per assessment."*

### 4:45–6:45 — Summative route (Math): instructor-gated
1. `/review` → open the pre-seeded Math submission → `/review/[id]`. Same
   source-image/transcription pairing the student saw, now with rubric
   criteria, evidence indices, and the AI's recommended per-criterion
   score — the on-screen legend explains what "conf" means, no need to
   define it yourself.
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
   *this is the mark, reviewed and released by a human* — **and point at
   the feedback text itself showing the correct working**, right next to
   Physics' guided feedback from five minutes ago that didn't. Same
   pipeline, two different teaching decisions, both made by the instructor.
   That contrast is your close — no separate wrap-up slide needed.

If you land here with time to spare: `/exam-prep` → generate + attempt one
more practice item off this result. Cut this first if you're running long.

## If something breaks live

- **AI call fails/times out:** fall back to a second pre-seeded submission
  already fully graded — jump straight to its `/feedback` or `/review/[id]`
  instead of narrating a retry.
- **Wifi dies:** this is exactly what `AIMS_FIXTURE_MODE=true` is for —
  decide before you go on, don't switch mid-demo.
- **Wrong persona signed in:** the corner switcher pill signs you into the
  other role in one click — no need to sign out first.
- **Running long:** cut the deck's Scalability slide first (10s), then the
  summative route's second exam-prep visit (see above) — in that order.

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
