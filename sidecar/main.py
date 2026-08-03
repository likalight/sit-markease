"""AIMS Python sidecar — FastAPI. §8.

Consolidates everything that isn't TypeScript-native: OpenCV line geometry,
SymPy verification, local embeddings. Run locally; no deployment needed for
the demo (`npm run sidecar:dev`).
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import base64

import cv
import embed as embed_module
import ocr as ocr_module
import pdf as pdf_module
import symbolic

app = FastAPI(title="AIMS sidecar")


@app.get("/health")
def health():
    return {
        "ok": True,
        "models_loaded": {
            "embeddings": embed_module._model is not None,
            "ocr": ocr_module._p2t is not None,
        },
    }


class PreprocessRequest(BaseModel):
    image_b64: str


@app.post("/cv/preprocess")
def cv_preprocess(req: PreprocessRequest):
    try:
        return cv.preprocess(req.image_b64)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class DetectLinesRequest(BaseModel):
    image_b64: str


@app.post("/cv/detect-lines")
def cv_detect_lines(req: DetectLinesRequest):
    try:
        boxes = cv.detect_lines_from_b64(req.image_b64)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"boxes": boxes, "source": "opencv"}


class EquivalentRequest(BaseModel):
    a_latex: str
    b_latex: str


@app.post("/math/equivalent")
def math_equivalent(req: EquivalentRequest):
    result = symbolic.equivalent(req.a_latex, req.b_latex)
    return {"equivalent": result, "parsed": result is not None}


class VerifyItemRequest(BaseModel):
    prompt: str
    solution: str


@app.post("/math/verify-item")
def math_verify_item(req: VerifyItemRequest):
    return symbolic.verify_item(req.prompt, req.solution)


class PdfToImagesRequest(BaseModel):
    pdf_b64: str


@app.post("/pdf/to-images")
def pdf_to_images(req: PdfToImagesRequest):
    try:
        pdf_bytes = base64.b64decode(req.pdf_b64)
        images_b64 = pdf_module.pdf_to_page_images_b64(pdf_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"pdf conversion failed: {e}")
    if not images_b64:
        raise HTTPException(status_code=400, detail="pdf had no pages")
    return {"images_b64": images_b64, "page_count": len(images_b64)}


class EmbedRequest(BaseModel):
    texts: list[str]


@app.post("/embed")
def embed_texts(req: EmbedRequest):
    try:
        vectors = embed_module.embed(req.texts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"embedding failed: {e}")
    return {"vectors": vectors, "dim": 384}


class OcrTranscribeRequest(BaseModel):
    image_b64: str


@app.post("/ocr/transcribe")
def ocr_transcribe(req: OcrTranscribeRequest):
    try:
        return ocr_module.transcribe(req.image_b64)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ocr transcription failed: {e}")
