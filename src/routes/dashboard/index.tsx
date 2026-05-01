import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  UserMinus,
  Star,
  ArrowUpRight,
  TrendingDown
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [{ title: "Dashboard — CYBERBARBERSHOP" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    revenueToday: 0,
    appointmentsToday: 12,
    newClients: 0,
    avgTicket: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  const demoTransactions = [
    { desc: "Corte Alpha + Barba", barber: "Cristiano", time: "10:30", paymentMethod: "Pix", value: "+R$ 75,00", type: "income" },
    { desc: "Pomada Efeito Matte", barber: "Sistema", time: "11:15", paymentMethod: "Dinheiro", value: "+R$ 45,00", type: "income" },
    { desc: "Degradê Pro", barber: "Carlos", time: "12:00", paymentMethod: "Cartão", value: "+R$ 50,00", type: "income" },
    { desc: "Combo Pai e Filho", barber: "Henrique", time: "13:30", paymentMethod: "Pix", value: "+R$ 110,00", type: "income" },
    { desc: "Corte Navalhado", barber: "Cristiano", time: "14:20", paymentMethod: "Cartão", value: "+R$ 45,00", type: "income" },
  ];

  useEffect(() => {
    if (user?.isDemo) {
      setStats({
        revenueToday: 325,
        appointmentsToday: 18,
        newClients: 4,
        avgTicket: 72
      });
      setRecentTransactions(demoTransactions);
      return;
    }

    try {
      // 1. Calculate Revenue and Stats from Transactions
      const savedTransactions = localStorage.getItem("cybertech_transactions");
      if (savedTransactions) {
        const transactions = JSON.parse(savedTransactions);
        const today = new Date().toLocaleDateString("pt-BR");
        
        const transactionsToday = transactions.filter((t: any) => t.date === today && t.type === "income");
        const revToday = transactionsToday.reduce((sum: number, t: any) => {
          const val = parseFloat(t.value.replace("+R$ ", "").replace("-R$ ", ""));
          return isNaN(val) ? sum : sum + val;
        }, 0);

        const totalRev = transactions.filter((t: any) => t.type === "income").reduce((sum: number, t: any) => {
          const val = parseFloat(t.value.replace("+R$ ", "").replace("-R$ ", ""));
          return isNaN(val) ? sum : sum + val;
        }, 0);

        const incomeCount = transactions.filter((t: any) => t.type === "income").length;
        const avg = incomeCount > 0 ? totalRev / incomeCount : 0;

        // 2. Calculate New Clients
        const savedClients = localStorage.getItem("cybertech_clientes");
        const clients = savedClients ? JSON.parse(savedClients) : [];
        const newClientsToday = clients.filter((c: any) => c.lastVisit === today && c.visits === 1).length;

        setStats({
          revenueToday: revToday,
          appointmentsToday: 12 + Math.floor(revToday / 50),
          newClients: newClientsToday || 0,
          avgTicket: avg || 65
        });

        setRecentTransactions(transactions.slice(0, 5));
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  }, [user]);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua barbearia hoje</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Faturamento hoje" value={`R$ ${stats.revenueToday.toFixed(0)}`} change="12%" positive />
        <StatCard icon={Calendar} label="Agendamentos" value={stats.appointmentsToday.toString()} change="8%" positive />
        <StatCard icon={Users} label="Clientes novos" value={stats.newClients.toString()} change="25%" positive />
        <StatCard icon={TrendingUp} label="Ticket médio" value={`R$ ${stats.avgTicket.toFixed(0)}`} change="3%" positive />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-card-foreground">Atividades Recentes</h2>
            <TrendingUp size={16} className="text-primary" />
          </div>
          <div className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((t, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg bg-surface/50 p-3 border border-white/5 animate-in fade-in duration-300">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <DollarSign size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-surface-foreground">{t.desc}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                      {t.barber} · {t.time} · {t.paymentMethod}
                    </p>
                  </div>
                  <span className="text-sm font-black text-green-400 italic">
                    {t.value}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground italic">
                Nenhuma atividade registrada ainda.
              </div>
            )}
          </div>
        </div>

        {/* Quick stats sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Métricas rápidas</h3>
            <div className="space-y-4">
              {[
                { icon: Clock, label: "Ocupação", value: "78%" },
                { icon: UserMinus, label: "Faltas", value: "2%" },
                { icon: Star, label: "Avaliação", value: "4.8" },
                { icon: Users, label: "Retenção", value: "85%" },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <m.icon size={14} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{m.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-card-foreground">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-3 text-sm font-semibold text-card-foreground">Top barbeiro do mês</h3>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-cyan text-sm font-bold text-primary-foreground">
                C
              </div>
              <div>
                <p className="text-sm font-medium text-card-foreground">Carlos Mendes</p>
                <p className="text-[10px] text-muted-foreground">142 atendimentos · R$ 9.230</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
