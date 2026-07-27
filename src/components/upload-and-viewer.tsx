"use client";

import { useState } from "react";
import type { Box } from "@/lib/schemas/geometry";

type UploadResult = {
  submissionId: string;
  originalUrl: string;
  boxes: Box[];
  skewDeg: number;
  qualityScore: number;
  detector: string;
};

// M1 acceptance-criterion viewer: upload a photo, show the deskewed result's
// line boxes overlaid on the original image. This is not the full E3 review
// console (that's M5) — just enough to prove S1/S1b work end-to-end.
export function UploadAndViewer({ questionId }: { questionId: string }) {
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);

    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      setError("choose an image first");
      setLoading(false);
      return;
    }

    const body = new FormData();
    body.append("file", file);

    try {
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

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input type="file" name="file" accept="image/*" className="text-sm" />
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Processing…" : "Upload"}
        </button>
      </form>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-neutral-500">
            skew: {result.skewDeg.toFixed(2)}° · quality: {result.qualityScore.toFixed(2)} ·
            detector: {result.detector} · {result.boxes.length} line(s) detected
          </p>
          <div className="relative inline-block border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.originalUrl} alt="original submission" className="block max-w-2xl" />
            {result.boxes.map((box, i) => (
              <div
                key={i}
                className="absolute border-2 border-red-500/80"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
