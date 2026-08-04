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

  // The question students currently submit against — the most recently
  // created question belonging to an assessment an educator has actually
  // opened for submissions (assessments.status = 'open'). A "draft"
  // assignment's question is not submittable, even if it's the most
  // recently created one overall — this is what makes "open for
  // submissions" a real gate instead of dead schema (docs/DECISIONS.md).
  async getCurrentQuestion() {
    if (fx()) {
      const openAssessmentIds = new Set(
        (localStore.all("assessments") as any[]).filter((a) => a.status === "open").map((a) => a.id)
      );
      const open = (localStore.all("questions") as any[]).filter((q) => openAssessmentIds.has(q.assessment_id));
      return open[open.length - 1] ?? null;
    }
    const admin = supabaseAdmin();
    const { data: openAssessments } = await admin.from("assessments").select("id").eq("status", "open");
    const openIds = (openAssessments ?? []).map((a: any) => a.id);
    if (openIds.length === 0) return null;
    // `position` is scoped per-assessment (each restarts at 1), so it can't
    // tell two different assessments' questions apart by recency — order by
    // created_at instead (supabase/migrations/0003_add_question_created_at.sql).
    const { data } = await admin
      .from("questions")
      .select("*")
      .in("assessment_id", openIds)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },

  // Every new question needs a module + assessment container. Rather than
  // building full module/assessment management UI, every educator-created
  // question attaches to one shared default module/assessment pair,
  // created lazily on first use.
  async findOrCreateDefaultModule(ownerId: string) {
    const code = "GENERAL";
    if (fx()) {
      const existing = localStore.findOne("modules", (m: any) => m.code === code);
      if (existing) return existing;
      return localStore.insert("modules", { code, title: "General", owner_id: ownerId, notation_glossary: null });
    }
    const admin = supabaseAdmin();
    const { data: existing } = await admin.from("modules").select("*").eq("code", code).maybeSingle();
    if (existing) return existing;
    const { data, error } = await admin
      .from("modules")
      .insert({ code, title: "General", owner_id: ownerId })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async findOrCreateDefaultAssessment(moduleId: string) {
    if (fx()) {
      const existing = localStore.findOne("assessments", (a: any) => a.module_id === moduleId);
      if (existing) return existing;
      return localStore.insert("assessments", { module_id: moduleId, title: "General assessment" });
    }
    const admin = supabaseAdmin();
    const { data: existing } = await admin.from("assessments").select("*").eq("module_id", moduleId).limit(1).maybeSingle();
    if (existing) return existing;
    const { data, error } = await admin
      .from("assessments")
      .insert({ module_id: moduleId, title: "General assessment" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  // Real, educator-named assignment — replaces findOrCreateDefaultAssessment
  // for the "create assignment" flow (that one stays for anything that still
  // needs a bare default container). New assessments start "draft" (schema
  // default) — not submittable until updateAssessmentStatus opens them.
  async createAssessment(moduleId: string, title: string, mode: "formative" | "summative" = "summative") {
    if (fx()) {
      return localStore.insert("assessments", { module_id: moduleId, title, status: "draft", assessment_mode: mode });
    }
    const { data, error } = await supabaseAdmin()
      .from("assessments")
      .insert({ module_id: moduleId, title, status: "draft", assessment_mode: mode })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async listAssessmentsForOwner(ownerId: string) {
    if (fx()) {
      const moduleIds = new Set(
        (localStore.all("modules") as any[]).filter((m: any) => m.owner_id === ownerId).map((m: any) => m.id)
      );
      return (localStore.all("assessments") as any[])
        .filter((a: any) => moduleIds.has(a.module_id))
        .slice()
        .reverse();
    }
    const admin = supabaseAdmin();
    const { data: modules } = await admin.from("modules").select("id").eq("owner_id", ownerId);
    const moduleIds = (modules ?? []).map((m: any) => m.id);
    if (moduleIds.length === 0) return [];
    const { data } = await admin
      .from("assessments")
      .select("*")
      .in("module_id", moduleIds)
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  async updateAssessmentStatus(id: string, status: "draft" | "open" | "marking" | "released") {
    if (fx()) {
      return localStore.update("assessments", id, { status });
    }
    const { data, error } = await supabaseAdmin().from("assessments").update({ status }).eq("id", id).select("*").single();
    if (error) throw error;
    return data;
  },

  async getAssessment(id: string) {
    if (fx()) return localStore.get("assessments", id);
    const { data } = await supabaseAdmin().from("assessments").select("*").eq("id", id).maybeSingle();
    return data;
  },

  async countQuestionsForAssessment(assessmentId: string) {
    if (fx()) return localStore.find("questions", (q: any) => q.assessment_id === assessmentId).length;
    const { count } = await supabaseAdmin()
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("assessment_id", assessmentId);
    return count ?? 0;
  },

  async createQuestion(row: {
    assessment_id: string;
    position: number;
    prompt_text: string;
    prompt_latex: string | null;
    model_solution: string;
    expected_answer_latex: string | null;
    topic_tags: string[];
    max_score: number;
  }) {
    if (fx()) return localStore.insert("questions", row);
    const { data, error } = await supabaseAdmin().from("questions").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  async createRubric(questionId: string) {
    if (fx()) return localStore.insert("rubrics", { question_id: questionId, version: 1 });
    const { data, error } = await supabaseAdmin()
      .from("rubrics")
      .insert({ question_id: questionId, version: 1 })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async insertRubricCriteria(
    rows: { rubric_id: string; key: string; name: string; weight: number; max_score: number; levels: unknown }[]
  ) {
    if (rows.length === 0) return [];
    if (fx()) return localStore.insertMany("rubric_criteria", rows);
    const { data, error } = await supabaseAdmin().from("rubric_criteria").insert(rows).select("*");
    if (error) throw error;
    return data ?? [];
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

  async createUser(row: { name: string; email: string; role: "educator" | "student" | "admin" }) {
    if (fx()) return localStore.insert("users", row);
    const { data, error } = await supabaseAdmin().from("users").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  // Used right after a real Supabase Auth signup, where our own `users` row
  // must share the same id as the auth.users row Supabase already created.
  async createUserWithId(id: string, row: { name: string; email: string; role: "educator" | "student" | "admin" }) {
    if (fx()) return localStore.insert("users", { id, ...row });
    const { data, error } = await supabaseAdmin().from("users").insert({ id, ...row }).select("*").single();
    if (error) throw error;
    return data;
  },

  async getUser(id: string) {
    if (fx()) return localStore.get("users", id);
    const { data } = await supabaseAdmin().from("users").select("*").eq("id", id).maybeSingle();
    return data;
  },

  async updateUserFeedbackTone(userId: string, tone: "supportive" | "concise" | "socratic") {
    if (fx()) return localStore.update("users", userId, { feedback_tone: tone });
    const { error } = await supabaseAdmin().from("users").update({ feedback_tone: tone }).eq("id", userId);
    if (error) throw error;
  },

  async listAllQuestions() {
    if (fx()) return localStore.all("questions");
    const { data } = await supabaseAdmin().from("questions").select("*");
    return data ?? [];
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

  async findModuleByCode(code: string) {
    if (fx()) return localStore.findOne("modules", (m: any) => m.code === code);
    const { data } = await supabaseAdmin().from("modules").select("*").eq("code", code).maybeSingle();
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
  async createSubmission(row: { questionId: string; studentId: string | null; status: string; inputMethod?: "photo" | "typed" }) {
    if (fx()) {
      return localStore.insert("submissions", {
        question_id: row.questionId,
        student_id: row.studentId,
        status: row.status,
        input_method: row.inputMethod ?? "photo",
        submitted_at: new Date().toISOString(),
      });
    }
    const { data, error } = await supabaseAdmin()
      .from("submissions")
      .insert({
        question_id: row.questionId,
        student_id: row.studentId,
        status: row.status,
        input_method: row.inputMethod ?? "photo",
      })
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

  // Rate limiting: every accepted submission triggers real, billed AI calls
  // with no free-tier fallback (docs/STUBS.md) — the public 3-ID student
  // gate had no throttle at all. Counts a student's submissions in a
  // rolling window so the upload route can reject past a threshold.
  async countSubmissionsSince(studentId: string, sinceIso: string) {
    if (fx()) {
      return localStore
        .find("submissions", (s: any) => s.student_id === studentId && s.submitted_at >= sinceIso)
        .length;
    }
    const { count } = await supabaseAdmin()
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .gte("submitted_at", sinceIso);
    return count ?? 0;
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

  async updateSolutionStep(id: string, patch: Record<string, any>) {
    if (fx()) return localStore.update("solution_steps", id, patch);
    const { error } = await supabaseAdmin().from("solution_steps").update(patch).eq("id", id);
    if (error) throw error;
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

  async updateCriterionResult(id: string, patch: Record<string, any>) {
    if (fx()) return localStore.update("criterion_results", id, patch);
    const { error } = await supabaseAdmin().from("criterion_results").update(patch).eq("id", id);
    if (error) throw error;
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

  async updateFeedback(id: string, patch: Record<string, any>) {
    if (fx()) return localStore.update("feedback", id, patch);
    const { error } = await supabaseAdmin().from("feedback").update(patch).eq("id", id);
    if (error) throw error;
  },

  async insertFeedbackFlag(row: Record<string, any>) {
    if (fx()) return localStore.insert("feedback_flags", row);
    const { data, error } = await supabaseAdmin().from("feedback_flags").insert(row).select("*").single();
    if (error) throw error;
    return data;
  },

  async listFeedbackFlags(feedbackId: string) {
    if (fx()) return localStore.find("feedback_flags", (f: any) => f.feedback_id === feedbackId);
    const { data } = await supabaseAdmin().from("feedback_flags").select("*").eq("feedback_id", feedbackId);
    return data ?? [];
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
    // .maybeSingle() throws if 2+ rows match, and since only `data` was ever
    // destructured here, that error silently became "no practice set found"
    // — which made generatePracticeSet's own idempotency guard think it was
    // safe to create a duplicate on retry, compounding the problem. Ordering
    // + limit(1) tolerates duplicates that already exist instead of hiding
    // them as false negatives.
    const { data } = await supabaseAdmin()
      .from("practice_sets")
      .select("*")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: false })
      .limit(1);
    return data?.[0] ?? null;
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

  // One attempt per (practice_item, student) — a student revisiting a
  // problem updates their existing attempt rather than creating a new row,
  // so hints/response/outcome persist across visits instead of resetting.
  async upsertPracticeAttempt(row: { practiceItemId: string; studentId: string; response?: string; hintsUsed?: number; outcome?: "correct" | "partial" | "incorrect" | null }) {
    const existing = await this.getPracticeAttempt(row.practiceItemId, row.studentId);
    const patch = {
      response: row.response,
      hints_used: row.hintsUsed,
      outcome: row.outcome,
    };
    if (existing) {
      if (fx()) return localStore.update("practice_attempts", (existing as any).id, patch);
      const { data, error } = await supabaseAdmin()
        .from("practice_attempts")
        .update(patch)
        .eq("id", (existing as any).id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }
    const insertRow = { practice_item_id: row.practiceItemId, student_id: row.studentId, ...patch };
    if (fx()) return localStore.insert("practice_attempts", insertRow);
    const { data, error } = await supabaseAdmin().from("practice_attempts").insert(insertRow).select("*").single();
    if (error) throw error;
    return data;
  },

  async getPracticeAttempt(practiceItemId: string, studentId: string) {
    if (fx()) {
      return localStore.findOne(
        "practice_attempts",
        (a: any) => a.practice_item_id === practiceItemId && a.student_id === studentId
      );
    }
    const { data } = await supabaseAdmin()
      .from("practice_attempts")
      .select("*")
      .eq("practice_item_id", practiceItemId)
      .eq("student_id", studentId)
      .maybeSingle();
    return data;
  },

  async listPracticeAttemptsForItems(practiceItemIds: string[], studentId: string) {
    if (practiceItemIds.length === 0) return [];
    if (fx()) {
      return localStore.find(
        "practice_attempts",
        (a: any) => practiceItemIds.includes(a.practice_item_id) && a.student_id === studentId
      );
    }
    const { data } = await supabaseAdmin()
      .from("practice_attempts")
      .select("*")
      .in("practice_item_id", practiceItemIds)
      .eq("student_id", studentId);
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
