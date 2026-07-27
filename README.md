# AIMS

AI for Individualised Mastery Support. See `docs/PRD.md` for the full spec and `CLAUDE.md` for working rules.

## Local setup

1. **Create a Supabase project** (free tier) at supabase.com. Note the project URL, anon key, and service-role key.
2. Copy `.env.example` to `.env` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY` (not needed until M2)
3. **Run the migration**: paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor and execute (or use the Supabase CLI's `db push` if you have a linked project).
4. `npm install`
5. `npm run seed` — creates the demo module/assessment/question/rubric and two demo accounts (`AIMS_DEMO_EDUCATOR_EMAIL` / `AIMS_DEMO_STUDENT_EMAIL` in `.env.example`), plus the `submissions` storage bucket.
6. `npm run dev` — Next.js app on `localhost:3000`. Log in with either demo account.
7. In a second terminal: `python -m venv sidecar/.venv`, activate it, `pip install -r sidecar/requirements.txt`, then `npm run sidecar:dev` — FastAPI on `localhost:8000`. `GET /health` should return `{"ok": true, ...}`.

## Repository layout

See PRD §16.

## Status

M0 and M1 only (§17). See `docs/STUBS.md` for what's intentionally not implemented yet, `docs/DECISIONS.md` for deviations from the PRD.
