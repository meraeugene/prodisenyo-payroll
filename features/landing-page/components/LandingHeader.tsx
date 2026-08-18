"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Modules", href: "#modules" },
  { label: "How it works", href: "#workflow" },
  { label: "For every role", href: "#roles" },
  { label: "Product tour", href: "#product-tour" },
];

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[74px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4"
          aria-label="Prodisenyo ProBuild home"
        >
          <Image
            src="/prodisenyo-building-mark.png"
            alt=""
            width={46}
            height={42}
            className="h-10 w-11 object-contain"
            priority
          />
          <span className="leading-tight">
            <span className="block text-[17px] font-bold tracking-[-0.03em] text-[#0b4842]">
              Prodisenyo ProBuild
            </span>
            <span className="block text-[10px] font-medium uppercase tracking-[0.17em] text-emerald-800/70">
              Construction ERP
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary navigation">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/auth/login"
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            Sign In
          </Link>
          <Link
            href="/auth/login"
            className="rounded-lg bg-[#075f55] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(7,95,85,0.18)] transition-colors hover:bg-[#064d46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            Open ProBuild
          </Link>
        </div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-nav"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((current) => !current)}
          className="rounded-lg border border-emerald-950/10 p-2.5 text-emerald-900 lg:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen ? (
        <div
          id="landing-mobile-nav"
          className="border-t border-emerald-950/10 bg-white px-5 py-5 shadow-lg lg:hidden"
        >
          <nav className="mx-auto flex max-w-[1320px] flex-col gap-1" aria-label="Mobile navigation">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/auth/login"
              className="mt-3 rounded-lg bg-[#075f55] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Sign In
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
