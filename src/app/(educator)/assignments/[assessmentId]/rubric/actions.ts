"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

type EditableCriterion = {
  key: string;
  name: string;
  weight: number;
  max_score: number;
  levels: { level: string; score: number; descriptor: string }[];
};

// Rubric review/edit before opening for submissions — rubrics were
// previously set once by AI at creation time with no way to review or
// change them (only the mid-review "+Add rubric item" existed, gated on a
// submission already existing). Saves the whole edited set per question in
// one go via replaceRubricCriteria (delete-then-reinsert), matching the
// small-list-of-criteria scale this always operates at.
export async function saveRubricAction(
  assessmentId: string,
  rubricId: string,
  criteria: EditableCriterion[]
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") return;

  await db.replaceRubricCriteria(rubricId, criteria);
  revalidatePath(`/assignments/${assessmentId}/rubric`);
}
