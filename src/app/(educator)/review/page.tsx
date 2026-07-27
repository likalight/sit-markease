import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getReviewQueue } from "@/lib/pipeline/review-queue";
import { ConfidenceBar } from "@/components/confidence-bar";

// docs/DESIGN.md §3 `review-queue-row` / §2 product density. Sorted lowest-
// confidence first (§5.1) — an ethical position: attention goes where
// judgement is needed.
export default async function ReviewQueuePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const queue = await getReviewQueue();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Review queue</h1>
        <p className="text-body-sm text-muted">{queue.length} submission(s) awaiting approval, lowest confidence first.</p>
      </div>

      {queue.length === 0 ? (
        <p className="text-body-sm text-muted">Nothing to review — upload a submission and process it first.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline rounded-lg border border-hairline">
          {queue.map((entry) => (
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
      )}
    </main>
  );
}
