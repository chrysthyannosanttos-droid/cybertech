import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateVacations } from '@/lib/cltEngine';
import { TreePalm, Plus, Printer, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';

interface Employee { id: string; name: string; salary: number; periculosidade?: number; insalubridade?: number; gratificacao?: number; admission_date?: string; storeName?: string; }
interface Vacation { id: string; employee_name: string; store_name?: string; vacation_start: string; vacation_end: string; vacation_days: number; net_total: number; gross_total: number; status: string; sell_bonus: boolean; vacation_pay: number; one_third: number; bonus_pay: number; inss_deduction: number; irrf_deduction: number; }

const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function Vacations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'superadmin' || user?.email === 'cristiano';

  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState('');

  const [form, setForm] = useState({
    employeeId: '',
    vacationDays: 30 as 30 | 20 | 15,
    sellBonus: false,
    vacationStart: '',
    dependents: 0,
  });

  const selectedEmp = employees.find(e => e.id === form.employeeId);
  const preview = selectedEmp ? calculateVacations({
    baseSalary: selectedEmp.salary,
    hazardPay: selectedEmp.periculosidade || 0,
    unhealthyPay: selectedEmp.insalubridade || 0,
    bonus: selectedEmp.gratificacao || 0,
    vacationDays: form.vacationDays,
    sellBonus: form.sellBonus,
    dependents: form.dependents,
  }) : null;

  const vacationEnd = form.vacationStart
    ? format(addDays(new Date(form.vacationStart), form.vacationDays - 1), 'yyyy-MM-dd')
    : '';

  const filteredEmps = employees.filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase()));

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Robust tenant_id resolution (same as Employees page)
      let currentTenantId = (user as any)?.tenantId || (user as any)?.tenant_id;
      if (!currentTenantId) {
        const { data: tData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        if (tData?.id) currentTenantId = tData.id;
      }
      if (currentTenantId) setTenantId(currentTenantId);

      // Fetch vacations
      let vacQuery = supabase.from('vacations').select('*').order('created_at', { ascending: false });
      if (currentTenantId) vacQuery = vacQuery.eq('tenant_id', currentTenantId);
      const { data: vData } = await vacQuery;

      // Fetch employees (select * to avoid column mismatch errors)
      const { data: storesData } = await supabase.from('stores').select('id, name');
      let empQuery = supabase.from('employees').select('*').eq('status', 'ACTIVE').order('name');
      if (currentTenantId) empQuery = empQuery.eq('tenant_id', currentTenantId);
      const { data: eData, error: eError } = await empQuery;

      if (eError) console.error('Erro ao buscar funcionários:', eError.message);

      if (vData) setVacations(vData as Vacation[]);
      if (eData) setEmployees((eData || []).map(emp => ({
        ...emp,
        storeName: storesData?.find(s => s.id === emp.store_id)?.name || '—'
      })) as Employee[]);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!form.employeeId || !form.vacationStart || !preview) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    const emp = employees.find(e => e.id === form.employeeId);
    if (!emp) return;

    const { error } = await supabase.from('vacations').insert([{
      employee_id: form.employeeId,
      employee_name: emp.name,
      tenant_id: tenantId,
      vacation_start: form.vacationStart,
      vacation_end: vacationEnd,
      vacation_days: form.vacationDays,
      sell_bonus: form.sellBonus,
      vacation_pay: preview.vacationPay,
      one_third: preview.oneThird,
      bonus_pay: preview.bonusPay,
      gross_total: preview.grossTotal,
      inss_deduction: preview.inss,
      irrf_deduction: preview.irrf,
      net_total: preview.netTotal,
      status: 'PENDENTE',
    }]);

    if (error) {
      toast({ title: 'Erro ao registrar férias', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: '✅ Férias registradas!', description: `${emp.name} — Líquido: ${fmt(preview.netTotal)}` });
    setIsOpen(false);
    setForm({ employeeId: '', vacationDays: 30, sellBonus: false, vacationStart: '', dependents: 0 });
    setTimeout(() => window.location.reload(), 500);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('vacations').delete().eq('id', id);
    if (!error) {
      setVacations(prev => prev.filter(v => v.id !== id));
      toast({ title: 'Registro excluído' });
    }
  };

  const handlePrint = (v: Vacation) => {
    const content = `
      <html><head><title>Recibo de Férias</title><style>
        body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;color:#111;}
        h1{font-size:18px;text-align:center;border-bottom:2px solid #000;padding-bottom:8px;}
        .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;}
        .total{font-weight:bold;font-size:16px;background:#f5f5f5;padding:12px;margin-top:16px;}
        .assinatura{margin-top:60px;display:flex;justify-content:space-between;}
        .assinatura div{text-align:center;border-top:1px solid #000;padding-top:8px;width:45%;}
      </style></head><body>
      <h1>RECIBO DE FÉRIAS</h1>
      <div class="row"><span>Funcionário</span><strong>${v.employee_name}</strong></div>
      <div class="row"><span>Período de Gozo</span><span>${new Date(v.vacation_start).toLocaleDateString('pt-BR')} até ${new Date(v.vacation_end).toLocaleDateString('pt-BR')}</span></div>
      <div class="row"><span>Dias de Férias</span><span>${v.vacation_days} dias${v.sell_bonus ? ' (+ 10 dias abono pecuniário)' : ''}</span></div>
      <div class="row"><span>Remuneração de Férias</span><span>${(v.vacation_pay||0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span></div>
      <div class="row"><span>1/3 Constitucional</span><span>${(v.one_third||0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span></div>
      ${v.bonus_pay > 0 ? `<div class="row"><span>Abono Pecuniário</span><span>${v.bonus_pay.toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span></div>` : ''}
      <div class="row"><span>Total Bruto</span><span>${(v.gross_total||0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span></div>
      <div class="row" style="color:red"><span>(-) INSS</span><span>${(v.inss_deduction||0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span></div>
      <div class="row" style="color:red"><span>(-) IRRF</span><span>${(v.irrf_deduction||0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</span></div>
      <div class="total"><div class="row"><span>VALOR LÍQUIDO A RECEBER</span><strong>${(v.net_total||0).toLocaleString('pt-BR', {style:'currency',currency:'BRL'})}</strong></div></div>
      <div class="assinatura">
        <div>Assinatura da Empresa</div>
        <div>Assinatura do Funcionário</div>
      </div>
      </body></html>
    `;
    const win = window.open('', '_blank');
    win?.document.write(content);
    win?.document.close();
    win?.print();
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <TreePalm className="w-6 h-6 text-emerald-400" />
            </div>
            Módulo de Férias
          </h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 ml-14">
            Cálculo automático CLT — 1/3 constitucional + Abono pecuniário
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) { setEmpSearch(''); } }}>
          <DialogTrigger asChild>
            <Button className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-bold text-[13px] gap-2 shadow-lg shadow-emerald-500/20 text-black">
              <Plus className="w-4 h-4" /> Registrar Férias
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl border-white/10 bg-[#0a0f1e]">
            <DialogHeader>
              <DialogTitle className="text-white font-black flex items-center gap-2">
                <TreePalm className="w-5 h-5 text-emerald-400" /> Lançamento de Férias
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Seleção de funcionário — busca inline */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Funcionário</Label>
                {selectedEmp ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <div>
                      <p className="text-[13px] font-bold text-white">{selectedEmp.name}</p>
                      <p className="text-[11px] text-muted-foreground">Salário: {fmt(selectedEmp.salary)}{(selectedEmp.periculosidade || 0) > 0 ? ` | Pericul.: ${fmt(selectedEmp.periculosidade!)}` : ''}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => setForm(f => ({ ...f, employeeId: '' }))}>
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="flex items-center px-3 border-b border-white/10">
                      <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Buscar funcionário pelo nome..."
                        value={empSearch}
                        onChange={e => setEmpSearch(e.target.value)}
                        className="w-full h-10 bg-transparent text-[13px] text-white outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                      {filteredEmps.length === 0 && (
                        <p className="text-[12px] text-muted-foreground text-center py-4">Nenhum colaborador encontrado</p>
                      )}
                      {filteredEmps.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => { setForm(f => ({ ...f, employeeId: emp.id })); setEmpSearch(''); }}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-primary/10 transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="flex flex-col text-left">
                            <span className="text-[13px] text-white font-bold">{emp.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{emp.storeName}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{fmt(emp.salary)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dias de férias */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Dias de Férias</Label>
                <Select value={String(form.vacationDays)} onValueChange={v => setForm(f => ({ ...f, vacationDays: Number(v) as 30 | 20 | 15 }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 dias (Completo)</SelectItem>
                    <SelectItem value="20">20 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Início das férias */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Início das Férias</Label>
                <Input type="date" value={form.vacationStart} onChange={e => setForm(f => ({ ...f, vacationStart: e.target.value }))} className="bg-white/5 border-white/10 h-10" />
                {vacationEnd && <p className="text-[11px] text-emerald-400 font-medium">Retorno: {new Date(vacationEnd + 'T12:00:00').toLocaleDateString('pt-BR')}</p>}
              </div>

              {/* Dependentes */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Dependentes (IRRF)</Label>
                <Input type="number" min={0} max={10} value={form.dependents} onChange={e => setForm(f => ({ ...f, dependents: Number(e.target.value) }))} className="bg-white/5 border-white/10 h-10" />
              </div>

              {/* Abono pecuniário */}
              <div className="flex items-center justify-between rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                <div>
                  <p className="text-[13px] font-bold text-amber-400">Abono Pecuniário</p>
                  <p className="text-[11px] text-muted-foreground">Venda de 10 dias de férias em dinheiro</p>
                </div>
                <Switch checked={form.sellBonus} onCheckedChange={v => setForm(f => ({ ...f, sellBonus: v }))} />
              </div>

              {/* Preview do cálculo */}
              {preview && (
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-5 space-y-3">
                  <h4 className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Demonstrativo (Prévia)</h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Remuneração de Férias', val: preview.vacationPay, color: 'text-white' },
                      { label: '1/3 Constitucional', val: preview.oneThird, color: 'text-white' },
                      ...(form.sellBonus ? [{ label: 'Abono Pecuniário', val: preview.bonusPay, color: 'text-amber-400' }] : []),
                      { label: 'Total Bruto', val: preview.grossTotal, color: 'text-white font-bold' },
                      { label: '(-) INSS', val: -preview.inss, color: 'text-rose-400' },
                      { label: '(-) IRRF', val: -preview.irrf, color: 'text-rose-400' },
                    ].map(item => (
                      <div key={item.label} className="flex justify-between text-[12px]">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className={item.color}>{fmt(Math.abs(item.val))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[14px] font-black pt-2 border-t border-emerald-500/20">
                      <span className="text-emerald-400">Líquido a Receber</span>
                      <span className="text-emerald-400">{fmt(preview.netTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={handleSave} className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase text-[12px] tracking-widest">
                Confirmar e Registrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de registros */}
      <div className="space-y-3">
        {isLoading && <p className="text-muted-foreground text-[13px] text-center py-12">Carregando...</p>}
        {!isLoading && vacations.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-2xl">
            <TreePalm className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold text-muted-foreground">Nenhum registro de férias encontrado</p>
          </div>
        )}
        {vacations.map(v => (
          <div key={v.id} className="glass-card rounded-2xl border border-white/5 overflow-hidden">
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <TreePalm className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">{v.employee_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(v.vacation_start).toLocaleDateString('pt-BR')} — {new Date(v.vacation_end).toLocaleDateString('pt-BR')} · {v.vacation_days} dias
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[14px] font-black text-emerald-400">{fmt(v.net_total)}</p>
                  <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-full border',
                    v.status === 'PAGO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    v.status === 'CANCELADO' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                    'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                  )}>{v.status}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={e => { e.stopPropagation(); handlePrint(v); }}>
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10" onClick={e => { e.stopPropagation(); handleDelete(v.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {expandedId === v.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            </div>
            {expandedId === v.id && (
              <div className="border-t border-white/5 p-5 bg-white/[0.02]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Férias', val: v.vacation_pay || 0 },
                    { label: '1/3 Constitucional', val: v.one_third || 0 },
                    { label: 'Abono Pecuniário', val: v.bonus_pay || 0 },
                    { label: 'Total Bruto', val: v.gross_total || 0 },
                    { label: '(-) INSS', val: -(v.inss_deduction || 0) },
                    { label: '(-) IRRF', val: -(v.irrf_deduction || 0) },
                    { label: 'Líquido', val: v.net_total || 0 },
                  ].map(item => (
                    <div key={item.label} className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                      <p className={cn('text-[13px] font-bold', item.val < 0 ? 'text-rose-400' : 'text-white')}>{fmt(Math.abs(item.val))}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
