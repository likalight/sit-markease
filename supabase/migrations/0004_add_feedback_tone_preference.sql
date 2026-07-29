-- A student's feedback tone was always hardcoded to "supportive" — never
-- actually personalized despite the product being named "Individualised
-- Mastery Support." This lets a student pick how S6 talks to them.
alter table users add column if not exists feedback_tone text
  check (feedback_tone in ('supportive', 'concise', 'socratic')) default 'supportive';
