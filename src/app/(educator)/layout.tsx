import { NavHeader } from "@/components/nav-header";

export default function EducatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col">
      <NavHeader />
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </div>
  );
}
