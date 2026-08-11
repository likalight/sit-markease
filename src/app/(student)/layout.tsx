import { AppSidebar } from "@/components/app-sidebar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}
