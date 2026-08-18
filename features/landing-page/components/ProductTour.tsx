"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import LandingSectionHeading from "@/features/landing-page/components/LandingSectionHeading";
import { landingTourSlides } from "@/features/landing-page/utils/landingContent";

export default function ProductTour() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlide = landingTourSlides[activeIndex];

  return (
    <section id="product-tour" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-10">
        <LandingSectionHeading
          eyebrow="Product tour"
          title="See how every team works inside ProBuild"
          description="Explore the real role-based screens that connect planning, approval, purchasing, project delivery, and payroll."
        />

        <div
          className="mt-10 flex gap-2 overflow-x-auto pb-2"
          role="tablist"
          aria-label="Product tour screens"
        >
          {landingTourSlides.map((slide, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={slide.label}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="landing-product-tour-panel"
                onClick={() => setActiveIndex(index)}
                className={[
                  "shrink-0 rounded-full border px-4 py-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2",
                  active
                    ? "border-[#075f55] bg-[#075f55] text-white"
                    : "border-emerald-950/10 bg-white text-slate-600 hover:bg-emerald-50",
                ].join(" ")}
              >
                {slide.label}
              </button>
            );
          })}
        </div>

        <div
          id="landing-product-tour-panel"
          role="tabpanel"
          className="mt-6 grid overflow-hidden rounded-[24px] border border-emerald-950/10 bg-[#f7faf8] lg:grid-cols-[0.68fr_1.32fr]"
        >
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              {activeSlide.label}
            </p>
            <h3 className="mt-4 text-balance text-2xl font-bold leading-tight tracking-[-0.035em] text-[#103d39] sm:text-3xl">
              {activeSlide.title}
            </h3>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              {activeSlide.description}
            </p>
            <ul className="mt-6 space-y-3">
              {activeSlide.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-3 text-sm font-medium text-slate-700"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                    strokeWidth={2}
                  />
                  {bullet}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/login"
              className="mt-8 inline-flex w-fit items-center gap-2 text-sm font-bold text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-4"
            >
              Open ProBuild
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex items-center bg-[#eaf2ee] p-4 sm:p-7 lg:p-8">
            <div className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white shadow-[0_24px_55px_rgba(14,61,55,0.14)]">
              <Image
                key={activeSlide.image}
                src={activeSlide.image}
                alt={activeSlide.imageAlt}
                width={activeSlide.imageWidth}
                height={activeSlide.imageHeight}
                sizes="(min-width: 1024px) 58vw, 94vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
