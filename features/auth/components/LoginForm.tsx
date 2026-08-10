"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { type AuthActionState, signInAction } from "@/actions/auth";

interface LoginFormProps {
  nextPath: string | null;
}

export default function LoginForm({ nextPath }: LoginFormProps) {
  const initialAuthActionState: AuthActionState = { error: null };
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="space-y-7">
      <input type="hidden" name="next" value={nextPath ?? ""} />

      <div className="space-y-2.5">
        <label htmlFor="username" className="block text-[15px] font-medium text-[#172238]">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Enter your username"
          required
          className="h-[62px] w-full rounded-[9px] border border-[#cfd5dd] bg-white px-5 text-[15px] text-[#172238] outline-none transition placeholder:text-[#8b95a7] hover:border-[#aab5c2] focus:border-[#08726f] focus:ring-4 focus:ring-[#08726f]/10"
        />
      </div>

      <div className="space-y-2.5">
        <label htmlFor="password" className="block text-[15px] font-medium text-[#172238]">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            className="h-[62px] w-full rounded-[9px] border border-[#cfd5dd] bg-white px-5 pr-14 text-[15px] text-[#172238] outline-none transition placeholder:text-[#8b95a7] hover:border-[#aab5c2] focus:border-[#08726f] focus:ring-4 focus:ring-[#08726f]/10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-[#78859a] transition hover:bg-[#eef4f4] hover:text-[#075f5d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#08726f] focus-visible:ring-offset-2"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div className="flex min-h-7 items-center gap-2 text-sm text-[#677286]">
        <ShieldCheck className="h-4 w-4 text-[#08726f]" aria-hidden="true" />
        <span>Use your authorized company account</span>
      </div>

      {state.error ? (
        <div role="alert" className="rounded-[9px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-[57px] w-full items-center justify-center gap-2 rounded-[7px] bg-[#076d69] px-5 text-base font-semibold text-white shadow-[0_10px_24px_rgba(7,109,105,0.16)] transition hover:bg-[#055f5b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#076d69] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-65"
      >
        {pending ? (
          <>
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}
