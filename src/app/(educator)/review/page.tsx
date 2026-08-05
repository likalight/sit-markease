import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getReviewQueueGroupedByQuestion } from "@/lib/pipeline/review-queue";
import { ConfidenceBar } from "@/components/confidence-bar";
import { DEMO_SUMMATIVE_TITLE } from "@/lib/demo-tour/demo-content";

// docs/DESIGN.md §3 `review-queue-row` / §2 product density. Grouped by
// question, Gradescope-style — an instructor works through one question's
// submissions against the same rubric before switching, rather than a flat
// list interleaving unrelated questions. Within a group, still sorted
// lowest-confidence first (§5.1): attention goes where judgement is needed.
export default async function ReviewQueuePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const groups = await getReviewQueueGroupedByQuestion();
  const total = groups.reduce((sum, g) => sum + g.entries.length, 0);

  return (
    <main data-tour-id="review-page-body" className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Review queue</h1>
        <p className="text-body-sm text-muted">{total} submission(s) awaiting approval, grouped by question.</p>
      </div>

      {groups.length === 0 ? (
        <p className="text-body-sm text-muted">Nothing to review — upload a submission and process it first.</p>
      ) : (
        <div className="flex flex-col gap-lg">
          {groups.map((group) => (
            <div key={group.questionId} className="rounded-lg border border-hairline">
              <div className="flex items-center justify-between border-b border-hairline px-md py-sm">
                <div>
                  <p className="text-title-sm font-semibold text-body-strong">{group.assessmentTitle}</p>
                  <p className="text-caption text-muted-soft">{group.questionPromptText}</p>
                </div>
                <Link
                  href={`/review/${group.entries[0].submissionId}`}
                  data-tour-id={group.assessmentTitle === DEMO_SUMMATIVE_TITLE ? "review-open" : undefined}
                  className="rounded-sm bg-primary px-sm py-xs text-body-sm font-medium text-on-primary"
                >
                  Review all {group.entries.length} →
                </Link>
              </div>
              <ul className="flex flex-col divide-y divide-hairline">
                {group.entries.map((entry) => (
                  <li key={entry.submissionId}>
                    <Link
                      href={`/review/${entry.submissionId}`}
                      className="grid min-h-11 grid-cols-[1fr_120px_80px_140px] items-center gap-sm px-md py-xs hover:bg-surface-soft"
                    >
                      <span className="text-body-sm text-body">Submission {entry.submissionId.slice(0, 8)}</span>
                      <ConfidenceBar value={entry.avgConfidence} />
                      <span className="text-data-sm tabular-nums text-body-strong">
                        {entry.totalRecommended ?? "?"}/{entry.maxTotal ?? "?"}
                      </span>
                      <span className="text-caption-caps text-attention">
                        {entry.needsHumanReview ? "⚑ human required" : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
