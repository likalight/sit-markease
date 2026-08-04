import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { EducatorUploadForm } from "@/components/educator-upload-form";
import { VALID_STUDENT_IDS } from "@/lib/auth/student-roster";

// Summative-only intake: a real closed-book exam collects physical paper,
// so the student can't self-submit after the fact — the instructor scans
// each script and attributes it to a student ID here instead. Formative
// keeps self-submit (/submit) — see docs/DECISIONS.md.
export default async function EducatorUploadPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const { assessmentId } = await params;
  const assessment = await db.getAssessment(assessmentId);
  if (!assessment) notFound();

  const mode = (assessment as any).assessment_mode ?? "summative";

  const questions = (await db.listAllQuestions())
    .filter((q: any) => q.assessment_id === assessmentId)
    .map((q: any) => ({ id: q.id, promptText: q.prompt_text, position: q.position }))
    .sort((a: any, b: any) => a.position - b.position);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href="/assignments" className="text-body-sm text-muted underline">
          ← Back to assignments
        </Link>
        <h1 className="mt-xs text-title-lg text-body-strong">{(assessment as any).title} — upload a script</h1>
        <p className="text-body-sm text-muted">
          For scripts collected on paper: scan or photograph each student's answer and attribute it to their
          student ID. This lands in your review queue exactly like a self-submitted script — nothing releases
          without your approval.
        </p>
      </div>

      {mode !== "summative" ? (
        <p className="rounded-sm border border-attention/30 bg-attention-soft px-sm py-xs text-body-sm text-attention">
          This assignment is formative — students self-submit their own practice attempts at /submit. On-behalf-of
          upload is only for summative (closed-book CA / exam) assignments.
        </p>
      ) : questions.length === 0 ? (
        <p className="text-body-sm text-muted">This assignment has no questions yet.</p>
      ) : (
        <EducatorUploadForm questions={questions} validStudentIds={VALID_STUDENT_IDS} />
      )}
    </main>
  );
}
