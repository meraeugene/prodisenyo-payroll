import EngineerNotificationsPageClient from "@/features/engineer/components/EngineerNotificationsPageClient";
import { requireEngineerWorkspace } from "@/features/engineer/server/requireEngineerWorkspace";
export default async function EngineerNotificationsPage() { const { data } = await requireEngineerWorkspace(); return <EngineerNotificationsPageClient notifications={data.notifications} preview={data.dataSource === "mock"} />; }
