"use client";

import { useState } from "react";
import { UploadAndViewer } from "./upload-and-viewer";
import { TypedSubmissionForm } from "./typed-submission-form";

// Objective 1 (brief): OCR is one input method, not the only one. A student
// with their working already in LaTeX shouldn't have to photograph it.
export function SubmitModeToggle({ questionId }: { questionId: string }) {
  const [mode, setMode] = useState<"photo" | "typed">("photo");

  return (
    <div className="flex flex-col gap-md">
      <div className="flex gap-xs border-b border-hairline">
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={`px-sm py-xs text-body-sm ${mode === "photo" ? "border-b-2 border-ink font-medium text-body-strong" : "text-muted"}`}
        >
          Photo or PDF
        </button>
        <button
          type="button"
          onClick={() => setMode("typed")}
          className={`px-sm py-xs text-body-sm ${mode === "typed" ? "border-b-2 border-ink font-medium text-body-strong" : "text-muted"}`}
        >
          Type it in (LaTeX)
        </button>
      </div>

      {mode === "photo" ? <UploadAndViewer questionId={questionId} /> : <TypedSubmissionForm questionId={questionId} />}
    </div>
  );
}
