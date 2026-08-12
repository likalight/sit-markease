# Handoff — resuming this project in a new Claude account

Written 2026-08-12, right after the pitch-deck screenshot refresh (commit `eb236e4`).
This file exists so a fresh Claude session — with zero memory of this conversation —
can pick the project up cold. Read this first, then the docs it points to.

## What this project is

**SIT MarkEase** (internal names: AIMS / aims-v2) — an AI grading and feedback tool,
built for a hackathon (Group 15). Full spec: `docs/PRD.md` (v2.0, zero-cost build) —
read it in full before writing code, same as `CLAUDE.md` says. `CLAUDE.md` at the repo
root has the non-negotiable rules (structured outputs only, human approves every grade,
never correct a student's transcription, etc.) — that file travels with the repo, so it
loads automatically in a new account. No need to restate its contents here.

Other standing docs, already in the repo:
- `docs/DECISIONS.md` — every deviation from the PRD, with a one-line rationale each.
- `docs/STUBS.md` — everything stubbed/mocked/not-built, and why.
- `docs/DEMO_PLAN.md` — the live walkthrough script (which routes, which order, what to say).
- `docs/DESIGN.md` — design tokens / component patterns.

## Repo / demo state

- GitHub: `likalight/sit-markease`, branch `master`. Nothing is pushed automatically —
  every push this session was done explicitly, on request.
- **Vercel is retired as of 2026-08-12 — the hackathon demo runs entirely on
  `localhost`.** As of 2026-08-13, all Vercel vestiges have been removed: the `.vercel/`
  project-link directory is deleted, the 11 now-dead `export const maxDuration` route
  configs (Vercel-only serverless timeout, no effect self-hosted) are stripped from the API
  routes that had them, `README.md`'s "Try it live" section now gives local run
  instructions instead of the old public URL, and the pitch deck's closing slide
  (`src/app/page.tsx`, slide 7) prints "RUNNING LOCALLY · localhost:3000" instead of a
  `sit-markease.vercel.app` link. See `docs/DECISIONS.md`'s "Vercel deployment retired"
  entry for the full rationale. No more `vercel deploy` / `vercel alias` going forward
  unless explicitly asked again — verify everything against a local `npm run dev` server.
  The still-live `sit-markease.vercel.app` deployment (from before this cleanup) is not
  being kept in sync and should be treated as stale, not a source of truth.
- `.env` is gitignored (secrets) — it does **not** travel with the repo. The new account
  needs its own `.env` populated before `npm run dev` will do anything beyond serve static
  pages. Keys needed (get the values from wherever they're currently stored — password
  manager, the old machine, or Vercel's project env vars, not from this repo):
  ```
  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  AIMS_GEMINI_API_KEY, AIMS_GEMINI_MODEL, AIMS_GEMINI_RPM
  AIMS_GROQ_API_KEY, AIMS_GROQ_MODEL, AIMS_GROQ_RPM
  AIMS_OPENAI_API_KEY, AIMS_OPENAI_MODEL, AIMS_OPENAI_RPM
  AIMS_PROVIDER_PRIMARY, AIMS_PROVIDER_FAST, AIMS_PROVIDER_ADJUDICATOR
  AIMS_AWS_ACCESS_KEY_ID, AIMS_AWS_SECRET_ACCESS_KEY, AIMS_AWS_REGION
  AIMS_AGREEMENT_THRESHOLD, AIMS_DUAL_READ_ENABLED, AIMS_LINE_DETECTOR, AIMS_RETRIEVAL_MODE
  AIMS_AI_LIVE, AIMS_FIXTURE_MODE
  AIMS_DEMO_EDUCATOR_EMAIL, AIMS_DEMO_EDUCATOR_PASSWORD
  AIMS_DEMO_STUDENT_EMAIL, AIMS_DEMO_STUDENT_PASSWORD
  SIDECAR_URL
  ```
  Set `AIMS_FIXTURE_MODE=true` to work with zero network calls / zero API keys (serves
  cached responses from `local-data/ai-cache/`, which **is** committed). Real end-to-end
  work (like this session's screenshot capture) needs `AIMS_FIXTURE_MODE=false` and real keys.

## Running the demo locally

```
npm install
npm run dev          # http://localhost:3000
```

Sign-in shortcuts (Route Handlers, set the session cookie and redirect — added this
session specifically so a live demo can open two already-signed-in tabs with one click):
- `http://localhost:3000/demo/instructor` → signs in as the demo educator, lands on `/review`
- `http://localhost:3000/demo/student` → signs in as demo student `111`, lands on `/submit`
- The pitch deck's closing slide (`/`, slide 7, `OpenDemoButton`) opens both of the above
  in two new tabs from a single click — the intended way to kick off a live demo.

`AIMS_FIXTURE_MODE=true` in `.env` makes every AI call replay from
`local-data/ai-cache/` (committed, zero network calls) — safest option for the actual
timed demo slot, since it can't 429 or go slow on stage. `AIMS_FIXTURE_MODE=false` hits
real providers and is what this session used to capture fresh screenshots; keep it `true`
for the live pitch unless a specific beat needs to show a real, uncached model call.

## Outstanding action item — two SQL migrations not yet run

`supabase/migrations/0009_add_assessment_feedback_mode.sql` and
`0010_add_ai_assessment_mode.sql` exist in the repo but have **not** been applied to the
live Supabase database — this environment only has REST keys, not a Postgres password, so
they've had to wait for someone to run them manually in the Supabase SQL editor. Flagged
repeatedly across sessions; still not confirmed done as of this write-up. Do this before
relying on `feedback_mode` or the third `assessment_mode` value (`'ai'`) working against
the real DB — the app code already assumes both exist.

## What just happened this session (most recent work, already shipped)

The 7-slide `/` pitch deck (`src/app/page.tsx` + `src/components/pitch/*`) had 4 screenshots
that were reused from an earlier deck version and didn't precisely match what their slide
claimed. Replaced all 4 with screenshots captured fresh from the live running app via
Playwright (real data, real pipeline runs, not mocked):

- `public/deck-review-console.png` — slide 1 hero, the full review console.
- `public/deck-flagged-review.png` — slide 3, a flagged/unapproved Math submission showing
  per-step AI confidence *and* the real "Approve & next" button.
- `public/deck-student-feedback.png` — slide 5, a released submission with a named
  misconception card.
- `public/deck-practice-item.png` — slide 6, a **Physics** practice item (deliberately a
  different subject than the Math shown elsewhere, to visually back the "many disciplines"
  claim rather than just asserting it).

Slide 4 (three assessment-mode cards) was deliberately left as plain text — never needed a
screenshot; an attempt to also add a live AI-mode assessment row hung on form submission
(rubric-structuring server action never returned) and wasn't pursued further — worth a look
if picking this back up, see "Loose ends" below.

Two real bugs were found and fixed while capturing (not just deck cosmetics — both affect
the live product, not only the deck):
- `src/components/math.tsx` (`MathText`) fed plain-English text with zero LaTeX delimiters
  straight into KaTeX, which silently drops spaces between words. Added a `looksLikeProse()`
  heuristic (several real English words, no LaTeX command → render as plain text). Known
  gap: doesn't catch *mixed* prose+math with no delimiters at all (e.g. "Differentiate the
  function f(x) = 4x^3 - 2x + 1." still renders mashed together, seen live in `/exam-prep`
  during this session) — only pure-prose-with-zero-math was fixed. A more complete fix would
  need the LLM prompt that generates these practice items to reliably wrap inline math in
  `$...$`, or a smarter split.
- `src/lib/design/misconception-label.ts` (new file) — novel-candidate misconceptions
  (`src/lib/pipeline/s5-diagnose.ts`, `candidate.proposed_name`) sometimes come back from the
  model as a raw snake_case slug (`final_value_accuracy_issue`) instead of a written label.
  Added a display-only title-case formatter, wired into both `review-console.tsx` and
  `student-feedback-console.tsx`. This is a formatting fix, not a change to stored data or
  to what the model returns.

All committed (`eb236e4`) and pushed. At the time this was done, it was also deployed to a
Vercel preview and aliased onto `sit-markease.vercel.app` — but per the "Repo / demo state"
section above, that workflow is now retired; treat it as historical, not something to repeat.

## Loose ends / worth knowing if you pick this up

- The `/assignments/new` form (creating an AI-mode assessment) hung indefinitely on submit
  during this session — the server action that structures the rubric via LLM
  (`src/lib/pipeline/rubric-structure.ts`, called from
  `src/app/(educator)/assignments/new/actions.ts`) never returned within ~4 minutes, with no
  error surfaced either. Not root-caused. If the demo needs a live AI-mode assessment row,
  investigate this first — it currently blocks creating one through the UI.
- `MathText`'s prose-detection heuristic (above) is intentionally narrow. If more
  mixed-prose-and-math practice prompts turn up mangled in `/exam-prep`, that's the known
  remaining gap, not a new bug.
- Two Math submissions in the seeded demo data (`db464f08...`, `dc4f5881...`) were found
  during this session with `status: 'approved'` but no grade recommendation ever computed —
  orphaned from an earlier session, not something this session's work caused. They were
  reprocessed and approved properly (via `/api/submissions/:id/process` then the real Approve
  button) as a side effect of trying to release Math's results, so this specific pair is
  fixed, but it's a reminder that demo-data drift like this can happen across long-running
  Supabase state and is worth a sanity check (`/assignments` → does "Submitted" match
  "reviewed & released" + pending, for both rows) before a live demo.
- `docs/DEMO_PLAN.md`'s opening paragraph still describes the deck as "the long-form,
  18-slide 'browse it yourself' version" — stale. The actual deck (`src/app/page.tsx`) is
  the 7-slide horizontal carousel this session worked on. Worth a pass to reconcile
  `DEMO_PLAN.md` with the current deck before rehearsing off of it.
