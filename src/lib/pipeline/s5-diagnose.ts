import { callStructured } from "@/lib/ai/client";
import { db } from "@/lib/db/facade";
import { DiagnosisSchema } from "@/lib/schemas/diagnosis";
import { diagnoseNativeSchema } from "./native-schemas";
import { s5DiagnoseSystemPrompt, s5DiagnoseUserPrompt, PROMPT_VERSIONS } from "./prompts";

// §7.6 S5 — misconception detection. Runs on the `fast` role (Groq by
// default) — cheap and sufficient per the PRD.

export interface DiagnoseResult {
  status: "diagnosed" | "failed";
  detectedCount: number;
  novelCandidateCount: number;
}

/** Runs S5 for an assessed submission (M4). Tags misconceptions against the
 * module taxonomy with evidence; novel candidates are persisted as
 * `status: 'candidate'` misconceptions so they surface in an educator queue
 * later (§7.6 growth loop — the queue UI itself is stretch, not core to
 * M6). Degrades rather than throws (CLAUDE.md rule 8). */
export async function diagnoseSubmission(submissionId: string): Promise<DiagnoseResult> {
  // Idempotency guard — see s2-transcribe.ts's identical guard for why this
  // matters against Supabase specifically. Unlike the other guarded stages,
  // S5's own artifact (misconception_tags) can legitimately be empty for a
  // fully correct submission, so "no rows" doesn't mean "never ran" — check
  // stage_runs for a prior success instead of the data it produced.
  const priorRuns = await db.listStageRuns(submissionId);
  const alreadySucceeded = priorRuns.some((r: any) => r.stage === "S5_diagnose" && r.status === "succeeded");
  if (alreadySucceeded) {
    const existingTags = await db.listMisconceptionTags(submissionId);
    return { status: "diagnosed", detectedCount: existingTags.length, novelCandidateCount: 0 };
  }

  const submission = await db.getSubmission(submissionId);
  if (!submission) {
    await db.logStageRun({ submissionId, stage: "S5_diagnose", status: "failed", error: "submission not found" });
    return { status: "failed", detectedCount: 0, novelCandidateCount: 0 };
  }

  const transcription = await db.getTranscription(submissionId);
  const grade = await db.getGradeRecommendation(submissionId);
  if (!transcription || !grade) {
    await db.logStageRun({
      submissionId,
      stage: "S5_diagnose",
      status: "failed",
      error: !transcription ? "no transcription" : "no grade recommendation",
    });
    return { status: "failed", detectedCount: 0, novelCandidateCount: 0 };
  }

  const steps = await db.listSolutionSteps(transcription.id);
  const criteria = await db.listCriterionResults(grade.id);
  const module_ = await db.getModuleForQuestion(submission.question_id);
  const taxonomy = module_ ? await db.listMisconceptions(module_.id) : [];

  let diagnosis;
  try {
    diagnosis = await callStructured({
      stage: "S5_diagnose",
      promptVersion: PROMPT_VERSIONS.s5Diagnose,
      role: "fast",
      system: s5DiagnoseSystemPrompt(),
      prompt: s5DiagnoseUserPrompt({
        steps,
        criteriaJustifications: criteria.map((c: any) => `${c.level} on ${c.criterion_key}: ${c.justification}`),
        taxonomy: taxonomy.map((t: any) => ({
          key: t.key,
          name: t.name,
          typical_signature: t.typical_signature,
          description: t.description,
        })),
      }),
      schema: DiagnosisSchema,
      nativeSchema: diagnoseNativeSchema,
      temperature: 0.2,
      submissionId,
    });
  } catch (err) {
    await db.logStageRun({
      submissionId,
      stage: "S5_diagnose",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "failed", detectedCount: 0, novelCandidateCount: 0 };
  }

  const taxonomyByKey = new Map(taxonomy.map((t: any) => [t.key, t]));
  const tagRows = diagnosis.detected
    .map((d) => {
      const entry = taxonomyByKey.get(d.misconception_key);
      if (!entry) return null; // model hallucinated a key not in the taxonomy — drop, don't guess
      return {
        submission_id: submissionId,
        misconception_id: (entry as any).id,
        confidence: d.confidence,
        evidence_step_indices: d.evidence_step_indices,
        observed_signature: d.observed_signature,
        confirmed_by_human: null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  await db.insertMisconceptionTags(tagRows);

  let novelCandidateCount = 0;
  if (module_) {
    for (const candidate of diagnosis.novel_candidates ?? []) {
      const key = `mc_candidate_${candidate.proposed_name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)}`;
      const existing = taxonomy.find((t: any) => t.key === key);
      const misconception =
        existing ??
        (await db.insertMisconception({
          module_id: module_.id,
          key,
          name: candidate.proposed_name,
          description: candidate.proposed_name,
          typical_signature: "",
          severity: "conceptual",
          remediation_note: "",
          status: "candidate",
        }));
      await db.insertMisconceptionTags([
        {
          submission_id: submissionId,
          misconception_id: (misconception as any).id,
          confidence: candidate.confidence,
          evidence_step_indices: candidate.evidence_step_indices,
          observed_signature: candidate.proposed_name,
          confirmed_by_human: null,
        },
      ]);
      novelCandidateCount += 1;
    }
  }

  await db.logStageRun({ submissionId, stage: "S5_diagnose", status: "succeeded", promptVersion: PROMPT_VERSIONS.s5Diagnose });

  return { status: "diagnosed", detectedCount: tagRows.length, novelCandidateCount };
}
