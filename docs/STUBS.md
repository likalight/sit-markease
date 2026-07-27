# Stubs and mocks

Anything not fully implemented, listed immediately as it's introduced.

## M0

- Auth is Supabase email/password only — no magic link, no SSO (out of scope per §4.3 anyway).
- `docs/seed` creates one educator and one student demo account with fixed passwords; not for anything beyond the hackathon demo.

## M1

- Line-merge tuning (`min_height`, `min_gap`, `ink_frac` in `sidecar/cv.py`) uses the PRD's suggested defaults, untuned against real handwriting. Needs revisiting once real scripts are available (feeds M5 accuracy metric).
- PDF ingestion (`pdf2image`) is **not wired in M1** — only direct image upload (jpg/png) is implemented. `pdf2image` is in `requirements.txt` for when this is added.
- Upload viewer (`/setup` overlay page) is a minimal box-overlay viewer for verifying M1's acceptance criterion, not the full E2/E3 screens (those are M5/M8).
- Sidecar `/math/equivalent`, `/math/verify-item`, `/embed` exist as routed endpoints (`sidecar/symbolic.py`, `sidecar/embed.py`) but are not implemented — `verify_item` always returns `valid: false`, and `/embed` will attempt to download `bge-small-en-v1.5` on first real call. Real implementation lands in M3/M7.
