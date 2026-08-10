import { notFound } from "next/navigation";
import EngineerProjectDetailPageClient from "@/features/engineer/components/EngineerProjectDetailPageClient";
import { requireEngineerWorkspace } from "@/features/engineer/server/requireEngineerWorkspace";
export default async function EngineerProjectPage({ params }: { params: Promise<{ id: string }> }) { const [{ id }, { data }] = await Promise.all([params, requireEngineerWorkspace()]); const project = data.projects.find((item) => item.id === id); if (!project) notFound(); return <EngineerProjectDetailPageClient project={project} materialRequests={data.materialRequests.filter((request) => request.project_id === id)} preview={data.dataSource === "mock"} />; }
