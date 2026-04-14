import { ShieldCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ts-navy flex flex-col overflow-auto">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* Header */}
      <header className="relative flex items-center gap-3 px-8 py-5">
        <div className="w-9 h-9 rounded-xl bg-ts-saffron flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-bold text-white text-lg leading-none">TourSafe</p>
          <p className="text-white/50 text-xs">
            Smart Tourist Safety & Emergency Response System
          </p>
        </div>
        <div className="ml-auto text-white/30 text-xs font-mono">
          Govt. of India Initiative
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative text-center py-4 text-white/30 text-xs">
        © 2026 TourSafe. Ministry of Tourism, Government of India.
      </footer>
    </div>
  );
}
