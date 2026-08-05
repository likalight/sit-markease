import { db } from "@/lib/db/facade";

export type UploadedScriptDocument = { bytes: Buffer; contentType: string };

export async function documentsFromStorageReferences(
  assessmentId: string,
  files: { path?: string; contentType?: string }[]
): Promise<UploadedScriptDocument[]> {
  if (files.length === 0) throw new Error("attach at least one script file");
  return Promise.all(
    files.map(async (file) => {
      const path = String(file.path ?? "");
      if (!path.startsWith(`scripts/raw/${assessmentId}/`)) throw new Error("invalid uploaded file reference");
      return {
        bytes: await db.downloadImage(path),
        contentType: String(file.contentType || "image/png"),
      };
    })
  );
}

export async function documentsFromFormFiles(files: File[]): Promise<UploadedScriptDocument[]> {
  if (files.length === 0) throw new Error("attach at least one script file");
  return Promise.all(
    files.map(async (file) => ({
      bytes: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "image/png",
    }))
  );
}
