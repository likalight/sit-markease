import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { signOutAction } from "@/app/login/actions";
import { Logo } from "./logo";

// Every authenticated page used to be an island — no way back except the
// browser's back button, which is a large part of why the app read as "hard
// to understand." This bar is included via the (educator)/(student) layouts
// so every page under them keeps the same way home.
//
// Mobile fix: at narrow widths, cramming the logo + 3 nav links + name +
// sign-out into one nowrap flex row forced every item's own text to wrap
// mid-word, reading as garbled interleaved text. Now the two groups
// (branding+nav vs. account) wrap onto their own line as a unit, nav links
// wrap as a whole rather than per-word, and the name hides below `sm` since
// "Sign out" alone is enough there.
export async function NavHeader() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-lg gap-y-xs border-b border-hairline px-6 py-xs">
      <div className="flex flex-wrap items-center gap-x-lg gap-y-xs">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-xs">
          <Logo className="h-7 w-7" />
          <span className="font-serif text-title-md text-ink">SIT MarkEase</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-md gap-y-xs text-body-sm text-muted">
          {user.role === "educator" && (
            <>
              <Link href="/review" className="whitespace-nowrap hover:text-body">
                Review queue
              </Link>
              <Link href="/assignments" className="whitespace-nowrap hover:text-body">
                Assignments
              </Link>
              <Link href="/insights" className="whitespace-nowrap hover:text-body">
                Class insights
              </Link>
            </>
          )}
          {user.role === "student" && (
            <>
              <Link href="/submit" className="whitespace-nowrap hover:text-body">
                Submit work
              </Link>
              <Link href="/feedback" className="whitespace-nowrap hover:text-body">
                My feedback
              </Link>
              <Link href="/exam-prep" className="whitespace-nowrap hover:text-body">
                Exam prep
              </Link>
              <Link href="/settings" className="whitespace-nowrap hover:text-body">
                Settings
              </Link>
            </>
          )}
        </nav>
      </div>
      <div className="flex shrink-0 items-center gap-sm text-body-sm text-muted-soft">
        <span className="hidden sm:inline">{user.name}</span>
        <form action={signOutAction}>
          <button type="submit" className="whitespace-nowrap text-caption underline">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
