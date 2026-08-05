import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

const SEVERITY_CLASS: Record<string, string> = {
  conceptual: "border-disputed/40 bg-disputed-soft text-disputed",
  procedural: "border-attention/40 bg-attention-soft text-attention",
  notational: "border-hairline bg-surface-soft text-muted",
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ assessment?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const { assessment: assessmentParam } = await searchParams;
  const assessments = (await db.listAssessmentsForOwner(user.id)).filter((assessment: any) => !assessment.archived_at);

  if (assessments.length === 0) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-lg px-6 py-xl">
        <h1 className="text-title-lg text-body-strong">Class insights</h1>
        <p className="text-body-sm text-muted">
          No assignments yet — <Link href="/assignments/new" className="underline">create one</Link> to see
          class-level analytics once submissions come in.
        </p>
      </main>
    );
  }

  const selectedId = assessmentParam && assessments.some((a: any) => a.id === assessmentParam)
    ? assessmentParam
    : (assessments[0] as any).id;

  const insights = await db.getAssessmentInsights(selectedId);
  const maxHistogramCount = Math.max(1, ...insights.scoreHistogram.map((b) => b.count));

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Class insights</h1>
        <p className="text-body-sm text-muted">
          Aggregate-only — how the class is doing, not who's doing well or badly.
        </p>
      </div>

      <div className="flex flex-wrap gap-xs">
        {assessments.map((a: any) => (
          <Link
            key={a.id}
            href={`/insights?assessment=${a.id}`}
            className={`rounded-pill border px-md py-xs text-body-sm ${
              a.id === selectedId
                ? "border-primary/40 bg-primary-soft text-body-strong"
                : "border-hairline text-muted hover:text-body"
            }`}
          >
            {a.title}
          </Link>
        ))}
      </div>

      {insights.submissionCount === 0 ? (
        <p className="rounded-lg border border-hairline p-lg text-body-sm text-muted">
          No graded submissions for &quot;{insights.assessmentTitle}&quot; yet.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-sm rounded-lg border border-hairline p-lg">
            <h2 className="text-title-sm font-semibold text-body-strong">Score distribution</h2>
            <p className="text-caption text-muted-soft">{insights.submissionCount} graded submission(s)</p>
            <div className="flex items-end gap-xxs" style={{ height: 96 }}>
              {insights.scoreHistogram.map((b) => (
                <div key={b.bucket} className="flex flex-1 flex-col items-center gap-xxs">
                  <div
                    className="w-full rounded-t-sm bg-primary"
                    style={{ height: `${(b.count / maxHistogramCount) * 80}px`, opacity: b.count ? 1 : 0.15 }}
                  />
                  <span className="text-caption text-muted-soft">{b.bucket * 10}</span>
                </div>
              ))}
            </div>
            <p className="text-caption text-muted-soft">Score bucket, in % of max</p>
          </section>

          <section className="flex flex-col gap-sm rounded-lg border border-hairline p-lg">
            <h2 className="text-title-sm font-semibold text-body-strong">Weakest rubric criteria</h2>
            {insights.criteriaBreakdown.length === 0 ? (
              <p className="text-body-sm text-muted">No scored criteria yet.</p>
            ) : (
              <div className="flex flex-col gap-xs">
                {insights.criteriaBreakdown.slice(0, 10).map((c, i) => (
                  <div key={i} className="flex items-center gap-sm">
                    <span className="w-48 shrink-0 truncate text-body-sm text-body">{c.name}</span>
                    <div className="h-2 flex-1 rounded-pill bg-surface-soft">
                      <div
                        className="h-2 rounded-pill bg-primary"
                        style={{ width: `${Math.round(c.avgPct * 100)}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-data-sm tabular-nums text-muted">
                      {Math.round(c.avgPct * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-sm rounded-lg border border-hairline p-lg">
            <h2 className="text-title-sm font-semibold text-body-strong">Top misconceptions</h2>
            {insights.topMisconceptions.length === 0 ? (
              <p className="text-body-sm text-muted">No misconceptions detected yet.</p>
            ) : (
              <div className="flex flex-col gap-xs">
                {insights.topMisconceptions.slice(0, 10).map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-sm">
                    <span className="flex items-center gap-xs text-body-sm text-body">
                      {m.name}
                      <span
                        className={`rounded-sm border px-xs py-[1px] text-caption ${SEVERITY_CLASS[m.severity] ?? SEVERITY_CLASS.notational}`}
                      >
                        {m.severity}
                      </span>
                    </span>
                    <span className="text-data-sm tabular-nums text-muted">
                      {m.count} occurrence{m.count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
