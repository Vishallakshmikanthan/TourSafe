import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AlertsRightPanel } from "@/components/layout/AlertsRightPanel";
import { StatusBar } from "@/components/layout/StatusBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-ts-light">
      {/* Left Sidebar */}
      <AdminSidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <AdminHeader />

        {/* Content + Right Panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-auto scrollbar-thin">
            {children}
          </main>

          {/* Right Panel */}
          <AlertsRightPanel />
        </div>

        {/* Status Bar */}
        <StatusBar />
      </div>
    </div>
  );
}
