"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const EDUCATOR_LINKS = [
  { href: "/review", label: "Review queue" },
  { href: "/assignments", label: "Assignments" },
  { href: "/insights", label: "Class insights" },
];

const STUDENT_LINKS = [
  { href: "/submit", label: "Submit work" },
  { href: "/exam-prep", label: "Exam prep" },
  { href: "/settings", label: "Settings" },
];

export function SidebarNavLinks({ role }: { role: "educator" | "student" | "admin" }) {
  const pathname = usePathname();
  const links = role === "educator" ? EDUCATOR_LINKS : role === "student" ? STUDENT_LINKS : [];

  return (
    <nav className="flex flex-col gap-xxs px-sm">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-sm px-sm py-xs text-body-sm ${
              active ? "bg-surface-card font-medium text-body-strong" : "text-muted hover:text-body"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
