import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Tenant, Employee, Certificate, Store as StoreType, ServiceProvider } from '@/types';
import { Building2, Users, DollarSign, TrendingUp, FileHeart, Store, Briefcase, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MOCK_MRR_DATA } from '@/data/mockData';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserMinus, Calculator } from 'lucide-react';


function KpiCard({ icon: Icon, label, value, sub, delay, onClick }: { icon: any; label: string; value: string; sub?: string; delay: number; onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        `glass-card rounded-2xl p-5 animate-fade-in-up stagger-${delay} border border-white/5 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(31,180,243,0.1)] group`,
        onClick && 'cursor-pointer hover:bg-white/[0.03]'
      )}
    >
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
  'hsl(var(--primary))', // Dynamic Primary
  '#8b5cf6', // Violet
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#ec4899', // Pink
];

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'superadmin';
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [rescissions, setRescissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRescissionsList, setShowRescissionsList] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [
        { data: tData },
        { data: eData },
        { data: cData },
        { data: sData },
        { data: pData },
        { data: pyData },
        { data: rsData }
      ] = await Promise.all([
        supabase.from('tenants').select('*'),
        supabase.from('employees').select('*').eq('status', 'ACTIVE'),
        supabase.from('certificates').select('*'),
        supabase.from('stores').select('*'),
        supabase.from('service_providers').select('*'),
        supabase.from('payrolls').select('*'),
        supabase.from('rescissions').select('*').order('termination_date', { ascending: false })
      ]);

      if (tData) setTenants(tData.map(t => ({ ...t, employeeCount: t.employee_count, subscription: t.subscription || { status: 'active', monthlyFee: 0 } } as Tenant)));
      if (pyData) setPayrolls(pyData);
      if (eData) setEmployees(eData.map(e => ({
        ...e,
        storeId: e.store_id,
        admissionDate: e.admission_date,
        salary: Number(e.salary),
        valeTransporte: Number(e.vale_transporte),
        valeRefeicao: Number(e.vale_refeicao),
        insalubridade: Number(e.insalubridade),
        periculosidade: Number(e.periculosidade),
        gratificacao: Number(e.gratificacao),
        flexivel: Number(e.flexivel),
        mobilidade: Number(e.mobilidade),
        valeFlexivel: Number(e.vale_flexivel)
      } as Employee)));
      if (cData) setCertificates(cData.map(c => ({ ...c, employeeId: c.employee_id, employeeName: c.employee_name } as unknown as Certificate)));
      if (sData) setStores(sData.map(s => ({ ...s, tenantId: s.tenant_id } as StoreType)));
      if (pData) setProviders(pData.map(p => ({
        ...p,
        tenantId: p.tenant_id,
        contractValue: Number(p.contract_value),
        startDate: p.start_date,
        endDate: p.end_date,
        additionalCosts: p.additional_costs || []
      } as ServiceProvider)));
      if (rsData) setRescissions(rsData);
      
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleFixAllData = async () => {
    if (!window.confirm('Deseja executar a manutenção global? Isso irá:\n1. Ativar todos os funcionários\n2. Corrigir salários > 30.000 (dividir por 100)\n3. Identificar gênero pelo nome')) return;
    
    setIsLoading(true);
    try {
      const { data: emps } = await supabase.from('employees').select('*');
      if (!emps) return;

      const guessGender = (name: string): 'M' | 'F' => {
        const first = name.split(' ')[0].toUpperCase();
        // Heurística simples para nomes brasileiros
        if (first.endsWith('A') || ['BEATRIZ', 'ALICE', 'ESTER', 'RUTH', 'IRACEMA'].includes(first)) return 'F';
        return 'M';
      };

      const updates = emps.map(e => {
        let sal = Number(e.salary || 0);
        if (sal > 30000) sal = sal / 100;
        
        return {
          id: e.id,
          status: 'ACTIVE',
          salary: sal,
          gender: e.gender || guessGender(e.name)
        };
      });

      // Update in batches of 50 to avoid payload issues
      for (let i = 0; i < updates.length; i += 50) {
        const batch = updates.slice(i, i + 50);
        await Promise.all(batch.map(u => 
          supabase.from('employees').update({ 
            status: u.status, 
            salary: u.salary, 
            gender: u.gender 
          }).eq('id', u.id)
        ));
      }

      toast({ title: 'Manutenção concluída!', description: `${updates.length} registros processados.` });
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Erro na manutenção', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    let result = employees;
    if (selectedStoreId !== 'all') {
      result = result.filter(e => e.storeId === selectedStoreId);
    }
    return result;
  }, [selectedStoreId, employees]);

  const newAdmissions = useMemo(() => {
    return filteredEmployees.filter(e => {
      if (!e.admissionDate) return false;
      const date = parseISO(e.admissionDate);
      return isWithinInterval(date, { 
        start: parseISO(startDate), 
        end: parseISO(endDate) 
      });
    }).length;
  }, [filteredEmployees, startDate, endDate]);

  const activeClients = tenants.filter(t => t.subscription.status === 'active').length;
  const totalMRR = tenants.filter(t => t.subscription.status === 'active').reduce((s, t) => s + (t.subscription.monthlyFee || 0), 0);
  const totalEmployees = filteredEmployees.length;
  
  const filteredCertificates = useMemo(() => {
    return certificates.filter(c => {
      const matchStore = selectedStoreId === 'all' || filteredEmployees.some(e => e.id === c.employeeId);
      if (!matchStore) return false;
      
      const date = parseISO(c.date);
      return isWithinInterval(date, { 
        start: parseISO(startDate), 
        end: parseISO(endDate) 
      });
    });
  }, [certificates, filteredEmployees, selectedStoreId, startDate, endDate]);

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

  const storeDistribution = stores.map(store => ({
    name: store.name.replace('SUPER ', 'S.').replace('ATACADO ', 'AT.').replace('VAREJO ', 'V.'),
    count: employees.filter(e => e.storeId === store.id).length,
  }));

  const expiringContracts = useMemo(() => {
    return providers.filter(p => {
      if (!p.endDate) return false;
      const days = Math.ceil((new Date(p.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return days <= 15 && days >= 0;
    });
  }, [providers]);

  const providerCosts = useMemo(() => {
    return providers
      .filter(p => {
        if (!p.startDate) return true;
        const start = parseISO(p.startDate);
        const rangeStart = parseISO(startDate);
        const rangeEnd = parseISO(endDate);
        
        // Show if contract overlaps with selected period
        const pEnd = p.endDate ? parseISO(p.endDate) : new Date(8640000000000000); // Far future
        return start <= rangeEnd && pEnd >= rangeStart;
      })
      .map(p => {
        const extraTotal = p.additionalCosts?.reduce((s: number, c: any) => s + c.value, 0) || 0;
        return {
          name: p.name,
          total: p.contractValue + extraTotal,
          base: p.contractValue,
          extra: extraTotal
        };
      }).sort((a, b) => b.total - a.total);
  }, [providers, startDate, endDate]);

  // Usa dados históricos reais do mockData em vez de valores fabricados
  const mrrChartData = MOCK_MRR_DATA;

  const totalCertDays = useMemo(() => {
    return filteredCertificates.reduce((sum, cert) => sum + (cert.days || 0), 0);
  }, [filteredCertificates]);

  const absenteeism = totalEmployees > 0 ? ((totalCertDays / (totalEmployees * 22)) * 100).toFixed(1) : '0.0';

  const processedPayrollTotal = useMemo(() => {
    return payrolls
      .filter(p => {
        const month = parseInt(startDate.split('-')[1]);
        const year = parseInt(startDate.split('-')[0]);
        return p.reference_month === month && p.reference_year === year;
      })
      .reduce((s, p) => s + (p.net_salary || 0), 0);
  }, [payrolls, startDate]);

  const totalRescissionsValue = useMemo(() => {
    return rescissions
      .filter(r => {
        const date = parseISO(r.termination_date);
        return isWithinInterval(date, { 
          start: parseISO(startDate), 
          end: parseISO(endDate) 
        });
      })
      .reduce((s, r) => s + (r.rescission_value || 0), 0);
  }, [rescissions, startDate, endDate]);

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
      adicionalNoturno: acc.adicionalNoturno + (Number(e.adicional_noturno) || 0),
    }), { salary: 0, insalubridade: 0, periculosidade: 0, gratificacao: 0, vt: 0, vr: 0, flex: 0, mobilidade: 0, valeFlex: 0, adicionalNoturno: 0 });
  }, [filteredEmployees]);

  const totalCost = Object.values(costs).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{isSuperAdmin ? 'Painel Administrativo' : 'Dashboard'}</h1>
          <p className="text-[13px] text-muted-foreground">Visão geral e indicadores de desempenho</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Admin Tools */}
          {user?.role === 'superadmin' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9 gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              onClick={handleFixAllData}
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} /> Manutenção Global
            </Button>
          )}

          {/* Period Filter */}
          <div className="flex items-center gap-2 glass p-1.5 px-3 rounded-full border border-white/10 shadow-lg group">
             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Período</span>
             <div className="h-4 w-[1px] bg-white/10 mx-1" />
             <div className="flex items-center gap-1 group-hover:text-primary transition-colors">
                <Input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="h-7 w-[120px] bg-transparent border-none text-[11px] p-0 focus-visible:ring-0 cursor-pointer" 
                />
                <span className="text-muted-foreground text-[10px] font-bold">até</span>
                <Input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="h-7 w-[120px] bg-transparent border-none text-[11px] p-0 focus-visible:ring-0 cursor-pointer text-right px-1" 
                />
             </div>
          </div>

          {!isSuperAdmin && (
            <div className="flex items-center gap-2 glass p-1.5 px-4 rounded-full border border-white/10 shadow-lg">
              <span className="text-[10px] font-black text-muted-foreground whitespace-nowrap uppercase tracking-widest">Unidade</span>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="w-[180px] h-7 text-[11px] border-none bg-transparent focus:ring-0 p-0 font-bold">
                  <SelectValue placeholder="Todas as Lojas" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  <SelectItem value="all">Todas as Lojas</SelectItem>
                  {stores.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Alertas Críticos */}
      {expiringContracts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          {expiringContracts.map(p => (
            <div key={p.id} className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5 flex items-center justify-between group overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-full bg-rose-500/5 -skew-x-12 translate-x-16 group-hover:translate-x-8 transition-transform" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-400 animate-pulse">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[13px] font-black text-white uppercase tracking-tighter">Contrato vencendo: {p.name}</h4>
                  <p className="text-[11px] text-rose-400 font-bold uppercase tracking-widest">
                    Vence em {Math.ceil((new Date(p.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias — {new Date(p.endDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-black uppercase tracking-widest relative z-10 transition-all active:scale-95"
                onClick={() => window.location.href = '/service-providers'}
              >
                Gerenciar
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isSuperAdmin && (
          <>
            <KpiCard icon={Building2} label="Clientes Ativos" value={`${activeClients}/${tenants.length}`} sub={`${tenants.length - activeClients} inativos`} delay={1} />
            <KpiCard icon={DollarSign} label="Receita Mensal" value={`R$ ${totalMRR.toLocaleString('pt-BR')}`} delay={2} />
          </>
        )}
        <KpiCard 
          icon={Users} 
          label="Colaboradores" 
          value={String(totalEmployees)} 
          sub={newAdmissions > 0 ? `${newAdmissions} novas admissões` : 'Nenhuma admissão'} 
          delay={isSuperAdmin ? 3 : 1} 
        />
        <KpiCard icon={FileHeart} label="Atestados" value={String(totalCertificates)} sub={`Absenteísmo: ${absenteeism}%`} delay={isSuperAdmin ? 4 : 2} />
        {!isSuperAdmin && (
          <>
            <KpiCard icon={DollarSign} label="Salário Líquido" value={`R$ ${processedPayrollTotal.toLocaleString('pt-BR')}`} sub="Lote do mês" delay={3} />
            <KpiCard 
              icon={UserMinus} 
              label="Rescisões Pagas" 
              value={`R$ ${totalRescissionsValue.toLocaleString('pt-BR')}`} 
              sub={`${rescissions.length} registros`} 
              delay={4} 
              onClick={() => setShowRescissionsList(true)}
            />
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
                  <AreaChart data={mrrChartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} tickFormatter={v => `R$${v/1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
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
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1}/>
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
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
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(210, 40%, 70%)'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-2">
                  {overallGenderData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: i === 0 ? 'hsl(var(--primary))' : 'hsl(210, 40%, 70%)' }} />
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
                  <Bar dataKey="H" name="Homens" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={12} />
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
                    fill="hsl(var(--primary))" 
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
            
            <div className="relative pl-5 border-l-2 border-white/10 group hover:border-primary/50 transition-colors">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 tracking-widest">Adicional Noturno</p>
              <p className="text-xl font-bold tabular-nums text-indigo-400 tracking-tight">
                R$ {costs.adicionalNoturno.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            
            <div className="xl:col-span-1 glass bg-primary/10 p-6 rounded-2xl border border-primary/20 flex flex-col justify-center shadow-[0_0_20px_rgba(14,165,233,0.1)]">
              <p className="text-[10px] font-bold text-primary uppercase mb-1 tracking-widest">Custo Total Consolidado</p>
              <p className="text-2xl font-black text-primary tabular-nums tracking-tighter">
                R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rescissions List Dialog */}
      <Dialog open={showRescissionsList} onOpenChange={setShowRescissionsList}>
        <DialogContent className="max-w-3xl border-white/10 bg-[#0a0f1e]">
          <DialogHeader>
            <DialogTitle className="text-white font-black flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-rose-400" /> Histórico de Rescisões Pagas
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-3 mt-4">
            {rescissions.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">Nenhuma rescisão registrada.</p>
            ) : (
              rescissions.map(r => (
                <div key={r.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-white">{r.employee_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {format(parseISO(r.termination_date), 'dd/MM/yyyy')} · {r.type}
                    </p>
                    {r.store_name && <p className="text-[10px] text-primary/70 font-bold uppercase">{r.store_name}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-black text-white">R$ {Number(r.rescission_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    {r.fgts_value > 0 && <p className="text-[10px] text-amber-500">FGTS: R$ {Number(r.fgts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
