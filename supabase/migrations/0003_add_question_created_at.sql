-- getCurrentQuestion() needs to know which question was created most
-- recently across ALL assessments, not just within one. `position` is
-- scoped per-assessment (each new assessment restarts at 1), so two
-- questions in different assessments can tie on position — found live: a
-- brand-new educator-created question in a different assessment tied with
-- the original seeded question's position=1, and the tie broke toward the
-- old one, so new questions never actually reached students.
alter table questions add column if not exists created_at timestamptz default now();
