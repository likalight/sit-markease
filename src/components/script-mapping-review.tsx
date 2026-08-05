"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PageRegion } from "@/lib/schemas/script-mapping";

type Mapping = { id?: string; questionId: string; detectedLabel: string; regions: PageRegion[]; confidence: number; notes: string };

export function ScriptMappingReview({ scriptUploadId, pages, questions, initialMappings }: {
  scriptUploadId: string;
  pages: { pageIndex: number; url: string }[];
  questions: { id: string; position: number; promptText: string }[];
  initialMappings: Mapping[];
}) {
  const router = useRouter();
  const [mappings, setMappings] = useState(initialMappings);
  const [selectedPage, setSelectedPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const page = pages.find((item) => item.pageIndex === selectedPage) ?? pages[0];
  const overlays = useMemo(() => mappings.flatMap((mapping, mappingIndex) => mapping.regions.filter((region) => region.page_index === selectedPage).map((region) => ({ mapping, mappingIndex, region }))), [mappings, selectedPage]);

  async function readJsonResponse(response: Response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { error: { message: text || "The server returned a non-JSON response." } };
    }
  }

  function addMissing() {
    const used = new Set(mappings.map((mapping) => mapping.questionId));
    const question = questions.find((item) => !used.has(item.id));
    if (!question) return;
    setMappings([...mappings, { questionId: question.id, detectedLabel: `Q${question.position}`, confidence: 0, notes: "Added by instructor", regions: [{ page_index: selectedPage, x: 0, y: 0, w: 1, h: 1 }] }]);
  }

  async function saveAndGrade() {
    setBusy(true);
    setMessage("Saving mappings…");
    try {
      const saved = await fetch(`/api/scripts/${scriptUploadId}/mappings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mappings }) });
      const savedJson = await readJsonResponse(saved);
      if (!saved.ok) throw new Error(savedJson.error?.message ?? "could not save mappings");
      setMessage("Creating question submissions…");
      const confirmed = await fetch(`/api/scripts/${scriptUploadId}/confirm`, { method: "POST" });
      const confirmedJson = await readJsonResponse(confirmed);
      if (!confirmed.ok) throw new Error(confirmedJson.error?.message ?? "could not confirm mappings");
      const ids = confirmedJson.submissionIds as string[];
      for (let index = 0; index < ids.length; index++) {
        setMessage(`Grading question ${index + 1} of ${ids.length}…`);
        const result = await fetch(`/api/submissions/${ids[index]}/process`, { method: "POST" });
        const resultJson = await readJsonResponse(result);
        if (!result.ok) throw new Error(resultJson.error?.message ?? `question ${index + 1} could not be processed`);
      }
      setMessage("All questions are ready for review.");
      router.push("/review");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-0 gap-lg lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <section className="min-w-0">
        <div className="mb-sm flex gap-xs">
          {pages.map((item) => <button key={item.pageIndex} type="button" onClick={() => setSelectedPage(item.pageIndex)} className={`h-9 w-9 border text-caption ${selectedPage === item.pageIndex ? "border-primary bg-primary-soft text-primary-active" : "border-hairline"}`}>{item.pageIndex + 1}</button>)}
        </div>
        {page && <div className="relative overflow-hidden border border-hairline bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.url} alt={`Script page ${page.pageIndex + 1}`} className="block h-auto w-full" />
          {overlays.map(({ mapping, mappingIndex, region }, index) => <div key={`${mappingIndex}-${index}`} className="absolute border-2 border-primary bg-primary/10" style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.w * 100}%`, height: `${region.h * 100}%` }}><span className="bg-primary px-1 text-caption text-on-primary">Q{questions.find((q) => q.id === mapping.questionId)?.position ?? "?"}</span></div>)}
        </div>}
      </section>
      <section className="min-w-0">
        <div className="flex items-baseline justify-between"><h2 className="text-title-md text-body-strong">Question mapping</h2><span className="text-caption text-muted">{mappings.length}/{questions.length}</span></div>
        <div className="mt-sm divide-y divide-hairline border-y border-hairline">
          {mappings.map((mapping, index) => <div key={`${mapping.questionId}-${index}`} className="py-sm">
            <div className="flex gap-xs">
              <select value={mapping.questionId} onChange={(event) => setMappings(mappings.map((item, itemIndex) => itemIndex === index ? { ...item, questionId: event.target.value } : item))} className="min-w-0 flex-1 border border-hairline px-sm py-xs text-body-sm">
                {questions.map((question) => <option key={question.id} value={question.id}>Q{question.position} — {question.promptText.slice(0, 52)}</option>)}
              </select>
              <button type="button" aria-label="Remove mapping" title="Remove mapping" onClick={() => setMappings(mappings.filter((_, itemIndex) => itemIndex !== index))} className="h-9 w-9 border border-hairline text-body-sm">×</button>
            </div>
            <p className="mt-xs text-caption text-muted">{mapping.regions.length} region{mapping.regions.length === 1 ? "" : "s"} · {Math.round(mapping.confidence * 100)}% confidence · {mapping.notes}</p>
            <div className="mt-xs grid gap-xs">
              {mapping.regions.map((region, regionIndex) => (
                <div key={regionIndex} className="grid grid-cols-5 gap-xxs text-caption">
                  {(["page_index", "x", "y", "w", "h"] as const).map((field) => (
                    <label key={field} className="flex flex-col gap-[2px] text-muted-soft">
                      {field === "page_index" ? "page" : field}
                      <input
                        type="number"
                        min={0}
                        max={field === "page_index" ? Math.max(0, pages.length - 1) : 1}
                        step={field === "page_index" ? 1 : 0.01}
                        value={region[field]}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setMappings(mappings.map((item, itemIndex) => itemIndex !== index ? item : {
                            ...item,
                            regions: item.regions.map((candidate, candidateIndex) => candidateIndex === regionIndex ? { ...candidate, [field]: value } : candidate),
                          }));
                        }}
                        className="min-w-0 border border-hairline px-xxs py-xxs text-body"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>)}
        </div>
        <button type="button" onClick={addMissing} className="mt-sm border border-hairline px-sm py-xs text-body-sm">Add missing question</button>
        <div className="mt-lg border-t border-hairline pt-md">
          <button data-tour-id="confirm-mapping" type="button" disabled={busy || mappings.length === 0} onClick={saveAndGrade} className="rounded-sm bg-primary px-md py-sm text-body-sm font-medium text-on-primary disabled:opacity-50">Confirm mapping and grade</button>
          {message && <p className="mt-sm text-body-sm text-muted">{message}</p>}
        </div>
      </section>
    </div>
  );
}
