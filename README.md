# Stepwise

AI-assisted assessment diagnosis, built at SIT for the AIMS project (**AIMS —
AI for Individualised Mastery Support**). See `docs/PRD.md` for the full spec,
`docs/DESIGN.md` for the design system, and `CLAUDE.md` for working rules.

## Local setup (fixture mode — no API keys needed)

This build runs entirely on cached fixture data by default
(`AIMS_FIXTURE_MODE=true`) — no Supabase project, no Gemini/Groq keys required
to see the whole product work. See `docs/DECISIONS.md` for why.

1. `npm install`
2. Copy `.env.example` to `.env` (defaults already have fixture mode on).
3. `npm run seed` — seeds the demo module/assessment/question/rubric/taxonomy and two demo accounts (role-switch login, no password, in fixture mode).
4. `npm run ingest-corpus` — seeds the module's practice-item corpus.
5. In a second terminal: `python -m venv sidecar/.venv`, activate it, `pip install -r sidecar/requirements.txt`, then `npm run sidecar:dev` — FastAPI on `localhost:8000`.
6. `npm run seed-gold` then `npm run seed-ai-fixtures` — ingests the 3 synthetic gold scripts and seeds their AI responses into the fixture cache.
7. `npm run dev` — Next.js app on `localhost:3000`. Click "See it in action" on the landing page for an instant, pre-populated demo — no login, no upload.

## Real providers (optional)

Set `AIMS_FIXTURE_MODE=false` and fill in `AIMS_GEMINI_API_KEY` / `AIMS_GROQ_API_KEY`
plus a real Supabase project's credentials to run against live free-tier
providers instead. See `docs/DECISIONS.md` "M2 — free-tier providers".

## Repository layout

See PRD §16.

## Status

M0 through M9 (§17) are built and verified against a 3-script synthetic gold
set — see `docs/STUBS.md` for what's intentionally not implemented,
`docs/DECISIONS.md` for deviations from the PRD, and `npm run eval` for the
§3.3 metrics table.
