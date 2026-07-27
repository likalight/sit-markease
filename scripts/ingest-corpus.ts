/**
 * §12 corpus prep. Seeds a small hand-authored module corpus (lecture notes
 * + tutorial problems for separable ODEs) as resources + resource_chunks.
 *
 * Deviation from §12 (docs/DECISIONS.md): each chunk's topic_tags/difficulty/
 * concepts_required are hand-authored here rather than produced by "one LLM
 * pass" over ingested documents — reasonable for a 4-chunk corpus, revisit
 * if the corpus grows past what's practical to tag by hand.
 *
 * Run with `npm run ingest-corpus`. Idempotent — safe to re-run.
 */
import "dotenv/config";
import { localStore } from "../src/lib/db/local-store";
import { db } from "../src/lib/db/facade";

const CHUNKS = [
  {
    kind: "tutorial" as const,
    label: "Tutorial 6 Q3",
    difficulty: "target" as const,
    topic_tags: ["ODEs", "separation-of-variables"],
    concepts_required: ["separation_of_variables", "constant_of_integration"],
    content:
      "Tutorial 6 Q3. Solve dy/dx = 2x y, given y(0) = 1.\n" +
      "Solution: separate variables: dy/y = 2x dx. Integrate both sides, keeping the constant of " +
      "integration: ln|y| = x^2 + C. This +C matters — without it you have only one member of a whole " +
      "family of solutions. Exponentiate: y = e^{x^2 + C} = A e^{x^2} where A = e^C. Now apply the " +
      "initial condition y(0) = 1 to the general solution: 1 = A e^0 = A, so A = 1. Final answer: y = e^{x^2}.",
  },
  {
    kind: "tutorial" as const,
    label: "Tutorial 4 Q2",
    difficulty: "scaffold" as const,
    topic_tags: ["ODEs", "initial-conditions"],
    concepts_required: ["initial_conditions", "general_solution"],
    content:
      "Tutorial 4 Q2. Solve dy/dx = 3x^2 y, given y(0) = 5.\n" +
      "A common mistake is substituting the initial condition before the equation has been integrated — " +
      "at that point y and x are still related only through the differential equation, not through an " +
      "explicit formula, so there is nothing yet to substitute into. Always integrate first to obtain the " +
      "general solution, and only then use the initial condition to pin down the constant. " +
      "Separate: dy/y = 3x^2 dx. Integrate: ln|y| = x^3 + C, so y = A e^{x^3}. Now apply y(0) = 5: A = 5. " +
      "Final answer: y = 5 e^{x^3}.",
  },
  {
    kind: "lecture_notes" as const,
    label: "Lecture 5: Separation of Variables",
    difficulty: "scaffold" as const,
    topic_tags: ["ODEs", "separation-of-variables", "method"],
    concepts_required: ["separation_of_variables"],
    content:
      "Lecture 5 notes. A first-order ODE dy/dx = f(x) g(y) is separable: rewrite as dy/g(y) = f(x) dx, " +
      "then integrate both sides independently. Always include the constant of integration on at least " +
      "one side. If an initial condition is given, apply it only after both sides have been integrated, " +
      "to the general solution — never to an intermediate, unintegrated equation.",
  },
  {
    kind: "tutorial" as const,
    label: "Tutorial 6 Q5",
    difficulty: "extension" as const,
    topic_tags: ["ODEs", "separation-of-variables"],
    concepts_required: ["separation_of_variables", "constant_of_integration"],
    content:
      "Tutorial 6 Q5 (harder). Solve dy/dx = 4x^3 y, given y(0) = 2.\n" +
      "Separate: dy/y = 4x^3 dx. Integrate: ln|y| = x^4 + C, so y = A e^{x^4}. Apply y(0) = 2: A = 2. " +
      "Final answer: y = 2 e^{x^4}.",
  },
];

async function main() {
  const module_ = localStore.findOne("modules", (m: any) => m.code === "ENG1001");
  if (!module_) {
    throw new Error("no seeded module found — run `npm run seed` first");
  }

  const existing = await db.listResources(module_.id);
  if (existing.length > 0) {
    console.log(`  corpus already has ${existing.length} resource(s) for ${module_.code} — skipping`);
    return;
  }

  for (const chunk of CHUNKS) {
    const resource = await db.insertResource({
      module_id: module_.id,
      kind: chunk.kind,
      label: chunk.label,
      storage_path: null,
      topic_tags: chunk.topic_tags,
      difficulty: chunk.difficulty,
    });
    await db.insertResourceChunks([
      {
        resource_id: (resource as any).id,
        chunk_index: 0,
        content: chunk.content,
        concepts_required: chunk.concepts_required,
        embedding: null,
      },
    ]);
    console.log(`  ingested "${chunk.label}" (${chunk.difficulty})`);
  }

  console.log(`\nIngested ${CHUNKS.length} corpus chunks for ${module_.code}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
