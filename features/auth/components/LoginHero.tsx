import Image from "next/image";

export default function LoginHero() {
  return (
    <section className="relative hidden min-h-screen overflow-hidden bg-[#f7f8f8] lg:block">
      <Image
        src="/login-construction-site.png"
        alt="High-rise building under construction"
        fill
        priority
        sizes="52vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-white/40" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col px-[8%] pb-20 pt-[7.5vh]">
        <div className="flex w-fit flex-col items-center">
          <Image
            src="/prodisenyo-building-mark.png"
            alt="Prodisenyo building mark"
            width={112}
            height={92}
            className="h-[92px] w-[112px] object-contain"
          />
          <p className="mt-3 text-[24px] font-semibold tracking-[0.01em] text-[#086864]">
            Prodisenyo ProBuild
          </p>
          <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.42em] text-[#3e8a87]">
            Building dreams into reality
          </p>
        </div>

        <div className="mt-[12.5vh] max-w-[670px]">
          <h1 className="text-[clamp(46px,4vw,68px)] font-semibold leading-[1.04] tracking-[-0.045em] text-[#076966]">
            Prodisenyo ProBuild
          </h1>
          <p className="mt-4 text-[clamp(25px,2vw,34px)] font-medium tracking-[-0.025em] text-[#566071]">
            Construction ERP Platform
          </p>
          <p className="mt-8 max-w-[590px] text-[clamp(18px,1.45vw,22px)] leading-[1.62] text-[#677183]">
            Streamline your construction business with a powerful ERP solution
            for managing projects, procurement, payroll, expenses, and
            operations &mdash; all in one place.
          </p>
        </div>
      </div>
    </section>
  );
}
