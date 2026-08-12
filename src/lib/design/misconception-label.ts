// Taxonomy misconceptions (src/lib/pipeline/taxonomy.ts) already have a
// human-written `name`. Novel candidates (src/lib/pipeline/s5-diagnose.ts)
// use whatever `proposed_name` the model returned, which is sometimes a
// slug like "final_value_accuracy_issue" instead of a written label —
// display-only normalization, not a change to what's stored.
export function formatMisconceptionName(name: string): string {
  if (!/^[a-z0-9_]+$/.test(name)) return name;
  return name
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
