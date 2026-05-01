import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const plans = [
  {
    name: "Iniciante",
    price: "79",
    desc: "Para barbearias iniciando a digitalização",
    features: ["2 barbeiros", "Agenda online", "CRM básico", "Lembretes automáticos", "Suporte por e-mail"],
    popular: false,
  },
  {
    name: "Profissional",
    price: "149",
    desc: "Para barbearias que querem crescer",
    features: ["Barbeiros ilimitados", "Financeiro completo", "Controle de estoque", "Marketing automático", "Relatórios avançados", "Suporte prioritário"],
    popular: true,
  },
  {
    name: "Corporativo",
    price: "299",
    desc: "Para redes e franquias",
    features: ["Multiunidade", "Inteligência de Negócios", "API completa", "Marca própria", "Suporte dedicado", "Integração personalizada"],
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-bold md:text-4xl">
            Planos que <span className="text-gradient-cyan">cabem no bolso</span>
          </h2>
          <p className="text-muted-foreground">Comece grátis por 14 dias. Sem cartão de crédito.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
                plan.popular
                  ? "border-primary bg-card glow-cyan scale-[1.02]"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-cyan px-4 py-1 text-xs font-bold text-primary-foreground">
                  MAIS POPULAR
                </div>
              )}
              <h3 className="mb-1 text-xl font-bold text-card-foreground">{plan.name}</h3>
              <p className="mb-6 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-extrabold text-card-foreground">R${plan.price}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check size={16} className="text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/dashboard">
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-gradient-cyan text-primary-foreground hover:opacity-90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  Começar agora
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
