import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { PracticeItemCard } from "@/components/practice-item-card";

// §11.1 S2 — practice set. Editorial density. Difficulty ramp visible,
// provenance line on every item, hint ladder + solution gating in the
// client component.
export default async function PracticeSetPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const { submissionId } = await params;
  const submission = await db.getSubmission(submissionId);
  if (!submission || submission.student_id !== user.id) notFound();

  const practiceSet = await db.getPracticeSetForSubmission(submissionId);
  if (!practiceSet) notFound();

  const items = await db.listPracticeItems((practiceSet as any).id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-xl px-6 py-section">
      <div>
        <h1 className="font-serif text-display-lg text-ink">Your practice set</h1>
        <p className="text-body-md text-muted">
          {items.length} problem(s), scaffold → target → extension, drawn from your module's own material.
        </p>
      </div>

      <div className="flex flex-col gap-lg">
        {items.map((item: any) => (
          <PracticeItemCard
            key={item.id}
            position={item.position}
            difficulty={item.difficulty}
            promptLatex={item.prompt_latex}
            solutionLatex={item.solution_latex}
            hintLadder={item.hint_ladder}
            targetsBecause={item.targets_because}
            provenance={item.provenance}
            verifiedBy={item.verified_by}
          />
        ))}
      </div>
    </main>
  );
}
