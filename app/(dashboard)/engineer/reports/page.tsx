import EngineerReportsPageClient from "@/features/engineer/components/EngineerReportsPageClient";
import { requireEngineerWorkspace } from "@/features/engineer/server/requireEngineerWorkspace";
export default async function EngineerReportsPage() { const { data } = await requireEngineerWorkspace(); return <EngineerReportsPageClient projects={data.projects} reports={data.reports} preview={data.dataSource === "mock"} />; }
