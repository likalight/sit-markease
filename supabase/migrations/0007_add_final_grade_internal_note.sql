-- Internal, instructor-only note on a final grade — distinct from
-- adjustment_note (which explains a *score* override) and never read by any
-- student-facing code path (feedback table stays the sole student-facing
-- surface). See docs/DECISIONS.md.
alter table final_grades add column if not exists internal_note text;
