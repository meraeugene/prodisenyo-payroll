import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"SF Pro Display"',
          '"SF Pro Text"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Helvetica Neue"',
          "sans-serif",
        ],
        mono: ['"SF Mono"', '"Fira Code"', '"Fira Mono"', "monospace"],
      },
      colors: {
        // shadcn tokens
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring))",

        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",

        primary: {
          DEFAULT: "oklch(var(--primary))",
          foreground: "oklch(var(--primary-foreground))",
        },

        secondary: {
          DEFAULT: "oklch(var(--secondary))",
          foreground: "oklch(var(--secondary-foreground))",
        },

        destructive: {
          DEFAULT: "oklch(var(--destructive))",
          foreground: "oklch(var(--destructive-foreground))",
        },

        muted: {
          DEFAULT: "oklch(var(--muted))",
          foreground: "oklch(var(--muted-foreground))",
        },

        accent: {
          DEFAULT: "oklch(var(--accent))",
          foreground: "oklch(var(--accent-foreground))",
        },

        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },

        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },

        // Prodisenyo teal palette
        apple: {
          white: "rgb(var(--apple-white) / <alpha-value>)",
          snow: "rgb(var(--apple-snow) / <alpha-value>)",
          mist: "rgb(var(--apple-mist) / <alpha-value>)",
          silver: "rgb(var(--apple-silver) / <alpha-value>)",
          steel: "rgb(var(--apple-steel) / <alpha-value>)",
          smoke: "rgb(var(--apple-smoke) / <alpha-value>)",
          ash: "rgb(var(--apple-ash) / <alpha-value>)",
          charcoal: "rgb(var(--apple-charcoal) / <alpha-value>)",
          black: "rgb(var(--apple-black) / <alpha-value>)",
        },
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.03em",
        tight: "-0.02em",
      },
      boxShadow: {
        "apple-sm": "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        apple: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)",
        "apple-lg": "0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.07)",
        "apple-xl": "0 24px 64px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      transitionTimingFunction: {
        apple: "cubic-bezier(0.4, 0, 0.2, 1)",
        "apple-bounce": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      animation: {
        "fade-up": "fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) forwards",
        "fade-in": "fadeIn 0.3s cubic-bezier(0.4,0,0.2,1) forwards",
        "slide-down": "slideDown 0.3s cubic-bezier(0.4,0,0.2,1) forwards",
        "scale-in": "scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
        shimmer: "shimmer 1.8s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
