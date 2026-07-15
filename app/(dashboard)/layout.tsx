import { getCurrentProfile } from "@/lib/auth";
import DashboardOverlays from "@/components/DashboardOverlays";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentProfile();

  return (
    <DashboardShell profile={profile}>
      {children}
      <DashboardOverlays role={profile?.role ?? null} />
    </DashboardShell>
  );
}
