"use client";

import { useState } from "react";

// US10: student flags feedback as wrong or unhelpful (§10 POST /api/feedback/:id/flag).
export function FeedbackFlagButton({ feedbackId }: { feedbackId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function submit() {
    setState("sending");
    await fetch(`/api/feedback/${feedbackId}/flag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "unhelpful" }),
    });
    setState("sent");
  }

  if (state === "sent") {
    return <p className="text-xs text-neutral-400">Thanks — flagged for educator review.</p>;
  }

  return (
    <button
      onClick={submit}
      disabled={state === "sending"}
      className="text-xs text-neutral-400 underline disabled:opacity-50"
    >
      Was this feedback wrong or unhelpful?
    </button>
  );
}
