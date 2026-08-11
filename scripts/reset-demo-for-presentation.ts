/**
 * Resets the two live-demo assessments (Math/summative, Physics/formative)
 * to the pre-demo state docs/DEMO_PLAN.md assumes: draft/unissued, so the
 * "issue it" beat in the demo route has something real to show. Keeps the
 * demo student roster assigned to both (student picking is not part of the
 * timed 7-minute route, and re-doing it live would just burn time) — the
 * only thing this un-does is visibility, via the same status field the
 * rubric page's "Open for submissions" button toggles.
 *
 * Does NOT touch submissions: seeding one real ungraded Math submission for
 * the review-queue beat means running the actual OCR + grading pipeline,
 * which needs the Python sidecar up and spends real (free-tier) API quota —
 * do that live via the app's own "Use sample script" upload, not from here.
 */
import "dotenv/config";
import { db } from "../src/lib/db/facade";
import { resolveStudentAccount, VALID_STUDENT_IDS } from "../src/lib/auth/student-roster";

const MATH_SUMMATIVE = "5891668e-ad8f-4ba7-82b2-63abdb07d0cf";
const PHYSICS_FULL = "9bd44653-79bf-45af-a909-c0893d7fad15";

async function main() {
  if (process.env.AIMS_CONFIGURE_DEMO !== "true") {
    throw new Error("Refusing to change demo records. Set AIMS_CONFIGURE_DEMO=true for this command only.");
  }

  const students = (await Promise.all(VALID_STUDENT_IDS.map(resolveStudentAccount))).filter(Boolean) as any[];

  await db.updateAssessment(MATH_SUMMATIVE, { status: "draft" });
  await db.updateAssessment(PHYSICS_FULL, { status: "draft" });
  await db.replaceAssessmentStudents(MATH_SUMMATIVE, students.map((s) => s.id));
  await db.replaceAssessmentStudents(PHYSICS_FULL, students.map((s) => s.id));

  console.log("Math and Physics are both back to draft/unissued, roster still assigned.");
  console.log("Remaining manual steps before you go on stage:");
  console.log("  1. As Dr. Tan, open Math -> Upload a script -> Use sample script -> confirm mapping.");
  console.log("     That's the ungraded submission the review-queue beat needs. Leave it unapproved.");
  console.log("  2. Do not click 'Open for submissions' on either assessment yet - that's the live beat.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
