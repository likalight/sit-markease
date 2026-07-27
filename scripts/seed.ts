/**
 * M0 seed script. Creates:
 *  - two demo auth users (educator, student) with matching public.users rows
 *  - one module / assessment / question / rubric (§15 seed data, demo question)
 *  - the 'submissions' storage bucket used from M1 onward
 *
 * Run with `npm run seed`. Idempotent — safe to re-run.
 */
import "dotenv/config";
import { supabaseAdmin } from "../src/lib/db/supabase-admin";

async function ensureDemoUser(
  admin: ReturnType<typeof supabaseAdmin>,
  email: string,
  password: string,
  name: string,
  role: "educator" | "student"
) {
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    console.log(`  user ${email} already seeded (${existing.id})`);
    return existing.id as string;
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    // Auth user may already exist from a prior partial run even if public.users doesn't.
    const { data: list } = await admin.auth.admin.listUsers();
    const found = list?.users.find((u) => u.email === email);
    if (!found) throw createError;

    await admin.from("users").insert({ id: found.id, email, name, role });
    console.log(`  linked existing auth user ${email} (${found.id})`);
    return found.id;
  }

  const authId = created.user.id;
  const { error: insertError } = await admin
    .from("users")
    .insert({ id: authId, email, name, role });
  if (insertError) throw insertError;

  console.log(`  created ${role} ${email} (${authId})`);
  return authId;
}

async function main() {
  const admin = supabaseAdmin();

  console.log("Ensuring 'submissions' storage bucket...");
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === "submissions")) {
    const { error } = await admin.storage.createBucket("submissions", { public: false });
    if (error) throw error;
    console.log("  created bucket 'submissions'");
  } else {
    console.log("  bucket 'submissions' already exists");
  }

  console.log("Seeding demo accounts...");
  const educatorEmail = process.env.AIMS_DEMO_EDUCATOR_EMAIL ?? "educator@aims.demo";
  const educatorPassword = process.env.AIMS_DEMO_EDUCATOR_PASSWORD ?? "aims-demo-educator-1";
  const studentEmail = process.env.AIMS_DEMO_STUDENT_EMAIL ?? "student@aims.demo";
  const studentPassword = process.env.AIMS_DEMO_STUDENT_PASSWORD ?? "aims-demo-student-1";

  const educatorId = await ensureDemoUser(
    admin,
    educatorEmail,
    educatorPassword,
    "Dr. Tan",
    "educator"
  );
  await ensureDemoUser(admin, studentEmail, studentPassword, "Wei Ming", "student");

  console.log("Seeding module / assessment / question / rubric...");
  const { data: existingModule } = await admin
    .from("modules")
    .select("id")
    .eq("code", "ENG1001")
    .maybeSingle();

  let moduleId = existingModule?.id as string | undefined;
  if (!moduleId) {
    const { data: module, error } = await admin
      .from("modules")
      .insert({
        code: "ENG1001",
        title: "Engineering Mathematics",
        owner_id: educatorId,
        notation_glossary: "Standard calculus/ODE notation; d/dx for derivatives, ∫ for integrals.",
      })
      .select("id")
      .single();
    if (error) throw error;
    moduleId = module.id;
    console.log(`  created module ENG1001 (${moduleId})`);
  } else {
    console.log(`  module ENG1001 already exists (${moduleId})`);
  }

  const { data: existingAssessment } = await admin
    .from("assessments")
    .select("id")
    .eq("module_id", moduleId)
    .eq("title", "Assignment 1")
    .maybeSingle();

  let assessmentId = existingAssessment?.id as string | undefined;
  if (!assessmentId) {
    const { data: assessment, error } = await admin
      .from("assessments")
      .insert({ module_id: moduleId, title: "Assignment 1", status: "open" })
      .select("id")
      .single();
    if (error) throw error;
    assessmentId = assessment.id;
    console.log(`  created assessment "Assignment 1" (${assessmentId})`);
  } else {
    console.log(`  assessment "Assignment 1" already exists (${assessmentId})`);
  }

  const { data: existingQuestion } = await admin
    .from("questions")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq("position", 1)
    .maybeSingle();

  let questionId = existingQuestion?.id as string | undefined;
  if (!questionId) {
    const { data: question, error } = await admin
      .from("questions")
      .insert({
        assessment_id: assessmentId,
        position: 1,
        prompt_text: "Solve the separable ODE dy/dx = xy, given y(0) = 2.",
        prompt_latex: "\\frac{dy}{dx} = xy, \\quad y(0) = 2",
        model_solution:
          "Separate variables: dy/y = x dx. Integrate: ln|y| = x^2/2 + C. " +
          "Apply y(0)=2: C = ln 2. So y = 2 e^{x^2/2}.",
        expected_answer_latex: "y = 2 e^{x^2/2}",
        topic_tags: ["ODEs", "separation-of-variables"],
        max_score: 20,
      })
      .select("id")
      .single();
    if (error) throw error;
    questionId = question.id;
    console.log(`  created question 1 (${questionId})`);
  } else {
    console.log(`  question 1 already exists (${questionId})`);
  }

  const { data: existingRubric } = await admin
    .from("rubrics")
    .select("id")
    .eq("question_id", questionId)
    .maybeSingle();

  if (!existingRubric) {
    const { data: rubric, error } = await admin
      .from("rubrics")
      .insert({ question_id: questionId, version: 1 })
      .select("id")
      .single();
    if (error) throw error;

    const criteria = [
      {
        rubric_id: rubric.id,
        key: "c_setup",
        name: "Problem setup",
        weight: 20,
        max_score: 4,
        levels: [
          { level: "novice", score: 1, descriptor: "Fails to separate variables" },
          { level: "proficient", score: 3, descriptor: "Correctly separates variables" },
          { level: "expert", score: 4, descriptor: "Separates variables and states domain" },
        ],
      },
      {
        rubric_id: rubric.id,
        key: "c_method",
        name: "Method / integration",
        weight: 30,
        max_score: 6,
        levels: [
          { level: "novice", score: 2, descriptor: "Integration attempted with errors" },
          { level: "proficient", score: 4, descriptor: "Both sides integrated correctly" },
          { level: "expert", score: 6, descriptor: "Integrated correctly, constant handled cleanly" },
        ],
      },
      {
        rubric_id: rubric.id,
        key: "c_ic",
        name: "Initial condition application",
        weight: 25,
        max_score: 5,
        levels: [
          { level: "novice", score: 1, descriptor: "IC not applied or applied incorrectly" },
          { level: "proficient", score: 3, descriptor: "IC applied to general solution correctly" },
          { level: "expert", score: 5, descriptor: "IC applied correctly with clear justification" },
        ],
      },
      {
        rubric_id: rubric.id,
        key: "c_answer",
        name: "Final answer",
        weight: 25,
        max_score: 5,
        levels: [
          { level: "novice", score: 1, descriptor: "Final answer incorrect" },
          { level: "proficient", score: 4, descriptor: "Final answer correct" },
          { level: "expert", score: 5, descriptor: "Final answer correct and simplified" },
        ],
      },
    ];

    const { error: criteriaError } = await admin.from("rubric_criteria").insert(criteria);
    if (criteriaError) throw criteriaError;
    console.log(`  created rubric with ${criteria.length} criteria (${rubric.id})`);
  } else {
    console.log(`  rubric already exists (${existingRubric.id})`);
  }

  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
