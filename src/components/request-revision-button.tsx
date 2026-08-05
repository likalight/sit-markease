"use client";

import { useState } from "react";

export function RequestRevisionButton({
  submissionId,
  label = "Generate practice set",
  dataTourId,
}: {
  submissionId: string;
  label?: string;
  dataTourId?: string;
}) {
  const [state, setState] = useState<"idle" | "generating" | "error">("idle");

  async function submit() {
    setState("generating");
    const res = await fetch(`/api/submissions/${submissionId}/request-revision`, { method: "POST" });
    if (!res.ok) {
      setState("error");
      return;
    }
    const result = await res.json();
    if (result.status === "generated") {
      // A full navigation, not router.push — the item was just written and
      // an immediate RSC-cached read of the practice page occasionally lost
      // that race (404 on a set that demonstrably existed a moment later).
      // Forcing an actual server round trip avoids reading stale cache.
      window.location.href = `/practice/${submissionId}`;
    } else {
      setState("error");
    }
  }

  if (state === "error") {
    return <p className="text-caption text-muted-soft">Could not generate practice for this one. Try again later.</p>;
  }

  return (
    <button
      onClick={submit}
      disabled={state === "generating"}
      data-tour-id={dataTourId}
      className="rounded-sm bg-primary px-md py-xs text-body-sm font-medium text-on-primary disabled:opacity-60"
    >
      {state === "generating" ? "Building your practice set..." : label}
    </button>
  );
}
