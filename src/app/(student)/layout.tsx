import { NavHeader } from "@/components/nav-header";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavHeader />
      {children}
    </div>
  );
}
