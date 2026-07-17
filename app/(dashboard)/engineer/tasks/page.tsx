import EngineerTasksPageClient from "@/features/engineer/components/EngineerTasksPageClient";
import { requireEngineerWorkspace } from "@/features/engineer/server/requireEngineerWorkspace";
export default async function EngineerTasksPage() { const { data } = await requireEngineerWorkspace(); return <EngineerTasksPageClient tasks={data.tasks} preview={data.dataSource === "mock"} />; }
