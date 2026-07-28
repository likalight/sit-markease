-- criterion_results never actually stored criterion_key (the human-readable
-- rubric key like "c_setup") — only criterion_id, a foreign key. Every place
-- that reads criterion_key (the review console's score totals, the
-- adjust-criterion-level API route, the student feedback page's criterion
-- name lookup) assumed it existed and silently broke: scores collided onto
-- one key, adjusting a criterion 404'd, names didn't resolve. Found via
-- actually testing the deployed app end to end.
alter table criterion_results add column if not exists criterion_key text;
