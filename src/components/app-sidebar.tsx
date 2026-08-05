import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { enterDemoAction } from "@/app/enter/actions";
import { signOutAction } from "@/app/login/actions";
import { Logo } from "./logo";
import { SidebarNavLinks } from "./sidebar-nav-links";
import { DemoRoleSwitcher } from "./demo-role-switcher";

// Gradescope-style persistent left sidebar, replacing the old top NavHeader.
// Split into this server piece (auth lookup, same as NavHeader did) and a
// client child for active-route highlighting via usePathname().
export async function AppSidebar() {
  const user = await getCurrentUser();
  if (!user) return null;

  const homeHref = user.role === "educator" ? "/review" : "/submit";

  return (
    <>
      <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-hairline bg-surface-soft">
        <Link href={homeHref} className="flex items-center gap-xs px-md py-md">
          <Logo className="h-7 w-7" />
          <span className="font-serif text-title-md text-ink">SIT MarkEase</span>
        </Link>

        <SidebarNavLinks role={user.role} />

        <div className="mt-auto flex flex-col gap-sm border-t border-hairline px-md py-md">
          <div>
            <p className="text-caption-caps text-muted-soft">Viewing as</p>
            <span className="truncate text-body-sm text-body-strong">{user.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-xxs md:hidden">
            <form action={enterDemoAction}>
              <input type="hidden" name="role" value="educator" />
              <button
                type="submit"
                disabled={user.role === "educator"}
                className="w-full rounded-sm border border-hairline px-xs py-xxs text-caption disabled:bg-primary disabled:text-on-primary"
              >
                Instructor
              </button>
            </form>
            <form action={enterDemoAction}>
              <input type="hidden" name="role" value="student" />
              <input type="hidden" name="studentId" value="111" />
              <button
                type="submit"
                disabled={user.role === "student"}
                className="w-full rounded-sm border border-hairline px-xs py-xxs text-caption disabled:bg-primary disabled:text-on-primary"
              >
                Student 111
              </button>
            </form>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="text-caption text-muted underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <DemoRoleSwitcher user={user} />
    </>
  );
}
