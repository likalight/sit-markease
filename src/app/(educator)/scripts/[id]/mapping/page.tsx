import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { ScriptMappingReview } from "@/components/script-mapping-review";
import { DemoGuidePanel } from "@/components/demo-guide-panel";

export default async function ScriptMappingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "educator") redirect("/login");
  const { id } = await params;
  const script = await db.getScriptUpload(id);
  if (!script) notFound();
  const assessment = await db.getAssessment((script as any).assessment_id);
  const student = await db.getUser((script as any).student_id);
  const pages = await db.listScriptPages(id);
  const questions = await db.listQuestionsForAssessment((script as any).assessment_id);
  const mappings = await db.listQuestionMappings(id);
  const pageViews = await Promise.all((pages as any[]).map(async (page) => ({ pageIndex: page.page_index, url: await db.getImageUrl(page.processed_path) })));

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-lg px-6 py-xl">
      <div>
        <Link href={`/assignments/${(script as any).assessment_id}/upload`} className="text-body-sm text-muted underline">← Back to upload</Link>
        <h1 className="mt-xs text-title-lg text-body-strong">Confirm script mapping</h1>
        <p className="text-body-sm text-muted">{(assessment as any)?.title} · {(student as any)?.name} · source pages remain visible throughout review</p>
      </div>
      <DemoGuidePanel
        eyebrow="Human checkpoint"
        title="The AI suggests question regions; the instructor confirms"
        body="This is how the demo handles scripts where several questions share a page or one answer continues across pages. The source image stays visible, and no summative grading starts until the mapping is confirmed."
        steps={[
          { title: "Check the boxes", body: "Each suggested region is tied to a rubric-backed question." },
          { title: "Confirm mapping", body: "Confirmed regions are cropped into per-question submissions." },
          { title: "Review grades", body: "After processing, the review queue shows the evidence-backed marking.", href: "/review", action: "Open review queue" },
        ]}
      />
      <ScriptMappingReview
        scriptUploadId={id}
        pages={pageViews.filter((page): page is { pageIndex: number; url: string } => !!page.url)}
        questions={(questions as any[]).map((question) => ({ id: question.id, position: question.position, promptText: question.prompt_text }))}
        initialMappings={(mappings as any[]).map((mapping) => ({ id: mapping.id, questionId: mapping.question_id, detectedLabel: mapping.detected_label ?? "", regions: mapping.regions ?? [], confidence: Number(mapping.confidence), notes: mapping.notes ?? "" }))}
      />
    </main>
  );
}
