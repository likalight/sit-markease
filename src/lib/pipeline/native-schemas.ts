import { SchemaType } from "@google/generative-ai";

// Hand-written Gemini responseSchema literals (OpenAPI 3.0 subset) mirroring
// the Zod schemas in src/lib/schemas/*.ts exactly. Gemini's native
// structured-output mode doesn't accept a Zod/JSON-Schema object directly,
// and a generic converter would be fragile — one literal per stage is more
// reliable for the handful of shapes this build needs.

export const s2ReadNativeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          step_index: { type: SchemaType.INTEGER },
          line_indices: { type: SchemaType.ARRAY, items: { type: SchemaType.INTEGER } },
          latex: { type: SchemaType.STRING },
          plain_text: { type: SchemaType.STRING },
          role: {
            type: SchemaType.STRING,
            enum: ["setup", "substitution", "rule_application", "simplification", "result"],
          },
          confidence: { type: SchemaType.NUMBER },
        },
        required: ["step_index", "line_indices", "latex", "plain_text", "role", "confidence"],
      },
    },
    final_answer: {
      type: SchemaType.OBJECT,
      properties: { latex: { type: SchemaType.STRING }, present: { type: SchemaType.BOOLEAN } },
      required: ["latex", "present"],
    },
    flags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    student_identifier: { type: SchemaType.STRING, nullable: true },
    overall_legibility: { type: SchemaType.NUMBER },
  },
  required: ["steps", "final_answer", "flags", "overall_legibility"],
};

export const s2ReadTypedNativeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    steps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          step_index: { type: SchemaType.INTEGER },
          role: {
            type: SchemaType.STRING,
            enum: ["setup", "substitution", "rule_application", "simplification", "result"],
          },
          plain_text: { type: SchemaType.STRING },
        },
        required: ["step_index", "role", "plain_text"],
      },
    },
    final_answer: {
      type: SchemaType.OBJECT,
      properties: { latex: { type: SchemaType.STRING }, present: { type: SchemaType.BOOLEAN } },
      required: ["latex", "present"],
    },
  },
  required: ["steps", "final_answer"],
};

export const assessNativeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    criterion_results: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          criterion_key: { type: SchemaType.STRING },
          level: { type: SchemaType.STRING },
          score: { type: SchemaType.NUMBER },
          max_score: { type: SchemaType.NUMBER },
          evidence_step_indices: { type: SchemaType.ARRAY, items: { type: SchemaType.INTEGER } },
          justification: { type: SchemaType.STRING },
          confidence: { type: SchemaType.NUMBER },
        },
        required: ["criterion_key", "level", "score", "max_score", "evidence_step_indices", "justification", "confidence"],
      },
    },
    total_recommended: { type: SchemaType.NUMBER },
    max_total: { type: SchemaType.NUMBER },
    error_carry_forward_applied: { type: SchemaType.BOOLEAN },
    needs_human_review: { type: SchemaType.BOOLEAN },
    review_reasons: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["criterion_results", "total_recommended", "max_total", "needs_human_review"],
};

export const diagnoseNativeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    detected: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          misconception_key: { type: SchemaType.STRING },
          confidence: { type: SchemaType.NUMBER },
          evidence_step_indices: { type: SchemaType.ARRAY, items: { type: SchemaType.INTEGER } },
          severity: { type: SchemaType.STRING, enum: ["notational", "procedural", "conceptual"] },
          observed_signature: { type: SchemaType.STRING },
        },
        required: ["misconception_key", "confidence", "evidence_step_indices", "severity", "observed_signature"],
      },
    },
    novel_candidates: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          proposed_name: { type: SchemaType.STRING },
          evidence_step_indices: { type: SchemaType.ARRAY, items: { type: SchemaType.INTEGER } },
          confidence: { type: SchemaType.NUMBER },
        },
        required: ["proposed_name", "evidence_step_indices", "confidence"],
      },
    },
  },
  required: ["detected", "novel_candidates"],
};

export const feedbackNativeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: { type: SchemaType.STRING },
    strengths: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: { text: { type: SchemaType.STRING }, step_indices: { type: SchemaType.ARRAY, items: { type: SchemaType.INTEGER } } },
        required: ["text", "step_indices"],
      },
    },
    breakdown_points: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          step_index: { type: SchemaType.INTEGER },
          what_happened: { type: SchemaType.STRING },
          why_it_matters: { type: SchemaType.STRING },
          misconception_key: { type: SchemaType.STRING, nullable: true },
        },
        required: ["step_index", "what_happened", "why_it_matters"],
      },
    },
    next_action: { type: SchemaType.STRING },
    tone: { type: SchemaType.STRING, enum: ["supportive", "concise", "socratic"] },
    word_count: { type: SchemaType.INTEGER },
  },
  required: ["summary", "strengths", "breakdown_points", "next_action", "tone", "word_count"],
};

export const practiceNativeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          position: { type: SchemaType.INTEGER },
          difficulty: { type: SchemaType.STRING, enum: ["scaffold", "target", "extension"] },
          prompt_latex: { type: SchemaType.STRING },
          solution_latex: { type: SchemaType.STRING },
          hint_ladder: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          targets_because: { type: SchemaType.STRING },
          provenance: {
            type: SchemaType.OBJECT,
            properties: {
              type: { type: SchemaType.STRING, enum: ["retrieved", "variant_of"] },
              source_label: { type: SchemaType.STRING },
            },
            required: ["type", "source_label"],
          },
        },
        required: ["position", "difficulty", "prompt_latex", "solution_latex", "hint_ladder", "targets_because", "provenance"],
      },
    },
  },
  required: ["items"],
};

export const rubricStructureNativeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    criteria: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          key: { type: SchemaType.STRING },
          name: { type: SchemaType.STRING },
          weight: { type: SchemaType.NUMBER },
          max_score: { type: SchemaType.NUMBER },
          levels: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                level: { type: SchemaType.STRING },
                score: { type: SchemaType.NUMBER },
                descriptor: { type: SchemaType.STRING },
              },
              required: ["level", "score", "descriptor"],
            },
          },
        },
        required: ["key", "name", "weight", "max_score", "levels"],
      },
    },
  },
  required: ["criteria"],
};

export const documentExtractNativeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    prompt_text: { type: SchemaType.STRING },
    model_solution: { type: SchemaType.STRING },
    expected_answer_latex: { type: SchemaType.STRING },
    max_score: { type: SchemaType.NUMBER },
    raw_rubric_notes: { type: SchemaType.STRING },
  },
  required: ["prompt_text", "model_solution", "expected_answer_latex", "max_score", "raw_rubric_notes"],
};
