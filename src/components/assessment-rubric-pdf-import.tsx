"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AssessmentRubricPdfImport({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function readJsonResponse(response: Response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      const msg = text.startsWith("Request Entity Too Large")
        ? "That PDF is too large for direct upload. Export/compress it smaller, or split it into images."
        : text || "The server returned a non-JSON response.";
      return { error: { message: msg } };
    }
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setStatus("importing");
    setMessage("Reading rubric PDF and building editable rubrics...");

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/assessments/${assessmentId}/rubric-document`, { method: "POST", body });
      const json = await readJsonResponse(response);
      if (!response.ok) throw new Error(json.error?.message ?? "could not import rubric PDF");

      const warningText = json.warnings?.length ? ` Warnings: ${json.warnings.join("; ")}` : "";
      setStatus("done");
      setMessage(`Imported ${json.imported?.length ?? 0} question rubric(s) from ${json.pageCount ?? "the"} page(s).${warningText}`);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="flex flex-col gap-sm rounded-sm border border-hairline bg-surface-soft p-md">
      <div>
        <h2 className="text-title-sm text-body-strong">Assessment rubric PDF</h2>
        <p className="text-body-sm text-muted">
          Upload the mark scheme PDF for this assessment. It becomes the editable question/rubric set used for script mapping and grading.
        </p>
      </div>
      <label className="flex flex-col gap-xs text-body-sm">
        Import PDF or images
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={status === "importing"}
          onChange={(event) => importFile(event.target.files?.[0])}
          className="text-caption"
        />
      </label>
      {message && (
        <p className={`text-body-sm ${status === "error" ? "text-disputed" : "text-muted"}`}>
          {message}
        </p>
      )}
    </section>
  );
}
