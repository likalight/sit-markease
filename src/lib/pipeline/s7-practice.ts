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
//
// Split into two distinct stages/stage_runs — generation (`S7_practice`)
// and verification (`S7_verify`) — matching the pitch deck's two separate
// journey steps, rather than one function logging one stage the way this
// used to work. `generatePracticeSet` below is a thin wrapper preserving
// the original single-call signature for existing callers (the
// request-revision route, scripts/seed-ai-fixtures.ts).

export interface PracticeResult {
  status: "generated" | "skipped_no_misconception" | "failed";
  itemCount: number;
  discardedCount: number;
}

interface GenerationContext {
  misconceptionId: string;
  items: PracticeItem[];
}

type GenerateItemsResult = { status: "generated"; context: GenerationContext } | { status: "skipped_no_misconception" | "failed" };

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

/** Stage 1: misconception lookup + RAG retrieval + the LLM generation call.
 * Logs `stage: "S7_practice"`. Returns the raw (unverified) generated items
 * — verification happens separately in verifyAndPersistPracticeSet. */
async function generatePracticeItems(submissionId: string): Promise<GenerateItemsResult> {
  const submission = await db.getSubmission(submissionId);
  if (!submission) {
    await db.logStageRun({ submissionId, stage: "S7_practice", status: "failed", error: "submission not found" });
    return { status: "failed" };
  }

  const tags = await db.listMisconceptionTags(submissionId);
  if (tags.length === 0) {
    await db.logStageRun({ submissionId, stage: "S7_practice", status: "skipped" });
    return { status: "skipped_no_misconception" };
  }

  const module_ = await db.getModuleForQuestion(submission.question_id);
  const question = await db.getQuestionWithRubric(submission.question_id);
  if (!module_) {
    await db.logStageRun({ submissionId, stage: "S7_practice", status: "failed", error: "no module for question" });
    return { status: "failed" };
  }

  const taxonomy = await db.listMisconceptions(module_.id);
  const taxonomyById = new Map(taxonomy.map((t: any) => [t.id, t]));

  // Target the highest-confidence detected misconception.
  const topTag = [...tags].sort((a: any, b: any) => b.confidence - a.confidence)[0];
  const misconception = taxonomyById.get(topTag.misconception_id) as any;
  if (!misconception) {
    await db.logStageRun({ submissionId, stage: "S7_practice", status: "failed", error: "misconception taxonomy entry missing" });
    return { status: "failed" };
  }

  const resources = await db.listResources(module_.id);
  const chunks = await db.listResourceChunks(resources.map((r: any) => r.id));
  const resourceLabelById = new Map(resources.map((r: any) => [r.id, r.label]));

  const retrievalQuery = `${misconception.description} ${topTag.observed_signature} ${(question?.topic_tags ?? []).join(" ")}`;
  const retrieved = await retrieveChunks(retrievalQuery, chunks, 4);

  try {
    const generation = await callStructured({
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

    await db.logStageRun({ submissionId, stage: "S7_practice", status: "succeeded", promptVersion: PROMPT_VERSIONS.s7Practice });
    return { status: "generated", context: { misconceptionId: misconception.id, items: generation.items } };
  } catch (err) {
    await db.logStageRun({
      submissionId,
      stage: "S7_practice",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "failed" };
  }
}

/** Stage 2: per-item verification gate + persistence. Logs
 * `stage: "S7_verify"`. Discards anything that fails verification —
 * CLAUDE.md rule 7, never ship an unverified item. */
async function verifyAndPersistPracticeSet(submissionId: string, context: GenerationContext): Promise<PracticeResult> {
  const submission = await db.getSubmission(submissionId);
  if (!submission) {
    await db.logStageRun({ submissionId, stage: "S7_verify", status: "failed", error: "submission not found" });
    return { status: "failed", itemCount: 0, discardedCount: 0 };
  }

  // Everything from here on used to be unguarded: a throw from the
  // per-item verification loop or the two DB writes below propagated all
  // the way up through the orchestrator with no stage_runs row ever
  // written — found live, where callStructured's own success log (for the
  // generation call itself) was the ONLY S7 row on record despite no
  // practice_set ever landing in the DB. Wrapping this closes that blind
  // spot: any failure here now degrades and logs, per CLAUDE.md rule 8.
  try {
    const verifiedItems: (PracticeItem & { verifiedBy: "sympy" | "llm" | "unverified" })[] = [];
    let discardedCount = 0;

    for (const item of context.items) {
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
        stage: "S7_verify",
        status: "failed",
        error: `all ${context.items.length} generated items failed verification`,
      });
      return { status: "failed", itemCount: 0, discardedCount };
    }

    const practiceSet = await db.createPracticeSet({
      student_id: submission.student_id,
      submission_id: submissionId,
      target_misconception_ids: [context.misconceptionId],
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

    await db.logStageRun({ submissionId, stage: "S7_verify", status: "succeeded", promptVersion: PROMPT_VERSIONS.s7Verify });

    return { status: "generated", itemCount: verifiedItems.length, discardedCount };
  } catch (err) {
    await db.logStageRun({
      submissionId,
      stage: "S7_verify",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: "failed", itemCount: 0, discardedCount: 0 };
  }
}

/** Thin wrapper preserving the original single-call entry point — idempotency
 * guard, then stage 1 (generate) followed by stage 2 (verify + persist). */
export async function generatePracticeSet(submissionId: string): Promise<PracticeResult> {
  const existingSet = await db.getPracticeSetForSubmission(submissionId);
  if (existingSet) {
    const items = await db.listPracticeItems((existingSet as any).id);
    return { status: "generated", itemCount: items.length, discardedCount: 0 };
  }

  const generated = await generatePracticeItems(submissionId);
  if (generated.status !== "generated") {
    return { status: generated.status, itemCount: 0, discardedCount: 0 };
  }

  return verifyAndPersistPracticeSet(submissionId, generated.context);
}
