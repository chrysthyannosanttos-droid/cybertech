import { createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FooterSection } from "@/components/landing/FooterSection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CYBERBARBERSHOP — Estilo que conecta você ao futuro" },
      { name: "description", content: "Agendamento, CRM, financeiro, estoque e marketing em uma única plataforma SaaS para barbearias." },
      { property: "og:title", content: "CYBERBARBERSHOP — Estilo que conecta você ao futuro" },
      { property: "og:description", content: "Gerencie sua barbearia como um profissional. Agendamento online, CRM e muito mais." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-dark">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <FooterSection />
    </div>
  );
}
