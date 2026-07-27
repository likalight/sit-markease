# Decisions log

Deviations from `docs/PRD.md`, with a one-line rationale each. Newest first.

## M0 — no RLS policies

The §9 schema is created with Row Level Security left off (Supabase default for freshly created tables). All reads/writes route through Next.js Route Handlers using the service-role client (`src/lib/db/supabase-admin.ts`), which is never imported into client code. Role/ownership checks happen in the route handlers themselves. Faster to build for a 36-hour hackathon; would need real RLS policies (or at minimum enabling it with matching policies) before any non-demo deployment.

## M0/M1 — repo location

Scaffolded at a fresh `~/aims-v2` rather than reusing the pre-existing `~/aims`. The prior repo used Docker and an `apps/web` + `apps/worker` monorepo-workspace layout, both of which conflict with this PRD (§16 layout, CLAUDE.md's "no Docker" rule). Confirmed with the user before proceeding; old repo left untouched.
