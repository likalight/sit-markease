# CLAUDE.md — working rules for this repo

Project: **AIMS — AI for Individualised Mastery Support**. Full spec: `docs/PRD.md` (v2.0, zero-cost build). Read it in full before writing code. It is self-contained — ignore any earlier drafts.

## Non-negotiables

1. **Vertical slice first.** One question, one submission, upload → transcribe → assess → diagnose → feedback → practice. End-to-end before breadth, before polish.
2. **Structured outputs only.** Every model call returns JSON validated against a Zod schema in `src/lib/schemas/`. Never regex-parse prose. Validation failure → one retry with the error appended → documented fallback.
3. **The human decides.** Nothing writes `final_grades` without an explicit educator approval action, and every approval writes an `audit_log` row.
4. **Evidence or invalid.** A criterion result without `evidence_step_indices` fails schema validation. Enforced in code and in the DB constraint, not just the prompt.
5. **Never correct the student's work during transcription.** Errors are the signal. Transcribe literally; mark illegible spans as `[ILLEGIBLE]`; never guess.
6. **Two systems must agree.** Transcription needs two independent reads above the agreement threshold. Maths correctness is checked symbolically where parseable. Disagreement routes to a human, never to a student.
7. **Never ship an unverified practice item.** Generated items must pass the SymPy or LLM verification gate. Failures are discarded, not shipped.
8. **Degrade, never crash.** A failed stage records itself in `stage_runs` and the pipeline continues with partial state.

## Architecture facts

- **TypeScript app** (Next.js 15 App Router) + **Python sidecar** (FastAPI at `SIDECAR_URL`) for OpenCV, SymPy, and local embeddings.
- **Line geometry comes from OpenCV projection profiling**, behind the `LineDetector` interface. Not from a paid OCR service.
- **Recognition comes from two Claude reads**, not from an OCR engine: Read A literal (`AIMS_MODEL_PRIMARY`), Read B semantic (`AIMS_MODEL_FAST`).
- **Embeddings are local** (`bge-small-en-v1.5`, 384-dim). If they fail, set `AIMS_RETRIEVAL_MODE=fulltext` and use Postgres `tsvector`.
- Prompts live in `/prompts/*.vN.md`. Persist `prompt_version` and `model` on every `stage_run`.
- Log `input_tokens`, `output_tokens`, `latency_ms`, `cost_usd` on every AI call. Metrics M10/M11 depend on it.
- Temperature: 0.0–0.1 for S2/S4, 0.2 for S5, 0.4–0.6 for S6/S7.
- Render all maths with KaTeX. Never show raw LaTeX to a user.
- `AIMS_FIXTURE_MODE=true` serves cached outputs with zero API calls. **Keep this working — it is the demo-day safety net.**

## Process

- Work milestone by milestone (PRD §17). Stop and report after each. Do not run ahead.
- Commit per milestone, message prefixed with the ID (`M4: rubric assessment stage`).
- Anything stubbed or mocked → `docs/STUBS.md`, immediately.
- Any deviation from the PRD → `docs/DECISIONS.md` with a one-line rationale.
- **Timebox risky installs to 90 minutes** (paddlepaddle, sentence-transformers, antlr for `parse_latex`). If it isn't working, take the documented fallback and record it. Do not let a dependency eat a quarter of the build window.
- Genuine ambiguity → pick whatever keeps the §20 demo working, note it, move on. Don't block.

## Do not

- Do not add LangChain, LlamaIndex, Redis, Celery, Docker, CI, or a hosted vector DB. The PRD explains why for each.
- Do not add a paid service of any kind. This is a zero-cost build; tokens are the only spend.
- Do not build anything outside PRD §4.1 until §4.1 is fully green.
- Do not remove the source-image-beside-transcription view. It is the trust mechanism and the emotional core of the demo.
- Do not cut the evaluation harness (M9). It is 20% of the judging score.
- Do not claim coverage or accuracy the eval harness hasn't measured. Report actual numbers, including the bad ones.
