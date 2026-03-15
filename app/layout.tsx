import type { Metadata } from "next";
import "./globals.css";
import "sonner/dist/styles.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Prodisenyo Payroll System",
    template: "%s | Prodisenyo Payroll",
  },
  description:
    "Prodisenyo Payroll System helps teams upload attendance logs, review worked hours, and generate accurate payroll reports faster.",
  // icons: {
  //   icon: "/icon.ico",
  //   shortcut: "/icon.ico",
  //   apple: "/icon.ico",
  // },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geist.variable)}
      data-theme="default"
    >
      <body className="min-h-screen bg-apple-snow antialiased">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className:
              "border border-apple-mist bg-apple-white text-apple-charcoal",
          }}
        />
      </body>
    </html>
  );
}
