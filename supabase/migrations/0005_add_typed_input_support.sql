-- Objective 1 (brief): broaden input beyond OCR — a student who already has
-- their working in LaTeX shouldn't have to photograph handwriting and hope
-- the read is right. This lets a submission skip S1/S2's OCR path entirely.
alter table submissions add column if not exists input_method text
  default 'photo' check (input_method in ('photo', 'typed'));

alter table solution_steps drop constraint if exists solution_steps_source_check;
alter table solution_steps add constraint solution_steps_source_check
  check (source in ('reconciled', 'read_a', 'read_b', 'human', 'typed'));
