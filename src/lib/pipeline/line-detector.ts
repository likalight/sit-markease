import { sidecar } from "@/lib/sidecar/client";
import type { Box } from "@/lib/schemas/geometry";

// §7.2 — kept as an explicit interface so a future PaddleOCR/commercial
// upgrade drops in without touching call sites.
export interface LineDetector {
  detect(imageB64: string): Promise<{ boxes: Box[]; source: "opencv" | "paddle" | "commercial" }>;
}

export const opencvLineDetector: LineDetector = {
  async detect(imageB64: string) {
    return sidecar.detectLines(imageB64);
  },
};

export function getLineDetector(): LineDetector {
  // AIMS_LINE_DETECTOR env var selects the implementation; only 'opencv' exists so far (M1).
  return opencvLineDetector;
}
