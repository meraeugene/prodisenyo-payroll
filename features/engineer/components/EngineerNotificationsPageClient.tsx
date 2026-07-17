"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { TbBell, TbCheck, TbCircleCheck, TbClockExclamation, TbFileAlert, TbPackage } from "react-icons/tb";
import { toast } from "sonner";
import { markAllEngineerNotificationsReadAction, markEngineerNotificationReadAction } from "@/actions/engineer";
import EngineerPageHeader from "@/features/engineer/components/EngineerPageHeader";
import EngineerPreviewBanner from "@/features/engineer/components/EngineerPreviewBanner";
import type { EngineerNotification } from "@/features/engineer/types";
import { formatEngineerDate } from "@/features/engineer/utils/engineerDashboard";

function NotificationIcon({ type }: { type: string }) { if (type.includes("material")) return <TbPackage />; if (type.includes("report")) return <TbFileAlert />; if (type.includes("deadline") || type.includes("overdue")) return <TbClockExclamation />; if (type.includes("approved")) return <TbCircleCheck />; return <TbBell />; }

export default function EngineerNotificationsPageClient({ notifications, preview = false }: { notifications: EngineerNotification[]; preview?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [visibleNotifications, setVisibleNotifications] = useState(notifications);
  const unread = visibleNotifications.filter((notification) => !notification.read_at).length;
  const markAll = () => startTransition(async () => { try { if (preview) setVisibleNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))); else await markAllEngineerNotificationsReadAction(); toast.success("All notifications marked read."); } catch { toast.error("Could not update notifications."); } });
  const markOne = (id: string) => startTransition(async () => { try { if (preview) setVisibleNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: new Date().toISOString() } : item)); else await markEngineerNotificationReadAction(id); } catch { toast.error("Could not update notification."); } });
  return <div className="mx-auto max-w-[1050px] p-4 sm:p-7">{preview ? <EngineerPreviewBanner /> : null}<EngineerPageHeader title="Notifications" description={`${unread} unread update${unread === 1 ? "" : "s"} requiring your attention.`} action={unread ? <button disabled={pending} onClick={markAll} className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[#cdd9d1] bg-white px-4 text-xs font-semibold text-[#087332]"><TbCheck />Mark all read</button> : null} /><section className="mt-6 overflow-hidden rounded-[7px] border border-[#d9e2dc] bg-white"><div className="divide-y divide-[#e2e8e4]">{visibleNotifications.map((notification) => <article key={notification.id} className={`flex gap-4 p-5 ${notification.read_at ? "bg-white" : "bg-[#f6faf7]"}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${notification.read_at ? "bg-[#f0f3f1] text-[#68726b]" : "bg-[#e7f4ea] text-[#087332]"}`}><NotificationIcon type={notification.type} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-semibold">{notification.title}</h2><span className="text-[9px] text-[#7a838c]">{formatEngineerDate(notification.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></div>{notification.body ? <p className="mt-2 text-xs leading-5 text-[#626c75]">{notification.body}</p> : null}<div className="mt-3 flex gap-3">{notification.href ? <Link href={notification.href} className="text-[10px] font-semibold text-[#087332]">Open item</Link> : null}{!notification.read_at ? <button disabled={pending} onClick={() => markOne(notification.id)} className="text-[10px] font-semibold text-[#6e7780]">Mark read</button> : null}</div></div>{!notification.read_at ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#087332]" /> : null}</article>)}</div>{!visibleNotifications.length ? <p className="p-12 text-center text-sm text-[#7a838c]">You are all caught up.</p> : null}</section></div>;
}
