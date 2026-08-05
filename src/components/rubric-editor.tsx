"use client";

import { useState } from "react";
import { saveRubricAction } from "@/app/(educator)/assignments/[assessmentId]/rubric/actions";

type Level = { level: string; score: number; descriptor: string };
type Criterion = { key: string; name: string; weight: number; max_score: number; levels: Level[] };

export function RubricEditor({
  assessmentId,
  rubricId,
  questionPromptText,
  initialCriteria,
}: {
  assessmentId: string;
  rubricId: string;
  questionPromptText: string;
  initialCriteria: Criterion[];
}) {
  const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateCriterion(index: number, patch: Partial<Criterion>) {
    setCriteria((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
    setSaved(false);
  }

  function updateLevel(criterionIndex: number, levelIndex: number, patch: Partial<Level>) {
    setCriteria((prev) =>
      prev.map((c, i) =>
        i === criterionIndex
          ? { ...c, levels: c.levels.map((l, j) => (j === levelIndex ? { ...l, ...patch } : l)) }
          : c
      )
    );
    setSaved(false);
  }

  function addCriterion() {
    setCriteria((prev) => [
      ...prev,
      {
        key: `c_${prev.length + 1}`,
        name: "New criterion",
        weight: 1,
        max_score: 1,
        levels: [{ level: "met", score: 1, descriptor: "" }],
      },
    ]);
    setSaved(false);
  }

  function removeCriterion(index: number) {
    setCriteria((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function addLevel(criterionIndex: number) {
    setCriteria((prev) =>
      prev.map((c, i) => (i === criterionIndex ? { ...c, levels: [...c.levels, { level: "", score: 0, descriptor: "" }] } : c))
    );
    setSaved(false);
  }

  function removeLevel(criterionIndex: number, levelIndex: number) {
    setCriteria((prev) =>
      prev.map((c, i) => (i === criterionIndex ? { ...c, levels: c.levels.filter((_, j) => j !== levelIndex) } : c))
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await saveRubricAction(assessmentId, rubricId, criteria);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-sm rounded-lg border border-hairline p-md">
      <p className="text-body-sm text-muted">{questionPromptText}</p>

      <div className="flex flex-col gap-sm">
        {criteria.map((c, ci) => (
          <div key={ci} className="flex flex-col gap-xs rounded-sm border border-hairline p-sm">
            <div className="flex items-center gap-xs">
              <input
                value={c.name}
                onChange={(e) => updateCriterion(ci, { name: e.target.value })}
                className="flex-1 rounded-sm border border-hairline px-xs py-xxs text-body-sm text-body-strong"
              />
              <label className="flex items-center gap-xxs text-caption text-muted-soft">
                weight
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={c.weight}
                  onChange={(e) => updateCriterion(ci, { weight: Number(e.target.value) })}
                  className="w-16 rounded-sm border border-hairline px-xs py-xxs text-body-sm"
                />
              </label>
              <label className="flex items-center gap-xxs text-caption text-muted-soft">
                max pts
                <input
                  type="number"
                  min={0}
                  value={c.max_score}
                  onChange={(e) => updateCriterion(ci, { max_score: Number(e.target.value) })}
                  className="w-16 rounded-sm border border-hairline px-xs py-xxs text-body-sm"
                />
              </label>
              <button
                onClick={() => removeCriterion(ci)}
                className="rounded-sm border border-hairline px-xs py-xxs text-caption text-disputed"
              >
                Remove
              </button>
            </div>

            <div className="flex flex-col gap-xxs pl-md">
              {c.levels.map((l, li) => (
                <div key={li} className="flex items-center gap-xs">
                  <input
                    value={l.level}
                    onChange={(e) => updateLevel(ci, li, { level: e.target.value })}
                    placeholder="level"
                    className="w-24 rounded-sm border border-hairline px-xs py-xxs text-caption"
                  />
                  <input
                    type="number"
                    value={l.score}
                    onChange={(e) => updateLevel(ci, li, { score: Number(e.target.value) })}
                    className="w-16 rounded-sm border border-hairline px-xs py-xxs text-caption tabular-nums"
                  />
                  <input
                    value={l.descriptor}
                    onChange={(e) => updateLevel(ci, li, { descriptor: e.target.value })}
                    placeholder="descriptor"
                    className="flex-1 rounded-sm border border-hairline px-xs py-xxs text-caption"
                  />
                  <button
                    onClick={() => removeLevel(ci, li)}
                    className="text-caption text-disputed underline"
                  >
                    remove
                  </button>
                </div>
              ))}
              <button onClick={() => addLevel(ci)} className="w-fit text-caption text-muted underline">
                + level
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-sm">
        <button
          onClick={addCriterion}
          className="w-fit rounded-sm border border-dashed border-hairline px-sm py-xs text-caption text-muted underline"
        >
          + Add criterion
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-sm bg-primary px-sm py-xs text-caption font-medium text-on-primary disabled:opacity-60"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
