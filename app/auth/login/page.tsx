import { redirect } from "next/navigation";
import LoginPage from "@/features/auth/components/LoginPage";
import { getCurrentProfile, getRoleHomePath } from "@/lib/auth";

export const metadata = {
  title: "Login",
};

export default async function LoginRoute({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(getRoleHomePath(profile.role));
  }

  const params = searchParams ? await searchParams : undefined;
  return <LoginPage nextPath={params?.next ?? null} />;
}
