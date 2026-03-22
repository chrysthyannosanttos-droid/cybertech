import { MOCK_TENANTS, MOCK_EMPLOYEES, MOCK_CERTIFICATES, MOCK_MRR_DATA, MOCK_STORES, MOCK_SERVICE_PROVIDERS } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Users, DollarSign, TrendingUp, FileHeart, Store, Briefcase } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';

function KpiCard({ icon: Icon, label, value, sub, delay }: { icon: any; label: string; value: string; sub?: string; delay: number }) {
  return (
    <div className={`glass-card rounded-2xl p-5 animate-fade-in-up stagger-${delay} border border-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(31,180,243,0.1)] group`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
          {sub && <p className="text-[10px] text-primary/70 font-medium">{sub}</p>}
        </div>
      </div>
      <p className="text-3xl font-bold tabular-nums tracking-tight text-white">{value}</p>
    </div>
  );
}

const COLORS = [
  '#0ea5e9', // Primary Cyan
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#ec4899', // Pink
];

export default function Dashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');

  const filteredEmployees = useMemo(() => {
    if (selectedStoreId === 'all') return MOCK_EMPLOYEES;
    return MOCK_EMPLOYEES.filter(e => e.storeId === selectedStoreId);
  }, [selectedStoreId]);

  const activeClients = MOCK_TENANTS.filter(t => t.subscription.status === 'active').length;
  const totalMRR = MOCK_TENANTS.filter(t => t.subscription.status === 'active').reduce((s, t) => s + t.subscription.monthlyFee, 0);
  const totalEmployees = filteredEmployees.length;
  const filteredCertificates = MOCK_CERTIFICATES.filter(c => filteredEmployees.some(e => e.id === c.employeeId));
  const totalCertificates = filteredCertificates.length;

  const maleEmployees = filteredEmployees.filter(e => e.gender === 'M');
  const femaleEmployees = filteredEmployees.filter(e => e.gender === 'F');

  const overallGenderData = [
    { name: 'Homens', value: maleEmployees.length },
    { name: 'Mulheres', value: femaleEmployees.length },
  ];

  const roleGenderDistribution = useMemo(() => {
    const data: Record<string, { role: string; H: number; M: number }> = {};
    filteredEmployees.forEach(e => {
      const role = e.role || 'Outros';
      if (!data[role]) data[role] = { role, H: 0, M: 0 };
      if (e.gender === 'M') data[role].H += 1;
      else if (e.gender === 'F') data[role].M += 1;
    });
    return Object.values(data)
      .sort((a, b) => (b.H + b.M) - (a.H + a.M))
      .slice(0, 10); // Show top 10 roles
  }, [filteredEmployees]);

  const cidDistribution = useMemo(() => {
    const data: Record<string, number> = {};
    filteredCertificates.forEach(c => {
      data[c.cid] = (data[c.cid] || 0) + 1;
    });
    return Object.entries(data)
      .map(([cid, count]) => ({ cid, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredCertificates]);

  const storeDistribution = MOCK_STORES.map(store => ({
    name: store.name.replace('SUPER ', 'S.').replace('ATACADO ', 'AT.').replace('VAREJO ', 'V.'),
    count: MOCK_EMPLOYEES.filter(e => e.storeId === store.id).length,
  }));

  const providerCosts = useMemo(() => {
    return MOCK_SERVICE_PROVIDERS.map(p => {
      const extraTotal = p.additionalCosts?.reduce((s, c) => s + c.value, 0) || 0;
      return {
        name: p.name,
        total: p.contractValue + extraTotal,
        base: p.contractValue,
        extra: extraTotal
      };
    }).sort((a, b) => b.total - a.total);
  }, []);

  const totalCertDays = filteredCertificates.reduce((s, c) => s + c.days, 0);
  const absenteeism = totalEmployees > 0 ? ((totalCertDays / (totalEmployees * 22)) * 100).toFixed(1) : '0.0';

  const costs = useMemo(() => {
    return filteredEmployees.reduce((acc, e) => ({
      salary: acc.salary + (e.salary || 0),
      insalubridade: acc.insalubridade + (e.insalubridade || 0),
      periculosidade: acc.periculosidade + (e.periculosidade || 0),
      gratificacao: acc.gratificacao + (e.gratificacao || 0),
      vt: acc.vt + (e.valeTransporte || 0),
      vr: acc.vr + (e.valeRefeicao || 0),
      flex: acc.flex + (e.flexivel || 0),
      mobilidade: acc.mobilidade + (e.mobilidade || 0),
      valeFlex: acc.valeFlex + (e.valeFlexivel || 0),
    }), { salary: 0, insalubridade: 0, periculosidade: 0, gratificacao: 0, vt: 0, vr: 0, flex: 0, mobilidade: 0, valeFlex: 0 });
  }, [filteredEmployees]);

  const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{isSuperAdmin ? 'Painel Administrativo' : 'Dashboard'}</h1>
          <p className="text-[13px] text-muted-foreground">Visão geral e indicadores de desempenho</p>
        </div>
        
        {!isSuperAdmin && (
          <div className="flex items-center gap-3 glass p-1.5 px-4 rounded-full border border-white/10 shadow-lg">
            <span className="text-[12px] font-bold text-muted-foreground whitespace-nowrap uppercase tracking-widest">Unidade</span>
            <div className="h-4 w-[1px] bg-white/10 mx-1" />
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="w-[200px] h-8 text-[12px] border-none bg-transparent focus:ring-0">
                <SelectValue placeholder="Todas as Lojas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Lojas</SelectItem>
                {MOCK_STORES.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isSuperAdmin && (
          <>
            <KpiCard icon={Building2} label="Clientes Ativos" value={`${activeClients}/${MOCK_TENANTS.length}`} sub={`${MOCK_TENANTS.length - activeClients} inativos`} delay={1} />
            <KpiCard icon={DollarSign} label="Receita Mensal" value={`R$ ${totalMRR.toLocaleString('pt-BR')}`} delay={2} />
          </>
        )}
        <KpiCard icon={Users} label="Colaboradores" value={String(totalEmployees)} delay={isSuperAdmin ? 3 : 1} />
        <KpiCard icon={FileHeart} label="Atestados" value={String(totalCertificates)} sub={`Absenteísmo: ${absenteeism}%`} delay={isSuperAdmin ? 4 : 2} />
        {!isSuperAdmin && (
          <>
            <KpiCard icon={Store} label="Lojas Ativas" value={String(MOCK_STORES.length)} delay={3} />
            <KpiCard icon={TrendingUp} label="Folha Estimada" value={`R$ ${filteredEmployees.reduce((s, e) => s + e.salary, 0).toLocaleString('pt-BR')}`} delay={4} />
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-12 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* MRR or Store Distribution */}
            {isSuperAdmin ? (
              <div className="glass-card rounded-2xl border border-white/5 p-6 animate-fade-in-up stagger-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
                <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Faturamento Recorrente (MRR)
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={MOCK_MRR_DATA}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} tickFormatter={v => `R$${v/1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="glass-card rounded-2xl border border-white/5 p-6 animate-fade-in-up stagger-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
                <h3 className="text-sm font-semibold mb-6 flex items-center gap-2 text-white">
                  <Users className="w-4 h-4 text-primary" /> Colaboradores por Loja
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={storeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                    <Bar dataKey="count" fill="url(#colorCyan)" radius={[4, 4, 0, 0]} barSize={32} />
                    <defs>
                      <linearGradient id="colorCyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Overall Gender Pie Chart */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 animate-fade-in-up stagger-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
              <h3 className="text-sm font-semibold mb-6 flex items-center gap-2 text-white">
                <Users className="w-4 h-4 text-primary" /> Distribuição Geral por Gênero
              </h3>
              <div className="flex flex-col items-center justify-center h-[240px]">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={overallGenderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {overallGenderData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(221, 83%, 53%)' : 'hsl(210, 40%, 70%)'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-2">
                  {overallGenderData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? 'hsl(221, 83%, 53%)' : 'hsl(210, 40%, 70%)' }} />
                      <span className="text-[11px] font-medium">{d.name}: <span className="text-muted-foreground">{d.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gender by Role Lateral Chart */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 animate-fade-in-up stagger-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
              <h3 className="text-sm font-semibold mb-6 flex items-center gap-2 text-white">
                <Briefcase className="w-4 h-4 text-primary" /> Quantidade por Gênero e Cargo
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  layout="vertical"
                  data={roleGenderDistribution}
                  margin={{ left: 30, right: 30, top: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="role" 
                    width={150}
                    tick={{ fontSize: 10, fontWeight: 500, fill: 'rgba(255,255,255,0.6)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 20 }} />
                  <Bar dataKey="H" name="Homens" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="M" name="Mulheres" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* CID Frequency Chart */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 animate-fade-in-up stagger-7 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />
              <h3 className="text-sm font-semibold mb-6 flex items-center gap-2 text-white">
                <FileHeart className="w-4 h-4 text-primary" /> Frequência de CIDs (Atestados)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cidDistribution}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="cid" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.6)' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <Bar dataKey="count" name="Qtd Atestados" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Service Provider Costs Chart (Candlestick Style) */}
            <div className="glass-card rounded-2xl border border-white/5 p-6 animate-fade-in-up stagger-8 lg:col-span-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32" />
              <h3 className="text-sm font-semibold mb-6 flex items-center gap-2 text-white">
                <DollarSign className="w-4 h-4 text-primary" /> Distribuição de Custos por Prestador (Vela)
              </h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={providerCosts} margin={{ top: 10, right: 30, left: 20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.6)' }} axisLine={false} tickFormatter={v => `R$${v}`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
                    formatter={(v: any, name: string) => {
                      if (name === 'Variação (Extras)') return `R$ ${v[1] - v[0]}`;
                      return `R$ ${v.toLocaleString('pt-BR')}`;
                    }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ color: 'rgba(255,255,255,0.8)' }}/>
                  <Bar 
                    dataKey={(d) => [d.base, d.total]} 
                    name="Variação (Extras)" 
                    fill="#f59e0b" 
                    radius={[4, 4, 4, 4]}
                    barSize={20}
                  />
                  <Bar 
                    dataKey="base" 
                    name="Custo Base (Contrato)" 
                    fill="#0ea5e9" 
                    radius={[4, 4, 0, 0]}
                    barSize={8}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-muted-foreground mt-2 text-center italic">
                A barra larga (Vela) representa o acréscimo de custos extras sobre o valor base do contrato.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Costs View */}
      {!isSuperAdmin && (
        <div className="glass-card rounded-2xl border border-white/5 p-8 animate-fade-in-up stagger-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl -mr-32 -mt-32" />
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Detalhamento de Custos Mensais</h3>
              <p className="text-[11px] text-emerald-500/70 uppercase tracking-widest font-bold">Competência Atual</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-y-12 gap-x-8">
            {[
              { label: 'Salários Base', value: costs.salary, color: 'text-white' },
              { label: 'Insalubridade', value: costs.insalubridade, color: 'text-rose-400' },
              { label: 'Periculosidade', value: costs.periculosidade, color: 'text-amber-400' },
              { label: 'Gratificações', value: costs.gratificacao, color: 'text-emerald-400' },
              { label: 'Vale Transporte', value: costs.vt, color: 'text-blue-400' },
              { label: 'Vale Refeição', value: costs.vr, color: 'text-indigo-400' },
              { label: 'Flexível', value: costs.flex, color: 'text-purple-400' },
              { label: 'Mobilidade', value: costs.mobilidade, color: 'text-cyan-400' },
              { label: 'FLEXIVEL (Selo)', value: costs.valeFlex, color: 'text-pink-400' },
            ].map((item) => (
              <div key={item.label} className="relative pl-5 border-l-2 border-white/10 group hover:border-primary/50 transition-colors">
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-widest">{item.label}</p>
                <p className={`text-xl font-bold tabular-nums ${item.color} tracking-tight`}>
                  R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
            
            <div className="xl:col-span-1 glass bg-primary/10 p-6 rounded-2xl border border-primary/20 flex flex-col justify-center shadow-[0_0_20px_rgba(14,165,233,0.1)]">
              <p className="text-[10px] font-bold text-primary uppercase mb-1 tracking-widest">Custo Total Consolidado</p>
              <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">
                R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
