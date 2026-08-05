"use client";

export async function renderPdfToImageFiles(
  file: File,
  options: { maxPages?: number; maxWidth?: number; quality?: number } = {}
): Promise<File[]> {
  const maxPages = options.maxPages ?? 15;
  const maxWidth = options.maxWidth ?? 1600;
  const quality = options.quality ?? 0.78;
  const pdfjs = await import("pdfjs-dist");

  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  if (pdf.numPages > maxPages) {
    throw new Error(`PDFs are capped at ${maxPages} pages for this demo.`);
  }

  const pages: File[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, maxWidth / baseViewport.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not render PDF page in this browser.");

    await page.render({ canvas, canvasContext: context, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error(`Could not render PDF page ${pageNumber}.`);
    pages.push(new File([blob], `${file.name.replace(/\.pdf$/i, "")}-page-${pageNumber}.jpg`, { type: "image/jpeg" }));
  }
  return pages;
}

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
