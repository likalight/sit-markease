"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Box } from "@/lib/schemas/geometry";
import { isPdfFile, renderPdfToImageFiles } from "@/lib/pdf/render-client";

type UploadResult = {
  submissionId: string;
  originalUrl: string;
  boxes: Box[];
  skewDeg: number;
  qualityScore: number;
  detector: string;
  pageCount: number;
  pipeline: {
    status: string;
    assess: { status: string };
    diagnose: { status: string };
    autoReleased: boolean;
  };
};

// Student self-submit viewer: upload a photo, show the deskewed result's
// line boxes, then run the rest of the pipeline (S2-S7, see the upload
// route) which auto-releases the grade if it's confident enough — no
// waiting on an educator unless the read's own confidence was too low.
export function UploadAndViewer({ questionId }: { questionId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submitFile(file: File | undefined) {
    if (!file) {
      setError("choose a photo or file first");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const uploadFile = isPdfFile(file) ? (await renderPdfToImageFiles(file, { maxPages: 15, maxWidth: 1600 }))[0] : file;
      const body = new FormData();
      body.append("file", uploadFile);
      const res = await fetch(`/api/questions/${questionId}/submissions`, {
        method: "POST",
        body,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? `upload failed (${res.status})`);
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
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center gap-sm">
        {/* capture="environment" opens the camera directly on a phone,
            instead of the OS's generic file picker. Desktop browsers ignore
            capture, so this button just opens a normal file dialog there. */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => submitFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-sm bg-ink px-sm py-xs text-body-sm font-medium text-on-dark disabled:opacity-50"
        >
          {loading ? "Processing…" : "Take a photo"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => submitFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-sm border border-hairline px-sm py-xs text-body-sm text-body disabled:opacity-50"
        >
          Upload a file instead
        </button>
      </div>

      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-sm py-xs text-body-sm text-disputed">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-sm">
          <p className="text-body-sm text-muted">
            skew: {result.skewDeg.toFixed(2)}° · quality: {result.qualityScore.toFixed(2)} ·
            detector: {result.detector} · {result.boxes.length} line(s) detected
            {result.pageCount > 1 && ` · ${result.pageCount} pages uploaded (grading currently uses page 1)`}
          </p>
          <div className="relative inline-block rounded-lg bg-surface-dark p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.originalUrl} alt="original submission" className="block max-w-2xl rounded-sm" />
            {result.boxes.map((box, i) => (
              <div
                key={i}
                className="absolute rounded-sm border-[1.5px] border-verified bg-verified-soft opacity-60"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                }}
              />
            ))}
          </div>

          {autoReleased && (
            <div className="flex items-center gap-sm rounded-sm border border-verified/30 bg-verified-soft px-sm py-xs">
              <p className="text-body-sm text-verified">Graded instantly — the read was confident.</p>
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
              The read wasn't confident enough to trust automatically, so this one needs a quick educator
              check before it's released. You'll see it on your feedback page as soon as that's done.
            </p>
          )}

          {needsHumanTranscription && (
            <p className="rounded-sm border border-attention/30 bg-attention-soft px-sm py-xs text-body-sm text-attention">
              The transcription confidence was too low to trust automatically — this submission needs a
              human to transcribe it before it can be graded.
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
