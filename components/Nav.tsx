import { RotateCcw } from "lucide-react";
import StepIndicator from "./StepIndicator";
import { Step } from "@/types";

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
          <div className="flex flex-col items-center gap-1 leading-none">
            <span className="text-base font-black tracking-wide text-gray-900">
              PRODISENYO
            </span>

            <div className="flex items-center gap-2 -mt-1">
              {/* Left sharp line */}
              <div className="h-[1px] w-6 bg-gradient-to-r from-transparent via-gray-400 to-gray-400"></div>

              <span className="text-[8px] tracking-[0.10em] text-gray-500 whitespace-nowrap">
                PAYROLL SYSTEM
              </span>

              {/* Right sharp line */}
              <div className="h-[1px] w-6 bg-gradient-to-l from-transparent via-gray-400 to-gray-400"></div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Step Indicator (desktop) */}
            <div className="hidden md:block">
              <StepIndicator current={step} />
            </div>

            {/* Reset Button */}
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
      </div>
    </nav>
  );
};

export default Nav;
