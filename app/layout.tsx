import type { Metadata, Viewport } from "next";
import "./globals.css";
import "sonner/dist/styles.css";
import { Toaster } from "sonner";
import { AppStateProvider } from "@/features/app/AppStateProvider";
import PwaRegister from "@/features/app/components/PwaRegister";

export const metadata: Metadata = {
  title: {
    default: "Prodisenyo ProBuild",
    template: "%s | Prodisenyo ProBuild",
  },
  description:
    "Prodisenyo ProBuild helps teams upload documents to generate payroll reports, generate accurate cost estimates, and track project budgets in real-time.",
  applicationName: "Prodisenyo ProBuild",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/pwa.png",
    apple: "/pwa.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prodisenyo ProBuild",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#14532d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="font-sans" data-theme="prodisenyo">
      <body className="min-h-screen bg-apple-snow antialiased">
        <PwaRegister />
        <AppStateProvider>
          {children}
          <Toaster
            position="top-right"
            expand
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "group border border-apple-mist bg-white text-apple-charcoal shadow-[0_20px_48px_rgba(24,83,43,0.14)] rounded-[20px]",
                title: "text-sm font-semibold text-apple-charcoal",
                description: "text-[13px] leading-5 text-apple-steel",
                content: "gap-1.5",
                icon: "text-[rgb(var(--theme-chart-2))]",
                closeButton:
                  "border border-apple-mist bg-[rgb(var(--apple-snow))] text-apple-steel transition hover:bg-apple-mist hover:text-apple-charcoal",
                success:
                  "border-emerald-200 bg-[linear-gradient(180deg,rgba(248,253,250,1),rgba(239,250,243,1))]",
                error:
                  "border-red-200 bg-[linear-gradient(180deg,rgba(255,250,250,1),rgba(254,242,242,1))]",
                info: "border-sky-200 bg-[linear-gradient(180deg,rgba(249,252,255,1),rgba(240,249,255,1))]",
                warning:
                  "border-amber-200 bg-[linear-gradient(180deg,rgba(255,252,245,1),rgba(254,249,195,0.4))]",
              },
            }}
          />
        </AppStateProvider>
      </body>
    </html>
  );
}
