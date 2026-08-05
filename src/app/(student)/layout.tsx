import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { GuidedTour } from "@/components/guided-tour";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <AppSidebar />
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      <Suspense fallback={null}>
        <GuidedTour />
      </Suspense>
    </div>
  );
}
