"use client";

import { useState } from "react";

// Optional shortcut on the "New question" form — upload a photo/PDF of a
// real marking-scheme document instead of retyping it. Prefills the
// existing named fields via direct DOM writes rather than lifting the
// whole form into client state; the educator still reviews/edits and
// submits the same server action as the paste-as-text path.
export function DocumentUploadField() {
  const [status, setStatus] = useState<"idle" | "extracting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function readJsonResponse(response: Response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: { message: text || "The server returned a non-JSON response." } };
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("extracting");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/assignments/extract-document", { method: "POST", body: formData });
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error?.message ?? "extraction failed");

      const setValue = (name: string, value: string) => {
        const el = document.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
        if (el) el.value = value;
      };
      setValue("promptText", data.prompt_text ?? "");
      setValue("modelSolution", data.model_solution ?? "");
      setValue("expectedAnswerLatex", data.expected_answer_latex ?? "");
      setValue("rubricNotes", data.raw_rubric_notes ?? "");
      if (data.max_score) setValue("maxScore", String(data.max_score));

      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="flex flex-col gap-xs rounded-sm border border-dashed border-hairline px-md py-sm">
      <label className="flex flex-col gap-xs text-body-sm text-body">
        Upload marking scheme <span className="text-muted-soft">(photo or PDF — optional, fills in the fields below for you to review)</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFile}
          disabled={status === "extracting"}
          className="text-body-sm"
        />
      </label>
      {status === "extracting" && <p className="text-caption text-muted-soft">Reading document…</p>}
      {status === "done" && <p className="text-caption text-verified">Extracted — review the fields below before saving.</p>}
      {status === "error" && <p className="text-caption text-disputed">{error}</p>}
    </div>
  );
}
