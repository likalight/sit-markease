"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type TypedResult = {
  submissionId: string;
  pipeline: {
    status: string;
    assess: { status: string };
    diagnose: { status: string };
    autoReleased: boolean;
  };
};

// Objective 1 (brief) — the alternative to photographing handwriting: a
// student who already has their working as LaTeX/text types each step on
// its own line here instead. No image, no OCR, no line detection — this
// skips straight to S4-S7 (see /api/questions/:id/submissions/typed).
export function TypedSubmissionForm({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<TypedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const steps = text.split("\n").map((s) => s.trim()).filter(Boolean);
    if (steps.length === 0) {
      setError("type at least one step of your working");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/questions/${questionId}/submissions/typed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? `submission failed (${res.status})`);
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const pipelineStatus = result?.pipeline?.status;
  const needsHumanTranscription = pipelineStatus === "needs_human_transcription";
  const pipelineFailed = pipelineStatus === "failed";
  const autoReleased = !!result?.pipeline?.autoReleased;
  const needsEducatorReview = !!result && !needsHumanTranscription && !pipelineFailed && !autoReleased;

  return (
    <div className="flex flex-col gap-md">
      <label className="flex flex-col gap-xs text-body-sm text-body">
        Your working, one step per line
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"dy/y = x dx\n\\int \\frac{dy}{y} = \\int x \\, dx\n\\ln|y| = x^2/2 + C\ny = 2e^{x^2/2}"}
          className="rounded-sm border border-hairline px-md py-sm font-mono text-body-sm"
        />
      </label>

      <button
        type="button"
        disabled={loading}
        onClick={submit}
        className="self-start rounded-sm bg-ink px-sm py-xs text-body-sm font-medium text-on-dark disabled:opacity-50"
      >
        {loading ? "Grading…" : "Submit typed working"}
      </button>

      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-sm py-xs text-body-sm text-disputed">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-sm">
          {autoReleased && (
            <div className="flex items-center gap-sm rounded-sm border border-verified/30 bg-verified-soft px-sm py-xs">
              <p className="text-body-sm text-verified">Graded instantly — typed input has no legibility risk.</p>
              <button
                type="button"
                onClick={() => router.push(`/feedback?sub=${result?.submissionId}`)}
                className="rounded-sm bg-ink px-sm py-xs text-body-sm font-medium text-on-dark"
              >
                See your feedback
              </button>
            </div>
          )}

          {needsEducatorReview && (
            <p className="rounded-sm border border-attention/30 bg-attention-soft px-sm py-xs text-body-sm text-attention">
              The mark needs a quick educator check before it's released. You'll see it on your feedback page
              as soon as that's done.
            </p>
          )}

          {needsHumanTranscription && (
            <p className="rounded-sm border border-attention/30 bg-attention-soft px-sm py-xs text-body-sm text-attention">
              Something about the typed steps couldn't be processed automatically — this needs a human to
              check it before it can be graded.
            </p>
          )}

          {pipelineFailed && (
            <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-sm py-xs text-body-sm text-disputed">
              Processing failed after transcription — check stage_runs for details. The submission was still
              saved.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
