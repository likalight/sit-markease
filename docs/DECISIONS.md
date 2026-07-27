# Decisions log

Deviations from `docs/PRD.md`, with a one-line rationale each. Newest first.

## M2 — local JSON store + fixture-mode auth replace Supabase for M2 onward

No Supabase project and no Anthropic API key are configured in this build environment (flagged to the user after M0/M1; confirmed again here). The user chose: build against a local, file-backed mock store and fixture AI responses so the pipeline is actually runnable and testable now, rather than writing seven milestones of code against credentials that don't exist.

Concretely:
- `src/lib/db/local-store.ts` — a singleton JSON-file-backed store (`local-data/store.json`, gitignored) with the same entities as the §9 Postgres schema (submissions, transcriptions, solution_steps, grade_recommendations, criterion_results, misconceptions, misconception_tags, feedback, resources, resource_chunks, practice_sets, practice_items, stage_runs, plus modules/questions/rubrics/users for seed data). This is what M2 onward reads and writes.
- `src/lib/storage/local-files.ts` — original/processed submission images go to `local-data/uploads/<submissionId>/` instead of a Supabase Storage bucket.
- Auth: when `AIMS_FIXTURE_MODE=true`, login is a plain role-switch (no password) that sets a plain (unsigned — local dev only, never for a real deployment) cookie identifying the demo educator or student — no Supabase Auth call. `AIMS_FIXTURE_MODE=false` keeps the original Supabase Auth path from M0 untouched.
- M1's upload route and setup page were updated to branch on `AIMS_FIXTURE_MODE` and use the local store/files when true.
- AI calls (S2, S4, S5, S6, S7) go through `src/lib/ai/client.ts`, which in fixture mode returns hand-authored fixture JSON (validated against the same Zod schemas a real response would be) instead of calling Anthropic, and logs `cost_usd: 0` on the `stage_runs` row.

**This is explicitly temporary.** The Supabase migration, schema, and M0/M1 Supabase-backed code are left in place and are the intended production path — `docs/STUBS.md` tracks exactly what needs to happen to swap back (point `AIMS_FIXTURE_MODE=false` at a real Supabase project + `ANTHROPIC_API_KEY`, verify the local-store shapes still match the SQL schema, re-run each milestone's acceptance check against the real backend).

## M2 — 3 synthetic gold-set scripts instead of 20-30 real handwritten ones

§15 wants 20-30 real handwritten scripts, human-marked before anyone sees AI output. This build has neither real students nor a human marker, and — per the M2 pivot above — no live model access to grade real scripts against anyway. Substituted 3 synthetic, programmatically-rendered scripts (`eval/gold/images/*.png`, generated via `cv2.putText`, not real handwriting) for the seeded ODE question, each targeting a specific outcome: `correct` (full marks, no misconceptions), `dropped_c` (drops the constant of integration, patches the final answer anyway — correct answer, unsound method), `ic_too_early` (applies the initial condition before the general solution — much lower score). Each has a hand-authored "human mark" in `eval/gold/*.json` standing in for real independent human marking, and hand-authored AI-response fixtures seeded into `local-data/ai-cache/` (`scripts/seed-ai-fixtures.ts`) standing in for real model output.

This is a real reduction in what M9's eval harness can honestly claim: 3 synthetic scripts is not statistically meaningful and the "human marks" are the same person (this build) who wrote the fixtures, not an independent marker — M9's report says this plainly rather than presenting it as real accuracy data. The pipeline logic itself (reconciliation routing, rubric scoring, misconception tagging, feedback, practice generation) is exercised for real against these fixtures — what's synthetic is the input data and the "ground truth," not the code path.

## M2 — dropped the `server-only` import guard

`import "server-only"` throws unconditionally when a module is loaded outside Next.js's webpack/turbopack bundling (its conditional-exports trick only resolves under a bundler condition those tools define) — which breaks every standalone script (`scripts/seed.ts`, `scripts/ingest-corpus.ts`, `eval/run.ts`) that needs to import `local-store.ts`, `facade.ts`, the AI client, etc. via `tsx`. Removed the guard from the affected files. None of them are imported from a `"use client"` component (verified by grep), so the actual protection it gave was redundant with Next's module graph; the marginal safety net wasn't worth breaking every script.

## M0 — no RLS policies

The §9 schema is created with Row Level Security left off (Supabase default for freshly created tables). All reads/writes route through Next.js Route Handlers using the service-role client (`src/lib/db/supabase-admin.ts`), which is never imported into client code. Role/ownership checks happen in the route handlers themselves. Faster to build for a 36-hour hackathon; would need real RLS policies (or at minimum enabling it with matching policies) before any non-demo deployment.

## M0/M1 — repo location

Scaffolded at a fresh `~/aims-v2` rather than reusing the pre-existing `~/aims`. The prior repo used Docker and an `apps/web` + `apps/worker` monorepo-workspace layout, both of which conflict with this PRD (§16 layout, CLAUDE.md's "no Docker" rule). Confirmed with the user before proceeding; old repo left untouched.
