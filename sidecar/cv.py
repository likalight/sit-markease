"""S1 ingest/preprocess and S1b line detection — PRD §7.1 / §7.2."""

import base64

import cv2
import numpy as np


def decode_image(image_b64: str) -> np.ndarray:
    raw = base64.b64decode(image_b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("could not decode image — not a valid image payload")
    return img


def encode_image(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".png", img)
    if not ok:
        raise ValueError("could not encode processed image")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _ink_mask(gray: np.ndarray) -> np.ndarray:
    _, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return mask


def deskew(img: np.ndarray) -> tuple[np.ndarray, float]:
    """Threshold -> minAreaRect on the ink mask -> rotate. §7.1 step 2."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mask = _ink_mask(gray)

    coords = cv2.findNonZero(mask)
    if coords is None:
        return img, 0.0

    rect = cv2.minAreaRect(coords)
    angle = rect[-1]
    # cv2.minAreaRect returns an angle in [-90, 0); normalise to a small rotation.
    if angle < -45:
        angle = 90 + angle

    if abs(angle) < 0.1:
        return img, 0.0

    (h, w) = img.shape[:2]
    center = (w // 2, h // 2)
    m = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        img, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )
    return rotated, float(angle)


def denoise_and_normalise(img: np.ndarray) -> np.ndarray:
    """Denoise, adaptive threshold, contrast normalise. §7.1 step 3."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.fastNlMeansDenoising(gray, h=10)
    normalised = cv2.normalize(denoised, None, 0, 255, cv2.NORM_MINMAX)
    binary = cv2.adaptiveThreshold(
        normalised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10
    )
    return binary


def quality_score(processed: np.ndarray) -> float:
    """Cheap legibility proxy: fraction of ink pixels within a plausible band.

    Too little ink -> mostly blank/underexposed page. Too much -> noise/shadow
    wasn't cleaned up. Neither claims to measure legibility precisely (that's
    `overall_legibility` from the S2 model reads); this only flags obviously
    bad scans before they hit the pipeline.
    """
    ink_frac = float((processed < 128).mean())
    if ink_frac <= 0:
        return 0.0
    target = 0.08
    return max(0.0, 1.0 - abs(ink_frac - target) / target)


def preprocess(image_b64: str) -> dict:
    img = decode_image(image_b64)
    rotated, skew_deg = deskew(img)
    processed = denoise_and_normalise(rotated)
    return {
        "processed_b64": encode_image(processed),
        "skew_deg": skew_deg,
        "quality_score": quality_score(processed),
    }


def merge_close(bands: list[list[int]], min_gap: int) -> list[list[int]]:
    if not bands:
        return bands
    merged = [bands[0]]
    for start, end in bands[1:]:
        prev_start, prev_end = merged[-1]
        if start - prev_end < min_gap:
            merged[-1] = [prev_start, end]
        else:
            merged.append([start, end])
    return merged


def detect_lines(gray: np.ndarray, min_height=12, min_gap=8, ink_frac=0.02) -> list[dict]:
    """Horizontal projection profiling. §7.2 — verbatim from the PRD."""
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 31, 10
    )
    profile = binary.sum(axis=1)
    on = profile > profile.max() * ink_frac if profile.max() > 0 else profile > 0

    bands, start = [], None
    for y, is_on in enumerate(on):
        if is_on and start is None:
            start = y
        elif not is_on and start is not None:
            if y - start >= min_height:
                bands.append([start, y])
            start = None
    if start is not None:
        bands.append([start, len(on)])

    bands = merge_close(bands, min_gap)

    boxes = []
    for y0, y1 in bands:
        col = binary[y0:y1].sum(axis=0)
        xs = np.where(col > 0)[0]
        if len(xs) == 0:
            continue
        boxes.append(
            {
                "x": float(xs[0]) / gray.shape[1],
                "y": float(y0) / gray.shape[0],
                "w": float(xs[-1] - xs[0]) / gray.shape[1],
                "h": float(y1 - y0) / gray.shape[0],
            }
        )
    return boxes


def detect_lines_from_b64(image_b64: str) -> list[dict]:
    img = decode_image(image_b64)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return detect_lines(gray)
