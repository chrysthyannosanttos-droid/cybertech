import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-32 md:pt-40">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="mx-auto max-w-5xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-subtle bg-cyan-muted px-4 py-1.5 text-sm text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Plataforma #1 para barbearias
        </div>

        <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Gerencie sua barbearia
          <br />
          <span className="text-gradient-cyan">como um profissional</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
          Agendamento, CRM, financeiro, estoque e marketing em uma única
          plataforma. Tudo que você precisa para crescer.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/dashboard">
            <Button size="lg" className="bg-gradient-cyan text-primary-foreground gap-2 px-8 text-base font-semibold shadow-lg glow-cyan hover:opacity-90">
              Começar grátis
              <ArrowRight size={18} />
            </Button>
          </Link>
          <Link to="/pricing">
            <Button variant="outline" size="lg" className="gap-2 border-border px-8 text-base text-foreground hover:bg-secondary">
              Ver planos
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6 md:gap-12">
          {[
            { icon: Calendar, label: "Agendamentos/mês", value: "50k+" },
            { icon: Users, label: "Barbearias ativas", value: "1.200+" },
            { icon: DollarSign, label: "Em transações", value: "R$2M+" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-2">
              <stat.icon size={20} className="text-primary" />
              <span className="text-2xl font-bold text-foreground md:text-3xl">{stat.value}</span>
              <span className="text-xs text-muted-foreground md:text-sm">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
