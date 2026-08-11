import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

// Feedback style used to be a student-chosen preference here
// (users.feedback_tone, migration 0004). Superseded by an instructor-
// controlled, per-assessment "feedback_mode" (migration 0009,
// src/app/(educator)/assignments/[assessmentId]/setup) — the teaching
// decision of how much of the answer to reveal belongs to whoever set the
// assessment, not the student receiving it. Left as a static note rather
// than a dead interactive control, which would have kept letting a student
// "save" a preference that no longer does anything.
export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") redirect("/login");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-6 py-xl">
      <div>
        <h1 className="text-title-lg text-body-strong">Settings</h1>
        <p className="text-body-sm text-muted">
          How much your feedback reveals — guiding questions only, an explanation of the mistake, or the
          full correct working — is set by your instructor for each assessment, not chosen here.
        </p>
      </div>
    </main>
  );
}
