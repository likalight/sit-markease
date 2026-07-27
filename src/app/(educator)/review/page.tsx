import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getReviewQueue } from "@/lib/pipeline/review-queue";

// §11.1 E3 review queue: lowest confidence first (§5.1). Links into the
// three-pane console at /review/[submissionId].
export default async function ReviewQueuePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const queue = await getReviewQueue();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <p className="text-sm text-neutral-500">{queue.length} submission(s) awaiting approval, lowest confidence first.</p>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing to review — upload a submission and process it first.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-200 rounded border border-neutral-200">
          {queue.map((entry) => (
            <li key={entry.submissionId}>
              <Link
                href={`/review/${entry.submissionId}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {entry.totalRecommended ?? "?"}/{entry.maxTotal ?? "?"}
                  </span>
                  {entry.needsHumanReview && (
                    <span className="text-xs text-amber-600">flagged for human review</span>
                  )}
                </div>
                <span className="text-xs text-neutral-400">
                  confidence {(entry.avgConfidence * 100).toFixed(0)}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
