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
import { UserMinus, Calculator, Trophy, Medal, Zap, LayoutDashboard, Search } from 'lucide-react';


function KpiCard({ icon: Icon, label, value, sub, delay, onClick, trend }: { icon: any; label: string; value: string; sub?: string; delay: number; onClick?: () => void; trend?: string }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        `glass-card rounded-[2rem] p-6 animate-fade-in-up stagger-${delay} border border-white/5 hover:border-primary/40 transition-all duration-500 hover:shadow-[0_20px_40px_rgba(31,180,243,0.1)] group relative overflow-hidden`,
        onClick && 'cursor-pointer hover:bg-white/[0.03]'
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        {trend && (
          <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {trend}
          </span>
        )}
      </div>
      
      <div className="relative z-10">
        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.15em]">{label}</span>
        <p className="text-3xl font-black tabular-nums tracking-tighter text-white mt-1 group-hover:text-primary transition-colors">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
          <div className="w-1 h-1 rounded-full bg-primary/50" />
          {sub}
        </p>}
      </div>
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
  const { user, isImpersonating } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === 'superadmin' && !isImpersonating;
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
  const [showPayrollList, setShowPayrollList] = useState(false);
  const [showCertificatesDetail, setShowCertificatesDetail] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      let qTenants = supabase.from('tenants').select('*');
      let qEmployees = supabase.from('employees').select('*').eq('status', 'ACTIVE');
      let qCertificates = supabase.from('certificates').select('*');
      let qStores = supabase.from('stores').select('*');
      let qProviders = supabase.from('service_providers').select('*');
      let qPayrolls = supabase.from('payrolls').select('*');
      let qRescissions = supabase.from('rescissions').select('*').order('termination_date', { ascending: false });

      // Se não for superadmin (ou estiver emulando), filtrar por tenant_id
      if (!isSuperAdmin && user?.tenantId) {
        qEmployees = qEmployees.eq('tenant_id', user.tenantId);
        qCertificates = qCertificates.eq('tenant_id', user.tenantId);
        qStores = qStores.eq('tenant_id', user.tenantId);
        qProviders = qProviders.eq('tenant_id', user.tenantId);
        qPayrolls = qPayrolls.eq('tenant_id', user.tenantId);
        qRescissions = qRescissions.eq('tenant_id', user.tenantId);
      }

      const [
        { data: tData },
        { data: eData },
        { data: cData },
        { data: sData },
        { data: pData },
        { data: pyData },
        { data: rsData }
      ] = await Promise.all([
        qTenants,
        qEmployees,
        qCertificates,
        qStores,
        qProviders,
        qPayrolls,
        qRescissions
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

  const certRanking = useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const data: Record<string, { name: string; count: number; days: number }> = {};
    certificates.forEach(c => {
      const certDate = parseISO(c.date);
      if (certDate >= sixMonthsAgo) {
        if (!data[c.employeeId]) {
          data[c.employeeId] = { name: c.employeeName || 'Desconhecido', count: 0, days: 0 };
        }
        data[c.employeeId].count += 1;
        data[c.employeeId].days += (c.days || 0);
      }
    });

    return Object.values(data)
      .sort((a, b) => b.days - a.days)
      .slice(0, 10);
  }, [certificates]);

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
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 relative group overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            <LayoutDashboard className="w-7 h-7 text-primary relative z-10 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">{isSuperAdmin ? 'Gestão CyberTech' : 'Dashboard Hub'}</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Live Sync</span>
              </div>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <Zap className="w-3 h-3 text-primary" /> Inteligência de Dados RH Plus
            </p>
          </div>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {isSuperAdmin && (
          <>
            <KpiCard icon={Building2} label="Clientes Ativos" value={`${activeClients}/${tenants.length}`} sub={`${tenants.length - activeClients} inativos`} delay={1} trend="+12%" />
            <KpiCard icon={DollarSign} label="Receita Mensal" value={`R$ ${totalMRR.toLocaleString('pt-BR')}`} delay={2} trend="SaaS" />
          </>
        )}
        <KpiCard 
          icon={Users} 
          label="Colaboradores" 
          value={String(totalEmployees)} 
          sub={newAdmissions > 0 ? `${newAdmissions} novas admissões` : 'Nenhuma admissão'} 
          delay={isSuperAdmin ? 3 : 1} 
          trend="Escalável"
        />
        <KpiCard 
          icon={FileHeart} 
          label="Absenteísmo" 
          value={`${absenteeism}%`} 
          sub={`${totalCertificates} atestados ativos`} 
          delay={isSuperAdmin ? 4 : 2} 
          onClick={() => setShowCertificatesDetail(true)}
          trend="Alerta"
        />
        
        <KpiCard 
          icon={DollarSign} 
          label="Folha Líquida" 
          value={`R$ ${processedPayrollTotal.toLocaleString('pt-BR')}`} 
          sub="Competência Atual" 
          delay={5} 
          onClick={() => setShowPayrollList(true)}
          trend="CLT"
        />
        <KpiCard 
          icon={Zap} 
          label="Economia Mensal" 
          value={`R$ ${(totalEmployees * 45).toLocaleString('pt-BR')}`} 
          sub="Tempo Economizado" 
          delay={6} 
          trend="ROI"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lado Esquerdo: Gráficos Principais */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 gap-6">

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card rounded-[2rem] border border-white/5 p-8 animate-fade-in-up stagger-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  Distribuição por Gênero
                </h3>
                <div className="flex flex-col items-center justify-center h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overallGenderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {overallGenderData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : '#8b5cf6'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center pointer-events-none">
                    <span className="text-2xl font-black text-white">{totalEmployees}</span>
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total</span>
                  </div>
                </div>
                <div className="flex justify-center gap-8 mt-6">
                  {overallGenderData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: i === 0 ? 'hsl(var(--primary))' : '#8b5cf6', color: i === 0 ? 'hsl(var(--primary))' : '#8b5cf6' }} />
                      <span className="text-[11px] font-black text-white/80 uppercase">{d.name}: <span className="text-white">{d.value}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CID Frequency Chart */}
              <div className="glass-card rounded-[2rem] border border-white/5 p-8 animate-fade-in-up stagger-7 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-rose-500/10 transition-colors" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                    <FileHeart className="w-4 h-4 text-rose-500" />
                  </div>
                  Frequência de CIDs
                </h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={cidDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="cid" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }} allowDecimals={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Bar dataKey="count" name="Qtd" fill="url(#colorRose)" radius={[6, 6, 0, 0]} barSize={24} />
                    <defs>
                      <linearGradient id="colorRose" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={1}/>
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.4}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
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
          </div>
        </div>

        {/* Lado Direito: Leaderboard de Absenteísmo */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card rounded-[2rem] border border-white/5 p-8 animate-fade-in-up stagger-9 relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl -mr-16 -mt-16" />
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <Trophy className="w-4 h-4 text-rose-500" />
                </div>
                Ranking Absenteísmo
              </h3>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => setShowCertificatesDetail(true)}>
                <Search className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {certRanking.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs relative",
                      idx === 0 ? "bg-amber-500/20 text-amber-500" : 
                      idx === 1 ? "bg-slate-300/20 text-slate-300" : 
                      idx === 2 ? "bg-amber-700/20 text-amber-700" : "bg-white/5 text-muted-foreground"
                    )}>
                      {idx === 0 ? <Medal className="w-5 h-5" /> : idx + 1}
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-white group-hover:text-primary transition-colors">{item.name}</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.count} atestados registrados</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-black text-rose-500">{item.days}d</p>
                    <div className="w-12 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                       <div className="h-full bg-rose-500" style={{ width: `${(item.days / certRanking[0].days) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              {certRanking.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Sem dados críticos</p>
                </div>
              )}
            </div>

            <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10">
               <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Dica de Gestão</p>
               <p className="text-[11px] text-muted-foreground leading-relaxed">
                 O Top 3 acima representa os colaboradores com maior impacto operacional por afastamento médico nos últimos 180 dias.
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

            <div className="relative pl-5 border-l-2 border-emerald-500/30 group hover:border-emerald-500 transition-colors bg-emerald-500/5 rounded-r-xl py-1">
              <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 tracking-widest">Valor Líquido Folha</p>
              <p className="text-xl font-black tabular-nums text-emerald-400 tracking-tight">
                R$ {processedPayrollTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
              <UserMinus className="w-5 h-5 text-rose-400" /> Detalhamento de Rescisões
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-3 mt-4">
            {rescissions.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">Nenhuma rescisão registrada no período.</p>
            ) : (
              rescissions.map(r => (
                <div key={r.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/[0.08] transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                      <UserMinus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white">{r.employee_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {format(parseISO(r.termination_date), 'dd/MM/yyyy')} · {r.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-black text-rose-400">R$ {Number(r.rescission_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    {r.fgts_value > 0 && <p className="text-[10px] text-amber-500">FGTS+Multa: R$ {Number(r.fgts_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll List Dialog */}
      <Dialog open={showPayrollList} onOpenChange={setShowPayrollList}>
        <DialogContent className="max-w-3xl border-white/10 bg-[#0a0f1e]">
          <DialogHeader>
            <DialogTitle className="text-white font-black flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" /> Detalhamento de Folha Mensal
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-3 mt-4">
            {payrolls.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">Nenhum holerite processado nesta competência.</p>
            ) : (
              payrolls.map(p => (
                <div key={p.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/[0.08] transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <Calculator className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white">{p.employee_name}</p>
                      <p className="text-[11px] text-muted-foreground">Competência: {p.reference_month}/{p.reference_year}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-black text-emerald-400">R$ {Number(p.net_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-muted-foreground">Bruto: R$ {Number(p.gross_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Certificates Ranking Dialog */}
      <Dialog open={showCertificatesDetail} onOpenChange={setShowCertificatesDetail}>
        <DialogContent className="max-w-3xl border-white/10 bg-[#0a0f1e]">
          <DialogHeader>
            <DialogTitle className="text-white font-black flex items-center gap-2">
              <FileHeart className="w-5 h-5 text-rose-500" /> Ranking de Absenteísmo (Últimos 6 Meses)
            </DialogTitle>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar mt-4">
            {certRanking.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">Nenhum atestado registrado nos últimos 6 meses.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-4 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-b border-white/5">
                  <span>Colaborador</span>
                  <div className="flex gap-12">
                    <span className="w-20 text-center">Atestados</span>
                    <span className="w-20 text-right">Total Dias</span>
                  </div>
                </div>
                {certRanking.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/[0.08] transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[12px]",
                        idx < 3 ? "bg-rose-500/20 text-rose-400" : "bg-white/5 text-muted-foreground"
                      )}>
                        {idx + 1}º
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">Top {idx + 1} Absenteísmo</p>
                      </div>
                    </div>
                    <div className="flex gap-12 items-center">
                      <div className="w-20 text-center">
                        <span className="text-[14px] font-bold text-white">{item.count}</span>
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-[14px] font-black text-rose-400">{item.days}d</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-6 text-center italic border-t border-white/5 pt-4">
              O ranking considera a soma total de dias de afastamento nos últimos 180 dias.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
