import MaterialRequestPage from "@/features/material-requests/components/MaterialRequestPage";

export default async function RequestMaterialRoute({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const { projectId } = await searchParams;
  return <MaterialRequestPage defaultProjectId={projectId} />;
}