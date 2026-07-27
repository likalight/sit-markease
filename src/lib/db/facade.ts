import { env } from "./env";
import { localStore } from "./local-store";
import { localFiles } from "@/lib/storage/local-files";
import { supabaseAdmin } from "./supabase-admin";

// Single data-access seam for M2 onward. Every pipeline stage reads/writes
// through `db`, never `localStore` or `supabaseAdmin` directly, so the
// AIMS_FIXTURE_MODE swap-back (docs/DECISIONS.md "M2 — free-tier providers")
// touches one file. M0/M1's original Supabase-only code (login, dashboard,
// the M1 upload route) predates this facade and still calls Supabase
// directly where fixture mode isn't relevant to it.

function fx() {
  return env.isFixtureMode();
}

export const db = {
  // --- reference data (seeded) ---
  async getQuestionWithRubric(questionId: string) {
    if (fx()) {
      const question = localStore.get("questions", questionId);
      if (!question) return null;
      const rubric = localStore.findOne("rubrics", (r: any) => r.question_id === questionId);
      const criteria = rubric ? localStore.find("rubric_criteria", (c: any) => c.rubric_id === rubric.id) : [];
      return { ...question, rubric, criteria };
    }
    const admin = supabaseAdmin();
    const { data: question } = await admin.from("questions").select("*").eq("id", questionId).single();
    if (!question) return null;
    const { data: rubric } = await admin.from("rubrics").select("*").eq("question_id", questionId).maybeSingle();
    const { data: criteria } = rubric
      ? await admin.from("rubric_criteria").select("*").eq("rubric_id", rubric.id)
      : { data: [] };
    return { ...question, rubric, criteria: criteria ?? [] };
  },

  async getFirstQuestion() {
    if (fx()) {
      return localStore.findOne("questions", (q: any) => q.position === 1);
    }
    const { data } = await supabaseAdmin().from("questions").select("*").eq("position", 1).limit(1).maybeSingle();
    return data;
  },

  async findUserByRole(role: "educator" | "student") {
    if (fx()) return localStore.findOne("users", (u: any) => u.role === role);
    const { data } = await supabaseAdmin().from("users").select("*").eq("role", role).limit(1).maybeSingle();
    return data;
  },

  async findUserByEmail(email: string) {
    if (fx()) return localStore.findOne("users", (u: any) => u.email === email);
    const { data } = await supabaseAdmin().from("users").select("*").eq("email", email).maybeSingle();
    return data;
  },

  async listMisconceptions(moduleId: string) {
    if (fx()) return localStore.find("misconceptions", (m: any) => m.module_id === moduleId);
    const { data } = await supabaseAdmin().from("misconceptions").select("*").eq("module_id", moduleId);
    return data ?? [];
  },

  async insertMisconception(row: Record<string, any>) {
    if (fx()) return localStore.insert("misconceptions", row);
    const { data, error } = await supabaseAdmin().from("misconceptions").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  async getModuleForQuestion(questionId: string) {
    if (fx()) {
      const question = localStore.get("questions", questionId);
      const assessment = question ? localStore.get("assessments", question.assessment_id) : null;
      return assessment ? localStore.get("modules", assessment.module_id) : null;
    }
    const admin = supabaseAdmin();
    const { data: question } = await admin.from("questions").select("assessment_id").eq("id", questionId).single();
    if (!question) return null;
    const { data: assessment } = await admin
      .from("assessments")
      .select("module_id")
      .eq("id", question.assessment_id)
      .single();
    if (!assessment) return null;
    const { data: module_ } = await admin.from("modules").select("*").eq("id", assessment.module_id).single();
    return module_;
  },

  // --- submissions / pipeline state ---
  async createSubmission(row: { questionId: string; studentId: string | null; status: string }) {
    if (fx()) {
      return localStore.insert("submissions", {
        question_id: row.questionId,
        student_id: row.studentId,
        status: row.status,
        submitted_at: new Date().toISOString(),
      });
    }
    const { data, error } = await supabaseAdmin()
      .from("submissions")
      .insert({ question_id: row.questionId, student_id: row.studentId, status: row.status })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async updateSubmission(id: string, patch: Record<string, any>) {
    if (fx()) return localStore.update("submissions", id, patch);
    const { error } = await supabaseAdmin().from("submissions").update(patch).eq("id", id);
    if (error) throw error;
  },

  async getSubmission(id: string) {
    if (fx()) return localStore.get("submissions", id);
    const { data } = await supabaseAdmin().from("submissions").select("*").eq("id", id).single();
    return data;
  },

  async listAllSubmissions() {
    if (fx()) return localStore.all("submissions");
    const { data } = await supabaseAdmin().from("submissions").select("*");
    return data ?? [];
  },

  async listSubmissionsForQuestion(questionId: string) {
    if (fx()) return localStore.find("submissions", (s: any) => s.question_id === questionId);
    const { data } = await supabaseAdmin().from("submissions").select("*").eq("question_id", questionId);
    return data ?? [];
  },

  async createSubmissionPage(row: {
    submissionId: string;
    pageIndex: number;
    storagePath: string;
    processedPath: string;
    skewDeg: number;
    qualityScore: number;
  }) {
    if (fx()) {
      return localStore.insert("submission_pages", {
        submission_id: row.submissionId,
        page_index: row.pageIndex,
        storage_path: row.storagePath,
        processed_path: row.processedPath,
        skew_deg: row.skewDeg,
        quality_score: row.qualityScore,
      });
    }
    const { data, error } = await supabaseAdmin()
      .from("submission_pages")
      .insert({
        submission_id: row.submissionId,
        page_index: row.pageIndex,
        storage_path: row.storagePath,
        processed_path: row.processedPath,
        skew_deg: row.skewDeg,
        quality_score: row.qualityScore,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async listSubmissionPages(submissionId: string) {
    if (fx()) return localStore.find("submission_pages", (p: any) => p.submission_id === submissionId);
    const { data } = await supabaseAdmin().from("submission_pages").select("*").eq("submission_id", submissionId);
    return data ?? [];
  },

  async insertDetectedLines(pageId: string, boxes: any[], detector: string) {
    const rows = boxes.map((box, index) => ({
      submission_page_id: pageId,
      line_index: index + 1,
      box,
      detector,
    }));
    if (rows.length === 0) return [];
    if (fx()) return localStore.insertMany("detected_lines", rows);
    const { data, error } = await supabaseAdmin().from("detected_lines").insert(rows).select("*");
    if (error) throw error;
    return data ?? [];
  },

  async listDetectedLines(pageId: string) {
    if (fx()) return localStore.find("detected_lines", (l: any) => l.submission_page_id === pageId);
    const { data } = await supabaseAdmin().from("detected_lines").select("*").eq("submission_page_id", pageId);
    return data ?? [];
  },

  // --- transcription (S2/S3) ---
  async createTranscription(row: Record<string, any>) {
    if (fx()) return localStore.insert("transcriptions", row);
    const { data, error } = await supabaseAdmin().from("transcriptions").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  async getTranscription(submissionId: string) {
    if (fx()) return localStore.findOne("transcriptions", (t: any) => t.submission_id === submissionId);
    const { data } = await supabaseAdmin()
      .from("transcriptions")
      .select("*")
      .eq("submission_id", submissionId)
      .maybeSingle();
    return data;
  },

  async insertSolutionSteps(rows: Record<string, any>[]) {
    if (rows.length === 0) return [];
    if (fx()) return localStore.insertMany("solution_steps", rows);
    const { data, error } = await supabaseAdmin().from("solution_steps").insert(rows).select("*");
    if (error) throw error;
    return data ?? [];
  },

  async listSolutionSteps(transcriptionId: string) {
    if (fx()) {
      return localStore
        .find("solution_steps", (s: any) => s.transcription_id === transcriptionId)
        .sort((a: any, b: any) => a.step_index - b.step_index);
    }
    const { data } = await supabaseAdmin()
      .from("solution_steps")
      .select("*")
      .eq("transcription_id", transcriptionId)
      .order("step_index");
    return data ?? [];
  },

  // --- assessment (S4) ---
  async createGradeRecommendation(row: Record<string, any>) {
    if (fx()) return localStore.insert("grade_recommendations", row);
    const { data, error } = await supabaseAdmin().from("grade_recommendations").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  async getGradeRecommendation(submissionId: string) {
    if (fx()) return localStore.findOne("grade_recommendations", (g: any) => g.submission_id === submissionId);
    const { data } = await supabaseAdmin()
      .from("grade_recommendations")
      .select("*")
      .eq("submission_id", submissionId)
      .maybeSingle();
    return data;
  },

  async insertCriterionResults(rows: Record<string, any>[]) {
    if (rows.length === 0) return [];
    if (fx()) return localStore.insertMany("criterion_results", rows);
    const { data, error } = await supabaseAdmin().from("criterion_results").insert(rows).select("*");
    if (error) throw error;
    return data ?? [];
  },

  async listCriterionResults(gradeRecommendationId: string) {
    if (fx()) return localStore.find("criterion_results", (c: any) => c.grade_recommendation_id === gradeRecommendationId);
    const { data } = await supabaseAdmin()
      .from("criterion_results")
      .select("*")
      .eq("grade_recommendation_id", gradeRecommendationId);
    return data ?? [];
  },

  async createFinalGrade(row: Record<string, any>) {
    if (fx()) return localStore.insert("final_grades", row);
    const { data, error } = await supabaseAdmin().from("final_grades").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  async getFinalGrade(submissionId: string) {
    if (fx()) return localStore.findOne("final_grades", (g: any) => g.submission_id === submissionId);
    const { data } = await supabaseAdmin().from("final_grades").select("*").eq("submission_id", submissionId).maybeSingle();
    return data;
  },

  async insertAuditLog(row: Record<string, any>) {
    if (fx()) return localStore.insert("audit_log", row);
    const { error } = await supabaseAdmin().from("audit_log").insert(row);
    if (error) throw error;
  },

  // --- misconceptions (S5) ---
  async insertMisconceptionTags(rows: Record<string, any>[]) {
    if (rows.length === 0) return [];
    if (fx()) return localStore.insertMany("misconception_tags", rows);
    const { data, error } = await supabaseAdmin().from("misconception_tags").insert(rows).select("*");
    if (error) throw error;
    return data ?? [];
  },

  async listMisconceptionTags(submissionId: string) {
    if (fx()) return localStore.find("misconception_tags", (t: any) => t.submission_id === submissionId);
    const { data } = await supabaseAdmin().from("misconception_tags").select("*").eq("submission_id", submissionId);
    return data ?? [];
  },

  // --- feedback (S6) ---
  async createFeedback(row: Record<string, any>) {
    if (fx()) return localStore.insert("feedback", row);
    const { data, error } = await supabaseAdmin().from("feedback").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  async getFeedback(submissionId: string) {
    if (fx()) return localStore.findOne("feedback", (f: any) => f.submission_id === submissionId);
    const { data } = await supabaseAdmin().from("feedback").select("*").eq("submission_id", submissionId).maybeSingle();
    return data;
  },

  // --- RAG corpus + practice (S7) ---
  async insertResource(row: Record<string, any>) {
    if (fx()) return localStore.insert("resources", row);
    const { data, error } = await supabaseAdmin().from("resources").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  async listResources(moduleId: string) {
    if (fx()) return localStore.find("resources", (r: any) => r.module_id === moduleId);
    const { data } = await supabaseAdmin().from("resources").select("*").eq("module_id", moduleId);
    return data ?? [];
  },

  async insertResourceChunks(rows: Record<string, any>[]) {
    if (rows.length === 0) return [];
    if (fx()) return localStore.insertMany("resource_chunks", rows);
    const { data, error } = await supabaseAdmin().from("resource_chunks").insert(rows).select("*");
    if (error) throw error;
    return data ?? [];
  },

  async listResourceChunks(resourceIds: string[]) {
    if (fx()) return localStore.find("resource_chunks", (c: any) => resourceIds.includes(c.resource_id));
    const { data } = await supabaseAdmin().from("resource_chunks").select("*").in("resource_id", resourceIds);
    return data ?? [];
  },

  async createPracticeSet(row: Record<string, any>) {
    if (fx()) return localStore.insert("practice_sets", row);
    const { data, error } = await supabaseAdmin().from("practice_sets").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  async insertPracticeItems(rows: Record<string, any>[]) {
    if (rows.length === 0) return [];
    if (fx()) return localStore.insertMany("practice_items", rows);
    const { data, error } = await supabaseAdmin().from("practice_items").insert(rows).select("*");
    if (error) throw error;
    return data ?? [];
  },

  async getPracticeSetForSubmission(submissionId: string) {
    if (fx()) return localStore.findOne("practice_sets", (p: any) => p.submission_id === submissionId);
    const { data } = await supabaseAdmin()
      .from("practice_sets")
      .select("*")
      .eq("submission_id", submissionId)
      .maybeSingle();
    return data;
  },

  async listPracticeItems(practiceSetId: string) {
    if (fx()) {
      return localStore
        .find("practice_items", (i: any) => i.practice_set_id === practiceSetId)
        .sort((a: any, b: any) => a.position - b.position);
    }
    const { data } = await supabaseAdmin()
      .from("practice_items")
      .select("*")
      .eq("practice_set_id", practiceSetId)
      .order("position");
    return data ?? [];
  },

  // --- files ---
  async uploadImage(relativePath: string, bytes: Buffer, _contentType: string) {
    if (fx()) {
      localFiles.write(relativePath, bytes);
      return relativePath;
    }
    const { error } = await supabaseAdmin().storage.from("submissions").upload(relativePath, bytes, {
      contentType: _contentType,
      upsert: true,
    });
    if (error) throw error;
    return relativePath;
  },

  async downloadImage(relativePath: string): Promise<Buffer> {
    if (fx()) return localFiles.read(relativePath);
    const { data, error } = await supabaseAdmin().storage.from("submissions").download(relativePath);
    if (error || !data) throw error ?? new Error(`could not download ${relativePath}`);
    return Buffer.from(await data.arrayBuffer());
  },

  async getImageUrl(relativePath: string) {
    if (fx()) return localFiles.publicUrl(relativePath);
    const { data } = await supabaseAdmin().storage.from("submissions").createSignedUrl(relativePath, 3600);
    return data?.signedUrl ?? null;
  },

  // --- observability ---
  async logStageRun(row: {
    submissionId?: string | null;
    stage: string;
    status: "queued" | "running" | "succeeded" | "failed" | "skipped";
    model?: string | null;
    promptVersion?: string | null;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    latencyMs?: number;
    error?: string | null;
  }) {
    const payload = {
      submission_id: row.submissionId ?? null,
      stage: row.stage,
      status: row.status,
      model: row.model ?? null,
      prompt_version: row.promptVersion ?? null,
      input_tokens: row.inputTokens ?? 0,
      output_tokens: row.outputTokens ?? 0,
      cost_usd: row.costUsd ?? 0,
      latency_ms: row.latencyMs ?? 0,
      error: row.error ?? null,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    };
    if (fx()) return localStore.insert("stage_runs", payload);
    const { error } = await supabaseAdmin().from("stage_runs").insert(payload);
    if (error) throw error;
  },

  async listStageRuns(submissionId?: string) {
    if (fx()) {
      const all = localStore.all("stage_runs");
      return submissionId ? all.filter((r: any) => r.submission_id === submissionId) : all;
    }
    const query = supabaseAdmin().from("stage_runs").select("*");
    const { data } = submissionId ? await query.eq("submission_id", submissionId) : await query;
    return data ?? [];
  },
};
