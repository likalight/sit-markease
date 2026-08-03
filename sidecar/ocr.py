"""pix2text OCR pre-transcription hint — feeds S2's vision-model call.

Loads pix2text once at startup (auto-downloads its models from Hugging Face
on first use; cached under ~/.pix2text afterwards). Table recognition is
disabled — handwritten quiz scripts never contain tables, and it's extra
model weight the sidecar doesn't need to load.

pix2text is a pre-transcription hint, not a replacement for the vision-model
read: S2 still treats the image as ground truth (CLAUDE.md rule 5 — never
correct/guess), it just gets pix2text's per-line text + confidence as extra
grounding context alongside the image itself.
"""

import base64
import io

_p2t = None


def load_model():
    global _p2t
    if _p2t is None:
        from pix2text import Pix2Text

        _p2t = Pix2Text(enable_table=False)
    return _p2t


def transcribe(image_b64: str) -> dict:
    from PIL import Image

    p2t = load_model()
    raw = base64.b64decode(image_b64)
    img = Image.open(io.BytesIO(raw)).convert("RGB")

    result = p2t.recognize_text_formula(img=img, return_text=False, resized_shape=768)

    items = []
    for entry in result:
        position = entry.get("position")
        items.append(
            {
                "type": entry.get("type", "text"),
                "text": entry.get("text", ""),
                "score": float(entry.get("score", 0.0)),
                "position": position.tolist() if hasattr(position, "tolist") else (position or []),
                "line_number": int(entry.get("line_number", 0)),
            }
        )
    items.sort(key=lambda item: item["line_number"])

    return {"items": items, "source": "pix2text"}
