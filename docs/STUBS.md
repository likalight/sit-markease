# Stubs and mocks

Anything not fully implemented, listed immediately as it's introduced.

## M0

- Auth is Supabase email/password only — no magic link, no SSO (out of scope per §4.3 anyway).
- `docs/seed` creates one educator and one student demo account with fixed passwords; not for anything beyond the hackathon demo.

## M1

- Line-merge tuning (`min_height`, `min_gap`, `ink_frac` in `sidecar/cv.py`) uses the PRD's suggested defaults, untuned against real handwriting. Needs revisiting once real scripts are available (feeds M5 accuracy metric).
- PDF ingestion (`pdf2image`) is **not wired in M1** — only direct image upload (jpg/png) is implemented. `pdf2image` is in `requirements.txt` for when this is added.
- Upload viewer (`/setup` overlay page) is a minimal box-overlay viewer for verifying M1's acceptance criterion, not the full E2/E3 screens (those are M5/M8).
- Sidecar `/math/equivalent`, `/math/verify-item`, `/embed` exist as routed endpoints (`sidecar/symbolic.py`, `sidecar/embed.py`) but are not implemented — `verify_item` always returns `valid: false`, and `/embed` will attempt to download `bge-small-en-v1.5` on first real call. Real implementation lands in M3/M7.
- Line boxes are detected on the **deskewed** image but rendered as overlays on the **original** (per M1's acceptance criterion and E3's design). No inverse-rotation is applied to the box coordinates — accurate for the small skew angles deskew itself corrects for, a mismatch would show up on heavily skewed originals. Revisit if M5's real-script testing shows visible drift.
- `submissions` are created with a hardcoded lookup of the seeded demo student by email (`AIMS_DEMO_STUDENT_EMAIL`), not a real student-selection flow — batch upload / per-student attribution is M5-era work.

## M2 — provider/persistence architecture change

- **No live Gemini or Groq API keys are configured in this build environment.** `AIMS_GEMINI_API_KEY` / `AIMS_GROQ_API_KEY` are empty in `.env`. Every stage from here on (`src/lib/ai/client.ts`) runs in `AIMS_FIXTURE_MODE=true`, which replays only from `local-data/ai-cache/` — model calls that aren't pre-seeded there will throw a `ModelCallError` and the calling stage must degrade per CLAUDE.md rule 8. Fixture responses are hand-authored (not real model output) — see each milestone's stub notes below for exactly which prompts have fixtures.
- Supabase-backed code from M0/M1 (login, dashboard's non-fixture branch, `supabase-admin.ts`/`supabase-server.ts`) is untouched and unverified against a real project — same status as reported after M0/M1. `src/lib/db/facade.ts` is the new seam pipeline code (M2+) actually uses; it has a Supabase-calling branch for each method but only the fixture-mode branch has been exercised.
- `src/lib/ai/providers/groq.ts` uses JSON-object mode + Zod validation, not a provider-native structured-output mode — Groq's OpenAI-compatible API doesn't document one as reliably GA as Gemini's `responseSchema`. If Groq ships a strict JSON-schema mode, swap it in for tighter guarantees.
- Rate limiting (`src/lib/ai/rate-limit.ts`) is in-memory, single-process — correct for the dev server / eval script this build runs as, not for a multi-instance deployment.
- Gemini's native `responseSchema` structured output uses hand-written schema literals (`src/lib/pipeline/native-schemas.ts`), one per stage, rather than a generic Zod→Gemini-schema converter. Correct for the shapes this build needs; adding a new AI stage means writing a matching literal by hand.
- `src/lib/pipeline/reconcile.ts`'s `normalizeLatex()` is a practical approximation of §7.4 step 1 (strips `\left`/`\right`, converts `\cdot`/`\times` to `*`, unwraps single-level `\frac{a}{b}` to `(a)/(b)`, drops all bracket characters, collapses whitespace) — it does not handle nested `\frac`, and bracket-stripping means it can't distinguish `(a+b)*c` from `a+b*c` by structure alone (though the SymPy equivalence check that runs first for non-identical strings usually catches that case). Good enough for the synthetic gold set; revisit against real handwritten LaTeX variance.

## M3

- `sidecar/symbolic.py`'s `equivalent()` is real and passes all 10 of `sidecar/tests/test_symbolic.py`'s known pairs. `verify_item()` (the S7 verification gate) is still a stub — real implementation lands in M7.

## M4

- `sidecar/symbolic.py`'s `equivalent()` (M3) parses bare expressions, not equations — `parse_latex("y = 2e^{x^2/2}")` fails where `parse_latex("2e^{x^2/2}")` succeeds. Since final answers are almost always written as `"<var> = <expr>"`, `src/lib/pipeline/s4-assess.ts` strips a leading `identifier =` before calling the sidecar (`stripVariableAssignment()`). Found immediately when seeding this milestone's gold fixtures — every equation-form answer came back `unparseable` until this was added. Simple regex, handles the common case (`y = ...`, `x_1 = ...`); doesn't handle multi-variable systems or answers with no leading assignment.

## M5

- The review console (`src/components/review-console.tsx`) implements exactly M5's acceptance criteria (three panes, evidence chips that scroll to steps, approve writes `final_grades`+`audit_log`, `A`/`J`/`S` keyboard shortcuts, `review_seconds` timed client-side) — it is not yet the full E3 spec from §11.1. Missing versus the full design: "Adjust" doesn't have its own distinct action/audit trail separate from Approve (editing a score inline and then approving is the only path — there's no "reject" or per-criterion accept/adjust audit entry, just one audit_log row per approval with `adjusted: true/false`); there's no side-by-side view for low-agreement transcription disagreements (§7.4's "show both readings"); confidence isn't rendered as the "one consistent visual encoding... across every surface" the design direction (§11.2) asks for, just plain percentages.
- The review queue (`src/lib/pipeline/review-queue.ts`) scans **all** submissions rather than filtering by question, since only one question is seeded in this build. Fine at hackathon scale; would need a question filter (or pagination) with more than a handful of submissions.
- Keyboard shortcuts are wired but only verified by code review, not an automated or interactive-browser test (no headless browser available in this environment) — curl can't drive client-side `keydown` handlers or React Server Actions form submits, so the login flow and the review console's approve button/keyboard paths were verified via the underlying API routes and a manually-constructed session cookie instead of a real browser session.

## M2 (bugfix, noted for completeness)

- `src/lib/ai/client.ts`'s `callStructured()` originally constructed the resolved `LLMClient` (which requires an API key) *before* checking the cache — meaning even a cache hit or a fixture-mode "replay only" call would throw `AIMS_GEMINI_API_KEY is not set`. Fixed by resolving provider/model as plain strings first (no client construction), checking cache/fixture-mode against that, and only calling `getClient()` right before an actual network attempt. Caught by trying to run the real S2/S3 pipeline against the seeded fixtures — the first genuine end-to-end run this build did with zero API keys present, and it immediately surfaced the bug fixture-only testing couldn't have easily caught otherwise.
