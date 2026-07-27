"""Local embeddings — §8 / §12. Skeleton only until M7; see docs/STUBS.md.

Loads `BAAI/bge-small-en-v1.5` once at startup (~130MB, CPU-fine, 384-dim).
If that fails on this machine, drop `/embed` and set AIMS_RETRIEVAL_MODE=fulltext.
"""

_model = None


def load_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer

        _model = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _model


def embed(texts: list[str]) -> list[list[float]]:
    model = load_model()
    return model.encode(texts, normalize_embeddings=True).tolist()
