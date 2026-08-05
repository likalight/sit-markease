"""PDF -> page images. §8/§10 PDF ingestion — was stubbed in M1
(docs/STUBS.md: "PDF ingestion (pdf2image) is not wired in M1"); this wires
it. Each page becomes a PNG, handed to the same per-page pipeline
(preprocess -> detect-lines) that a direct image upload already goes
through, so a scanned PDF and a photographed image end up in identical
shape by the time anything downstream sees them.

Uses pypdfium2, not the PRD's originally-named pdf2image: pdf2image needs
the Poppler binary on PATH, which isn't pip-installable and isn't present
on this machine (or any fresh Windows dev box) without a separate manual
download. pypdfium2 ships PDFium as a prebuilt wheel — no external binary,
same result. Documented deviation, not a silent swap (docs/DECISIONS.md).
"""

import base64
import io


def pdf_to_page_images_b64(
    pdf_bytes: bytes,
    dpi: int = 144,
    max_width: int | None = 1600,
    image_format: str = "jpeg",
    quality: int = 78,
) -> list[str]:
    import pypdfium2 as pdfium

    scale = dpi / 72
    pdf = pdfium.PdfDocument(pdf_bytes)
    out = []
    for page in pdf:
        bitmap = page.render(scale=scale)
        image = bitmap.to_pil()
        if max_width and image.width > max_width:
            height = round(image.height * (max_width / image.width))
            image = image.resize((max_width, height))
        fmt = image_format.upper()
        if fmt == "JPEG":
            image = image.convert("RGB")
        buf = io.BytesIO()
        if fmt == "JPEG":
            image.save(buf, format=fmt, quality=quality, optimize=True)
        else:
            image.save(buf, format="PNG")
        out.append(base64.b64encode(buf.getvalue()).decode("ascii"))
    return out
