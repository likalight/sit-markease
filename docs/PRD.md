# AIMS — AI for Individualised Mastery Support
## Product Requirements Document v2.0 — Zero-Cost Build

**Project:** AI-Assisted Framework for Scalable Feedback and Targeted Practice in Open-Ended Assessments
**Context:** SIT Hackathon
**Budget:** $0 infrastructure. LLM tokens only (~$2–4 total; ask organisers for sponsor credits first).
**Status:** Implementation-ready
**Audience:** Claude Code + human teammates

> This document is self-contained and supersedes all earlier drafts and addenda. Where earlier versions specified Mathpix, LangChain, or hosted embeddings, this version replaces them. Do not consult prior drafts.

---

# Section 0 — Instructions for the implementing agent

## 0.1 First commands

```
Read docs/PRD.md in full. Then:
1. Restate the MVP scope (§4.1) and the demo narrative (§5.3) in under 300 words.
2. Scaffold the repo per §16.
3. Implement M0 and M1 only (§17). Stop and report before continuing.
```

## 0.2 Standing rules

1. **Vertical slice before breadth.** One question, one submission, upload → transcribe → assess → diagnose → feedback → practice. Working end-to-end before anything is polished or generalised.
2. **Structured outputs only.** Every model call returns JSON validated against a Zod schema in `src/lib/schemas/`. Never regex-parse prose. On validation failure: one retry with the error appended, then the documented fallback.
3. **The human decides.** Nothing writes to `final_grades` without an explicit educator approval action, and every approval writes an `audit_log` row.
4. **Evidence or invalid.** A criterion result without `evidence_step_indices` fails schema validation. Enforce in code, not just in the prompt.
5. **Never correct the student's work during transcription.** Errors are the signal. Transcribe literally; flag illegible spans.
6. **Degrade, never crash.** Each stage records its own failure in `stage_runs` and the pipeline continues with partial state.
7. **Two systems must agree.** Transcription requires two independent model reads to agree; maths correctness is checked symbolically where parseable. Disagreement routes to a human, never to a student.
8. **Timebox risky dependencies.** Anything that needs a >200MB install gets 90 minutes. If it isn't working, use the documented fallback and record it in `docs/DECISIONS.md`.

## 0.3 Bookkeeping

- Commit per milestone, prefixed with the milestone ID (`M2: rubric assessment stage`).
- Anything stubbed goes in `docs/STUBS.md` immediately.
- Any deviation from this PRD goes in `docs/DECISIONS.md` with a one-line rationale.
- When a choice is genuinely ambiguous, pick the option that keeps §20's demo working and note it. Don't block.

## 0.4 Assumptions (change these first if wrong)

| # | Assumption |
|---|---|
| A1 | Pilot domain: first-year engineering mathematics (calculus / ODEs), handwritten working |
| A2 | Submissions are phone photos or scans of handwritten work |
| A3 | ~36-hour build, 3–5 people |
| A4 | Judged on a live demo + pitch against §1.2 |
| A5 | TypeScript frontend/API + a small Python sidecar for CV, symbolic maths, and embeddings |

---

# Section 1 — Context

## 1.1 Problem

Large-enrolment modules cannot provide timely, individualised feedback on open-ended assessments. Two failures compound.

**Educator side.** Marking multi-step derivations is slow and cognitively expensive. 280 students × 6 questions = 1,680 artefacts per assessment. Under time pressure, feedback collapses into a mark and a tick, or a recycled generic comment. Consistency drifts across multiple TAs. By the time scripts are returned, teaching has moved on and the feedback is inert.

**Student side.** Even with a mark, a student cannot answer the only question that matters: *what exactly do I not understand, and what should I practise next?* They get a chapter, not the four problems targeting their specific error. Self-directed practice becomes undirected practice.

**The gap is not that marking is hard. It is that diagnosis does not scale — and without diagnosis, practice cannot be targeted.**

## 1.2 Judging rubric — the binding design constraint

| Criterion | Weight | What must be demonstrably true |
|---|---|---|
| Problem–Solution Fit | 30% | Real SIT-context problem, evidence of stakeholder need, solution maps 1:1 to the pain |
| Prototype Innovation & Creativity | 20% | A novel *mechanism* — the misconception layer and multi-system agreement — not "an LLM grades things" |
| Prototype Effectiveness | 20% | Live end-to-end run on real handwritten scripts with measured accuracy |
| Feasibility & Future Potential | 20% | Human-in-loop, auditable, costed, integration path, discipline-portable |
| Presentation & Pitch | 10% | 7-minute narrative with a clear value proposition |

§21 audits this build against each criterion. Read it before cutting scope.

## 1.3 Why this is now possible

1. Multimodal LLMs read messy handwritten mathematics well enough to transcribe *and reason about* it, removing the brittle OCR → symbol-parser chain.
2. Structured outputs make model responses machine-checkable, turning grading into a data pipeline rather than a chat.
3. Retrieval over course-owned material anchors generated practice to *this module's* notation, syllabus, and difficulty.

---

# Section 2 — Users

## 2.1 Personas

**P1 — Dr. Tan, Module Lead (primary).** 280 students, 4 TAs. Job: *get consistent, defensible marks and meaningful feedback out within a week without burning my TAs.* Fears: an AI marking error he must defend at an appeals board.

**P2 — Wei Ming, Year 1 student (primary).** Scored 11/20. Job: *tell me what I got wrong conceptually and give me problems that fix it.* Fears: generic feedback; being graded by a black box.

**P3 — Priya, TA (secondary).** 70 scripts. Job: *mark faster without losing accuracy; stop writing the same comment 40 times.*

**P4 — Programme Director (tertiary, the buyer).** Job: *show me cohort misconception data so I can fix the curriculum, and prove the AI is auditable.*

## 2.2 User stories

| ID | As a | I want to | So that | Pri |
|---|---|---|---|---|
| US1 | Educator | upload a question + rubric and have it structured automatically | I don't hand-build a marking scheme | P0 |
| US2 | Educator | bulk-upload scripts and get per-criterion recommendations with evidence | I mark by reviewing, not from scratch | P0 |
| US3 | Educator | see the transcription beside the original image | I can trust or correct what was read | P0 |
| US4 | Educator | accept / adjust / reject each recommendation in one action | I stay accountable for the mark | P0 |
| US5 | Student | see feedback tied to the exact step where my reasoning broke | I know *where*, not just *that*, I was wrong | P0 |
| US6 | Student | get 3–5 practice problems for my specific misconception | my study time targets my actual gap | P0 |
| US7 | Student | attempt practice with hint-first feedback | I learn in the loop, not after it | P1 |
| US8 | Educator | see a cohort misconception heatmap | I can reteach the top 3 gaps next lecture | P1 |
| US9 | Educator | see AI-vs-human agreement stats | I can calibrate my trust | P1 |
| US10 | Student | flag feedback as wrong or unhelpful | errors get caught | P1 |
| US11 | Educator | export marks as LMS-compatible CSV | it fits my existing workflow | P2 |

---

# Section 3 — Goals and metrics

## 3.1 Goals

- **G1** Halve educator time-per-script without degrading mark quality.
- **G2** Feedback that is *specific* (cites the student's own step) and *actionable* (names the misconception, prescribes practice).
- **G3** Close the loop: diagnosis → targeted practice → re-attempt → measured improvement.
- **G4** Human accountable, system auditable, at every step.
- **G5** Discipline-portable: rubric-driven, not maths-specific.

## 3.2 Non-goals — state these explicitly in the pitch

- **NG1** Not autonomous grading. No mark is released without educator approval.
- **NG2** Not proctoring, plagiarism detection, or AI-writing detection.
- **NG3** Not an LMS replacement.
- **NG4** Not a general chatbot tutor.
- **NG5** No group submissions, viva, or peer assessment in v1.

## 3.3 Metrics — measured live on the gold set

| ID | Metric | Target | Source |
|---|---|---|---|
| M1 | Step-level transcription fidelity | ≥90% semantic match | Gold set |
| M2 | Score MAE (AI vs. human) | ≤1.0 mark on 20 | Gold set |
| M3 | Score QWK | ≥0.70 | Gold set |
| M4 | Misconception precision | ≥80% | Educator review |
| M5 | Line-detection accuracy | ≥85% of steps correctly bounded | Gold set |
| M6 | Inter-read agreement rate | ≥80% of scripts | Instrumented |
| M7 | Human escalation rate | ≤20% | Instrumented |
| M8 | Symbolic verification coverage | report actual % | Instrumented |
| M9 | Educator time per script | ≤45s vs. ~4min baseline | Timed |
| M10 | Pipeline latency | ≤60s per script | `stage_runs` |
| M11 | Cost per script | ≤ S$0.10 | `stage_runs` |
| M12 | Legibility fairness gap | MAE difference across legibility quartiles | Gold set |

M12 is an equity check, not a vanity metric. If neat handwriting scores systematically higher, that is a real problem — surface it and name mandatory human review as the mitigation.

---

# Section 4 — Scope

## 4.1 MVP (P0) — must work live

1. **Assessment setup.** Module → assessment → question. Paste a rubric; AI structures it into weighted criteria with level descriptors; educator edits.
2. **Ingestion.** Upload photos/PDFs, single or batch. Deskew, denoise, normalise.
3. **Line detection.** Free CV pass produces per-line bounding boxes.
4. **Dual-read transcription.** Two independent model reads (literal + semantic) reconciled into ordered solution steps anchored to boxes, with an agreement score.
5. **Rubric-aligned assessment.** Per criterion: recommended level, score, evidence step indices, justification, confidence. Symbolic answer verification where parseable.
6. **Misconception detection.** Tag against a module taxonomy; novel candidates surfaced for taxonomy growth.
7. **Feedback generation.** What was right, precisely where it broke, the underlying concept, one next action.
8. **Educator review console.** Three-pane: image | transcription | recommendations. Accept/adjust per criterion, edit feedback, approve. Everything logged.
9. **Targeted practice via RAG.** Retrieve from the module corpus, assemble a 3–5 item scaffolded set, symbolically verify every item, show provenance.
10. **Student view.** Mark, criterion breakdown, annotated script, feedback, misconception cards, practice set.
11. **Evaluation harness.** CLI that runs the gold set and prints the §3.3 metrics table.

## 4.2 Stretch (P1) — only after MVP is green

- Cohort misconception heatmap and "reteach these 3" digest.
- Interactive practice: attempt → hint ladder → mastery update.
- Simple mastery model (EWMA per concept).
- Review queue sorted by confidence, lowest first.
- Student feedback flagging with an educator review inbox.

## 4.3 Out of scope

LTI/LMS integration, SSO, multi-tenancy, offline mode, mobile app, question authoring, anti-cheating, cross-module analytics.

---

# Section 5 — Journeys

## 5.1 Educator

```
1. Create assessment: paste question + rubric → AI structures → tweak weights   (2 min)
2. Bulk upload 30 scripts                                                        (1 min)
3. Pipeline runs in background, ~30s/script, parallelised
4. Review queue opens, lowest confidence first
   per script: glance image|transcription, scan 4 criteria,
   accept 3, adjust 1, tweak a feedback line                                     (~40s)
5. Approve batch → marks + feedback + practice sets released
6. Cohort dashboard → top misconception: "product rule treated as distributive"
   (41% of cohort) → decision: 10-minute reteach next lecture
```

## 5.2 Student

```
1. Notification: feedback ready
2. 13/20, criterion breakdown, annotated script → step 4 highlighted amber
3. "Your setup and boundary conditions were correct. At step 4 you applied the
    product rule as if d/dx(uv) = (du/dx)(dv/dx)."
4. Misconception card: 30s explainer + link to Lecture 6 slide 12 (provenance shown)
5. Practice set: 4 problems, scaffold → target → extension, drawn from the
   module's own tutorial bank, each isolating this one step
6. [P1] Attempts them; hint-first feedback; mastery bar moves
```

## 5.3 Demo narrative — this drives build order

> A real handwritten script goes in. Forty seconds later the educator has a defensible mark with evidence attached to specific steps; the student has feedback pointing at *their* step 4; and four practice problems exist because of what *they* specifically got wrong. Then we show the numbers proving the AI agreed with a human marker — and the cases where it didn't, and how the human caught them.

**Anything not required for that paragraph is stretch.**

---

# Section 6 — Architecture

## 6.1 System

```
┌────────────────────────────────────────────────────────────────────┐
│  Next.js app (TypeScript)                                          │
│  Educator: Setup · Review Console · Cohort Dashboard               │
│  Student:  Feedback · Practice                                     │
└──────────────┬───────────────────────────────────────────────────────┘
               │ Route handlers (REST) + SSE for job progress
┌──────────────┼───────────────────────────────────────────────────────┐
│  Orchestrator — stage state machine, retries, cost logging         │
│  S1 Ingest → S2 Transcribe → S3 Reconcile → S4 Assess →             │
│  S5 Diagnose → S6 Feedback → S7 Practice → S8 Human review          │
└───┬──────────────────┬─────────────────────────┬──────────────────┘
    │                   │                        │
┌───┼───────────┐  ┌────┼───────────┐   ┌────────┼──────────────────┐
│ Anthropic    │  │ Supabase       │   │ Python sidecar (FastAPI)   │
│ API          │  │ Postgres +     │   │ • OpenCV line detection    │
│ (vision,     │  │ pgvector +     │   │ • SymPy verification       │
│  structured  │  │ Storage + Auth │   │ • local embeddings         │
│  outputs)    │  │ [free tier]    │   │ [local process, free]      │
└──────────────┘  └──────────────────┘   └────────────────────────────┘
```

## 6.2 Stack — everything free except tokens

| Layer | Choice | Cost |
|---|---|---|
| Frontend + API | Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui | $0 |
| Maths rendering | KaTeX | $0 |
| Maths input (P1) | MathLive | $0 |
| DB / storage / auth | Supabase free tier (Postgres + pgvector) | $0 |
| Hosting | Vercel free tier, or localhost for the demo | $0 |
| CV / symbolic / embeddings | Python sidecar: FastAPI + OpenCV + SymPy + sentence-transformers | $0 |
| Embeddings | `bge-small-en-v1.5` locally (384-dim), CPU-fine | $0 |
| Retrieval fallback | Postgres `tsvector` full-text | $0 |
| LLM | Free-tier providers (Google AI Studio Gemini + Groq) | $0 |
| Validation | Zod (shared schemas) | $0 |
| Jobs | In-process queue + SSE | $0 |

**Models (revised — see docs/DECISIONS.md "M2 — free-tier providers"):** No Anthropic API budget for this build. All model calls go through a provider-agnostic `LLMClient` interface (`src/lib/ai/`); provider is chosen per model role via env var, so a future paid swap-in is a one-line change, not a rewrite.

- **Primary role** (assessment, feedback, practice; Read A in dual-read): **Google AI Studio, Gemini 2.0 Flash** (`AIMS_GEMINI_MODEL`) — vision-capable, generous free tier, native structured output via `responseSchema` (no prompt-and-parse for this provider).
- **Fast role** (Read B in dual-read; misconception tagging): **Groq** (`AIMS_GROQ_MODEL`, a vision-capable Llama model) — a *different provider*, not just a different model, so S2's dual-read gets cross-vendor disagreement rather than same-family disagreement (see §7.3).
- **Adjudicator role** (optional, low-confidence cases only): Gemini by default; same swap mechanism as the other two roles.

Every call is cached to disk keyed by `(prompt_version, model, input_hash)` (`src/lib/ai/cache.ts`) — re-running the eval harness never re-spends free-tier quota, and `AIMS_FIXTURE_MODE=true` replays *only* from this cache with zero network calls. Free-tier rate limits are handled with a per-provider RPM ceiling and exponential backoff on 429 (`src/lib/ai/rate-limit.ts`); a quota hit pauses a batch run rather than losing it.

**Explicitly rejected:** LangChain/LangGraph in the runtime pipeline (fixed DAG, not an agent loop — direct SDK calls are fewer layers to debug at 3am); LlamaIndex (redundant for a 40-page corpus); hosted vector DBs (pgvector is already there); Redis/Celery (in-process queue handles 30 scripts); commercial OCR (see §6.4). If two or more teammates already ship LangChain daily, override this and record it in `DECISIONS.md` — familiarity beats elegance at hackathon speed.

## 6.3 Key architectural decisions

| Decision | Choice | Rationale |
|---|---|---|
| Geometry | OpenCV projection profile, behind a `LineDetector` interface | Free, no model download, milliseconds, no GPU. Interface allows upgrade without refactor |
| Recognition | Two independent Claude reads, reconciled | Free OCR is weak on handwritten maths (~73% at best); Claude is already in the stack and is better |
| Reliability | Agreement between two reads + symbolic check + human approval | Three independent systems must agree before a student sees anything |
| Grading granularity | Per rubric criterion with evidence citations | Auditable, matches real marking, enables partial credit |
| Autonomy | Recommendation only; mandatory human approval | Trust, appeals defensibility, and the honest answer |
| Answer correctness | SymPy where parseable, LLM judgement otherwise | Deterministic where possible; never claim more coverage than measured |
| Practice generation | RAG over module corpus + symbolic verification gate | Notation, syllabus alignment, provenance, and no wrong problems |
| Misconceptions | Curated taxonomy + open slot for novel tags | Structure for analytics, room for the unexpected |

## 6.4 Why no commercial OCR

Free OCR is weakest exactly where handwritten maths is hardest — independent benchmarks put the best open-source engine (PaddleOCR) around 73% on handwriting, with Tesseract near 45% and EasyOCR near 62%, and commercial handwriting services still lead by a meaningful margin. **But we don't need free OCR to do recognition at all.** Commercial OCR was only providing two things: per-line geometry (easy — detection is nearly solved, and OpenCV does it deterministically) and an independent second reading (replaced by a second Claude read, which is more accurate anyway and adds no vendor).

Every open VLM alternative (PaddleOCR-VL, olmOCR, Qwen2.5-VL) needs a GPU; on laptop CPU expect 20–60s per page, which breaks the ≤60s end-to-end target by itself. Not worth it.

**Pitch framing:** *"We run entirely on open-source and free-tier infrastructure. Commercial maths OCR would add an estimated 5–10% transcription accuracy and drops in behind one interface — but the diagnostic layer, which is the actual contribution, doesn't depend on it."*

---

# Section 7 — Pipeline specification

Each stage is a pure function `(input, config) → validated output`. Prompts live in `/prompts/*.vN.md` and are versioned; log `prompt_version` and `model` on every run.

## 7.1 S1 — Ingest and preprocess

Python sidecar, `POST /cv/preprocess`.

1. PDF → page images (`pdf2image`, 200 DPI) or accept direct images.
2. Deskew: threshold → `cv2.minAreaRect` on the ink mask → rotate. **This single step fixes most downstream detection failures.**
3. Denoise (`cv2.fastNlMeansDenoising`), adaptive threshold, contrast normalise.
4. Store both the original and the processed image; the review console shows the **original**.

## 7.2 S1b — Line detection (free geometry)

Python sidecar, `POST /cv/detect-lines`. Horizontal projection profiling.

```python
import cv2, numpy as np

def detect_lines(gray, min_height=12, min_gap=8, ink_frac=0.02):
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                   cv2.THRESH_BINARY_INV, 31, 10)
    profile = binary.sum(axis=1)
    on = profile > profile.max() * ink_frac

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
        boxes.append({
            "x": float(xs[0]) / gray.shape[1],
            "y": float(y0) / gray.shape[0],
            "w": float(xs[-1] - xs[0]) / gray.shape[1],
            "h": float(y1 - y0) / gray.shape[0],
        })
    return boxes
```

**Interface — keep the upgrade path visible:**

```ts
interface LineDetector {
  detect(image: Buffer): Promise<{ boxes: Box[]; source: 'opencv' | 'paddle' | 'commercial' }>;
}
```

**Optional upgrade (timeboxed to 90 minutes, only if M1 is already green):** PaddleOCR detection-only (`PaddleOCR(det=True, rec=False)`, Apache 2.0) produces better boxes on messy layouts. `paddlepaddle` installs are historically fiddly and pull ~2GB — if it isn't running in 90 minutes, abandon and keep OpenCV.

**Known limits:** multi-column layouts, heavy slant, diagonal working. Deskew mitigates most. Record detection failures in `stage_runs`; they feed metric M5.

## 7.3 S2 — Dual-read transcription

Two **independently framed** reads, from **different providers** (revised — see docs/DECISIONS.md "M2 — free-tier providers"). Different framings alone catch different errors than temperature noise does; different *vendors* go further — two models from the same family share training data, RLHF process, and failure modes, so agreement between them is weaker evidence than agreement between genuinely independent systems. A Gemini/Groq disagreement is more likely to reflect real transcription ambiguity than two same-vendor models converging on a shared blind spot. Where a second free provider isn't available or is down, fall back to a second Gemini model (different size/version) and note the reduced independence in `stage_runs`.

```
              ┌─ Read A: Gemini (primary role), temp 0 ─
 page image ──┤   "literal line-by-line transcription" │
   + boxes    │                                        ├── S3 Reconcile
              └─ Read B: Groq (fast role), temp 0 ──────
                  "step-segmented semantic reading"
```

Pass the detected boxes into both reads so each line has a stable index to anchor to.

**Read A system prompt (literal):**

```
You transcribe handwritten university mathematics, line by line.
Transcribe EXACTLY what the student wrote, including all errors.
Never correct, complete, or improve their work — the errors are the signal.
You are given detected line regions, indexed from 1. Transcribe each region.
Mark anything you cannot read as [ILLEGIBLE]. Never guess.
Report per-line confidence in [0,1].
```

**Read B system prompt (semantic):**

```
You read handwritten university mathematics and identify the structure of the
student's reasoning. Group the work into logical solution steps. A step is one
substantive move: a substitution, an application of a rule, an algebraic
simplification, a statement of a result.
Transcribe exactly what is written — never correct errors.
Note crossings-out, restarts, and work that runs out of order.
Map each step to the line indices it spans.
```

**Output schemas:**

```jsonc
// Read A
{
  "lines": [
    {"line_index": 1, "latex": "\\int_0^1 x e^{x}\\,dx", "confidence": 0.92, "illegible": false}
  ],
  "student_identifier": "string|null",
  "overall_legibility": 0.88
}

// Read B
{
  "steps": [
    {
      "step_index": 1,
      "line_indices": [1, 2],
      "latex": "...",
      "plain_text": "...",
      "role": "setup",          // setup | substitution | rule_application | simplification | result
      "confidence": 0.9
    }
  ],
  "final_answer": {"latex": "...", "present": true},
  "flags": ["multiple_attempts_crossed_out"]
}
```

## 7.4 S3 — Reconciliation

The reliability mechanism. Not a model call — deterministic code plus one sidecar call.

```
For each step in Read B:
  concat Read A's latex over the step's line_indices  → A_text
  take Read B's latex                                  → B_text

  1. Normalise both (whitespace, \frac vs /, \cdot vs *, \left\right, brackets)
  2. If identical                       → agreement = 1.0
  3. Else try SymPy equivalence         → equivalent ? 0.95 : 0.0
  4. Else normalised Levenshtein ratio  → agreement = ratio

transcription_agreement = weighted mean over steps (weight by step length)
```

**Routing:**

| Condition | Action |
|---|---|
| `agreement ≥ 0.85` | Proceed. `source='reconciled'`, confidence high |
| `0.60 ≤ agreement < 0.85` | Proceed but set `needs_human_review=true` on the grade |
| `agreement < 0.60` | Halt at `needs_human_transcription`. Show both readings side by side in the console |
| `overall_legibility < 0.5` | Halt at `needs_human_transcription` regardless of agreement |

Persist both raw reads in `transcriptions.read_a_raw` / `read_b_raw` for audit and debugging. Steps are stored from Read B (it has the structure), with per-step `agreement` attached.

## 7.5 S4 — Rubric-aligned assessment

**Model:** primary role (Gemini by default), temp 0.1. **Input:** question, model solution (optional), rubric criteria with level descriptors, reconciled steps, symbolic answer-check result.

**Prompt principles:**
- Grade **only** against the supplied rubric. Import no external standards.
- Every criterion result cites `evidence_step_indices`. **A result without evidence is invalid** — enforce in the schema.
- Credit valid alternative methods. The model solution is *a* solution, not *the* solution.
- Apply **error carry-forward**: a step that is correct *given* an earlier error earns method credit.
- Set `needs_human_review` when the approach is unusual, work is partly illegible, criteria conflict, or transcription agreement was middling.

**Symbolic pre-check.** Before the model call, ask the sidecar whether the student's final answer is equivalent to the expected answer. Pass the result in as a fact:
`SYMBOLIC_CHECK: final answer verified EQUIVALENT | NOT EQUIVALENT | UNPARSEABLE`.
Instruct the model to treat EQUIVALENT/NOT EQUIVALENT as authoritative on correctness of the answer, while still judging method independently.

**Output schema:**

```jsonc
{
  "criterion_results": [
    {
      "criterion_key": "c_method",
      "level": "proficient",
      "score": 4.0,
      "max_score": 6.0,
      "evidence_step_indices": [2, 3],
      "justification": "Separation of variables correctly applied at step 2...",
      "confidence": 0.86
    }
  ],
  "total_recommended": 13.0,
  "max_total": 20.0,
  "error_carry_forward_applied": true,
  "needs_human_review": false,
  "review_reasons": []
}
```

**Self-consistency check.** For the gold-set evaluation and for any script where `needs_human_review` is already true, run S4 three times at temp 0.3. Report median score and spread. Spread > 2 marks forces human review. This is a strong, demoable answer to "how do you know it's reliable?"

## 7.6 S5 — Misconception detection

**Model:** fast role (Groq by default — cheap, sufficient), temp 0.2. **Input:** steps, criterion results, module taxonomy.

```jsonc
{
  "detected": [
    {
      "misconception_key": "mc_product_rule_distributive",
      "confidence": 0.91,
      "evidence_step_indices": [4],
      "severity": "conceptual",        // notational | procedural | conceptual
      "observed_signature": "wrote d/dx(uv) = (du/dx)(dv/dx)"
    }
  ],
  "novel_candidates": [
    {
      "proposed_name": "Treats definite-integral limits as unchanged after u-substitution",
      "evidence_step_indices": [6],
      "confidence": 0.7
    }
  ]
}
```

**Severity drives remediation:** *notational* → one-line correction, no practice. *Procedural* → drill practice. *Conceptual* → explainer + scaffolded practice. This feeds S7.

`novel_candidates` go to an educator queue. Demo this — it shows the system improves with use, and it is genuinely novel among hackathon grading tools.

## 7.7 S6 — Feedback generation

**Model:** primary role (Gemini by default), temp 0.5.

**Principles, encoded in the prompt:**
- Open with what was **specifically** correct ("your separation of variables at step 2 was clean"). Never generic praise.
- Locate the break **precisely**: cite the step number and quote the student's own expression.
- Explain the **concept**, not just the correction.
- One concrete next action.
- **Never reveal the full model solution** — leave room to re-attempt.
- Second person, warm, direct, never condescending. A struggling student should finish reading more motivated, not less.
- ≤180 words plus structured blocks.
- Tone configurable: `supportive | concise | socratic`.

```jsonc
{
  "summary": "one-sentence orientation",
  "strengths": [{"text": "...", "step_indices": [1,2]}],
  "breakdown_points": [
    {"step_index": 4, "what_happened": "...", "why_it_matters": "...",
     "misconception_key": "mc_product_rule_distributive"}
  ],
  "next_action": "Work through the four problems in your practice set...",
  "tone": "supportive",
  "word_count": 164
}
```

## 7.8 S7 — Targeted practice via RAG

**Retrieval:**

```
query = f"{misconception.description}. Observed: {tag.observed_signature}. "
        f"Topic: {question.topic_tags}. Difficulty: {target}."

candidates = vector_search(query, k=12) ∪ fulltext_search(query, k=12)
rerank score = 0.4 * topic_overlap + 0.3 * difficulty_proximity + 0.3 * concept_isolation
take top 6 → compose a set of 3–5
```

**Composition — scaffolded ramp:** 1 confidence-builder isolating the single sub-skill → 2 at target difficulty → 1 extension.

**Each item is either:**
- **(a) retrieved verbatim** from the module bank — *preferred*, cite the source; or
- **(b) a generated variant** of a retrieved item — state it plainly ("variant of Tutorial 6 Q3").

**Verification gate — mandatory.** Every generated item goes through the sidecar:
1. SymPy: does the stated solution actually equal the correct result?
2. If unparseable, a second LLM call verifies correctness and that the item exercises the named misconception.
3. **Failures are discarded, not shipped.** Retry up to twice, then fall back to retrieved-verbatim items only.

A judge working through your generated practice problem and finding the answer wrong is the single most likely way this demo dies. This gate is not optional.

```jsonc
{
  "practice_set": {
    "target_misconception_keys": ["mc_product_rule_distributive"],
    "items": [
      {
        "position": 1,
        "difficulty": "scaffold",
        "prompt_latex": "...",
        "solution_latex": "...",
        "hint_ladder": ["reveals least", "reveals more", "reveals most"],
        "targets_because": "isolates the product rule step with no integration",
        "provenance": {"type": "variant_of", "source_label": "Tutorial 6 Q3"},
        "verified_by": "sympy",     // sympy | llm | unverified
        "verified": true
      }
    ]
  }
}
```

## 7.9 Prompt conventions

- Versioned files: `prompts/s4_assess.v1.md`. Persist the version on every `stage_run`.
- **Prompt caching** on static blocks (rubric, taxonomy, notation glossary) across a batch — meaningful saving on 30 scripts and worth a line in the pitch.
- Few-shot with 2–3 real anonymised graded examples per stage. **This is the highest-leverage accuracy lever available — budget time for it.**
- Temperature: 0.0–0.1 for S2/S4, 0.2 for S5, 0.4–0.6 for S6/S7.
- Always request structured output. On validation failure: retry once with the error appended, then fall back.

---

# Section 8 — Python sidecar

One FastAPI process. Consolidates everything that isn't TypeScript-native. Run locally; no deployment needed for the demo.

```
POST /cv/preprocess       {image_b64}          → {processed_b64, skew_deg, quality_score}
POST /cv/detect-lines     {image_b64}          → {boxes: [{x,y,w,h}], source}
POST /math/equivalent     {a_latex, b_latex}   → {equivalent: true|false|null, parsed: bool}
POST /math/verify-item    {prompt, solution}   → {valid: bool, reason, method}
POST /embed               {texts: [str]}       → {vectors: [[float]], dim: 384}
GET  /health                                   → {ok, models_loaded}
```

**Symbolic equivalence:**

```python
from sympy import simplify
from sympy.parsing.latex import parse_latex

def equivalent(a_latex: str, b_latex: str):
    try:
        a, b = parse_latex(a_latex), parse_latex(b_latex)
        return bool(simplify(a - b) == 0)
    except Exception:
        return None      # unparseable — caller falls back to LLM judgement
```

**Be honest about coverage.** `parse_latex` handles clean expressions well and fails on messy handwritten LaTeX more often than you'd like. `None` means "fall back," never "wrong." Measure the parse success rate on the gold set and report it (metric M8). A slide saying *"symbolic verification covers 71% of cases deterministically; the rest fall back to LLM judgement with a confidence penalty"* reads as credible engineering. A slide claiming 100% does not.

**Embeddings:** load `BAAI/bge-small-en-v1.5` once at startup (~130MB, CPU-fine, 384-dim). If the download or install misbehaves, drop `/embed` and use Postgres full-text search only — on a 40-page corpus it is honestly competitive. Record the choice in `DECISIONS.md`.

**Dependencies:** `fastapi uvicorn opencv-python-headless numpy sympy antlr4-python3-runtime==4.11 sentence-transformers pdf2image`. Note `parse_latex` needs the antlr runtime — pin it.

---

# Section 9 — Data model

```sql
create extension if not exists vector;

-- Identity & structure
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null check (role in ('educator','student','admin')),
  created_at timestamptz default now()
);

create table modules (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  owner_id uuid references users(id),
  notation_glossary text,
  created_at timestamptz default now()
);

create table enrolments (
  module_id uuid references modules(id),
  user_id uuid references users(id),
  primary key (module_id, user_id)
);

create table assessments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  title text not null,
  status text not null default 'draft'
    check (status in ('draft','open','marking','released')),
  created_at timestamptz default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references assessments(id) on delete cascade,
  position int not null,
  prompt_text text not null,
  prompt_latex text,
  model_solution text,
  expected_answer_latex text,        -- for symbolic checking
  topic_tags text[] default '{}',
  max_score numeric not null
);

-- Rubric
create table rubrics (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  version int not null default 1
);

create table rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid references rubrics(id) on delete cascade,
  key text not null,
  name text not null,
  weight numeric not null,
  max_score numeric not null,
  levels jsonb not null      -- [{level, score, descriptor}]
);

-- Submissions
create table submissions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  student_id uuid references users(id),
  status text not null default 'uploaded' check (status in (
    'uploaded','processing','needs_human_transcription',
    'ready_for_review','in_review','approved','released','failed')),
  submitted_at timestamptz default now()
);

create table submission_pages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  page_index int not null,
  storage_path text not null,          -- original, shown to educator
  processed_path text,                 -- deskewed/denoised, fed to models
  width int, height int,
  skew_deg numeric, quality_score numeric
);

create table detected_lines (
  id uuid primary key default gen_random_uuid(),
  submission_page_id uuid references submission_pages(id) on delete cascade,
  line_index int not null,
  box jsonb not null,                  -- {x,y,w,h} normalised
  detector text                        -- 'opencv' | 'paddle'
);

create table transcriptions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  read_a_raw jsonb, read_b_raw jsonb,
  transcription_agreement numeric,
  overall_legibility numeric,
  final_answer_latex text,
  flags text[] default '{}',
  reconciliation_notes text,
  model_a text, model_b text, prompt_version text,
  created_at timestamptz default now()
);

create table solution_steps (
  id uuid primary key default gen_random_uuid(),
  transcription_id uuid references transcriptions(id) on delete cascade,
  step_index int not null,
  line_indices int[] default '{}',
  latex text, plain_text text,
  role text,
  box jsonb,                           -- union of the line boxes it spans
  confidence numeric,
  agreement numeric,                   -- per-step read agreement
  source text check (source in ('reconciled','read_a','read_b','human')),
  edited_by_human boolean default false
);

-- Assessment results
create table grade_recommendations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  total_recommended numeric,
  max_total numeric,
  needs_human_review boolean default false,
  review_reasons text[] default '{}',
  score_spread numeric,
  symbolic_check text check (symbolic_check in ('equivalent','not_equivalent','unparseable')),
  model text, prompt_version text,
  created_at timestamptz default now()
);

create table criterion_results (
  id uuid primary key default gen_random_uuid(),
  grade_recommendation_id uuid references grade_recommendations(id) on delete cascade,
  criterion_id uuid references rubric_criteria(id),
  level text, score numeric, max_score numeric,
  evidence_step_indices int[] not null
    check (array_length(evidence_step_indices, 1) > 0),
  justification text,
  confidence numeric
);

create table final_grades (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade unique,
  total numeric not null,
  approved_by uuid references users(id),
  approved_at timestamptz,
  adjusted boolean default false,
  adjustment_note text,
  review_seconds int                    -- feeds metric M9
);

-- Misconceptions
create table misconceptions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id),
  key text not null,
  name text not null,
  description text not null,
  typical_signature text,
  severity text check (severity in ('notational','procedural','conceptual')),
  remediation_note text,
  status text default 'active' check (status in ('active','candidate','retired')),
  unique (module_id, key)
);

create table misconception_tags (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  misconception_id uuid references misconceptions(id),
  confidence numeric,
  evidence_step_indices int[],
  observed_signature text,
  confirmed_by_human boolean default null
);

-- Feedback
create table feedback (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  summary text,
  strengths jsonb, breakdown_points jsonb,
  next_action text, tone text,
  edited_by_human boolean default false,
  released_at timestamptz
);

create table feedback_flags (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid references feedback(id) on delete cascade,
  student_id uuid references users(id),
  reason text, note text,
  created_at timestamptz default now()
);

-- Corpus & RAG
create table resources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) on delete cascade,
  kind text check (kind in ('lecture_notes','tutorial','past_paper','worked_example','textbook_extract')),
  label text not null,
  storage_path text,
  topic_tags text[] default '{}',
  difficulty text check (difficulty in ('scaffold','target','extension'))
);

create table resource_chunks (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid references resources(id) on delete cascade,
  chunk_index int,
  content text not null,
  concepts_required text[] default '{}',
  embedding vector(384),               -- bge-small-en-v1.5
  tsv tsvector generated always as (to_tsvector('english', content)) stored
);
create index on resource_chunks using hnsw (embedding vector_cosine_ops);
create index on resource_chunks using gin (tsv);

-- Practice
create table practice_sets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references users(id),
  submission_id uuid references submissions(id),
  target_misconception_ids uuid[],
  created_at timestamptz default now()
);

create table practice_items (
  id uuid primary key default gen_random_uuid(),
  practice_set_id uuid references practice_sets(id) on delete cascade,
  position int, difficulty text,
  prompt_latex text not null,
  solution_latex text,
  hint_ladder jsonb,
  targets_because text,
  provenance jsonb,
  verified boolean default false,
  verified_by text check (verified_by in ('sympy','llm','unverified'))
);

create table practice_attempts (
  id uuid primary key default gen_random_uuid(),
  practice_item_id uuid references practice_items(id) on delete cascade,
  student_id uuid references users(id),
  response text, hints_used int default 0,
  outcome text check (outcome in ('correct','partial','incorrect')),
  created_at timestamptz default now()
);

-- Observability & audit
create table stage_runs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references submissions(id) on delete cascade,
  stage text not null,
  status text not null check (status in ('queued','running','succeeded','failed','skipped')),
  model text, prompt_version text,
  input_tokens int, output_tokens int, cost_usd numeric,
  latency_ms int, error text,
  started_at timestamptz, finished_at timestamptz
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  entity_type text, entity_id uuid,
  action text,
  before jsonb, after jsonb,
  created_at timestamptz default now()
);
```

---

# Section 10 — API

All JSON, role-gated via Supabase session.

**Setup**
```
POST   /api/modules
POST   /api/modules/:id/resources           # upload corpus → chunk + embed
POST   /api/assessments
POST   /api/assessments/:id/questions
POST   /api/questions/:id/rubric:structure  # {raw_rubric_text} → structured criteria
PUT    /api/rubrics/:id
```

**Submissions & pipeline**
```
POST   /api/questions/:id/submissions       # multipart, 1..n files
POST   /api/submissions/:id/process
GET    /api/submissions/:id                 # aggregate: pages, lines, steps, results, feedback
GET    /api/submissions/:id/events          # SSE stage progress
PUT    /api/submissions/:id/steps/:idx      # human transcription correction → re-run S4+
```

**Review**
```
GET    /api/assessments/:id/review-queue    # ?sort=confidence_asc
PUT    /api/submissions/:id/criteria/:key   # {level, score, note}
PUT    /api/submissions/:id/feedback
POST   /api/submissions/:id/approve         # {review_seconds} → final_grades + audit_log
POST   /api/assessments/:id/release
```

**Student**
```
GET    /api/me/feedback                     # released only
GET    /api/me/practice-sets
POST   /api/practice-items/:id/attempts     # P1
POST   /api/feedback/:id/flag
```

**Analytics**
```
GET    /api/assessments/:id/misconception-heatmap
GET    /api/assessments/:id/agreement-stats
GET    /api/assessments/:id/novel-candidates
```

**Error shape:** `{"error": {"code": "TRANSCRIPTION_DISAGREEMENT", "message": "...", "recoverable": true}}`

---

# Section 11 — Frontend

## 11.1 Screens

**E1 — Assessment setup.** Question editor with KaTeX preview. Paste-a-rubric → AI structures → editable criterion cards with weight sliders that must sum to 100%.

**E2 — Upload & progress.** Drag-drop. Per-submission 8-dot pipeline strip, live via SSE. Failures inline with retry.

**E3 — Review console (the hero screen).**
- *Left:* original script, zoomable, with step boxes overlaid. Hovering a step highlights its region and vice versa.
- *Centre:* numbered steps, inline-editable, with a confidence bar and an agreement indicator. Where the two reads disagreed, show both readings and let the educator pick.
- *Right:* criterion cards — level, score, **evidence chips that scroll to the cited step**, justification, confidence. Accept / Adjust per card. Below: editable feedback.
- *Footer:* `Approve & next` (key: `A`), `Adjust` (`J`), `Skip` (`S`). **Keyboard-first** — someone marking 70 scripts will not reach for a mouse. Start a timer on open, write `review_seconds` on approve (metric M9).

**E4 — Cohort dashboard [P1].** Misconception heatmap (frequency × severity), score distribution, AI-vs-human agreement chart, novel-candidate queue.

**S1 — Student feedback view.** Mark + criterion bars. Annotated script with the breakdown step highlighted. Feedback blocks. Misconception cards with expandable explainer and source link. "Was this helpful?" flag.

**S2 — Practice set.** Difficulty ramp visible. Progressive hint ladder. Solution gated behind an attempt. Provenance line on every item.

## 11.2 Design direction

Judges see twenty dashboards a day. Do not look like the twenty-first.

- **Restraint over decoration.** One accent colour, generous whitespace, real typographic hierarchy.
- **Typography:** a distinctive serif or grotesque for headings, high-legibility sans for body. Render all maths with KaTeX — never show raw LaTeX to a user.
- **Confidence as a design language.** One consistent visual encoding for model confidence across every surface. It makes the human-in-the-loop story *visible* rather than merely claimed.
- **The annotated script is the emotional core.** A student's own handwriting with *their* step 4 highlighted is what makes the demo land. Spend disproportionate polish there.
- **Motion sparingly.** The pipeline progress strip is the one place animation earns its keep.

---

# Section 12 — RAG

**Corpus prep (before the hackathon if possible):**
1. Ingest 30–60 pages: lecture notes, 3 tutorial sheets with solutions, 1 past paper.
2. **Semantic chunking by problem boundary, not fixed size.** A tutorial question plus its solution is one chunk.
3. Enrich each chunk via one LLM pass: `topic_tags`, `difficulty`, `kind`, `concepts_required[]`.
4. Embed with the sidecar (`bge-small-en-v1.5`, 384-dim) and index.

**Retrieval:** hybrid — vector similarity ∪ full-text — then rerank by `0.4·topic_overlap + 0.3·difficulty_proximity + 0.3·concept_isolation`.

**If embeddings misbehave:** ship full-text search alone. On a 40-page corpus it is competitive, and shipping beats perfect retrieval.

**Provenance is non-negotiable.** Every practice item shows its source. This is what separates *"the AI invented some homework"* from *"the system found the four problems in your module's own bank that target your gap."* It is a direct hit on both Innovation and Feasibility.

---

# Section 13 — Misconception taxonomy (seed)

Seed 12–15 for the pilot topic. Replace with your actual topic's content.

| key | name | severity | signature | remediation |
|---|---|---|---|---|
| `mc_product_rule_distributive` | Product rule treated as distributive | conceptual | `d/dx(uv) = u'v'` | Concrete counterexample, then 3 product drills |
| `mc_usub_limits_untransformed` | Limits not transformed after substitution | procedural | evaluates in `u` using original `x` limits | Limit-transformation checklist |
| `mc_constant_of_integration_dropped` | Omits `+C` | notational | missing `+C` | One-line correction, no practice |
| `mc_chain_rule_missing_inner` | Inner derivative omitted | procedural | `d/dx sin(3x) = cos(3x)` | Decomposition drills |
| `mc_ic_applied_before_general` | IC applied to a particular, not general, solution | conceptual | applies IC mid-derivation | Order-of-operations walkthrough |
| `mc_ibp_sign_error` | Sign error in integration by parts | procedural | `∫u dv = uv + ∫v du` | Formula recall + 2 drills |
| `mc_domain_ignored` | Ignores domain restrictions | conceptual | divides by a possibly-zero expression | Case-split exercises |
| `mc_notation_equals_chain` | Chains non-equal expressions with `=` | notational | `=` used to mean "next step" | Notation hygiene note |
| `mc_separation_invalid` | Separates a non-separable ODE | conceptual | separates when terms don't factor | Recognition drills |
| `mc_linearity_over_nonlinear` | Applies linearity to non-linear operators | conceptual | `√(a+b) = √a + √b` | Counterexample + drills |
| `mc_arbitrary_constant_merged` | Merges constants prematurely | notational | loses generality of `C` | Brief note |
| `mc_partial_fraction_form` | Wrong partial-fraction ansatz | procedural | wrong numerator degree | Form-selection table |

**Growth loop:** S5's `novel_candidates` → educator queue → promote to `active` with a name and remediation note. Demo this.

---

# Section 14 — Evaluation harness

**Worth 20% of the score. Build it. Never cut it.**

**Gold set:** 20–30 real handwritten scripts for one question, independently marked by a human with per-criterion scores and a note of the key error. Store as `eval/gold/*.json` plus images.

**CLI:** `npm run eval -- --question <id> --samples 3`

**Reports the §3.3 metrics table**, plus:

- **Failure taxonomy.** Group every disagreement by cause: transcription error, ambiguous rubric, unusual valid method, genuine model error. **A slide saying "here are the 4 cases we got wrong and how the human-in-the-loop caught every one" scores far better than a claim of 95% accuracy.** Honest error analysis reads as maturity; unqualified accuracy claims read as naivety.
- **Fairness check (M12).** Score MAE by legibility quartile. If neat handwriting systematically scores higher, say so and name mandatory human review as the mitigation.
- **Ablation (cheap, high value).** Run with dual-read disabled and with symbolic verification disabled. If the numbers get worse, you have *evidence* that your mechanisms work rather than an assertion. This is the single most persuasive slide you can build.

---

# Section 15 — Seed data

**Prepare before the build starts. Do not burn build hours making test data.**

1. **1 module** — e.g. `ENG1001 Engineering Mathematics`, with notation glossary.
2. **1 assessment, 2 questions** (one demo, one spare), each with a 4-criterion rubric out of 20, and `expected_answer_latex` populated.
3. **20–30 handwritten scripts.** Teammates and friends write real answers *including deliberate, varied errors* covering ≥6 taxonomy entries. Phone photos, varied lighting, mild skew. Realism is the point.
4. **Independent human marks** for all of them, per criterion, done *before* anyone sees AI output.
5. **Corpus:** ~40 pages of notes plus 3 tutorial sheets with solutions.
6. **Demo accounts** with names you're comfortable projecting.

> If time is short, cut the script count to 20 before cutting the quality of the human marking. The human marks are what make §14 credible, and §14 is what makes the whole thing credible.

---

# Section 16 — Repository

```
aims/
├── CLAUDE.md
├── docs/{PRD.md, DECISIONS.md, STUBS.md}
├── prompts/
│  ├── s2_read_a_literal.v1.md
│  ├── s2_read_b_semantic.v1.md
│  ├── s4_assess.v1.md
│  ├── s5_diagnose.v1.md
│  ├── s6_feedback.v1.md
│  ├── s7_practice.v1.md
│  ├── s7_verify.v1.md
│  └── rubric_structure.v1.md
├── src/
│  ├── app/
│  │  ├── (educator)/{setup,review,dashboard}/
│  │  ├── (student)/{feedback,practice}/
│  │  └── api/
│  ├── lib/
│  │  ├── ai/          # client, structured-output helper, cost logging
│  │  ├── pipeline/    # s1..s7 + orchestrator + reconcile
│  │  ├── sidecar/     # typed client for the Python service
│  │  ├── rag/         # chunk, embed, retrieve, rerank
│  │  ├── db/
│  │  └── schemas/     # zod — single source of truth
│  └── components/
├── sidecar/
│  ├── main.py         # FastAPI
│  ├── cv.py           # preprocess, detect_lines
│  ├── symbolic.py     # sympy equivalence, item verification
│  ├── embed.py
│  └── requirements.txt
├── eval/{gold/, run.ts, metrics.ts}
├── supabase/migrations/
└── scripts/{seed.ts, ingest-corpus.ts}
```

---

# Section 17 — Build plan

~36 hours, 4 people. Scale proportionally.

| ID | Milestone | Hrs | Owner | Acceptance criteria |
|---|---|---|---|---|
| **M0** | Scaffold: repo, Supabase, migrations, auth, sidecar skeleton, seed | 3 | Backend | `npm run seed` creates module/assessment/question/rubric; `GET /health` returns ok; both roles can log in |
| **M1** | S1 ingest + S1b line detection | 3 | Backend | Upload a photo → deskewed image + boxes persisted; boxes render as overlays on the original |
| **M2** | S2 dual-read + S3 reconcile | 5 | AI | Two reads persisted; `transcription_agreement` computed; low agreement routes to `needs_human_transcription`; steps anchored to boxes |
| **M3** | Sidecar symbolic module | 2 | AI | `/math/equivalent` returns true/false/null correctly on 10 known pairs |
| **M4** | S4 rubric assessment | 4 | AI | Criterion results with evidence persisted; schema rejects evidence-free results; symbolic check passed in as a fact |
| **M5** | Review console (E3) | 6 | Frontend | Three panes work; evidence chips scroll to steps; accept/adjust writes `final_grades` + `audit_log`; `A` key advances; `review_seconds` recorded |
| **M6** | S5 + S6 diagnosis & feedback | 4 | AI | Misconception tags with evidence; feedback cites a specific step; renders in student view |
| **M7** | Corpus ingest + S7 practice RAG + verification gate | 5 | Backend/AI | 3–5 item set with provenance; every item passes verification or is discarded |
| **M8** | Student views (S1, S2) | 4 | Frontend | Annotated script, feedback, misconception cards, practice set — polished |
| **M9** | Eval harness + full metrics run + ablation | 4 | AI | `npm run eval` prints the §3.3 table plus failure taxonomy and ablation |
| **M10** | Cohort dashboard [P1] | 3 | Frontend | Heatmap + agreement chart from real data |
| **M11** | Polish, rehearsal, backup recording | 3 | All | End-to-end runs twice consecutively without intervention; video backup recorded |

**Critical path:** M0 → M1 → M2 → M4 → M5 → M8 → M9.

**Cut order if behind:** M10 → practice interactivity → ablation → self-consistency sampling → PaddleOCR upgrade. **Never cut M9.**

**Checkpoints:**
- **T-12h:** whatever exists must run end-to-end. If it doesn't, stop building and make it.
- **T-6h:** feature freeze. The last six hours are polish, rehearsal, and the backup recording. No exceptions — this rule exists because every team breaks it and every team regrets it.

---

# Section 18 — Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Line detection fails on messy scripts | High | Deskew first; measure M5 on day 1, not day 2; fall back to whole-page grading with step numbers but no overlays |
| Two reads disagree constantly (low agreement rate) | High | Tune τ on the gold set early. If the agreement rate is under 60%, the threshold is wrong, not the design |
| `parse_latex` coverage lower than hoped | Medium | It's a fallback path by design. Report actual coverage; never claim more |
| Generated practice item is wrong | Demo-killer | Mandatory verification gate; prefer retrieved-verbatim; provenance shown |
| Sidecar dependency install eats hours | High | 90-minute timebox each for OpenCV, SymPy, embeddings. Documented fallback for each |
| Latency too slow for a live demo | Medium | Pre-process the batch; demo one script live plus the pre-run batch; parallelise stages |
| API outage or rate limit mid-demo | High | `AIMS_FIXTURE_MODE=true` serves cached outputs with zero API calls. Keep it working. Record a full backup video |
| Scope creep | High | The cut order above is agreed in writing *before* the build starts |

---

# Section 19 — Ethics and governance

State these in the pitch. They are worth real points under Feasibility, and they are also simply correct.

- **Human accountability.** No mark reaches a student without educator approval. The system recommends with evidence; the human decides.
- **Transparency.** Students are told AI assisted the marking, see which criteria drove the score, and can flag feedback. Never a black box.
- **Right of appeal.** Full audit trail — what was recommended, what the human decided, when, and any note. Appeals are answerable with data.
- **Equity.** Legibility must not determine marks. Measure it (M12); route low-legibility scripts to humans rather than penalising them.
- **Data protection (PDPA).** Student scripts are personal data. Minimise — pseudonymous IDs, strip names before model calls where possible. State retention. Use a no-training data path. **For the hackathon, use consented volunteer scripts only, and say so on the slide.**
- **Free-tier LLM providers may train on submitted data.** Google AI Studio's and Groq's free tiers (docs/DECISIONS.md "M2 — free-tier providers") do not carry the same no-training guarantee as a paid enterprise endpoint — submitted images and text may be used to improve the provider's models. This build only ever sends **consented volunteer scripts** (same rule as the PDPA line above), and that consent must explicitly cover this. **Before any real deployment**, replace the free-tier providers with a paid no-training endpoint (Anthropic, Google Cloud Vertex AI, or equivalent) — the `LLMClient` interface exists specifically so this is a config change, not a rewrite.
- **Wellbeing.** Feedback is corrective, never demeaning. A struggling student should finish reading more motivated, not less.
- **Not surveillance.** Cohort analytics exist for curriculum improvement, not for ranking or flagging individuals.
- **Against deskilling.** The design keeps educators making judgements rather than rubber-stamping. Confidence-first queue ordering exists partly to direct attention where judgement actually matters.

---

# Section 20 — Demo script (7 minutes)

| Time | Beat | Content |
|---|---|---|
| 0:00–0:45 | **The pain** | "280 students. 1,680 handwritten answers. Two weeks to return them. What does a student get back? A number." Show a real script with a red tick and nothing else. |
| 0:45–1:15 | **The insight** | "The bottleneck isn't marking. It's *diagnosis*. Without diagnosis you can't target practice — so students revise everything and fix nothing." |
| 1:15–3:15 | **Live: educator** | Upload a real handwritten script. Pipeline runs on screen. Review console: transcription beside the image, two independent reads agreeing, four criteria with evidence chips, one adjustment in three seconds, approve. "Forty seconds. Baseline was four minutes." |
| 3:15–4:45 | **Live: student** | Their handwriting, step 4 highlighted. Feedback naming the misconception. Practice set: "these four problems exist because of what *this student specifically* got wrong, drawn from this module's own tutorial bank." Show provenance. |
| 4:45–5:45 | **The proof** | Metrics table from the gold set. Then the ablation: "with dual-read off, MAE rises from 0.8 to 1.4." Then the failure slide: "here are the 4 we got wrong, and how the human-in-the-loop caught every one." |
| 5:45–6:30 | **Feasibility & scale** | Cohort heatmap. Cost per cohort (cents). Entirely free-tier infrastructure. LMS path. Portability: swap the rubric and taxonomy and the same framework grades a design justification or a lab report. |
| 6:30–7:00 | **Close** | "AIMS doesn't replace the marker. It gives every student the diagnosis a one-to-one tutor would give them — 280 students at a time." |

**Rehearse the live sections five times.** Backup video queued in a second tab. Assume the wifi fails.

---

# Section 21 — Rubric self-audit

Check this before cutting anything.

## Problem–Solution Fit (30%)

| Requirement | How this build satisfies it | Evidence in demo |
|---|---|---|
| Real, specific problem | Diagnosis at scale, not "grading is slow" — §1.1 | 0:00–1:15 |
| Stakeholder need evidenced | **Gap: interview a real SIT educator for 20 minutes and quote them.** Do this. It is the cheapest 30%-weight point available | Opening slide |
| Solution maps 1:1 to pain | Educator pain → review console; student pain → misconception cards + targeted practice | 1:15–4:45 |
| Context understood | Cohort scale, TA structure, appeals process, PDPA all designed for | 5:45–6:30 |

## Innovation & Creativity (20%)

| Requirement | How |
|---|---|
| Novel mechanism, not a wrapper | The **misconception layer**: detection → taxonomy → severity-driven remediation → RAG-targeted practice → taxonomy growth from novel candidates |
| Creative interaction | Evidence chips linking marks to the student's own handwriting; confidence as a visual language; hint ladder |
| Beyond the obvious | Dual-read agreement, symbolic verification gate, novel-misconception discovery loop |

## Effectiveness (20%)

| Requirement | How |
|---|---|
| Demonstrates the concept | Full live run on a real handwritten script |
| Key functionality works | All 11 MVP items, end-to-end |
| Coherent user journey | Both journeys shown, educator → student, in sequence |
| **Measured, not asserted** | §14 metrics table + ablation + honest failure taxonomy |

## Feasibility & Future Potential (20%)

| Requirement | How |
|---|---|
| Realistic development path | Free-tier infrastructure, ~$2 per cohort, no GPU |
| Implementation credible | Human-in-loop, audit trail, appeals-defensible, PDPA-aware |
| Adoption pathway | Fits existing marking workflow; LMS integration on the roadmap; `LineDetector` interface shows designed-for-upgrade |
| Scales | Cost and latency measured; portability across disciplines argued |

## Presentation & Pitch (10%)

| Requirement | How |
|---|---|
| Engaging, clear, persuasive | §20's seven beats, rehearsed five times |
| Value proposition confident | One line, delivered twice: opening and close |
| Team communicates well | **Whoever owns the narrative should not be building in the final six hours** |

**The two biggest scoring gaps are not code.** They are (1) a real stakeholder quote from an actual SIT educator, and (2) rehearsal. Both cost hours, not days, and both sit on the heaviest-weighted criteria.

---

# Section 22 — Roadmap

- **Phase 1 (one semester pilot):** one module, one educator, two assessments. Measure turnaround time, TA hours saved, practice uptake, mark agreement. Ethics clearance for data use.
- **Phase 2:** LTI 1.3 LMS integration; SSO; semester-long mastery model; educator taxonomy-authoring tools.
- **Phase 3:** Multi-discipline expansion. Prove it on a non-maths module — a design justification or lab report — to validate the rubric+taxonomy abstraction.
- **Phase 4:** Cross-module learner profile; programme-level curriculum analytics; shared open misconception taxonomies across institutions.

**The thesis to leave with judges:** the durable asset is not the grader — it is the **misconception layer**. Once a module has a validated taxonomy and a misconception→remediation mapping, every downstream feature becomes cheap.

---

# Section 23 — Appendices

## 23.1 Environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SIDECAR_URL=http://localhost:8000

# Free-tier providers (docs/DECISIONS.md "M2 — free-tier providers") — no
# Anthropic API budget for this build. Swap-in path for a paid provider is a
# new src/lib/ai/providers/*.ts file plus these three lines.
AIMS_PROVIDER_PRIMARY=gemini      # gemini | groq
AIMS_PROVIDER_FAST=groq
AIMS_PROVIDER_ADJUDICATOR=gemini

AIMS_GEMINI_API_KEY=
AIMS_GEMINI_MODEL=gemini-2.0-flash
AIMS_GEMINI_RPM=10
AIMS_GROQ_API_KEY=
AIMS_GROQ_MODEL=llama-3.2-11b-vision-preview
AIMS_GROQ_RPM=25

AIMS_DUAL_READ_ENABLED=true
AIMS_AGREEMENT_THRESHOLD=0.85
AIMS_LINE_DETECTOR=opencv        # opencv | paddle
AIMS_RETRIEVAL_MODE=hybrid       # hybrid | fulltext
AIMS_FIXTURE_MODE=false          # true = cached responses only (local-data/ai-cache), zero network calls, zero quota spend
```

## 23.2 Glossary

**Criterion** — one scored dimension of a rubric. **Level** — a named band within a criterion. **Step** — one logical move in a solution. **Evidence** — the step indices justifying a criterion judgement. **Agreement** — similarity between the two independent transcription reads. **Misconception** — a reusable, named conceptual error. **Signature** — the observable pattern indicating a misconception. **Provenance** — the source a practice item was retrieved from or varied from. **Confidence gate** — a threshold routing low-confidence output to a human.

## 23.3 Open questions for the team

1. Which module and topic? Everything downstream depends on it.
2. Do you have real handwritten scripts and a human marker? If not, when?
3. Permission to use the module's notes and tutorials as the RAG corpus?
4. **Can you interview a real educator for 20 minutes?** Highest-value hour available — see §21.
5. Who owns the pitch narrative, and are they building in the last six hours? (They shouldn't be.)
6. Have you asked the organisers for sponsor API credits?
