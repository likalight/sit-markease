"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RequestRevisionButton({ submissionId, label = "Generate practice set" }: { submissionId: string; label?: string }) {
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
    return <p className="text-caption text-muted-soft">Could not generate practice for this one. Try again later.</p>;
  }

  return (
    <button
      onClick={submit}
      disabled={state === "generating"}
      className="rounded-sm bg-primary px-md py-xs text-body-sm font-medium text-on-primary disabled:opacity-60"
    >
      {state === "generating" ? "Building your practice set..." : label}
    </button>
  );
}
