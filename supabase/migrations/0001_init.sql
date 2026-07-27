-- AIMS initial schema — verbatim from PRD.md §9, plus the extension pgcrypto
-- needs for gen_random_uuid() on projects where it isn't already enabled.

create extension if not exists pgcrypto;
create extension if not exists vector;

-- Identity & structure
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null check (role in ('educator','student','admin')),
  created_at timestamptz default now()
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  owner_id uuid references users(id),
  notation_glossary text,
  created_at timestamptz default now()
);

create table enrolments (
  module_id uuid references modules(id),
  user_id uuid references users(id),
  primary key (module_id, user_id)
);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft','open','marking','released')),
  created_at timestamptz default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  position int not null,
  prompt_text text not null,
  prompt_latex text,
  model_solution text,
  expected_answer_latex text,        -- for symbolic checking
  topic_tags text[] default '{}',
  max_score numeric not null
);

-- Rubric
create table rubrics (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  version int not null default 1
);

create table rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid references rubrics(id) on delete cascade,
  key text not null,
  name text not null,
  weight numeric not null,
  max_score numeric not null,
  levels jsonb not null      -- [{level, score, descriptor}]
);

-- Submissions
create table submissions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  student_id uuid references users(id),
  status text not null default 'uploaded' check (status in (
    'uploaded','processing','needs_human_transcription',
    'ready_for_review','in_review','approved','released','failed')),
  submitted_at timestamptz default now()
);

create table submission_pages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  page_index int not null,
  storage_path text not null,          -- original, shown to educator
  processed_path text,                 -- deskewed/denoised, fed to models
  width int, height int,
  skew_deg numeric, quality_score numeric
);

create table detected_lines (
  id uuid primary key default gen_random_uuid(),
  submission_page_id uuid references submission_pages(id) on delete cascade,
  line_index int not null,
  box jsonb not null,                  -- {x,y,w,h} normalised
  detector text                        -- 'opencv' | 'paddle'
);

create table transcriptions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  read_a_raw jsonb, read_b_raw jsonb,
  transcription_agreement numeric,
  overall_legibility numeric,
  final_answer_latex text,
  flags text[] default '{}',
  reconciliation_notes text,
  model_a text, model_b text, prompt_version text,
  created_at timestamptz default now()
);

create table solution_steps (
  id uuid primary key default gen_random_uuid(),
  transcription_id uuid references transcriptions(id) on delete cascade,
  step_index int not null,
  line_indices int[] default '{}',
  latex text, plain_text text,
  role text,
  box jsonb,                           -- union of the line boxes it spans
  confidence numeric,
  agreement numeric,                   -- per-step read agreement
  source text check (source in ('reconciled','read_a','read_b','human')),
  edited_by_human boolean default false
);

-- Assessment results
create table grade_recommendations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  total_recommended numeric,
  max_total numeric,
  needs_human_review boolean default false,
  review_reasons text[] default '{}',
  score_spread numeric,
  symbolic_check text check (symbolic_check in ('equivalent','not_equivalent','unparseable')),
  model text, prompt_version text,
  created_at timestamptz default now()
);

create table criterion_results (
  id uuid primary key default gen_random_uuid(),
  grade_recommendation_id uuid references grade_recommendations(id) on delete cascade,
  criterion_id uuid references rubric_criteria(id),
  level text, score numeric, max_score numeric,
  evidence_step_indices int[] not null
    check (array_length(evidence_step_indices, 1) > 0),
  justification text,
  confidence numeric
);

create table final_grades (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade unique,
  total numeric not null,
  approved_by uuid references users(id),
  approved_at timestamptz,
  adjusted boolean default false,
  adjustment_note text,
  review_seconds int                    -- feeds metric M9
);

-- Misconceptions
create table misconceptions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id),
  key text not null,
  name text not null,
  description text not null,
  typical_signature text,
  severity text check (severity in ('notational','procedural','conceptual')),
  remediation_note text,
  status text default 'active' check (status in ('active','candidate','retired')),
  unique (module_id, key)
);

create table misconception_tags (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  misconception_id uuid references misconceptions(id),
  confidence numeric,
  evidence_step_indices int[],
  observed_signature text,
  confirmed_by_human boolean default null
);

-- Feedback
create table feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  summary text,
  strengths jsonb, breakdown_points jsonb,
  next_action text, tone text,
  edited_by_human boolean default false,
  released_at timestamptz
);

create table feedback_flags (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid references feedback(id) on delete cascade,
  student_id uuid references users(id),
  reason text, note text,
  created_at timestamptz default now()
);

-- Corpus & RAG
create table resources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  kind text check (kind in ('lecture_notes','tutorial','past_paper','worked_example','textbook_extract')),
  label text not null,
  storage_path text,
  topic_tags text[] default '{}',
  difficulty text check (difficulty in ('scaffold','target','extension'))
);

create table resource_chunks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references resources(id) on delete cascade,
  chunk_index int,
  content text not null,
  concepts_required text[] default '{}',
  embedding vector(384),               -- bge-small-en-v1.5
  tsv tsvector generated always as (to_tsvector('english', content)) stored
);
create index on resource_chunks using hnsw (embedding vector_cosine_ops);
create index on resource_chunks using gin (tsv);

-- Practice
create table practice_sets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references users(id),
  submission_id uuid references submissions(id),
  target_misconception_ids uuid[],
  created_at timestamptz default now()
);

create table practice_items (
  id uuid primary key default gen_random_uuid(),
  practice_set_id uuid references practice_sets(id) on delete cascade,
  position int, difficulty text,
  prompt_latex text not null,
  solution_latex text,
  hint_ladder jsonb,
  targets_because text,
  provenance jsonb,
  verified boolean default false,
  verified_by text check (verified_by in ('sympy','llm','unverified'))
);

create table practice_attempts (
  id uuid primary key default gen_random_uuid(),
  practice_item_id uuid references practice_items(id) on delete cascade,
  student_id uuid references users(id),
  response text, hints_used int default 0,
  outcome text check (outcome in ('correct','partial','incorrect')),
  created_at timestamptz default now()
);

-- Observability & audit
create table stage_runs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  stage text not null,
  status text not null check (status in ('queued','running','succeeded','failed','skipped')),
  model text, prompt_version text,
  input_tokens int, output_tokens int, cost_usd numeric,
  latency_ms int, error text,
  started_at timestamptz, finished_at timestamptz
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  entity_type text, entity_id uuid,
  action text,
  before jsonb, after jsonb,
  created_at timestamptz default now()
);
