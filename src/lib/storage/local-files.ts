import fs from "node:fs";
import path from "node:path";

// Local stand-in for Supabase Storage — see docs/DECISIONS.md M2 entry.
const UPLOADS_DIR = path.join(process.cwd(), "local-data", "uploads");

export const localFiles = {
  write(relativePath: string, bytes: Buffer): string {
    const fullPath = path.join(UPLOADS_DIR, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, bytes);
    return relativePath;
  },

  read(relativePath: string): Buffer {
    return fs.readFileSync(path.join(UPLOADS_DIR, relativePath));
  },

  // Served via src/app/api/local-files/[...path]/route.ts
  publicUrl(relativePath: string): string {
    return `/api/local-files/${relativePath}`;
  },
};
