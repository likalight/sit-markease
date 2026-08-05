"use client";

import { useState } from "react";
import { saveRubricAction } from "@/app/(educator)/assignments/[assessmentId]/rubric/actions";
import { isPdfFile, renderPdfToImageFiles } from "@/lib/pdf/render-client";

type Level = { level: string; score: number; descriptor: string };
type Criterion = { key: string; name: string; weight: number; max_score: number; levels: Level[] };

export function RubricEditor({
  assessmentId,
  rubricId,
  questionId,
  questionPromptText,
  initialCriteria,
}: {
  assessmentId: string;
  rubricId: string;
  questionId: string;
  questionPromptText: string;
  initialCriteria: Criterion[];
}) {
  const [criteria, setCriteria] = useState<Criterion[]>(initialCriteria);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  async function readJsonResponse(response: Response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: { message: text || "The server returned a non-JSON response." } };
    }
  }

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

  async function importRubric(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    setImportMessage(isPdfFile(file) ? "Rendering rubric PDF in your browser..." : "Reading rubric document...");
    try {
      const files = isPdfFile(file)
        ? await renderPdfToImageFiles(file, { maxPages: 15, maxWidth: 1200, quality: 0.76 })
        : [file];
      setImportMessage("Extracting editable rubric criteria...");
      const body = new FormData();
      files.forEach((page) => body.append("files", page));
      const response = await fetch(`/api/questions/${questionId}/rubric-from-document`, { method: "POST", body });
      const json = await readJsonResponse(response);
      if (!response.ok) throw new Error(json.error?.message ?? "could not import rubric");
      setCriteria(json.criteria ?? []);
      setSaved(false);
      setImportMessage("Rubric imported. Review and save when it looks right.");
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-sm rounded-lg border border-hairline p-md">
      <p className="text-body-sm text-muted">{questionPromptText}</p>
      <label className="flex flex-col gap-xs rounded-sm border border-dashed border-hairline px-sm py-xs text-body-sm text-body">
        Import rubric PDF
        <input
          type="file"
          accept="application/pdf,image/*"
          disabled={importing}
          onChange={(event) => importRubric(event.target.files?.[0])}
          className="text-caption"
        />
        {importMessage && <span className="text-caption text-muted-soft">{importMessage}</span>}
      </label>

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
