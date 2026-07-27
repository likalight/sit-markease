"""AIMS Python sidecar — FastAPI. §8.

Consolidates everything that isn't TypeScript-native: OpenCV line geometry,
SymPy verification, local embeddings. Run locally; no deployment needed for
the demo (`npm run sidecar:dev`).
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

import cv
import embed as embed_module
import symbolic

app = FastAPI(title="AIMS sidecar")


@app.get("/health")
def health():
    return {
        "ok": True,
        "models_loaded": {"embeddings": embed_module._model is not None},
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


class EmbedRequest(BaseModel):
    texts: list[str]


@app.post("/embed")
def embed_texts(req: EmbedRequest):
    try:
        vectors = embed_module.embed(req.texts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"embedding failed: {e}")
    return {"vectors": vectors, "dim": 384}
