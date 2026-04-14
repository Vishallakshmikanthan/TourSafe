import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "TourSafe — Smart Tourist Safety System",
  description:
    "National-level real-time tourist safety and emergency response platform",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-ts-light overflow-hidden h-screen">
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: { fontFamily: "Inter, sans-serif" },
          }}
        />
      </body>
    </html>
  );
}
