import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { supabaseAdmin } from "../src/lib/db/supabase-admin";

const tables = [
  "assessments", "questions", "rubrics", "rubric_criteria", "submissions", "submission_pages",
  "detected_lines", "transcriptions", "solution_steps", "grade_recommendations", "criterion_results",
  "final_grades", "misconception_tags", "feedback", "feedback_flags", "practice_sets", "practice_items",
  "practice_attempts", "stage_runs", "audit_log",
];

async function main() {
  const admin = supabaseAdmin();
  const backup: Record<string, unknown[]> = {};
  for (const table of tables) {
    const { data, error } = await admin.from(table).select("*");
    if (error) throw new Error(`${table}: ${error.message}`);
    backup[table] = data ?? [];
  }
  const directory = path.join(process.cwd(), "local-data", "backups");
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const output = path.join(directory, `before-full-assessment-${stamp}.json`);
  fs.writeFileSync(output, JSON.stringify({ created_at: new Date().toISOString(), tables: backup }, null, 2));
  console.log(`Backup written to ${output}`);
  for (const table of tables) console.log(`${table}: ${backup[table].length}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
