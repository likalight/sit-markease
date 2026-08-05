import "dotenv/config";
import { db } from "../src/lib/db/facade";
import { resolveStudentAccount, VALID_STUDENT_IDS } from "../src/lib/auth/student-roster";

const MATH_SUMMATIVE = "5891668e-ad8f-4ba7-82b2-63abdb07d0cf";
const MATH_FORMATIVE = "0391ded8-3d8a-438c-a204-a94619572c93";
const PHYSICS_FULL = "9bd44653-79bf-45af-a909-c0893d7fad15";
const PHYSICS_SINGLE = "5d0f308c-05b7-4b76-9bfa-b5e976ff3963";

async function main() {
  if (process.env.AIMS_CONFIGURE_DEMO !== "true") throw new Error("Refusing to change demo records. Set AIMS_CONFIGURE_DEMO=true for this command only.");
  const students = (await Promise.all(VALID_STUDENT_IDS.map(resolveStudentAccount))).filter(Boolean) as any[];
  const now = new Date();
  const due = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  await db.updateAssessment(MATH_SUMMATIVE, {
    title: "2018 H2 Maths 9758/01 Paper 1",
    assessment_mode: "summative",
    status: "open",
    opens_at: null,
    due_at: null,
    duration_minutes: null,
    attempts_allowed: 1,
    archived_at: null,
  });
  await db.updateAssessment(PHYSICS_FULL, {
    title: "Physics 9702/21 M/J/19 — Formative Paper",
    assessment_mode: "formative",
    status: "open",
    opens_at: now.toISOString(),
    due_at: due.toISOString(),
    duration_minutes: 60,
    attempts_allowed: 2,
    archived_at: null,
  });
  await db.replaceAssessmentStudents(MATH_SUMMATIVE, students.map((student) => student.id));
  await db.replaceAssessmentStudents(PHYSICS_FULL, students.map((student) => student.id));
  await db.updateAssessment(MATH_FORMATIVE, { archived_at: now.toISOString(), status: "draft" });
  await db.updateAssessment(PHYSICS_SINGLE, { archived_at: now.toISOString(), status: "draft" });
  console.log("Configured two visible demo assessments. Archived records were preserved, not deleted.");
}

main().catch((error) => { console.error(error); process.exit(1); });
