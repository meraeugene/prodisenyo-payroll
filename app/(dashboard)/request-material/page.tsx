import MaterialRequestPage from "@/features/material-requests/components/MaterialRequestPage";

export default async function RequestMaterialRoute({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; estimateItemId?: string }>;
}) {
  const { projectId, estimateItemId } = await searchParams;
  return (
    <MaterialRequestPage
      defaultProjectId={projectId}
      defaultEstimateItemId={estimateItemId}
    />
  );
}