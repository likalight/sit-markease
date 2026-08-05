import Link from "next/link";
import { redirect } from "next/navigation";
import { enterDemoAction } from "@/app/enter/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";
import { DemoRoleSwitcher } from "@/components/demo-role-switcher";
import { Logo } from "@/components/logo";

type DemoAction = {
  role: "educator" | "student";
  href: string;
  label: string;
  body: string;
};

function DemoJump({ action }: { action: DemoAction }) {
  return (
    <form action={enterDemoAction}>
      <input type="hidden" name="role" value={action.role} />
      <input type="hidden" name="studentId" value="111" />
      <input type="hidden" name="next" value={action.href} />
      <button type="submit" className="w-full rounded-sm border border-hairline bg-canvas px-md py-sm text-left hover:border-primary-hairline hover:bg-primary-soft">
        <span className="block text-body-sm font-semibold text-body-strong">{action.label}</span>
        <span className="mt-xxs block text-caption text-muted">{action.body}</span>
      </button>
    </form>
  );
}

function ModeCard({
  title,
  badge,
  description,
  instructor,
  student,
}: {
  title: string;
  badge: string;
  description: string;
  instructor: DemoAction[];
  student: DemoAction[];
}) {
  return (
    <section className="rounded-sm border border-primary-hairline bg-surface-card p-lg shadow-sm">
      <div className="mb-md flex flex-wrap items-baseline justify-between gap-sm">
        <div>
          <p className="text-caption-caps text-primary-active">{badge}</p>
          <h2 className="mt-xxs font-serif text-display-sm text-ink">{title}</h2>
        </div>
      </div>
      <p className="mb-lg max-w-3xl text-body-sm text-muted">{description}</p>
      <div className="grid gap-md md:grid-cols-2">
        <div className="flex flex-col gap-sm">
          <div>
            <p className="text-title-sm font-semibold text-body-strong">Instructor view</p>
            <p className="text-caption text-muted-soft">What the teacher controls.</p>
          </div>
          {instructor.map((action) => (
            <DemoJump key={action.href + action.label} action={action} />
          ))}
        </div>
        <div className="flex flex-col gap-sm">
          <div>
            <p className="text-title-sm font-semibold text-body-strong">Student 111 view</p>
            <p className="text-caption text-muted-soft">What the learner experiences.</p>
          </div>
          {student.map((action) => (
            <DemoJump key={action.href + action.label} action={action} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function DemoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const questions = (await db.listAllQuestions()) as any[];
  const assessmentIds = [...new Set(questions.map((question) => question.assessment_id))];
  const assessments = await Promise.all(assessmentIds.map((id) => db.getAssessment(String(id))));
  const visible = assessments.filter((assessment: any) => assessment && !assessment.archived_at) as any[];
  const formative = visible.find((assessment) => assessment.assessment_mode === "formative");
  const summative = visible.find((assessment) => assessment.assessment_mode === "summative");

  const formativeId = formative?.id ?? "";
  const summativeId = summative?.id ?? "";

  return (
    <main className="min-h-screen bg-canvas px-6 py-xl">
      <DemoRoleSwitcher user={user} />
      <div className="mx-auto flex max-w-5xl flex-col gap-lg">
        <header className="flex flex-wrap items-start justify-between gap-md">
          <div>
            <Link href="/" className="inline-flex items-center gap-xs">
              <Logo className="h-9 w-9" />
              <span className="font-serif text-title-lg text-ink">SIT MarkEase</span>
            </Link>
            <p className="mt-md text-caption-caps text-muted-soft">Prototype guide</p>
            <h1 className="mt-xxs max-w-3xl font-serif text-display-lg text-ink">
              Understand the app through two assessment modes.
            </h1>
            <p className="mt-sm max-w-2xl text-body-md text-muted">
              Do not start with the sidebar. Start here. Each mode shows what the instructor does and what Student 111
              sees, with buttons that switch roles and open the right screen.
            </p>
          </div>
          <div className="rounded-sm border border-hairline bg-surface-soft px-md py-sm">
            <p className="text-caption-caps text-muted-soft">Current role</p>
            <p className="text-body-sm font-semibold text-body-strong">{user.name}</p>
          </div>
        </header>

        <div className="grid gap-md md:grid-cols-3">
          <div className="rounded-sm border border-hairline bg-surface-soft px-md py-sm">
            <p className="text-title-sm font-semibold text-body-strong">1. Pick a mode</p>
            <p className="mt-xxs text-caption text-muted">Formative is practice. Summative is controlled assessment.</p>
          </div>
          <div className="rounded-sm border border-hairline bg-surface-soft px-md py-sm">
            <p className="text-title-sm font-semibold text-body-strong">2. Compare roles</p>
            <p className="mt-xxs text-caption text-muted">Instructor setup/review sits beside Student 111's experience.</p>
          </div>
          <div className="rounded-sm border border-hairline bg-surface-soft px-md py-sm">
            <p className="text-title-sm font-semibold text-body-strong">3. Follow the buttons</p>
            <p className="mt-xxs text-caption text-muted">The demo switches accounts for the reviewer automatically.</p>
          </div>
        </div>

        <ModeCard
          badge="Mode 1"
          title="Formative: Physics practice"
          description="Low-stakes practice. The instructor issues work and uploads/edits the rubric; Student 111 attempts it, submits work, then uses feedback and exam prep to close the gap."
          instructor={[
            {
              role: "educator",
              href: formativeId ? `/assignments/${formativeId}/rubric` : "/assignments",
              label: "Check the Physics rubric",
              body: "See the editable criteria the AI grades against.",
            },
            {
              role: "educator",
              href: formativeId ? `/assignments/${formativeId}/attempts` : "/assignments",
              label: "View formative attempts",
              body: "See auto-released student work and attempts.",
            },
          ]}
          student={[
            {
              role: "student",
              href: "/submit",
              label: "Open Student 111 assessments",
              body: "Start or continue the Physics attempt.",
            },
            {
              role: "student",
              href: "/exam-prep",
              label: "Open Exam prep",
              body: "Generate targeted practice from reviewed work.",
            },
          ]}
        />

        <ModeCard
          badge="Mode 2"
          title="Summative: Math paper"
          description="Higher-stakes assessment. The instructor uploads Student 111's script, confirms question mapping, reviews the source image beside the transcription, then approves and releases results."
          instructor={[
            {
              role: "educator",
              href: summativeId ? `/assignments/${summativeId}/rubric` : "/assignments",
              label: "Check the Math rubric",
              body: "The full-paper mark scheme becomes editable criteria.",
            },
            {
              role: "educator",
              href: summativeId ? `/assignments/${summativeId}/upload` : "/assignments",
              label: "Upload Student 111 script",
              body: "Use the built-in demo script; no local file needed.",
            },
            {
              role: "educator",
              href: "/review",
              label: "Review and approve",
              body: "Nothing reaches the student without human approval.",
            },
          ]}
          student={[
            {
              role: "student",
              href: "/submit",
              label: "See summative status",
              body: "Student 111 sees the Math paper, but cannot self-upload it.",
            },
            {
              role: "student",
              href: "/feedback",
              label: "Review released work",
              body: "Results appear only after the instructor releases them.",
            },
          ]}
        />
      </div>
    </main>
  );
}
