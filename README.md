# Practica

AI-assisted assessment diagnosis, built at SIT for the AIMS project (**AIMS —
AI for Individualised Mastery Support**). See `docs/PRD.md` for the full spec,
`docs/DESIGN.md` for the original design system (superseded — see
`docs/DECISIONS.md` "Post-M9 — went live" for the current one), and
`CLAUDE.md` for working rules.

## Current state: live

This build runs against real infrastructure, not fixtures:
- **OpenAI + Gemini** as the two independent AI readers (`AIMS_AI_LIVE=true`)
- **Real Supabase** — Postgres schema, Storage, and Auth (`AIMS_FIXTURE_MODE=false`)

Every model call still caches to disk by (provider, model, prompt, image hash)
regardless of live/fixture mode — re-running the same input never re-spends
quota. See `docs/DECISIONS.md`'s "Post-M9 — went live" entry for exactly what
changed and why.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env`.
3. Fill in `AIMS_OPENAI_API_KEY`, `AIMS_GEMINI_API_KEY`, and a real Supabase
   project's `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY`.
4. Run `supabase/migrations/0001_init.sql` against that project (paste it
   into the Supabase SQL Editor — no CLI/DB-password access needed) and
   create a private Storage bucket named `submissions`.
5. `npm run seed` — seeds the demo module/assessment/question/rubric/taxonomy
   and two demo accounts as real Supabase Auth users.
6. `npm run ingest-corpus` — seeds the module's practice-item corpus with
   real embeddings (needs `sentence-transformers` installed in the sidecar
   venv, see below).
7. In a second terminal: `python -m venv sidecar/.venv`, activate it,
   `pip install -r sidecar/requirements.txt`, then `npm run sidecar:dev` —
   FastAPI on `localhost:8000`.
8. `npm run dev` — Next.js app on `localhost:3100` (or whichever port you
   pass via `-p`).

### Fixture mode (no keys, no Supabase project)

Set `AIMS_FIXTURE_MODE=true` and `AIMS_AI_LIVE=false` to run entirely on a
local JSON file store and cached AI responses instead — useful for offline
development or CI. `npm run seed-gold` then `npm run seed-ai-fixtures` seeds
the 3 synthetic gold scripts' AI responses into the cache in that mode. See
`docs/DECISIONS.md` "M2 — local JSON store + fixture-mode auth" for why this
path exists and what it trades off.

## Repository layout

See PRD §16.

## Status

M0 through M9 (§17) were built and verified against a 3-script synthetic gold
set, then migrated to live providers and a real database post-M9 — see
`docs/STUBS.md` for what's intentionally not implemented, `docs/DECISIONS.md`
for every deviation from the PRD, and `npm run eval` for the §3.3 metrics
table (currently run against the AI cache for reproducibility, not raw
network latency).
