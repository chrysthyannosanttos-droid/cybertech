import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState, useEffect } from "react";

import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/dashboard/financeiro")({
  head: () => ({
    meta: [{ title: "Financeiro — CYBERBARBERSHOP" }],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('transacoes').select('*').order('created_at', { ascending: false });
    
    if (!error && data) {
      const formatted = data.map(t => ({
        id: t.id,
        desc: t.descricao,
        barber: t.barbeiro || "Sistema",
        value: t.valor, // already formatted as '+R$ 55.00' initially, let's trust string format
        type: t.tipo, // 'income' or 'expense'
        time: t.hora || "",
        date: t.data || "",
        paymentMethod: t.metodo_pagamento || ""
      }));
      setTransactions(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  // Calculate totals
  const parseValue = (val: string) => parseFloat(val.replace("+R$ ", "").replace("-R$ ", "").replace("R$ ", ""));
  
  const incomes = transactions.filter(t => t.type === "income");
  const expenses = transactions.filter(t => t.type === "expense");
  
  const totalIncome = incomes.reduce((sum, t) => sum + parseValue(t.value), 0);
  const totalExpense = expenses.reduce((sum, t) => sum + parseValue(t.value), 0);
  const profit = totalIncome - totalExpense;

  // Barber commissions (simplified 40% for this example)
  const barbers = Array.from(new Set(transactions.map(t => t.barber).filter(b => b && b !== "Sistema" && b !== "Admin" && b !== "Loja")));
  
  const barberRevenue = barbers.map(name => {
    const barberIncomes = incomes.filter(t => t.barber === name);
    const revenue = barberIncomes.reduce((sum, t) => sum + parseValue(t.value), 0);
    return {
      name,
      revenue: `R$ ${revenue.toFixed(2)}`,
      services: barberIncomes.length,
      commission: `R$ ${(revenue * 0.4).toFixed(2)}` // 40% commission
    };
  });

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Monitoramento de Fluxo de Caixa Real</p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Faturamento Total" value={`R$ ${totalIncome.toFixed(2)}`} change="—" positive />
        <StatCard icon={TrendingUp} label="Receitas" value={`R$ ${totalIncome.toFixed(2)}`} change="—" positive />
        <StatCard icon={TrendingDown} label="Despesas" value={`R$ ${totalExpense.toFixed(2)}`} change="—" />
        <StatCard icon={Wallet} label="Lucro Líquido" value={`R$ ${profit.toFixed(2)}`} change="—" positive />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Movimentações Recentes</h2>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {loading ? (
              <p className="text-center text-muted-foreground py-10">Carregando movimentações...</p>
            ) : transactions.map((t, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg bg-surface p-3 animate-in fade-in duration-300">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  t.type === "income" ? "bg-green-500/10" : "bg-red-500/10"
                }`}>
                  {t.type === "income" ? (
                    <ArrowUpRight size={16} className="text-green-400" />
                  ) : (
                    <ArrowDownRight size={16} className="text-red-400" />
                  )}
                </div>
                <div className="flex-1 text-xs sm:text-sm">
                  <p className="font-medium text-surface-foreground">{t.desc}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.barber} · {t.date} às {t.time} {t.paymentMethod ? `· ${t.paymentMethod}` : ""}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${
                  t.type === "income" ? "text-green-400" : "text-red-400"
                }`}>
                  {t.value}
                </span>
              </div>
            ))}
            {!loading && transactions.length === 0 && (
              <p className="text-center text-muted-foreground italic py-10">Nenhuma movimentação registrada.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 h-fit">
          <h2 className="mb-4 text-lg font-semibold text-card-foreground">Desempenho Profissional</h2>
          <div className="space-y-4">
            {loading ? (
              <p className="text-[10px] text-center text-muted-foreground">Calculando comissões...</p>
            ) : barberRevenue.length === 0 ? (
               <p className="text-[10px] text-center text-muted-foreground">Nenhuma venda atribuída a barbeiros ainda.</p>
            ) : barberRevenue.map((b) => (
              <div key={b.name} className="rounded-lg bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-muted text-[10px] font-bold text-primary">
                      {b.name[0]}
                    </div>
                    <span className="text-sm font-medium text-surface-foreground">{b.name}</span>
                  </div>
                  <span className="text-sm font-bold text-card-foreground">{b.revenue}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  <span>{b.services} serviços</span>
                  <span>Comissão: {b.commission}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
