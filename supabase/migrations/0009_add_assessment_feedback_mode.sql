-- Instructor-controlled teaching mode per assessment — replaces the
-- student-personal feedback_tone (users.feedback_tone, migration 0004) as
-- the deciding factor for how much of the correct answer S6 may reveal.
-- The instructor decides how much of the paper to expose before release,
-- not the student, and this now applies to formative assessments too (was
-- previously hardcoded to always-socratic there).
--   socratic = guiding questions only, never states the mistake or answer.
--   guided   = explains what happened and why, still never reveals the
--              full correct working (the old "supportive" tone's rule).
--   reveal   = explicitly may state the correct working and final answer.
alter table assessments add column if not exists feedback_mode text
  check (feedback_mode in ('socratic', 'guided', 'reveal')) default 'guided';
