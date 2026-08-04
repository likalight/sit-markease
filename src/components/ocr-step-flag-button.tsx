"use client";

import { useState } from "react";

// Formative-mode safeguard (Nicholas's review): with no instructor gate on
// this submission, the student is the only person who can catch a
// misreading before relying on it — this is the equivalent of the
// instructor's "Edit step" button, but for a student who can't otherwise
// see or correct the transcription at all (which is the deliberate,
// opposite safeguard for summative mode — see docs/DECISIONS.md).
export function OcrStepFlagButton({ feedbackId, stepIndex }: { feedbackId: string; stepIndex: number }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function submit() {
    setState("sending");
    await fetch(`/api/feedback/${feedbackId}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "ocr_misread", note: `Step ${stepIndex} was misread` }),
    });
    setState("sent");
  }

  if (state === "sent") {
    return <span className="text-caption text-muted-soft">Flagged for review.</span>;
  }

  return (
    <button
      onClick={submit}
      disabled={state === "sending"}
      className="text-caption text-muted-soft underline disabled:opacity-50"
    >
      This wasn't read correctly
    </button>
  );
}
