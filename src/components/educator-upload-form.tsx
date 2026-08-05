"use client";

import { useRef, useState } from "react";
import { isPdfFile, renderPdfToImageFiles } from "@/lib/pdf/render-client";

type Question = { id: string; promptText: string; position: number };

type UploadResult = {
  submissionId: string;
  studentId: string;
  studentName: string;
  originalUrl: string;
  pipeline: {
    status: string;
  };
};

// Educator on-behalf-of upload: pick which student this script belongs to,
// pick the question, attach the file. Summative-only (docs/DECISIONS.md) —
// the page that renders this already guards on assessment_mode, this form
// just trusts that guard and lets the API route enforce it again server-side.
export function EducatorUploadForm({ questions, validStudentIds }: { questions: Question[]; validStudentIds: string[] }) {
  const [questionId, setQuestionId] = useState(questions[0]?.id ?? "");
  const [studentId, setStudentId] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submitFile(file: File | undefined) {
    if (!validStudentIds.includes(studentId)) {
      setError(`enter a valid student ID first (${validStudentIds.join(", ")})`);
      return;
    }
    if (!questionId) {
      setError("choose a question first");
      return;
    }
    if (!file) {
      setError("choose a file first");
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const uploadFile = isPdfFile(file) ? (await renderPdfToImageFiles(file, { maxPages: 15, maxWidth: 1600 }))[0] : file;
      const body = new FormData();
      body.append("file", uploadFile);
      body.append("studentId", studentId);
      const res = await fetch(`/api/questions/${questionId}/submissions/educator`, { method: "POST", body });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message ?? `upload failed (${res.status})`);
      }
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-md rounded-lg border border-hairline p-md">
      <div className="flex flex-col gap-xs">
        <label className="text-body-sm font-medium text-body-strong" htmlFor="edu-upload-question">
          Question
        </label>
        <select
          id="edu-upload-question"
          value={questionId}
          onChange={(e) => setQuestionId(e.target.value)}
          className="rounded-sm border border-hairline px-sm py-xs text-body-sm text-body"
        >
          {questions.map((q) => (
            <option key={q.id} value={q.id}>
              Q{q.position} — {q.promptText.slice(0, 60)}
              {q.promptText.length > 60 ? "…" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-xs">
        <label className="text-body-sm font-medium text-body-strong" htmlFor="edu-upload-student-id">
          Student ID
        </label>
        <input
          id="edu-upload-student-id"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value.trim())}
          placeholder={validStudentIds.join(" / ")}
          className="w-40 rounded-sm border border-hairline px-sm py-xs text-body-sm text-body"
        />
        <p className="text-caption text-muted-soft">Demo roster: {validStudentIds.join(", ")}.</p>
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => submitFile(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-sm bg-ink px-sm py-xs text-body-sm font-medium text-on-dark disabled:opacity-50"
        >
          {loading ? "Processing…" : "Scan / upload this student's script"}
        </button>
      </div>

      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-sm py-xs text-body-sm text-disputed">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-xs rounded-sm border border-verified/30 bg-verified-soft px-sm py-xs">
          <p className="text-body-sm text-verified">
            Saved for {result.studentName} ({result.studentId}) — now in the review queue.
          </p>
          <a href="/review" className="text-caption text-verified underline">
            Go to review queue →
          </a>
        </div>
      )}
    </div>
  );
}
