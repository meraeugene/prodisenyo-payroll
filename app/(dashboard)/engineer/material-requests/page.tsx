import EngineerMaterialRequestsPageClient from "@/features/engineer/components/EngineerMaterialRequestsPageClient";
import { requireEngineerWorkspace } from "@/features/engineer/server/requireEngineerWorkspace";
export default async function EngineerMaterialRequestsPage() { const { data } = await requireEngineerWorkspace(); return <EngineerMaterialRequestsPageClient projects={data.projects} requests={data.materialRequests} preview={data.dataSource === "mock"} />; }
