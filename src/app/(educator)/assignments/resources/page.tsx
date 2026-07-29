import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { SubmitButton } from "@/components/submit-button";
import { addResourceAction } from "./actions";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");

  const { error } = await searchParams;

  const module_ = await db.findOrCreateDefaultModule(user.id);
  const resources = await db.listResources((module_ as any).id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href="/assignments" className="text-body-sm text-muted underline">
          ← Back to assignments
        </Link>
        <h1 className="mt-xs text-title-lg text-body-strong">Reference material</h1>
        <p className="text-body-sm text-muted">
          Lecture notes, worked examples, past tutorials — anything the AI should draw from when it
          generates practice problems. Without this, practice items generate with nothing to ground
          them against.
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-md py-sm text-body-sm text-disputed">
          {error}
        </p>
      )}

      {resources.length > 0 && (
        <ul className="flex flex-col divide-y divide-hairline border border-hairline">
          {resources.map((r: any) => (
            <li key={r.id} className="flex flex-col gap-xxs px-md py-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-body-sm font-medium text-body-strong">{r.label}</span>
                <span className="text-caption-caps text-muted-soft">{r.difficulty}</span>
              </div>
              {r.topic_tags?.length > 0 && (
                <span className="text-caption text-muted-soft">{r.topic_tags.join(", ")}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <form action={addResourceAction} className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs text-body-sm text-body">
          Label
          <input
            name="label"
            required
            placeholder="e.g. Lecture 5: IV drip rate calculations"
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Difficulty
          <select name="difficulty" defaultValue="scaffold" className="rounded-sm border border-hairline px-md py-sm">
            <option value="scaffold">Scaffold (introductory)</option>
            <option value="target">Target (standard)</option>
            <option value="extension">Extension (harder)</option>
          </select>
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Topic tags <span className="text-muted-soft">(comma-separated, optional)</span>
          <input
            name="topicTags"
            placeholder="e.g. dosage-calculation, iv-therapy"
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <label className="flex flex-col gap-xs text-body-sm text-body">
          Content
          <textarea
            name="content"
            required
            rows={10}
            placeholder="Paste your notes or worked examples. Separate distinct chunks (e.g. different worked examples) with a blank line — each becomes its own retrievable piece."
            className="rounded-sm border border-hairline px-md py-sm"
          />
        </label>

        <SubmitButton pendingLabel="Embedding and saving…">Add reference material</SubmitButton>
      </form>
    </main>
  );
}
