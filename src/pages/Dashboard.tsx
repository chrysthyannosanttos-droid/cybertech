import { MOCK_TENANTS, MOCK_EMPLOYEES, MOCK_CERTIFICATES, MOCK_MRR_DATA, MOCK_STORES } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Users, DollarSign, TrendingUp, FileHeart, Store } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

function KpiCard({ icon: Icon, label, value, sub, delay }: { icon: any; label: string; value: string; sub?: string; delay: number }) {
  return (
    <div className={`bg-card rounded-lg shadow-card p-5 animate-fade-in-up stagger-${delay}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[12px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

const COLORS = ['hsl(221, 83%, 53%)', 'hsl(210, 40%, 70%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(280, 60%, 50%)'];

export default function Dashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';

  const activeClients = MOCK_TENANTS.filter(t => t.subscription.status === 'active').length;
  const totalMRR = MOCK_TENANTS.filter(t => t.subscription.status === 'active').reduce((s, t) => s + t.subscription.monthlyFee, 0);
  const totalEmployees = MOCK_EMPLOYEES.length;
  const totalCertificates = MOCK_CERTIFICATES.length;

  const maleCount = MOCK_EMPLOYEES.filter(e => e.gender === 'M').length;
  const femaleCount = MOCK_EMPLOYEES.filter(e => e.gender === 'F').length;
  const genderData = [
    { name: 'Homens', value: maleCount },
    { name: 'Mulheres', value: femaleCount },
  ];

  const storeDistribution = MOCK_STORES.map(store => ({
    name: store.name.replace('SUPER ', 'S.').replace('ATACADO ', 'AT.').replace('VAREJO ', 'V.'),
    count: MOCK_EMPLOYEES.filter(e => e.storeId === store.id).length,
  }));

  const totalCertDays = MOCK_CERTIFICATES.reduce((s, c) => s + c.days, 0);
  const absenteeism = ((totalCertDays / (totalEmployees * 22)) * 100).toFixed(1);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-semibold">{isSuperAdmin ? 'Painel Administrativo' : 'Dashboard'}</h1>
        <p className="text-[13px] text-muted-foreground">Visão geral do sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isSuperAdmin && (
          <>
            <KpiCard icon={Building2} label="Clientes Ativos" value={`${activeClients}/${MOCK_TENANTS.length}`} sub={`${MOCK_TENANTS.length - activeClients} inativos`} delay={1} />
            <KpiCard icon={DollarSign} label="Receita Mensal" value={`R$ ${totalMRR.toLocaleString('pt-BR')}`} delay={2} />
          </>
        )}
        <KpiCard icon={Users} label="Total Funcionários" value={String(totalEmployees)} delay={isSuperAdmin ? 3 : 1} />
        <KpiCard icon={FileHeart} label="Atestados" value={String(totalCertificates)} sub={`Absenteísmo: ${absenteeism}%`} delay={isSuperAdmin ? 4 : 2} />
        {!isSuperAdmin && (
          <>
            <KpiCard icon={Store} label="Lojas" value={String(MOCK_STORES.length)} delay={3} />
            <KpiCard icon={TrendingUp} label="Folha Estimada" value={`R$ ${MOCK_EMPLOYEES.reduce((s, e) => s + e.salary, 0).toLocaleString('pt-BR')}`} delay={4} />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {isSuperAdmin && (
          <div className="bg-card rounded-lg shadow-card p-5 animate-fade-in-up stagger-5">
            <h3 className="text-[13px] font-semibold mb-4">Receita Recorrente Mensal (MRR)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MOCK_MRR_DATA}>
                <defs>
                  <linearGradient id="mrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v / 1000}k`} />
                <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString('pt-BR')}`, 'MRR']} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
                <Area type="monotone" dataKey="value" stroke="hsl(221, 83%, 53%)" fill="url(#mrr)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-card rounded-lg shadow-card p-5 animate-fade-in-up stagger-5">
          <h3 className="text-[13px] font-semibold mb-4">Funcionários por Loja</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={storeDistribution}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
              <Bar dataKey="count" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-lg shadow-card p-5 animate-fade-in-up stagger-6">
          <h3 className="text-[13px] font-semibold mb-4">Distribuição por Gênero</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={genderData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                  {genderData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {genderData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-[12px]">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-muted-foreground">{d.name}: <span className="font-medium text-foreground">{d.value}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
