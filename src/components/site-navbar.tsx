import Link from "next/link";
import { Logo } from "@/components/logo";

export function SiteNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-0 bg-[rgba(255,246,246,0.12)] backdrop-blur-xl transition-all duration-300 ease-out supports-[backdrop-filter]:bg-[rgba(255,246,246,0.18)]">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between px-6 py-3">
        <Link
          href="/"
          aria-label="SIT MarkEase home"
          className="flex items-center rounded-full border border-[rgba(180,90,90,0.08)] bg-[rgba(255,255,255,0.12)] px-2 py-1.5 shadow-[0_8px_22px_rgba(110,32,32,0.04)] transition hover:bg-[rgba(255,255,255,0.18)]"
        >
          <Logo className="h-8 w-auto" />
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-[rgba(180,90,90,0.06)] bg-[rgba(255,255,255,0.1)] px-1.5 py-1 shadow-[0_8px_22px_rgba(110,32,32,0.04)] backdrop-blur-sm">
          <Link href="/#about" className="rounded-full px-3 py-2 text-body-sm font-medium text-ink/80 transition hover:bg-[rgba(255,255,255,0.12)] hover:text-ink">
            About
          </Link>
          <Link href="/#tutorial" className="rounded-full px-3 py-2 text-body-sm font-medium text-ink/80 transition hover:bg-[rgba(255,255,255,0.12)] hover:text-ink">
            Tutorial
          </Link>
          <Link href="/login" className="rounded-full bg-[rgba(120,32,32,0.82)] px-3 py-2 text-body-sm font-medium text-white transition hover:bg-[rgba(103,24,24,0.9)]">
            Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
