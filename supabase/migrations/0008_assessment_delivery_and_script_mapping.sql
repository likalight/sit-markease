-- Full-assessment delivery: private rosters, timed formative attempts, and
-- assessment-level script uploads that are mapped back to question rubrics.

alter table assessments
  add column if not exists opens_at timestamptz,
  add column if not exists due_at timestamptz,
  add column if not exists duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  add column if not exists attempts_allowed int not null default 1 check (attempts_allowed > 0),
  add column if not exists archived_at timestamptz;

create table if not exists assessment_students (
  assessment_id uuid references assessments(id) on delete cascade,
  student_id uuid references users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (assessment_id, student_id)
);

create table if not exists assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  student_id uuid references users(id) on delete cascade,
  attempt_number int not null check (attempt_number > 0),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  submitted_at timestamptz,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'expired')),
  unique (assessment_id, student_id, attempt_number)
);

create table if not exists script_uploads (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  student_id uuid references users(id),
  attempt_id uuid references assessment_attempts(id) on delete set null,
  uploaded_by uuid references users(id),
  upload_kind text not null check (upload_kind in ('formative', 'summative')),
  status text not null default 'mapping'
    check (status in ('mapping', 'needs_mapping_review', 'mapped', 'processing', 'ready_for_review', 'released', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists script_pages (
  id uuid primary key default gen_random_uuid(),
  script_upload_id uuid references script_uploads(id) on delete cascade,
  page_index int not null,
  storage_path text not null,
  processed_path text not null,
  width int,
  height int,
  quality_score numeric,
  unique (script_upload_id, page_index)
);

create table if not exists question_mappings (
  id uuid primary key default gen_random_uuid(),
  script_upload_id uuid references script_uploads(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  submission_id uuid,
  detected_label text,
  regions jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0,
  notes text,
  status text not null default 'suggested'
    check (status in ('suggested', 'confirmed', 'rejected')),
  unique (script_upload_id, question_id)
);

alter table submissions
  add column if not exists attempt_id uuid references assessment_attempts(id) on delete set null,
  add column if not exists script_upload_id uuid references script_uploads(id) on delete set null;

alter table question_mappings
  add constraint question_mappings_submission_fk
  foreign key (submission_id) references submissions(id) on delete set null;

create index if not exists assessment_students_student_idx on assessment_students(student_id);
create index if not exists assessment_attempts_student_idx on assessment_attempts(student_id, assessment_id);
create index if not exists script_uploads_assessment_idx on script_uploads(assessment_id, student_id);
create index if not exists question_mappings_script_idx on question_mappings(script_upload_id);
