import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  ClipboardList,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  Receipt,
  Settings,
  Trash2,
  Upload,
  UserRoundSearch,
  Users,
  ListTodo,
  FileText,
  ClipboardCheck,
  BadgeDollarSign,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppRole } from "@/types/database";
import RoleGreetingHero from "@/features/home/components/RoleGreetingHero";

type FeatureCard = {
  href: string;
  title: string;
  description: string;
};

const FEATURE_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/upload-attendance": Upload,
  "/review-attendance": UserRoundSearch,
  "/generate-payroll": FolderKanban,
  "/budget-tracker": Receipt,
  "/payroll-analytics": LayoutDashboard,
  "/payroll-change": LineChart,
  "/payroll-approvals": LineChart,
  "/payroll-reports": LineChart,
  "/overtime-approvals": Clock3,
  "/estimate-approvals": Calculator,
  "/estimate-reviews": Calculator,
  "/add-user": Users,
  "/reset-data": Trash2,
  "/request-overtime": Clock3,
  "/settings": Settings,
  "/cost-estimator": Calculator,
  "/request-material": ClipboardList,
  "/my-tasks": ListTodo,
  "/projects": FolderKanban,
  "/progress-reports": FileText,
  "/overview": LayoutDashboard,
  "/projects?section=material-approvals": ClipboardCheck,
  "/material-approvals": ClipboardCheck,
  "/projects?section=purchasing-approvals": BadgeDollarSign,
  "/purchasing-approvals": BadgeDollarSign,
};

const ROLE_FEATURES: Record<AppRole, FeatureCard[]> = {
  admin: [
    {
      href: "/add-user",
      title: "User Management",
      description: "Create, update, and manage application user accounts.",
    },
    {
      href: "/reset-data",
      title: "Reset Data",
      description: "Clear workspace records when a clean setup is needed.",
    },
    {
      href: "/settings",
      title: "Settings",
      description: "Manage account settings and preferences.",
    },
  ],
  ceo: [
    {
      href: "/payroll-analytics",
      title: "Payroll Analytics",
      description: "View payroll analytics, trends, and workforce totals.",
    },
    {
      href: "/projects",
      title: "Projects Portfolio",
      description: "High-level overview of all company projects, budgets, and schedules.",
    },
    {
      href: "/projects?section=material-approvals",
      title: "Material Approvals",
      description: "Approve or reject material requests submitted by site engineers.",
    },
    {
      href: "/projects?section=purchasing-approvals",
      title: "Purchasing Approvals",
      description: "Review and approve purchase orders and vendor payments.",
    },
    {
      href: "/budget-tracker",
      title: "Budget Tracker",
      description: "Track project budget usage and spending status.",
    },
    {
      href: "/payroll-approvals",
      title: "Payroll Approvals",
      description: "Review submitted payroll runs and approval updates.",
    },
    {
      href: "/overtime-approvals",
      title: "Overtime Approvals",
      description: "Approve or reject pending overtime requests.",
    },
    {
      href: "/estimate-approvals",
      title: "Estimate Approvals",
      description: "Review project estimate submissions from the Projects workflow.",
    },
  ],
  payroll_manager: [
    {
      href: "/upload-attendance",
      title: "Upload Attendance",
      description: "Upload and prepare site attendance files.",
    },
    {
      href: "/request-overtime",
      title: "Request Overtime",
      description: "Submit overtime requests for team members.",
    },
    {
      href: "/settings",
      title: "Settings",
      description: "Manage account settings and preferences.",
    },
  ],
  engineer: [
    {
      href: "/overview",
      title: "Overview Dashboard",
      description: "A comprehensive project overview dashboard featuring status trackers and alerts.",
    },
    {
      href: "/projects",
      title: "Projects Workspace",
      description: "Manage tasks, log progress reports, and submit material requests for your assigned projects.",
    },
    {
      href: "/cost-estimator",
      title: "Cost Estimator",
      description: "Prepare project estimates and cost breakdowns.",
    },
  ],
  employee: [
    {
      href: "/request-overtime",
      title: "Request Overtime",
      description: "Send overtime requests to your approver.",
    },
    {
      href: "/settings",
      title: "Settings",
      description: "Manage account settings and preferences.",
    },
  ],
};

function getGreetingMessage(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getPhilippineHour() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      hourCycle: "h23",
      timeZone: "Asia/Manila",
    }).format(new Date()),
  );
}

function getFirstName(fullName: string | null, username: string) {
  const source = (fullName?.trim() || username.trim() || "there").replace(
    /[_-]+/g,
    " ",
  );
  const [first] = source.split(/\s+/);
  return first || "there";
}

function getDateLabel() {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  })
    .format(new Date())
    .toUpperCase();
}

function getRoleHints(role: AppRole) {
  if (role === "admin") {
    return [
      "Manage user accounts and platform administration.",
      "Keep administrative tools separate from executive workflows.",
      "Review account access before changing workspace data.",
    ];
  }

  if (role === "ceo") {
    return [
      "Review approvals and reports with a quick daily check.",
      "Track budgets and estimate health across active projects.",
      "Keep company workflows moving without bottlenecks.",
    ];
  }

  if (role === "payroll_manager") {
    return [
      "Process attendance and payroll tasks for today.",
      "Validate records before each payroll run.",
      "Review incoming requests early to avoid delays.",
    ];
  }

  if (role === "engineer") {
    return [
      "Focus on estimates and material planning today.",
      "Track spending before project costs rise too fast.",
      "Submit requests early to keep work on plan.",
    ];
  }

  return [
    "Check overtime and settings for your shift.",
    "Submit overtime requests early for faster approval.",
    "Keep your profile and account settings up to date.",
  ];
}

export default function RoleHomePage({
  role,
  fullName,
  username,
}: {
  role: AppRole;
  fullName: string | null;
  username: string;
}) {
  const firstName = getFirstName(fullName, username);
  const greeting = getGreetingMessage(getPhilippineHour());
  const dateLabel = getDateLabel();
  const roleHints = getRoleHints(role);
  const featureCards = ROLE_FEATURES[role];

  return (
    <main className="space-y-6 p-0 sm:p-6">
      <RoleGreetingHero
        dateLabel={dateLabel}
        title={`${greeting}, ${firstName}!`}
        messages={roleHints}
      />

      <section className="px-4 pb-4 sm:p-0">
        <div className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-apple-steel">
            Available Features
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-apple-charcoal">
            Start from here
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((card) => {
            const Icon = FEATURE_ICONS[card.href] ?? FolderKanban;

            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[18px] border border-emerald-200 bg-white p-4 text-emerald-950 shadow-[0_12px_26px_rgba(14,53,30,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_18px_34px_rgba(14,53,30,0.18)]"
              >
                <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-emerald-100/60 blur-2xl transition duration-300 group-hover:bg-emerald-100" />

                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[0_6px_14px_rgba(22,101,52,0.12)] transition duration-300 group-hover:scale-105 group-hover:border-emerald-300 group-hover:text-emerald-800">
                  <Icon size={18} />
                </div>

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <p className="text-[20px] font-semibold tracking-[-0.02em] text-emerald-950">
                    {card.title}
                  </p>
                </div>

                <p className="relative z-10 mt-4 text-base leading-6 text-emerald-800">
                  {card.description}
                </p>

                <div className="relative z-10 mt-2 flex items-center justify-end">
                  <ArrowRight
                    size={16}
                    className="text-emerald-700 transition duration-300 group-hover:translate-x-1 group-hover:text-emerald-800"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
