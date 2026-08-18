import type { Metadata } from "next";
import LandingPage from "@/features/landing-page/components/LandingPage";

export const metadata: Metadata = {
  title: "Prodisenyo ProBuild | Construction ERP",
  description:
    "Connect project planning, BOQ, procurement, progress, payroll, and costs with Prodisenyo ProBuild.",
};

export default function PublicLandingPage() {
  return <LandingPage />;
}
