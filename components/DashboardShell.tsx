"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Building2,
  BadgeDollarSign,
  Calculator,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  Clock3,
  House,
  LayoutDashboard,
  LineChart,
  Menu,
  Users,
  Settings,
  Trash2,
  Upload,
  UserPlus,
  UserRoundSearch,
  Wallet,
  X,
  FolderKanban,
} from "lucide-react";
import SignOutButton from "@/components/auth/SignOutButton";
import ProfileAvatar from "@/components/ProfileAvatar";
import { useAppState } from "@/features/app/AppStateProvider";
import { useDashboardNavState } from "@/features/navigation/hooks/useDashboardNavState";
import { useSidebarNotificationCounts } from "@/features/navigation/hooks/useSidebarNotificationCounts";
import { getProfileAvatarPublicUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

const NO_SCROLL_CLASS = "overflow-hidden";

const PRIMARY_NAV_ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/upload-attendance", label: "Upload Attendance", icon: Upload },
  { href: "/request-overtime", label: "Request Overtime", icon: Clock3 },
];

const PAYROLL_MANAGER_GENERAL_ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/upload-attendance", label: "Upload Attendance", icon: Upload },
] as const;

const PAYROLL_MANAGER_REQUEST_ITEMS = [
  { href: "/request-overtime", label: "Request Overtime", icon: Clock3 },
] as const;

const CEO_GENERAL_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

const CEO_PAYROLL_ITEMS = [
  {
    href: "/payroll-analytics",
    label: "Payroll Analytics",
    icon: LayoutDashboard,
  },
  { href: "/payroll-approvals", label: "Payroll Approvals", icon: LineChart },
] as const;

const CEO_PROJECT_ITEMS = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
] as const;

const CEO_REVIEW_ITEMS = [
  {
    href: "/overtime-approvals",
    label: "Overtime Approvals",
    icon: Clock3,
  },
] as const;

const GENERAL_WORKFLOW_ITEMS = [
  {
    href: "/review-attendance",
    label: "Review Attendance",
    icon: UserRoundSearch,
  },
  { href: "/generate-payroll", label: "Generate Payroll", icon: Wallet },
] as const;

const CEO_ADMIN_ITEMS = [
  { href: "/add-user", label: "User Management", icon: Users },
  { href: "/reset-data", label: "Reset Data", icon: Trash2 },
] as const;

const ENGINEER_GENERAL_ITEMS = [
  { href: "/overview", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
] as const;

const ENGINEER_PLANNING_ITEMS = [
  { href: "/cost-estimator", label: "Cost Estimator", icon: Calculator },
] as const;

const ENGINEER_REQUEST_ITEMS = [
  { href: "/request-overtime", label: "Request Overtime", icon: Clock3 },
] as const;

const EMPLOYEE_NAV_ITEMS = [
  { href: "/home", label: "Home", icon: House },
  { href: "/request-overtime", label: "Request Overtime", icon: Clock3 },
] as const;
const PURCHASER_NAV_ITEMS = [
  { href: "/purchaser-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/purchasing-approvals", label: "Purchasing", icon: BadgeDollarSign },
] as const;


type ProfileCardData = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "full_name" | "username" | "avatar_path" | "role"
>;

function formatRoleLabel(role: ProfileCardData["role"] | null): string {
  if (role === "admin") return "Administrator";
  if (role === "ceo") return "Chief Executive Officer";
  if (role === "payroll_manager") return "Payroll Manager";
  if (role === "purchaser") return "Purchaser";
  if (role === "engineer") return "Engineer";
  if (role === "employee") return "Employee";
  return "Signed-in user";
}

function renderSidebarLink(params: {
  item: {
    href: string;
    label: string;
    icon: LucideIcon;
  };
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
  badgeCount?: number;
}) {
  const { item, pathname, collapsed, onNavigate, badgeCount = 0 } = params;
  const active = pathname === item.href;

  return (
    <Link
      key={item.href}
      href={item.href}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg border border-apple-mist/60 px-3 py-1.5 text-sm transition-all",
        collapsed && "justify-center px-2.5",
        active
          ? "bg-apple-mist/40 text-apple-charcoal shadow-sm"
          : "text-apple-smoke hover:bg-apple-mist/40 hover:text-apple-charcoal hover:shadow-sm",
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          active
            ? "bg-[#1f6a37] text-white"
            : "text-apple-smoke group-hover:text-apple-charcoal",
        )}
      >
        <item.icon size={15} />
      </div>
      {!collapsed ? (
        <span className="min-w-0 flex-1 font-medium whitespace-nowrap">
          {item.label}
        </span>
      ) : null}
      {badgeCount > 0 ? (
        <span
          className={cn(
            "inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-[#1f6a37] px-2 py-0.5 text-[11px] font-bold text-white",
            collapsed ? "absolute -right-1 -top-1" : "ml-1",
          )}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      ) : null}
    </Link>
  );
}

function renderSidebarSectionLabel(params: {
  label: string;
  collapsed: boolean;
}) {
  const { label, collapsed } = params;

  if (collapsed) {
    return null;
  }

  return (
    <div className="px-3 pb-1 pt-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apple-silver">
        {label}
      </p>
    </div>
  );
}

export default function DashboardShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: (ProfileCardData & { id: string }) | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { hasAttendanceData, currentPayrollRunId, workspaceReset } =
    useAppState();
  const sidebarWidth = collapsed ? "80px" : "286px";
  const headerHeight = "69px";
  const settingsActive = pathname === "/settings";
  const isWorkflowRoute =
    pathname === "/review-attendance" || pathname === "/generate-payroll";
  const isCeo = profile?.role === "ceo";
  const isAdmin = profile?.role === "admin";
  const isPayrollManager = profile?.role === "payroll_manager";
  const isEngineer = profile?.role === "engineer";
  const isPurchaser = profile?.role === "purchaser";
  const isEmployee = profile?.role === "employee";
  const navState = useDashboardNavState(profile?.id ?? null, profile?.role ?? null);
  const canSeeWorkflowNav =
    isCeo ||
    (isPayrollManager &&
      !workspaceReset &&
      (navState.hasSavedAttendance || hasAttendanceData || isWorkflowRoute));
  const notificationCounts = useSidebarNotificationCounts(isCeo);

  useEffect(() => {
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches;

    if (open && isMobile) {
      document.body.classList.add(NO_SCROLL_CLASS);
      document.documentElement.classList.add(NO_SCROLL_CLASS);
    } else {
      document.body.classList.remove(NO_SCROLL_CLASS);
      document.documentElement.classList.remove(NO_SCROLL_CLASS);
    }

    return () => {
      document.body.classList.remove(NO_SCROLL_CLASS);
      document.documentElement.classList.remove(NO_SCROLL_CLASS);
    };
  }, [open]);

  useEffect(() => {
    document.body.classList.remove(NO_SCROLL_CLASS);
    document.documentElement.classList.remove(NO_SCROLL_CLASS);
    setOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches;

    if (
      isDesktop &&
      (pathname === "/budget-tracker" || pathname === "/cost-estimator")
    ) {
      setCollapsed(true);
      return;
    }

    setCollapsed(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen">
        {/* Mobile sidebar overlay */}
        {open && (
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex h-[100dvh] flex-col overflow-hidden border-r border-apple-mist bg-white transition-transform duration-300 lg:h-screen lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
          style={{ width: sidebarWidth }}
        >
          <div
            className="flex shrink-0 items-center justify-between border-b border-apple-mist px-5"
            style={{ height: headerHeight }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-apple-mist text-apple-charcoal">
                <Building2 className="h-4 w-4" strokeWidth={1.5} />
              </div>

              {!collapsed ? (
                <p className="font-semibold tracking-[-0.04em] text-apple-charcoal">
                  Prodisenyo ProBuild
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCollapsed((current) => !current)}
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-apple-smoke transition hover:bg-apple-mist/40 hover:text-apple-charcoal lg:flex"
                aria-label={
                  collapsed ? "Expand navigation" : "Collapse navigation"
                }
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronsRight size={16} />
                ) : (
                  <ChevronsLeft size={16} />
                )}
              </button>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-apple-mist bg-white text-apple-smoke transition hover:bg-apple-mist/40 hover:text-apple-charcoal lg:hidden"
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-5"
            style={{
              WebkitOverflowScrolling: "touch",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
            }}
          >
            <nav className="space-y-3">
              {(isCeo
                ? CEO_GENERAL_ITEMS
                : isAdmin
                  ? CEO_ADMIN_ITEMS
                : isPayrollManager
                  ? PAYROLL_MANAGER_GENERAL_ITEMS
                  : isEngineer
                    ? ENGINEER_GENERAL_ITEMS
                    : isPurchaser
                      ? PURCHASER_NAV_ITEMS
                      : isEmployee
                      ? EMPLOYEE_NAV_ITEMS
                      : PRIMARY_NAV_ITEMS
              ).map((item) =>
                renderSidebarLink({
                  item,
                  pathname,
                  collapsed,
                  onNavigate: () => setOpen(false),
                }),
              )}

              {isCeo ? (
                <>
                  {renderSidebarSectionLabel({
                    label: "Projects",
                    collapsed,
                  })}
                  {CEO_PROJECT_ITEMS.map((item) =>
                    renderSidebarLink({
                      item,
                      pathname,
                      collapsed,
                      onNavigate: () => setOpen(false),
                    }),
                  )}

                  {renderSidebarSectionLabel({
                    label: "Payroll",
                    collapsed,
                  })}
                  {CEO_PAYROLL_ITEMS.map((item) =>
                    renderSidebarLink({
                      item,
                      pathname,
                      collapsed,
                      onNavigate: () => setOpen(false),
                      badgeCount:
                        item.href === "/payroll-approvals"
                          ? notificationCounts.payrollReports
                          : 0,
                    }),
                  )}

                  {renderSidebarSectionLabel({
                    label: "Reviews",
                    collapsed,
                  })}
                  {CEO_REVIEW_ITEMS.map((item) =>
                    renderSidebarLink({
                      item,
                      pathname,
                      collapsed,
                      onNavigate: () => setOpen(false),
                      badgeCount:
                        item.href === "/overtime-approvals"
                          ? notificationCounts.overtime
                          : 0,
                    }),
                  )}
                </>
              ) : null}

              {isEngineer ? (
                <>
                  {renderSidebarSectionLabel({
                    label: "Planning",
                    collapsed,
                  })}
                  {ENGINEER_PLANNING_ITEMS.map((item) =>
                    renderSidebarLink({
                      item,
                      pathname,
                      collapsed,
                      onNavigate: () => setOpen(false),
                    }),
                  )}


                  {renderSidebarSectionLabel({
                    label: "Requests",
                    collapsed,
                  })}
                  {ENGINEER_REQUEST_ITEMS.map((item) =>
                    renderSidebarLink({
                      item,
                      pathname,
                      collapsed,
                      onNavigate: () => setOpen(false),
                    }),
                  )}
                </>
              ) : null}

              {isPayrollManager ? (
                <>
                  {canSeeWorkflowNav ? (
                    <>
                      {renderSidebarSectionLabel({
                        label: "Payroll",
                        collapsed,
                      })}
                      {GENERAL_WORKFLOW_ITEMS.map((item) =>
                        renderSidebarLink({
                          item,
                          pathname,
                          collapsed,
                          onNavigate: () => setOpen(false),
                        }),
                      )}
                    </>
                  ) : null}

                  {renderSidebarSectionLabel({
                    label: "Requests",
                    collapsed,
                  })}
                  {PAYROLL_MANAGER_REQUEST_ITEMS.map((item) =>
                    renderSidebarLink({
                      item,
                      pathname,
                      collapsed,
                      onNavigate: () => setOpen(false),
                    }),
                  )}
                </>
              ) : null}

            </nav>

            <div className="mt-auto space-y-1 pt-3">
              {!collapsed ? (
                <div className="px-3 pb-1 pt-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-apple-silver">
                    Account
                  </p>
                </div>
              ) : null}
              <Link
                href="/settings"
                title={collapsed ? "Settings" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg border border-apple-mist/60 px-3 py-1.5 text-sm transition-all",
                  collapsed && "justify-center px-2.5",
                  settingsActive
                    ? "bg-apple-mist/40 text-apple-charcoal shadow-sm"
                    : "text-apple-smoke hover:bg-apple-mist/40 hover:text-apple-charcoal hover:shadow-sm",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 mr items-center justify-center rounded-full transition-colors",
                    settingsActive
                      ? "bg-[#1f6a37] text-white"
                      : "text-apple-smoke group-hover:text-apple-charcoal",
                  )}
                >
                  <Settings size={15} />
                </div>
                {!collapsed ? (
                  <span className="font-medium">Settings</span>
                ) : null}
              </Link>

              <div className="pt-2">
                <SignOutButton
                  variant="sidebar"
                  collapsed={collapsed}
                  title={collapsed ? "Logout" : undefined}
                />
              </div>

              <div className="pt-4">
                <div
                  title={
                    collapsed
                      ? profile?.full_name?.trim() ||
                        profile?.username ||
                        "Signed-in user"
                      : undefined
                  }
                  className={cn(
                    collapsed
                      ? "flex justify-center"
                      : "rounded-2xl border border-apple-mist bg-white p-3 shadow-[0_8px_20px_rgba(24,83,43,0.06)]",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-3",
                      collapsed && "justify-center",
                    )}
                  >
                    <ProfileAvatar
                      avatarUrl={getProfileAvatarPublicUrl(
                        profile?.avatar_path,
                      )}
                      name={profile?.full_name?.trim() || profile?.username}
                      sizeClassName={collapsed ? "h-8 w-8" : "h-10 w-10"}
                      textClassName="text-xs"
                    />
                    {!collapsed ? (
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-apple-charcoal">
                          {profile?.full_name?.trim() ||
                            profile?.username ||
                            "Signed-in user"}
                        </p>
                        <p className="truncate text-xs text-apple-steel">
                          {profile?.username
                            ? ` ${formatRoleLabel(profile.role)}`
                            : "Loading account details..."}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {!collapsed ? (
                  <p className="pt-4 text-center text-[11px] text-[#b6c1c7]">
                    Copyright @2026 Veron Software. <br />
                    All rights reserved.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </aside>

        <div
          className={cn(
            "min-h-screen transition-[padding] duration-300",
            collapsed ? "lg:pl-[80px]" : "lg:pl-[286px]",
          )}
        >
          {/* Mobile top bar */}
          <div
            className="sticky top-0 z-30 flex items-center justify-between border-b border-apple-mist bg-white px-4 lg:hidden"
            style={{ height: headerHeight }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-apple-mist text-apple-charcoal">
                <Building2 className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <p className="font-semibold tracking-[-0.04em] text-apple-charcoal">
                Prodisenyo ProBuild
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-apple-mist text-apple-charcoal hover:bg-apple-mist/40"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
          </div>

          <main className="min-h-screen bg-white ">{children}</main>
        </div>
      </div>
    </div>
  );
}
