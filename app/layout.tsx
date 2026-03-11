import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Prodisenyo Payroll",
  description:
    "Upload your attendance report and auto-calculate payroll in seconds.",
  // icons: {
  //   icon: "/icon.ico",
  // },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-apple-snow antialiased">{children}</body>
    </html>
  );
}
