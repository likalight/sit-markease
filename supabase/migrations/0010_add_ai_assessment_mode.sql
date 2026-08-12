-- Third assessment_mode: 'ai' — a self-serve trainer mode with no
-- instructor involvement at all (not even the auto-release-but-instructor-
-- authored pattern 'formative' already uses). Displayed as "AI" in the UI;
-- 'formative'/'summative' display as "Developmental"/"Evaluative"
-- (src/lib/assessment-mode.ts) without their stored value changing, since
-- renaming the values of existing rows needs a data migration this
-- environment can't run unattended (REST keys only, no direct DB access).
alter table assessments drop constraint if exists assessments_assessment_mode_check;
alter table assessments add constraint assessments_assessment_mode_check
  check (assessment_mode in ('formative', 'summative', 'ai'));
