import { AppSidebar } from "@/components/app-sidebar";
import { DemoRoleSwitcher } from "@/components/demo-role-switcher";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      <DemoRoleSwitcher to="educator" />
    </div>
  );
}
