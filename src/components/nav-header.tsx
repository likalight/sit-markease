import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { signOutAction } from "@/app/login/actions";
import { Logo } from "./logo";

// Every authenticated page used to be an island — no way back except the
// browser's back button, which is a large part of why the app read as "hard
// to understand." This bar is included via the (educator)/(student) layouts
// so every page under them keeps the same way home.
export async function NavHeader() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <header className="flex items-center justify-between border-b border-hairline px-6 py-xs">
      <div className="flex items-center gap-lg">
        <Link href="/dashboard" className="flex items-center gap-xs">
          <Logo className="h-7 w-7" />
          <span className="font-serif text-title-md text-ink">Practica</span>
        </Link>
        <nav className="flex items-center gap-md text-body-sm text-muted">
          {user.role === "educator" && (
            <>
              <Link href="/review" className="hover:text-body">
                Review queue
              </Link>
              <Link href="/assignments" className="hover:text-body">
                Assignments
              </Link>
              <Link href="/insights" className="hover:text-body">
                Class insights
              </Link>
            </>
          )}
          {user.role === "student" && (
            <>
              <Link href="/submit" className="hover:text-body">
                Submit work
              </Link>
              <Link href="/feedback" className="hover:text-body">
                My feedback
              </Link>
              <Link href="/exam-prep" className="hover:text-body">
                Exam prep
              </Link>
            </>
          )}
        </nav>
      </div>
      <div className="flex items-center gap-sm text-body-sm text-muted-soft">
        <span>{user.name}</span>
        <form action={signOutAction}>
          <button type="submit" className="text-caption underline">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
