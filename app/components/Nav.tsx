import { RotateCcw } from "lucide-react";
import StepIndicator from "./StepIndicator";
import { Step } from "../types";

interface NavProps {
  step: Step;
  handleReset: () => void;
}

const Nav = ({ step, handleReset }: NavProps) => {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-apple-mist">
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-full h-7 px-3 rounded-lg bg-apple-charcoal flex items-center justify-center">
              <span className="text-white uppercase text-xs font-bold tracking-widest">
                Prodisenyo Payroll System
              </span>
            </div>
            {/* <span className="text-[15px] font-bold text-apple-charcoal tracking-tight">
                  Payroll
                </span> */}
          </div>

          {/* Steps — desktop */}
          <div className="hidden md:block">
            <StepIndicator current={step} />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {step >= 2 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-apple-silver
                      text-xs font-semibold text-apple-ash hover:border-apple-ash transition-all"
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
