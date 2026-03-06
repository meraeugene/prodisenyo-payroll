"use client";

import { Check } from "lucide-react";
import type { Step } from "@/app/types";

interface StepIndicatorProps {
  current: Step;
}

const STEPS: { label: string; sub: string }[] = [
  { label: "Upload Report", sub: "Attendance file" },
  { label: "File Parsing Engine", sub: "Clean raw logs" },
  { label: "Configure Rates", sub: "Pay settings" },
  { label: "Review & Export", sub: "Final payroll" },
];

export default function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => {
        const num = (idx + 1) as Step;
        const isDone = num < current;
        const isActive = num === current;

        return (
          <div key={idx} className="flex items-center">
            {/* Step item */}
            <div className="flex items-center gap-3">
              {/* Circle */}
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center
                  text-xs font-semibold transition-all duration-300
                  ${isDone
                    ? "bg-apple-charcoal text-white"
                    : isActive
                    ? "bg-apple-charcoal text-white ring-4 ring-apple-charcoal/10"
                    : "bg-apple-mist text-apple-steel border border-apple-silver"
                  }
                `}
              >
                {isDone ? <Check size={12} strokeWidth={2.5} /> : num}
              </div>

              {/* Label */}
              <div className="hidden sm:block">
                <p
                  className={`text-xs font-semibold tracking-tight transition-colors
                    ${isActive ? "text-apple-charcoal" : isDone ? "text-apple-ash" : "text-apple-steel"}`}
                >
                  {step.label}
                </p>
                <p className="text-2xs text-apple-steel">{step.sub}</p>
              </div>
            </div>

            {/* Connector */}
            {idx < STEPS.length - 1 && (
              <div className="mx-4 flex-1 hidden sm:flex items-center">
                <div
                  className={`h-px w-12 transition-colors duration-500
                    ${isDone ? "bg-apple-charcoal" : "bg-apple-silver"}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
