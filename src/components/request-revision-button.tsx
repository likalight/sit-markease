"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The student-triggered counterpart to S7 practice generation — matches the
// pitch deck's "student sees gap & requests revision" step. POST
// /api/submissions/:id/request-revision, then route into the practice set
// once it's ready.
export function RequestRevisionButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
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
      router.push(`/practice/${submissionId}`);
    } else {
      setState("error");
    }
  }

  if (state === "error") {
    return <p className="text-caption text-muted-soft">Couldn't generate practice for this one — try again later.</p>;
  }

  return (
    <button
      onClick={submit}
      disabled={state === "generating"}
      className="rounded-sm bg-primary px-md py-xs text-body-sm font-medium text-on-primary disabled:opacity-60"
    >
      {state === "generating" ? "Building your practice set…" : "Request revision"}
    </button>
  );
}
