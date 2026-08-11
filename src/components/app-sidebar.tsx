import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { signOutAction } from "@/app/login/actions";
import { Logo } from "./logo";
import { SidebarNavLinks } from "./sidebar-nav-links";

// Gradescope-style persistent left sidebar, replacing the old top NavHeader.
// Split into this server piece (auth lookup, same as NavHeader did) and a
// client child for active-route highlighting via usePathname().
export async function AppSidebar() {
  const user = await getCurrentUser();
  if (!user) return null;

  const homeHref = user.role === "educator" ? "/review" : "/submit";

  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-hairline bg-surface-dark">
      <Link href={homeHref} className="flex items-center gap-xs px-md py-md">
        <Logo className="h-7 w-auto" />
      </Link>

      <SidebarNavLinks role={user.role} />

      <div className="mt-auto flex flex-col gap-xs border-t border-hairline px-md py-md">
        <span className="truncate text-body-sm text-on-dark-soft">{user.name}</span>
        <form action={signOutAction}>
          <button type="submit" className="text-caption text-on-dark-soft underline">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
