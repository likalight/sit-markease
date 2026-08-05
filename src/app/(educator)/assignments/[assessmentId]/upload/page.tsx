import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { AssessmentScriptUpload } from "@/components/assessment-script-upload";
import { VALID_STUDENT_IDS, emailForStudentId } from "@/lib/auth/student-roster";
import { DEMO_SUMMATIVE_ASSESSMENT_ID, DEMO_SUMMATIVE_SAMPLE_SCRIPT } from "@/lib/demo-tour/demo-content";

export default async function EducatorUploadPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");
  const { assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) notFound();
  const mode = (assessment as any).assessment_mode ?? "summative";
  const questions = await db.listQuestionsForAssessment(assessmentId);
  const assigned = await db.listAssessmentStudents(assessmentId);
  const assignedEmails = new Set((assigned as any[]).map((row) => row.student?.email));
  const assignedStudentIds = VALID_STUDENT_IDS.filter((id) => assignedEmails.has(emailForStudentId(id)));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href="/assignments" className="text-body-sm text-muted underline">← Back to assignments</Link>
        <h1 className="mt-xs text-title-lg text-body-strong">{(assessment as any).title} — upload a script</h1>
        <p className="text-body-sm text-muted">
          Upload one complete script per student. The system detects question boundaries across every page,
          then asks you to confirm the mapping before any rubric assessment runs.
        </p>
      </div>
      {mode !== "summative" ? (
        <p className="border border-attention/30 bg-attention-soft px-md py-sm text-body-sm text-attention">Formative assessments are submitted by students from their own dashboard.</p>
      ) : (questions as any[]).length === 0 ? (
        <p className="text-body-sm text-muted">This assessment has no questions yet.</p>
      ) : assignedStudentIds.length === 0 ? (
        <p className="border border-attention/30 bg-attention-soft px-md py-sm text-body-sm text-attention">
          Assign students first on the <Link href={`/assignments/${assessmentId}/setup`} className="underline">issue settings page</Link>.
        </p>
      ) : (
        <AssessmentScriptUpload
          assessmentId={assessmentId}
          kind="summative"
          studentIds={assignedStudentIds}
          sampleScriptUrl={assessmentId === DEMO_SUMMATIVE_ASSESSMENT_ID ? DEMO_SUMMATIVE_SAMPLE_SCRIPT : undefined}
        />
      )}
    </main>
  );
}
