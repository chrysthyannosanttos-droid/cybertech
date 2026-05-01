import { createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PricingSection } from "@/components/landing/PricingSection";
import { FooterSection } from "@/components/landing/FooterSection";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Planos e Preços — CYBERBARBERSHOP" },
      { name: "description", content: "Escolha o plano ideal para sua barbearia. A partir de R$79/mês." },
      { property: "og:title", content: "Planos e Preços — CYBERBARBERSHOP" },
      { property: "og:description", content: "Comece grátis por 14 dias. Planos a partir de R$79/mês." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-dark">
      <LandingHeader />
      <div className="pt-20">
        <PricingSection />
      </div>
      <FooterSection />
    </div>
  );
}
