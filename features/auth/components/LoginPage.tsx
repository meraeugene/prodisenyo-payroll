import Image from "next/image";
import { Headphones } from "lucide-react";
import LoginForm from "@/features/auth/components/LoginForm";
import LoginHero from "@/features/auth/components/LoginHero";

interface LoginPageProps {
  nextPath: string | null;
}

export default function LoginPage({ nextPath }: LoginPageProps) {
  return (
    <main className="min-h-screen bg-[#f7f9fb] lg:grid lg:grid-cols-[51.8%_48.2%]">
      <LoginHero />

      <section className="relative flex min-h-screen flex-col items-center justify-center px-5 py-8 sm:px-8 lg:translate-y-5 lg:px-[7%] lg:py-10">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <Image
            src="/prodisenyo-building-mark.png"
            alt="Prodisenyo building mark"
            width={64}
            height={52}
            className="h-[52px] w-16 object-contain"
          />
          <div>
            <p className="text-lg font-semibold tracking-[-0.02em] text-[#076966]">
              Prodisenyo ProBuild
            </p>
            <p className="text-[9px] uppercase tracking-[0.26em] text-[#6d7889]">
              Construction ERP Platform
            </p>
          </div>
        </div>

        <div className="w-full max-w-[578px] rounded-[12px] border border-[#e1e5e9] bg-white px-6 py-10 shadow-[0_18px_55px_rgba(35,50,67,0.08)] sm:px-12 sm:py-14 lg:min-h-[696px] lg:px-[50px] lg:py-[56px]">
          <header className="text-center">
            <h2 className="text-[32px] font-semibold tracking-[-0.035em] text-[#162238] sm:text-[36px]">
              Welcome back
            </h2>
            <p className="mt-2.5 text-[16px] text-[#7a8496] sm:text-[17px]">
              Sign in to continue to Prodisenyo ProBuild
            </p>
          </header>

          <div className="mt-11">
            <LoginForm nextPath={nextPath} />
          </div>

          <div className="mt-9 flex items-center gap-5" aria-hidden="true">
            <span className="h-px flex-1 bg-[#dce1e7]" />
            <span className="text-sm text-[#8791a1]">or</span>
            <span className="h-px flex-1 bg-[#dce1e7]" />
          </div>

          <div className="mt-8 flex items-center justify-center gap-2.5 text-center text-[15px] font-medium text-[#076966]">
            <Headphones className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Contact Administrator</span>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-[#8a93a2] lg:mt-[6vh]">
          {"\u00A9"} {new Date().getFullYear()} Prodisenyo ProBuild. All rights reserved.
        </p>
      </section>
    </main>
  );
}
