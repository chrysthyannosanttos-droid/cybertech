import {
  Calendar,
  Users,
  DollarSign,
  ShoppingBag,
  Package,
  MessageSquare,
  UserCog,
  Building2,
} from "lucide-react";

const features = [
  { icon: Calendar, title: "Agendamento Online", desc: "Agenda por barbeiro com horários em tempo real, lista de espera e confirmação automática." },
  { icon: Users, title: "CRM de Clientes", desc: "Histórico completo, preferências, ticket médio e campanhas de retorno automáticas." },
  { icon: DollarSign, title: "Gestão Financeira", desc: "Caixa diário, comissões, metas, fluxo de caixa e DRE simplificado." },
  { icon: ShoppingBag, title: "PDV e Vendas", desc: "Serviços, produtos, combos, assinaturas, cashback e cupons." },
  { icon: Package, title: "Estoque", desc: "Controle de produtos e insumos com baixa automática e alertas." },
  { icon: MessageSquare, title: "Marketing", desc: "WhatsApp, SMS, e-mail, programa de fidelidade e indicação premiada." },
  { icon: UserCog, title: "Gestão de Equipe", desc: "Escalas, comissões, ranking de performance e metas individuais." },
  { icon: Building2, title: "Multiunidade", desc: "Várias lojas com gestão centralizada e relatórios consolidados." },
];

export function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <h2 className="mb-3 text-3xl font-bold md:text-4xl">
            Tudo em <span className="text-gradient-cyan">um só lugar</span>
          </h2>
          <p className="text-muted-foreground">
            Funcionalidades completas para qualquer tamanho de barbearia.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:bg-accent/50"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-muted">
                <f.icon size={20} className="text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-card-foreground">{f.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
