"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function AssessmentScriptUpload({
  assessmentId,
  kind,
  attemptId,
  studentIds = [],
}: {
  assessmentId: string;
  kind: "formative" | "summative";
  attemptId?: string;
  studentIds?: string[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [studentId, setStudentId] = useState(studentIds[0] ?? "");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true);
    setError(null);
    setProgress("Reading pages and detecting question boundaries…");
    const body = new FormData();
    Array.from(files).forEach((file) => body.append("files", file));
    if (attemptId) body.append("attemptId", attemptId);
    if (kind === "summative") body.append("studentId", studentId);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/scripts/${kind === "formative" ? "student" : "educator"}`, { method: "POST", body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "upload failed");
      if (kind === "summative") {
        router.push(`/scripts/${json.scriptUploadId}/mapping`);
        return;
      }
      if (!json.confident) {
        setProgress("Submitted. The question mapping needs an instructor check before feedback can be generated.");
        setLoading(false);
        router.refresh();
        return;
      }
      const ids = json.submissionIds as string[];
      for (let index = 0; index < ids.length; index++) {
        setProgress(`Grading question ${index + 1} of ${ids.length}…`);
        const processed = await fetch(`/api/submissions/${ids[index]}/process`, { method: "POST" });
        if (!processed.ok) throw new Error(`question ${index + 1} could not be processed`);
      }
      setProgress("Feedback is ready.");
      router.push(attemptId ? `/feedback?attempt=${attemptId}` : ids.length ? `/feedback?sub=${ids[0]}` : "/feedback");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-md border-t border-hairline pt-md">
      {kind === "summative" && (
        <label className="flex max-w-xs flex-col gap-xs text-body-sm">
          Student
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="rounded-sm border border-hairline px-md py-sm">
            {studentIds.map((id) => <option key={id} value={id}>Student {id}</option>)}
          </select>
        </label>
      )}
      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(event) => upload(event.target.files)} />
      <div>
        <button type="button" disabled={loading || (kind === "summative" && !studentId)} onClick={() => inputRef.current?.click()} className="rounded-sm bg-ink px-md py-sm text-body-sm font-medium text-on-dark disabled:opacity-50">
          {loading ? "Processing script…" : "Upload complete script"}
        </button>
      </div>
      <p className="text-caption text-muted-soft">Attach one PDF or several page images. Questions may share a page or continue across pages.</p>
      {progress && <p className="text-body-sm text-muted">{progress}</p>}
      {error && <p className="border border-disputed/30 bg-disputed-soft px-md py-sm text-body-sm text-disputed">{error}</p>}
    </div>
  );
}
