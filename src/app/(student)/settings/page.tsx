import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { SubmitButton } from "@/components/submit-button";
import { setFeedbackToneAction } from "./actions";

const TONE_OPTIONS = [
  {
    value: "supportive",
    label: "Supportive",
    description: "Leads with what went well, frames gaps as next steps.",
  },
  {
    value: "concise",
    label: "Concise",
    description: "Just the score breakdown and the one thing to fix — no framing.",
  },
  {
    value: "socratic",
    label: "Socratic",
    description: "Points at what to reconsider with a question instead of the answer.",
  },
] as const;

// Feedback tone was always hardcoded to "supportive" server-side — this is
// the first place a student actually chooses it, closing the gap between
// the product's "Individualised" framing and what S6 actually did.
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  const { saved, error } = await searchParams;
  const record = await db.getUser(user.id);
  const currentTone = (record as any)?.feedback_tone ?? "supportive";

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Settings</h1>
        <p className="text-body-sm text-muted">
          Choose how your feedback is written. This applies to every submission going forward — it
          doesn't rewrite feedback you've already received.
        </p>
      </div>

      {saved && (
        <p className="rounded-sm border border-verified/30 bg-verified-soft px-md py-sm text-body-sm text-verified">
          Saved.
        </p>
      )}
      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-md py-sm text-body-sm text-disputed">
          {error}
        </p>
      )}

      <form action={setFeedbackToneAction} className="flex flex-col gap-md">
        <fieldset className="flex flex-col gap-sm">
          <legend className="text-body-sm font-medium text-body-strong">Feedback tone</legend>
          {TONE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-sm rounded-sm border border-hairline px-md py-sm"
            >
              <input
                type="radio"
                name="tone"
                value={opt.value}
                defaultChecked={currentTone === opt.value}
                className="mt-1"
              />
              <span className="flex flex-col">
                <span className="text-body-sm font-medium text-body-strong">{opt.label}</span>
                <span className="text-caption text-muted">{opt.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      </form>
    </main>
  );
}
