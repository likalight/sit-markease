import Link from "next/link";

type DemoGuideStep = {
  title: string;
  body: string;
  href?: string;
  action?: string;
};

export function DemoGuidePanel({
  eyebrow,
  title,
  body,
  steps,
}: {
  eyebrow: string;
  title: string;
  body: string;
  steps: DemoGuideStep[];
}) {
  return (
    <aside className="demo-highlight rounded-sm border border-primary-hairline bg-primary-soft px-md py-md">
      <p className="text-caption-caps text-primary-active">{eyebrow}</p>
      <h2 className="mt-xxs text-title-sm font-semibold text-body-strong">{title}</h2>
      <p className="mt-xs text-body-sm text-body">{body}</p>
      <ol className="mt-sm flex flex-col gap-xs">
        {steps.map((step, index) => (
          <li key={`${step.title}-${index}`} className="grid grid-cols-[1.5rem_1fr] gap-xs text-body-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-caption font-semibold text-on-primary">
              {index + 1}
            </span>
            <span>
              <strong className="text-body-strong">{step.title}</strong>
              <span className="text-muted"> — {step.body}</span>
              {step.href && step.action && (
                <>
                  {" "}
                  <Link href={step.href} className="font-medium text-primary-active underline">
                    {step.action}
                  </Link>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
