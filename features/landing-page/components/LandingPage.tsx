import AdvantageSection from "@/features/landing-page/components/AdvantageSection";
import LandingCta from "@/features/landing-page/components/LandingCta";
import LandingFooter from "@/features/landing-page/components/LandingFooter";
import LandingHeader from "@/features/landing-page/components/LandingHeader";
import LandingHero from "@/features/landing-page/components/LandingHero";
import ModuleGrid from "@/features/landing-page/components/ModuleGrid";
import ProductTour from "@/features/landing-page/components/ProductTour";
import RolesSection from "@/features/landing-page/components/RolesSection";
import TrustSection from "@/features/landing-page/components/TrustSection";
import WorkflowSection from "@/features/landing-page/components/WorkflowSection";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingHeader />
      <LandingHero />
      <ModuleGrid />
      <WorkflowSection />
      <ProductTour />
      <RolesSection />
      <AdvantageSection />
      <TrustSection />
      <LandingCta />
      <LandingFooter />
    </main>
  );
}
