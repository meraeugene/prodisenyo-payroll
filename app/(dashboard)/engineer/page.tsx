import EngineerOverviewPageClient from "@/features/engineer/components/EngineerOverviewPageClient";
import { requireEngineerWorkspace } from "@/features/engineer/server/requireEngineerWorkspace";

export default async function EngineerOverviewPage() {
  const { data } = await requireEngineerWorkspace();
  return <EngineerOverviewPageClient data={data} />;
}
