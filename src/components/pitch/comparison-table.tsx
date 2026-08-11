import { COMPARISON_ROWS } from "@/lib/pitch/content";
import { CircleIcon, CheckCircleIcon } from "@/components/icons";

export function ComparisonTable() {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-hairline sm:block">
        <table className="w-full border-collapse text-left text-body-sm">
          <thead>
            <tr className="bg-surface-dark-elevated text-on-dark">
              <th className="px-md py-sm font-mono text-caption-caps font-medium">Existing grading platforms</th>
              <th className="px-md py-sm font-mono text-caption-caps font-medium text-on-dark">
                AIMS (our unique selling points)
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.existing} className="glass-card border-t border-hairline">
                <td className="px-md py-sm align-top text-muted">
                  <div className="flex items-start gap-xs">
                    <CircleIcon className="mt-[2px] shrink-0 text-muted-soft" width={16} height={16} />
                    <span>{row.existing}</span>
                  </div>
                </td>
                <td className="px-md py-sm align-top font-medium text-body-strong">
                  <div className="flex items-start gap-xs">
                    <CheckCircleIcon className="mt-[2px] shrink-0 text-verified" width={16} height={16} />
                    <span>{row.aims}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-sm sm:hidden">
        {COMPARISON_ROWS.map((row) => (
          <div key={row.existing} className="glass-card px-md py-md">
            <p className="mb-xxs font-mono text-caption-caps text-muted-soft">Existing</p>
            <p className="mb-sm flex items-start gap-xs text-body-sm text-muted">
              <CircleIcon className="mt-[2px] shrink-0 text-muted-soft" width={16} height={16} />
              <span>{row.existing}</span>
            </p>
            <p className="mb-xxs font-mono text-caption-caps text-primary-active">AIMS</p>
            <p className="flex items-start gap-xs text-body-sm font-medium text-body-strong">
              <CheckCircleIcon className="mt-[2px] shrink-0 text-verified" width={16} height={16} />
              <span>{row.aims}</span>
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
