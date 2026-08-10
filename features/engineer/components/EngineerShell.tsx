"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  TbBell,
  TbBriefcase,
  TbBuildingSkyscraper,
  TbCalculator,
  TbChecklist,
  TbFileDescription,
  TbLayoutDashboard,
  TbMenu2,
  TbPackage,
  TbSettings,
  TbX,
} from "react-icons/tb";
import ProfileAvatar from "@/components/ProfileAvatar";
import SignOutButton from "@/components/auth/SignOutButton";
import { getProfileAvatarPublicUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import { useEngineerNotificationCount } from "@/features/engineer/hooks/useEngineerNotificationCount";

const items = [
  { href: "/engineer", label: "Overview", icon: TbLayoutDashboard, exact: true },
  { href: "/engineer/projects", label: "Projects", icon: TbBuildingSkyscraper },
  { href: "/cost-estimator", label: "Cost Estimator", icon: TbCalculator },
  { href: "/engineer/tasks", label: "My Tasks", icon: TbChecklist },
  { href: "/engineer/material-requests", label: "Material Requests", icon: TbPackage },
  { href: "/engineer/reports", label: "Reports", icon: TbFileDescription },
  { href: "/engineer/notifications", label: "Notifications", icon: TbBell },
] as const;

type ShellProfile = {
  full_name: string | null;
  username: string;
  avatar_path: string | null;
};

export default function EngineerShell({ children, profile }: { children: React.ReactNode; profile: ShellProfile | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const notificationCount = useEngineerNotificationCount();
  const displayName = profile?.full_name?.trim() || profile?.username || "Engineer";

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#171b22]">
      {open ? <button type="button" aria-label="Close navigation overlay" className="fixed inset-0 z-40 bg-black/25 lg:hidden" onClick={() => setOpen(false)} /> : null}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-[214px] flex-col border-r border-[#e2e9e4] bg-white transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-[96px] items-center justify-between px-5">
          <Link href="/engineer" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-[7px] bg-[#087332] text-white"><TbBriefcase size={23} strokeWidth={1.8} /></span>
            <span className="leading-none"><span className="block text-[9px] font-semibold tracking-[0.04em] text-[#333b43]">PRODISENYO</span><span className="mt-1 block text-[15px] font-bold tracking-[-0.03em] text-[#087332]">PROBUILD</span></span>
          </Link>
          <button type="button" className="grid h-9 w-9 place-items-center text-[#58616b] lg:hidden" onClick={() => setOpen(false)} aria-label="Close navigation"><TbX size={22} /></button>
        </div>

        <nav className="flex-1 space-y-2 px-2.5 pt-2" aria-label="Engineer workspace">
          {items.map((item) => {
            const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex h-[43px] items-center gap-3 rounded-[5px] border-l-2 px-4 text-[13px] font-medium transition", active ? "border-[#087332] bg-[#edf5ef] text-[#07612b]" : "border-transparent text-[#424b55] hover:bg-[#f5f8f6] hover:text-[#087332]")}>
                <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.href === "/engineer/notifications" && notificationCount > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#d92132] px-1 text-[8px] font-bold text-white">{notificationCount > 99 ? "99+" : notificationCount}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#e4e9e5] p-3">
          <Link href="/settings" className="mb-2 flex h-10 items-center gap-3 rounded-[5px] px-3 text-xs text-[#59616a] hover:bg-[#f4f7f5]"><TbSettings size={18} />Settings</Link>
          <div className="flex items-center gap-2.5 rounded-[6px] p-1.5">
            <ProfileAvatar avatarUrl={getProfileAvatarPublicUrl(profile?.avatar_path)} name={displayName} sizeClassName="h-9 w-9" textClassName="text-[10px]" />
            <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-[#20262e]">{displayName}</p><p className="text-[9px] text-[#7a838d]">Engineer / Project Manager</p></div>
          </div>
          <div className="mt-1"><SignOutButton variant="sidebar" collapsed={false} /></div>
        </div>
      </aside>

      <div className="min-h-screen min-w-0 lg:pl-[214px]">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#e3e9e5] bg-white px-4 lg:hidden">
          <Link href="/engineer" className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-[6px] bg-[#087332] text-white"><TbBriefcase size={18} /></span><span className="text-sm font-bold text-[#087332]">PROBUILD</span></Link>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-[#dce5df] text-[#26302a]" onClick={() => setOpen(true)} aria-label="Open navigation"><TbMenu2 size={21} /></button>
        </header>
        <main className="min-h-screen min-w-0 overflow-x-hidden bg-[#fdfefd]">{children}</main>
      </div>
    </div>
  );
}
