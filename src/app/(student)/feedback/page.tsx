import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { StudentFeedbackConsole } from "@/components/student-feedback-console";
import { groupCriteriaByPart, extractPartLabel } from "@/lib/design/part-grouping";

// §11.1 S1 — student feedback view. Editorial density (docs/DESIGN.md §2):
// a student reads this once, carefully. Mark + criterion bars, the
// annotated script with the breakdown step(s) highlighted, feedback blocks,
// misconception cards with an expandable explainer, "was this helpful?"
// flag, and a link into the practice set (S2, /practice/[submissionId]).
export default async function StudentFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string; attempt?: string; assessment?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const { sub, attempt, assessment: assessmentParam } = await searchParams;
  const allSubmissions = await db.listAllSubmissions();
  const mine = allSubmissions.filter(
    (s: any) => s.student_id === user.id && (!sub || s.id === sub) && (!attempt || s.attempt_id === attempt)
  );

  const cards = await Promise.all(
    mine.map(async (submission: any) => {
      const grade = await db.getGradeRecommendation(submission.id);
      const feedback = await db.getFeedback(submission.id);
      if (!feedback || !grade) return null;

      const question = await db.getQuestionWithRubric(submission.question_id);
      const assessment = await db.getAssessment((question as any)?.assessment_id);
      if (assessmentParam && (assessment as any)?.id !== assessmentParam) return null;
      const isFormative = (assessment as any)?.assessment_mode === "formative";

      // CLAUDE.md rule 3: nothing reaches a student without explicit
      // educator approval. grade.total_recommended is the AI's unapproved
      // recommendation — until an educator approves it (writing a
      // final_grades row), the student sees a pending card, not a mark.
      const finalGrade = await db.getFinalGrade(submission.id);
      if (!finalGrade || (!isFormative && (assessment as any)?.status !== "released")) {
        return { submissionId: submission.id, pending: true as const, hasPracticeSet: false };
      }

      const criteria = await db.listCriterionResults(grade.id);
      const nameByKey = Object.fromEntries((question?.criteria ?? []).map((c: any) => [c.key, c.name]));

      const pages = await db.listSubmissionPages(submission.id);
      const page = pages[0];
      // Same processed-vs-original coordinate-space fix as the review
      // console (src/app/(educator)/review/[submissionId]/page.tsx) — line
      // boxes are computed against the deskewed image, not the raw upload.
      const originalUrl = page ? await db.getImageUrl(page.processed_path ?? page.storage_path) : null;
      const lines = page ? await db.listDetectedLines(page.id) : [];

      const transcription = await db.getTranscription(submission.id);
      const steps = transcription ? await db.listSolutionSteps(transcription.id) : [];

      const breakdownPoints = feedback.breakdown_points as {
        step_index: number;
        what_happened: string;
        why_it_matters: string;
        misconception_key: string | null;
      }[];

      const tags = await db.listMisconceptionTags(submission.id);

      // One box per question PART, not per rubric criterion — those diverge
      // whenever a single part is graded by more than one criterion. Matches
      // the review console's part-level annotation (lib/design/part-grouping.ts)
      // instead of a box per OCR line or per criterion.
      const partGroups = groupCriteriaByPart(
        criteria,
        (c: any) => nameByKey[c.criterion_key] ?? c.criterion_key,
        question?.prompt_text ?? ""
      );
      const partBoxes = Array.from(partGroups.entries())
        .map(([groupKey, groupCriteria]) => {
          const evidenceStepIndices = groupCriteria.flatMap((c: any) => c.evidence_step_indices);
          const lineIndices = new Set(
            steps.filter((s: any) => evidenceStepIndices.includes(s.step_index)).flatMap((s: any) => s.line_indices)
          );
          const lineBoxes = lines.filter((l: any) => lineIndices.has(l.line_index)).map((l: any) => l.box);
          if (lineBoxes.length === 0) return null;
          const x = Math.min(...lineBoxes.map((b: any) => b.x));
          const y = Math.min(...lineBoxes.map((b: any) => b.y));
          const right = Math.max(...lineBoxes.map((b: any) => b.x + b.w));
          const bottom = Math.max(...lineBoxes.map((b: any) => b.y + b.h));
          const ratios = groupCriteria.map((c: any) => c.score / c.max_score);
          const state = ratios.some((r: number) => r <= 0) ? "disputed" : ratios.every((r: number) => r >= 1) ? "verified" : "attention";
          const soleName =
            groupCriteria.length === 1 ? nameByKey[groupCriteria[0].criterion_key] ?? groupCriteria[0].criterion_key : null;
          const isPositionalKey = groupKey !== "all" && groupKey !== "unlabeled";
          const label =
            groupCriteria.length > 1
              ? `Part (${groupKey})`
              : isPositionalKey && !extractPartLabel(soleName!)
                ? `Part (${groupKey}) - ${soleName}`
                : soleName;
          return {
            key: groupKey,
            criterionKeys: groupCriteria.map((c: any) => c.criterion_key),
            box: { x, y, w: right - x, h: bottom - y },
            state,
            label,
          };
        })
        .filter((b: any): b is NonNullable<typeof b> => b !== null);

      const activePartKeys = new Set(
        partBoxes
          .filter((b: any) =>
            criteria.some(
              (c: any) =>
                b.criterionKeys.includes(c.criterion_key) &&
                breakdownPoints.some((bp) => c.evidence_step_indices.includes(bp.step_index))
            )
          )
          .map((b: any) => b.key)
      );

      const module_ = await db.getModuleForQuestion(submission.question_id);
      const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];
      const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));

      const misconceptionStepIndices = new Set<number>(
        tags.flatMap((t: any) => t.evidence_step_indices ?? [])
      );

      // Previously summative students never saw the raw transcription at
      // all (formative had no instructor gate, so the student was the only
      // safeguard against a misread — see docs/DECISIONS.md). Superseded by
      // direct request: the student-feedback layout now mirrors the
      // instructor's review console (script / transcribed steps / verdict)
      // for both modes — by the time a summative result is visible here it
      // was already instructor-approved and released, so there's no
      // remaining "unverified transcription" risk to hide.
      return {
        submissionId: submission.id,
        pending: false as const,
        feedbackId: (feedback as any).id,
        total: (finalGrade as any).total,
        maxTotal: grade.max_total,
        questionPosition: (question as any)?.position ?? null,
        questionPrompt: (question as any)?.prompt_text ?? "",
        criteria: criteria.map((c: any) => ({
          name: nameByKey[c.criterion_key] ?? c.criterion_key,
          score: c.score,
          maxScore: c.max_score,
          evidenceStepIndices: c.evidence_step_indices,
        })),
        originalUrl,
        partBoxes,
        activePartKeys,
        summary: feedback.summary,
        strengths: feedback.strengths as { text: string; step_indices: number[] }[],
        breakdownPoints,
        nextAction: feedback.next_action,
        misconceptions: tags.map((t: any) => ({
          name: taxonomyById.get(t.misconception_id)?.name ?? "unnamed",
          severity: taxonomyById.get(t.misconception_id)?.severity ?? "conceptual",
          observedSignature: t.observed_signature,
          remediationNote: taxonomyById.get(t.misconception_id)?.remediation_note ?? "",
        })),
        hasPracticeSet: false,
        isFormative,
        steps: steps.map((s: any) => ({
          stepIndex: s.step_index,
          latex: s.latex,
          plainText: s.plain_text,
          confidence: s.confidence,
          agreement: s.agreement,
          hasMisconception: misconceptionStepIndices.has(s.step_index),
        })),
      };
    })
  );

  const visible = cards.filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <main data-tour-id="feedback-container" className="mx-auto flex max-w-6xl flex-col gap-xxl px-6 py-section">
      <div className="flex items-baseline justify-between">
        <h1 className="font-serif text-display-lg text-ink">Review work</h1>
        {(sub || attempt || assessmentParam) && (
          <Link href="/submit" className="text-[0px] text-body underline">
            <span className="text-body-sm">Back to assessments -&gt;</span>
            See all your feedback →
          </Link>
        )}
      </div>

      {visible.length === 0 && (
        <p className="text-body-md text-muted">
          {sub || assessmentParam ? "That work isn't ready to review yet." : "No reviewed work yet."}
        </p>
      )}

      {visible.map((c) =>
        c.pending ? (
          <div key={c.submissionId} className="flex flex-col gap-xs border-t border-hairline pt-xl">
            <p className="text-body-md text-muted">
              Your submission has been graded by SIT MarkEase and is waiting on your teacher's review. Feedback
              will appear here once it's approved.
            </p>
          </div>
        ) : (
        <div key={c.submissionId} className="border-t border-hairline pt-xl">
          <StudentFeedbackConsole
            questionPosition={c.questionPosition}
            questionPrompt={c.questionPrompt}
            total={c.total}
            maxTotal={c.maxTotal}
            originalUrl={c.originalUrl}
            partBoxes={c.partBoxes}
            steps={c.steps}
            criteria={c.criteria}
            summary={c.summary}
            strengths={c.strengths}
            breakdownPoints={c.breakdownPoints}
            misconceptions={c.misconceptions}
            nextAction={c.nextAction}
            feedbackId={c.feedbackId}
            isFormative={c.isFormative}
            submissionId={c.submissionId}
          />
        </div>
        )
      )}
    </main>
  );
}
