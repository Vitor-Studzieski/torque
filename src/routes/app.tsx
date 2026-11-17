import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { PageTransition } from "@/components/layout/PageTransition";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  return (
    <div className="pt-7">
      <DemoBanner />
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar />
          <main className="mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
