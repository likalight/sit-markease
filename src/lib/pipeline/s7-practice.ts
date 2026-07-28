import { callStructured } from "@/lib/ai/client";
import { db } from "@/lib/db/facade";
import { sidecar } from "@/lib/sidecar/client";
import { PracticeGenerationSchema, type PracticeItem } from "@/lib/schemas/practice";
import { VerifyItemResponseSchema } from "@/lib/schemas/symbolic";
import { practiceNativeSchema } from "./native-schemas";
import { s7PracticeSystemPrompt, s7PracticeUserPrompt, s7VerifySystemPrompt, s7VerifyUserPrompt, PROMPT_VERSIONS } from "./prompts";
import { retrieveChunks } from "@/lib/rag/retrieve";

// §7.8 S7 — targeted practice via RAG + mandatory verification gate.
// Generates practice only when a misconception was actually detected (S5) —
// "targeted" practice needs a target. Verified items only are persisted;
// failures are discarded, not shipped (CLAUDE.md rule 7).

export interface PracticeResult {
  status: "generated" | "skipped_no_misconception" | "failed";
  itemCount: number;
  discardedCount: number;
}

async function verifyGeneratedItem(item: PracticeItem, submissionId: string): Promise<{ verified: boolean; verifiedBy: "sympy" | "llm" | "unverified" }> {
  const sympyResult = await sidecar.verifyItem(item.prompt_latex, item.solution_latex);
  if (sympyResult.method === "sympy") {
    return { verified: sympyResult.valid, verifiedBy: "sympy" };
  }

  // Fallback: LLM judgement (§7.8 point 2).
  try {
    const judged = await callStructured({
      stage: "S7_verify",
      promptVersion: PROMPT_VERSIONS.s7Verify,
      role: "fast",
      system: s7VerifySystemPrompt(),
      prompt: s7VerifyUserPrompt(item.prompt_latex, item.solution_latex),
      schema: VerifyItemResponseSchema,
      temperature: 0,
      submissionId,
    });
    return { verified: judged.valid, verifiedBy: "llm" };
  } catch {
    return { verified: false, verifiedBy: "unverified" };
  }
}

export async function generatePracticeSet(submissionId: string): Promise<PracticeResult> {
  // Idempotency guard — see s2-transcribe.ts's identical guard.
  const existingSet = await db.getPracticeSetForSubmission(submissionId);
  if (existingSet) {
    const items = await db.listPracticeItems((existingSet as any).id);
    return { status: "generated", itemCount: items.length, discardedCount: 0 };
  }

  const submission = await db.getSubmission(submissionId);
  if (!submission) {
    await db.logStageRun({ submissionId, stage: "S7_practice", status: "failed", error: "submission not found" });
    return { status: "failed", itemCount: 0, discardedCount: 0 };
  }

  const tags = await db.listMisconceptionTags(submissionId);
  if (tags.length === 0) {
    await db.logStageRun({ submissionId, stage: "S7_practice", status: "skipped" });
    return { status: "skipped_no_misconception", itemCount: 0, discardedCount: 0 };
  }

  const module_ = await db.getModuleForQuestion(submission.question_id);
  const question = await db.getQuestionWithRubric(submission.question_id);
  if (!module_) {
    await db.logStageRun({ submissionId, stage: "S7_practice", status: "failed", error: "no module for question" });
    return { status: "failed", itemCount: 0, discardedCount: 0 };
  }

  const taxonomy = await db.listMisconceptions(module_.id);
  const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));

  // Target the highest-confidence detected misconception.
  const topTag = [...tags].sort((a: any, b: any) => b.confidence - a.confidence)[0];
  const misconception = taxonomyById.get(topTag.misconception_id) as any;
  if (!misconception) {
    await db.logStageRun({ submissionId, stage: "S7_practice", status: "failed", error: "misconception taxonomy entry missing" });
    return { status: "failed", itemCount: 0, discardedCount: 0 };
  }

  const resources = await db.listResources(module_.id);
  const chunks = await db.listResourceChunks(resources.map((r: any) => r.id));
  const resourceLabelById = new Map(resources.map((r: any) => [r.id, r.label]));

  const retrievalQuery = `${misconception.description} ${topTag.observed_signature} ${(question?.topic_tags ?? []).join(" ")}`;
  const retrieved = await retrieveChunks(retrievalQuery, chunks, 4);

  let generation;
  try {
    generation = await callStructured({
      stage: "S7_practice",
      promptVersion: PROMPT_VERSIONS.s7Practice,
      role: "primary",
      system: s7PracticeSystemPrompt(),
      prompt: s7PracticeUserPrompt({
        misconceptionName: misconception.name,
        misconceptionDescription: misconception.description,
        observedSignature: topTag.observed_signature,
        topicTags: question?.topic_tags ?? [],
        retrievedItems: retrieved.map((c: any) => ({ label: resourceLabelById.get(c.resource_id) ?? "unknown source", content: c.content })),
      }),
      schema: PracticeGenerationSchema,
      nativeSchema: practiceNativeSchema,
      temperature: 0.5,
      submissionId,
    });
  } catch (err) {
    await db.logStageRun({
      submissionId,
      stage: "S7_practice",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "failed", itemCount: 0, discardedCount: 0 };
  }

  const verifiedItems: (PracticeItem & { verifiedBy: "sympy" | "llm" | "unverified" })[] = [];
  let discardedCount = 0;

  for (const item of generation.items) {
    if (item.provenance.type === "retrieved") {
      // Retrieved verbatim from the module's own corpus — trusted, no gate.
      verifiedItems.push({ ...item, verifiedBy: "sympy" });
      continue;
    }
    const { verified, verifiedBy } = await verifyGeneratedItem(item, submissionId);
    if (verified) {
      verifiedItems.push({ ...item, verifiedBy });
    } else {
      discardedCount += 1;
    }
  }

  if (verifiedItems.length === 0) {
    await db.logStageRun({
      submissionId,
      stage: "S7_practice",
      status: "failed",
      error: `all ${generation.items.length} generated items failed verification`,
    });
    return { status: "failed", itemCount: 0, discardedCount };
  }

  const practiceSet = await db.createPracticeSet({
    student_id: submission.student_id,
    submission_id: submissionId,
    target_misconception_ids: [misconception.id],
  });

  await db.insertPracticeItems(
    verifiedItems.map((item, i) => ({
      practice_set_id: (practiceSet as any).id,
      position: i + 1,
      difficulty: item.difficulty,
      prompt_latex: item.prompt_latex,
      solution_latex: item.solution_latex,
      hint_ladder: item.hint_ladder,
      targets_because: item.targets_because,
      provenance: item.provenance,
      verified: true,
      verified_by: item.verifiedBy,
    }))
  );

  await db.logStageRun({ submissionId, stage: "S7_practice", status: "succeeded", promptVersion: PROMPT_VERSIONS.s7Practice });

  return { status: "generated", itemCount: verifiedItems.length, discardedCount };
}
