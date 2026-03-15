"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import StepIndicator from "./StepIndicator";
import { Step, ThemeMode } from "@/types";

interface NavProps {
  step: Step;
  handleReset: () => void;
  theme: ThemeMode;
  onThemeChange: (nextTheme: ThemeMode) => void;
}

const themeOptions: Array<{
  value: ThemeMode;
  label: string;
}> = [
  { value: "default", label: "Default Theme" },
  { value: "prodisenyo", label: "Verdant Flux" },
  { value: "light", label: "Azure Drift" },
];

const Nav = ({ step, handleReset, theme, onThemeChange }: NavProps) => {
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedTheme = themeOptions.find((option) => option.value === theme);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-apple-white/80 backdrop-blur-xl border-b border-apple-mist">
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
        <div className="h-16 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-start gap-1 leading-none justify-self-start">
            <span className="text-base font-black tracking-wide text-apple-charcoal">
              PRODISENYO
            </span>

            <div className="flex items-center gap-2 -mt-1">
              <div className="h-[1px] w-6 bg-gradient-to-r from-transparent via-apple-steel to-apple-steel"></div>
              <span className="text-[8px] tracking-[0.10em] text-apple-smoke whitespace-nowrap">
                PAYROLL SYSTEM
              </span>
              <div className="h-[1px] w-6 bg-gradient-to-l from-transparent via-apple-steel to-apple-steel"></div>
            </div>
          </div>

          <div className="hidden md:block justify-self-center">
            <StepIndicator current={step} />
          </div>

          <div className="flex items-center gap-2 justify-self-end">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsThemeMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-apple-silver text-xs font-semibold text-apple-ash hover:border-apple-ash transition-all"
                aria-haspopup="menu"
                aria-expanded={isThemeMenuOpen}
              >
                <span>{selectedTheme?.label ?? "Palette"}</span>
                <ChevronDown
                  size={12}
                  className={
                    isThemeMenuOpen
                      ? "rotate-180 transition-transform"
                      : "transition-transform"
                  }
                />
              </button>

              {isThemeMenuOpen && (
                <div className="absolute right-0 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-apple-mist bg-apple-white shadow-apple z-50">
                  {themeOptions.map((option) => {
                    const isActive = theme === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onThemeChange(option.value);
                          setIsThemeMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold transition-colors ${
                          isActive
                            ? "bg-apple-snow text-apple-charcoal"
                            : "text-apple-ash hover:bg-apple-snow"
                        }`}
                      >
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {step >= 2 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-apple-silver text-xs font-semibold text-apple-ash hover:border-apple-ash transition-all"
              >
                <RotateCcw size={12} />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
