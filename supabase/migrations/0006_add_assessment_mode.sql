-- Nicholas's review: three distinct AIMS "personas" need different release
-- gates. `assessment_mode` decides which path a submission takes after S6
-- feedback — 'summative' (default, unchanged) keeps the existing
-- instructor-approval gate; 'formative' auto-releases immediately (no
-- human reviewer in the immediate loop) with Socratic-style feedback
-- instead of a full reveal.
--
-- Named assessment_mode, not mode — bare `mode` collides with Postgres's
-- MODE() WITHIN GROUP aggregate through PostgREST's query parser and
-- produced "WITHIN GROUP is required for ordered-set aggregate mode" on a
-- plain `select=mode`.
alter table assessments add column if not exists assessment_mode text
  not null default 'summative' check (assessment_mode in ('formative', 'summative'));
