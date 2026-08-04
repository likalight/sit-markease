// Groups rubric criteria by the question PART they grade, not one-box-per-
// criterion — those aren't the same thing. A single-part question can have
// several grading criteria ("correct setup", "correct arithmetic") that all
// belong to the one part the student answered; a multi-part question
// usually declares its parts as "(i) ... (ii) ... (iii) ..." in the prompt
// text itself, but the rubric-structuring AI doesn't reliably echo that
// labelling into the criteria it generates (seen live: a genuinely two-part
// question came back with criteria named "Correct Differentiation" /
// "Correct Evaluation" — no part label at all). So there are two signals,
// tried in order:
//   1. The criterion's own name carries a part label ("Part (i) - ...").
//   2. The question's prompt text declares an ordered list of parts
//      ("(i) ... (ii) ..."), and the count happens to match the criteria
//      count — assign positionally, in the order both were written.
// If neither signal fires, every criterion is evidently grading the same
// single-part answer, and they're merged into one group — never fall
// through to "one box per criterion" as a default, since that's exactly
// the wrong behaviour for a single-part question with multiple criteria.
const PART_LABEL_RE = /^\s*(?:part\s*)?\(?([ivxlcdm]{1,5}|[a-h]|\d{1,2})\)?[\s.):-]/i;

export function extractPartLabel(name: string): string | null {
  const m = name.match(PART_LABEL_RE);
  return m ? m[1].toLowerCase() : null;
}

// Ordered, de-duplicated list of part markers the question itself declares,
// e.g. "(i) Given that... (ii) Find a, b and c. (iii) Find the sum..." ->
// ["i", "ii", "iii"]. Heuristic, not a parser: matches a parenthesised
// roman numeral or single letter that appears standalone (not fused into a
// word), in first-seen order.
const DECLARED_PART_RE = /\(([ivxlcdm]{1,5}|[a-h])\)/gi;

export function extractDeclaredParts(promptText: string): string[] {
  const seen: string[] = [];
  for (const match of promptText.matchAll(DECLARED_PART_RE)) {
    const label = match[1].toLowerCase();
    if (!seen.includes(label)) seen.push(label);
  }
  return seen;
}

export function groupCriteriaByPart<T>(
  criteria: T[],
  nameFor: (c: T) => string,
  promptText = ""
): Map<string, T[]> {
  const labels = criteria.map((c) => extractPartLabel(nameFor(c)));
  const anyLabeled = labels.some((l) => l !== null);

  const groups = new Map<string, T[]>();

  if (anyLabeled) {
    criteria.forEach((c, i) => {
      const key = labels[i] ?? "unlabeled";
      const group = groups.get(key) ?? [];
      group.push(c);
      groups.set(key, group);
    });
    return groups;
  }

  // No criterion carries a part label — fall back to the question's own
  // declared part count, positionally, only when it lines up exactly.
  const declaredParts = extractDeclaredParts(promptText);
  if (declaredParts.length === criteria.length && declaredParts.length > 1) {
    criteria.forEach((c, i) => {
      const key = declaredParts[i];
      groups.set(key, [c]);
    });
    return groups;
  }

  // Single part, however many criteria grade it.
  groups.set("all", criteria);
  return groups;
}
