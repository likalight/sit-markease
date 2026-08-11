import { switchRoleAction } from "@/lib/demo-tour/actions";
import { SubmitButton } from "@/components/submit-button";

// Single-screen live demo needs a fast way to toggle between the
// instructor and student view without retyping credentials — no split
// screen, one presenter, one projector. Fixed corner pill, unobtrusive by
// default; only visible on the educator/student shells, not the landing
// deck. Reuses switchRoleAction (src/lib/demo-tour/actions.ts), the one
// piece of the old guided-tour machinery worth keeping.
export function DemoRoleSwitcher({ to }: { to: "student" | "educator" }) {
  const redirectTo = to === "student" ? "/submit" : "/review";
  return (
    <form action={switchRoleAction.bind(null, to, redirectTo)} className="fixed bottom-4 right-4 z-50">
      <SubmitButton
        pendingLabel="Switching…"
        className="rounded-pill border border-hairline bg-canvas px-md py-xs text-caption text-muted shadow-overlay hover:text-body"
      >
        {to === "student" ? "Switch to student view →" : "Switch to instructor view →"}
      </SubmitButton>
    </form>
  );
}
