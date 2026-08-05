"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isPdfFile, renderPdfToImageFiles } from "@/lib/pdf/render-client";

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

  async function readJsonResponse(response: Response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      const message = text.startsWith("Request Entity Too Large")
        ? "That file is too large for direct upload. Use compressed page images or a smaller PDF for this demo."
        : text || "The server returned a non-JSON response.";
      return { error: { message } };
    }
  }

  async function compressImage(file: File) {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    bitmap.close();
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  }

  async function prepareImageFile(file: File) {
    if (file.type.startsWith("image/")) return compressImage(file);
    return file;
  }

  async function prepareSourceFile(file: File) {
    if (!isPdfFile(file)) return [await prepareImageFile(file)];
    setProgress(`Rendering ${file.name} into page images...`);
    const pages = await renderPdfToImageFiles(file, { maxPages: 15, maxWidth: 1600, quality: 0.78 });
    return Promise.all(pages.map(prepareImageFile));
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    setProgress("Preparing script files...");

    try {
      const preparedFiles = (await Promise.all(files.map(prepareSourceFile))).flat();
      const signResponse = await fetch(`/api/assessments/${assessmentId}/scripts/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          attemptId,
          studentId: kind === "summative" ? studentId : undefined,
          files: preparedFiles.map((file) => ({ name: file.name, contentType: file.type || "application/octet-stream", size: file.size })),
        }),
      });
      const signJson = await readJsonResponse(signResponse);
      if (!signResponse.ok) throw new Error(signJson.error?.message ?? "could not prepare upload");

      const uploadedFiles = [];
      for (let index = 0; index < preparedFiles.length; index++) {
        const file = preparedFiles[index];
        const signed = signJson.uploads[index];
        setProgress(`Uploading file ${index + 1} of ${preparedFiles.length}...`);
        const uploadBody = new FormData();
        uploadBody.append("cacheControl", "3600");
        uploadBody.append("", file);
        const uploadResponse = await fetch(signed.signedUrl, {
          method: "PUT",
          headers: { "x-upsert": "false" },
          body: uploadBody,
        });
        if (!uploadResponse.ok) {
          const uploadText = await uploadResponse.text();
          throw new Error(uploadText || `file ${index + 1} could not be uploaded`);
        }
        uploadedFiles.push({ path: signed.path, contentType: signed.contentType || file.type || "application/octet-stream" });
      }

      setProgress("Reading pages and detecting question boundaries...");
      const response = await fetch(`/api/assessments/${assessmentId}/scripts/${kind === "formative" ? "student" : "educator"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          studentId: kind === "summative" ? studentId : undefined,
          files: uploadedFiles,
        }),
      });
      const json = await readJsonResponse(response);
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
        setProgress(`Grading question ${index + 1} of ${ids.length}...`);
        const processed = await fetch(`/api/submissions/${ids[index]}/process`, { method: "POST" });
        const processedJson = await readJsonResponse(processed);
        if (!processed.ok) {
          throw new Error(processedJson.error?.message ?? `question ${index + 1} could not be processed`);
        }
      }

      setProgress("Feedback is ready.");
      router.push("/submit");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  async function uploadInputFiles(files: FileList | null) {
    if (!files?.length) return;
    await uploadFiles(Array.from(files));
  }

  async function uploadBuiltInDemoScript() {
    setLoading(true);
    setError(null);
    setProgress("Loading built-in demo script...");
    try {
      const response = await fetch("/demo/student-111-script.png");
      if (!response.ok) throw new Error("could not load the built-in demo script");
      const blob = await response.blob();
      const file = new File([blob], "student-111-demo-script.png", { type: "image/png" });
      await uploadFiles([file]);
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
      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(event) => uploadInputFiles(event.target.files)} />
      <div className="flex flex-wrap items-center gap-sm">
        <button type="button" disabled={loading || (kind === "summative" && !studentId)} onClick={uploadBuiltInDemoScript} className="rounded-sm bg-primary px-md py-sm text-body-sm font-medium text-on-primary disabled:opacity-50">
          {loading ? "Processing script..." : "Use built-in demo script"}
        </button>
        <button type="button" disabled={loading || (kind === "summative" && !studentId)} onClick={() => inputRef.current?.click()} className="rounded-sm border border-hairline bg-canvas px-md py-sm text-body-sm font-medium text-body disabled:opacity-50">
          {loading ? "Processing script..." : "Upload complete script"}
        </button>
      </div>
      <p className="text-caption text-muted-soft">For reviewer demos, use the built-in Student 111 script. Real testing still supports one PDF or several page images, up to 15 pages total.</p>
      {progress && <p className="text-body-sm text-muted">{progress}</p>}
      {error && <p className="border border-disputed/30 bg-disputed-soft px-md py-sm text-body-sm text-disputed">{error}</p>}
    </div>
  );
}
