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
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
        <div className="h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="px-3 h-7 rounded-lg bg-apple-charcoal flex items-center justify-center">
              <span className="text-white uppercase text-xs font-bold tracking-widest">
                Prodisenyo Attendance System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Step Indicator (desktop) */}
            <div className="hidden md:block">
              <StepIndicator current={step} />
            </div>

            {/* Reset Button */}
            <div className="flex items-center gap-2">
              {step === 2 && (
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
      </div>
    </nav>
  );
};

export default Nav;
