import { callStructured } from "@/lib/ai/client";
import { StructuredRubricSchema, type StructuredRubric } from "@/lib/schemas/rubric";
import { rubricStructureNativeSchema } from "./native-schemas";
import { rubricStructureSystemPrompt, rubricStructureUserPrompt, PROMPT_VERSIONS } from "./prompts";

// "Paste a rubric, AI structures it" (docs/STUBS.md — previously a stubbed
// prompt version with no implementation). Lets an educator create a new
// question in any subject without hand-writing weighted, leveled criteria
// JSON — the concrete fix for "why is this locked to one hardcoded
// question" (docs/DECISIONS.md).
export async function structureRubric(args: {
  promptText: string;
  modelSolution: string;
  maxScore: number;
  rawRubricNotes: string;
}): Promise<StructuredRubric> {
  return callStructured({
    stage: "rubric_structure",
    promptVersion: PROMPT_VERSIONS.rubricStructure,
    role: "primary",
    system: rubricStructureSystemPrompt(),
    prompt: rubricStructureUserPrompt(args),
    schema: StructuredRubricSchema,
    nativeSchema: rubricStructureNativeSchema,
    temperature: 0.2,
  });
}
