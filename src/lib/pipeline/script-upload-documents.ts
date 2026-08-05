import { db } from "@/lib/db/facade";

export type UploadedScriptDocument = { bytes: Buffer; contentType: string };

function rejectPdf(contentType: string) {
  if (contentType.toLowerCase() === "application/pdf") {
    throw new Error("PDF reached the server without browser rendering. Hard refresh this page, then choose the PDF again or use the built-in demo script.");
  }
}

export async function documentsFromStorageReferences(
  assessmentId: string,
  files: { path?: string; contentType?: string }[]
): Promise<UploadedScriptDocument[]> {
  if (files.length === 0) throw new Error("attach at least one script file");
  return Promise.all(
    files.map(async (file) => {
      const path = String(file.path ?? "");
      if (!path.startsWith(`scripts/raw/${assessmentId}/`)) throw new Error("invalid uploaded file reference");
      const contentType = String(file.contentType || "image/png");
      rejectPdf(contentType);
      return {
        bytes: await db.downloadImage(path),
        contentType,
      };
    })
  );
}

export async function documentsFromFormFiles(files: File[]): Promise<UploadedScriptDocument[]> {
  if (files.length === 0) throw new Error("attach at least one script file");
  return Promise.all(
    files.map(async (file) => {
      const contentType = file.type || "image/png";
      rejectPdf(contentType);
      return {
        bytes: Buffer.from(await file.arrayBuffer()),
        contentType,
      };
    })
  );
}
