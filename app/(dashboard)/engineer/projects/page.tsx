import EngineerProjectsPageClient from "@/features/engineer/components/EngineerProjectsPageClient";
import { requireEngineerWorkspace } from "@/features/engineer/server/requireEngineerWorkspace";
export default async function EngineerProjectsPage() { const { data } = await requireEngineerWorkspace(); return <EngineerProjectsPageClient projects={data.projects} preview={data.dataSource === "mock"} />; }
