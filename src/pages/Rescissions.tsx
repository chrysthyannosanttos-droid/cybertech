import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateRescission, RescissionType, monthsBetween } from '@/lib/cltEngine';
import { addAuditLog } from '@/data/mockData';
import { UserMinus, Plus, Search, Trash2, Printer, ChevronDown, ChevronUp, Calculator, Sparkles, DollarSign, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Employee { id: string; name: string; salary: number; periculosidade?: number; insalubridade?: number; gratificacao?: number; adicionalNoturno?: number; admission_date?: string; storeName?: string; }
interface Rescission {
  id: string; employee_id: string; employee_name: string; termination_date: string;
  fgts_value: number; rescission_value: number; type: string; tenant_id: string;
  admission_date?: string; last_salary?: number; gross_value?: number;
  inss_deduction?: number; irrf_deduction?: number;
  other_deductions?: number;
  items?: any[];
}

const fmt = (n: number) => `R$ ${(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

const TYPE_NAMES: Record<string, string> = {
  SEM_JUSTA_CAUSA: 'Sem Justa Causa',
  COM_JUSTA_CAUSA: 'Com Justa Causa',
  PEDIDO_DEMISSAO: 'Pedido de Demissão',
  ACORDO: 'Rescisão por Acordo',
  INDENIZADO: 'Aviso Prévio Indenizado',
  TRABALHADO: 'Aviso Prévio Trabalhado',
  TERMINO_CONTRATO: 'Término de Contrato',
};

export default function Rescissions() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'tenant';

  const [rescissions, setRescissions] = useState<Rescission[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAiExp, setShowAiExp] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [empSearch, setEmpSearch] = useState('');

  const [form, setForm] = useState({
    employeeId: '',
    type: 'SEM_JUSTA_CAUSA' as RescissionType,
    terminationDate: new Date().toISOString().split('T')[0] as string,
    admissionDate: '' as string,
    lastSalary: 0,
    hazardPay: 0,
    unhealthyPay: 0,
    fgtsBalance: 0,
    hasVestedVacation: false,
    noticePeriodWorked: false,
    dependents: 0,
    extraHours: 0,
    extraHoursPercent: 0.5,
    additionalDeductions: 0,
    nightShiftPay: 0,
    manualDeductions: [] as { id: string; description: string; value: number }[],
  });

  const selectedEmp = employees.find(e => e.id === form.employeeId);
  const filteredEmps = employees.filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase()));

  // preview dinâmico
  const preview = (form.admissionDate || selectedEmp?.admission_date) && form.terminationDate && form.lastSalary > 0
    ? (() => {
        try {
          return calculateRescission({
            type: form.type,
            admissionDate: new Date(form.admissionDate || selectedEmp?.admission_date || ''),
            terminationDate: new Date(form.terminationDate),
            lastSalary: form.lastSalary,
            hazardPay: form.hazardPay,
            unhealthyPay: form.unhealthyPay,
            fgtsBalance: form.fgtsBalance,
            hasVestedVacation: form.hasVestedVacation,
            noticePeriodWorked: form.noticePeriodWorked,
            dependents: form.dependents,
            extraHours: form.extraHours,
            extraHoursPercent: form.extraHoursPercent,
            additionalDeductions: (form.additionalDeductions || 0) + form.manualDeductions.reduce((sum, d) => sum + (d.value || 0), 0),
            nightShiftPay: form.nightShiftPay,
          });
        } catch { return null; }
      })()
    : null;

  useEffect(() => {
    const fetchData = async () => {
      // Robust tenant_id resolution (same as Employees page)
      let currentTenantId = (currentUser as any)?.tenantId || (currentUser as any)?.tenant_id;
      if (!currentTenantId) {
        const { data: tData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        if (tData?.id) currentTenantId = tData.id;
      }
      if (currentTenantId) setTenantId(currentTenantId);

      // Fetch rescissions
      let resQuery = supabase.from('rescissions').select('*').order('created_at', { ascending: false });
      if (currentTenantId) resQuery = resQuery.eq('tenant_id', currentTenantId);
      const { data: rData } = await resQuery;

      // Fetch employees (select * to avoid column mismatch errors)
      let empQuery = supabase.from('employees').select('*').eq('status', 'ACTIVE').order('name');
      if (currentTenantId) empQuery = empQuery.eq('tenant_id', currentTenantId);
      const { data: eData, error: eError } = await empQuery;

      if (eError) console.error('Erro ao buscar funcionários:', eError.message);

      if (rData) setRescissions(rData as Rescission[]);
      if (eData) setEmployees(eData as Employee[]);
    };
    fetchData();
  }, []);

  // Ao selecionar funcionário, preenche dados automaticamente
  useEffect(() => {
    if (selectedEmp) {
      setForm(f => ({
        ...f,
        lastSalary: selectedEmp.salary,
        hazardPay: selectedEmp.periculosidade || 0,
        unhealthyPay: selectedEmp.insalubridade || 0,
        admissionDate: selectedEmp.admission_date || '',
        nightShiftPay: selectedEmp.adicionalNoturno || 0,
      }));
    }
  }, [form.employeeId]);

  const handleSave = async () => {
    if (!form.employeeId || !form.terminationDate || !preview) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const emp = employees.find(e => e.id === form.employeeId);
    if (!emp) return;

    const { error } = await supabase.from('rescissions').insert([{
      employee_id: form.employeeId,
      employee_name: emp.name,
      store_name: emp.storeName,
      termination_date: form.terminationDate,
      fgts_value: preview.multaFGTS + preview.fgtsTotal,
      rescission_value: preview.valorLiquido,
      type: form.type,
      tenant_id: tenantId,
      admission_date: form.admissionDate || selectedEmp?.admission_date,
      last_salary: form.lastSalary,
      gross_value: preview.totalCreditos,
      inss_deduction: preview.inss,
      irrf_deduction: preview.irrf,
      other_deductions: (form.additionalDeductions || 0) + form.manualDeductions.reduce((sum, d) => sum + (d.value || 0), 0),
      items: preview.items,
    }]);

    if (error) {
      toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
      return;
    }

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Sistema',
      action: 'CREATE_RESCISSION',
      details: `[Rescisões] Rescisão de ${emp.name} — Tipo: ${TYPE_NAMES[form.type]} — Líquido: ${fmt(preview.valorLiquido)}`,
    });

    // Atualiza o estado local sem recarregar a página
    const { data: newRow } = await supabase
      .from('rescissions')
      .select('*')
      .eq('employee_id', form.employeeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (newRow) {
      setRescissions(prev => [newRow as Rescission, ...prev]);
    }

    toast({ title: '✅ Rescisão calculada e registrada!', description: `${emp.name} — Líquido: ${fmt(preview.valorLiquido)}` });
    setIsOpen(false);
    setForm({ employeeId: '', type: 'SEM_JUSTA_CAUSA', terminationDate: new Date().toISOString().split('T')[0], admissionDate: '', lastSalary: 0, hazardPay: 0, unhealthyPay: 0, fgtsBalance: 0, hasVestedVacation: false, noticePeriodWorked: false, dependents: 0, extraHours: 0, extraHoursPercent: 0.5, additionalDeductions: 0, manualDeductions: [], nightShiftPay: 0 });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) return;
    // Usa toast/confirm nativo apenas como fallback seguro
    if (!window.confirm(`Excluir rescisão de ${name}?`)) return;
    const { error } = await supabase.from('rescissions').delete().eq('id', id);
    if (!error) {
      setRescissions(prev => prev.filter(r => r.id !== id));
      toast({ title: 'Excluído com sucesso' });
    } else {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const handlePrint = (r: Rescission) => {
    const win = window.open('', '_blank');
    const months = r.admission_date && r.termination_date
      ? monthsBetween(new Date(r.admission_date), new Date(r.termination_date))
      : '—';
    win?.document.write(`<html><head><title>Rescisão — ${r.employee_name}</title><style>
      body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;font-size:13px;}
      h1{text-align:center;font-size:16px;border-bottom:2px solid #000;padding-bottom:8px;}
      .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;}
      .credit{color:#167a3c;font-weight:bold;} .deduction{color:#c0392b;font-weight:bold;}
      .total{background:#f0f0f0;padding:12px;margin-top:16px;font-weight:bold;font-size:15px;}
      .assin{margin-top:60px;display:flex;justify-content:space-between;}
      .assin div{text-align:center;border-top:1px solid #000;padding-top:8px;width:45%;}
    </style></head><body>
    <h1>TERMO DE RESCISÃO DE CONTRATO DE TRABALHO</h1>
    <div class="row"><span>Funcionário</span><strong>${r.employee_name}</strong></div>
    ${(r as any).store_name ? `<div class="row"><span>Unidade/Loja</span><span>${(r as any).store_name}</span></div>` : ''}
    <div class="row"><span>Data de Admissão</span><span>${r.admission_date ? new Date(r.admission_date).toLocaleDateString('pt-BR') : '—'}</span></div>
    <div class="row"><span>Data de Demissão</span><span>${new Date(r.termination_date).toLocaleDateString('pt-BR')}</span></div>
    <div class="row"><span>Tempo de Serviço</span><span>${months} meses</span></div>
    <div class="row"><span>Motivo</span><strong>${TYPE_NAMES[r.type] || r.type}</strong></div>
    <div class="row"><span>Último Salário</span><span>${fmt(r.last_salary || 0)}</span></div>
    <div class="row"><span>Total Bruto (Proventos)</span><span class="credit">${fmt(r.gross_value || r.rescission_value)}</span></div>
    <div class="row"><span>INSS Descontado</span><span class="deduction">-${fmt(r.inss_deduction || 0)}</span></div>
    <div class="row"><span>IRRF Descontado</span><span class="deduction">-${fmt(r.irrf_deduction || 0)}</span></div>
    ${r.other_deductions ? `<div class="row"><span>Outros Descontos</span><span class="deduction">-${fmt(r.other_deductions)}</span></div>` : ''}
    <div class="row"><span>FGTS + Multa (Disponível para Saque)</span><span class="credit">+${fmt(r.fgts_value || 0)}</span></div>
    <div class="total"><div class="row"><span>VALOR LÍQUIDO A RECEBER (DEPÓSITO)</span><strong>${fmt(r.rescission_value)}</strong></div></div>
    <div style="margin-top:20px; font-size:10px; color:#666; text-align:justify; line-height:1.4;">
      Nota: O valor acima refere-se às verbas rescisórias depositadas em conta. O saldo de FGTS e a multa de 40% (se aplicável) são movimentados via chave de saque na Caixa Econômica Federal.
    </div>
    <div class="assin"><div>Assinatura da Empresa</div><div>Assinatura do Funcionário</div></div>
    </body></html>`);
    win?.document.close();
    win?.print();
  };

  const filtered = rescissions.filter(r => r.employee_name?.toLowerCase().includes(search.toLowerCase()));
  
  const totalNetValue = rescissions.reduce((acc, r) => acc + (r.rescission_value || 0), 0);
  const totalFgtsValue = rescissions.reduce((acc, r) => acc + (r.fgts_value || 0), 0);
  const totalGrossValue = rescissions.reduce((acc, r) => acc + (r.gross_value || 0), 0);

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <UserMinus className="w-6 h-6 text-rose-400" />
            </div>
            Rescisões
          </h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 ml-14">
            Calculadora automática CLT — Multa FGTS, Férias, 13º, INSS, IRRF
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) setEmpSearch(''); }}>
          <DialogTrigger asChild>
            <Button className="h-10 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 font-bold text-[13px] gap-2 shadow-lg shadow-rose-500/20">
              <Plus className="w-4 h-4" /> Nova Rescisão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl border-white/10 bg-[#0a0f1e]">
            <DialogHeader>
              <DialogTitle className="text-white font-black flex items-center gap-2">
                <Calculator className="w-5 h-5 text-rose-400" /> Calculadora de Rescisão (CLT)
              </DialogTitle>
            </DialogHeader>

            <div className="max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar space-y-4 mt-2">
              {/* Funcionário — busca inline */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Funcionário</Label>
                {selectedEmp ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <div>
                      <p className="text-[13px] font-bold text-white">{selectedEmp.name}</p>
                      <p className="text-[11px] text-muted-foreground">Loja: {selectedEmp.storeName} · Salário: {fmt(selectedEmp.salary)} · Admissão: {selectedEmp.admission_date ? new Date(selectedEmp.admission_date).toLocaleDateString('pt-BR') : '—'}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => setForm(f => ({ ...f, employeeId: '', lastSalary: 0, hazardPay: 0, unhealthyPay: 0, admissionDate: '' }))}>
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

              {/* Tipo de Rescisão */}
              <div className="space-y-2">
                <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Motivo do Desligamento</Label>
                <RadioGroup value={form.type} onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))} className="grid grid-cols-2 gap-2">
                  {Object.entries(TYPE_NAMES).map(([val, label]) => (
                    <div key={val} className={cn('flex items-center space-x-2 p-3 rounded-xl border cursor-pointer transition-colors',
                      form.type === val ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10')}>
                      <RadioGroupItem value={val} id={`r-${val}`} className="border-rose-500 text-rose-500" />
                      <Label htmlFor={`r-${val}`} className={cn('text-[12px] cursor-pointer', val === 'COM_JUSTA_CAUSA' && 'text-rose-400')}>{label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Data de Admissão</Label>
                  <Input type="date" value={form.admissionDate || selectedEmp?.admission_date || ''} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} className="bg-white/5 border-white/10 h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Data de Demissão</Label>
                  <Input type="date" value={form.terminationDate} onChange={e => setForm(f => ({ ...f, terminationDate: e.target.value }))} className="bg-white/5 border-white/10 h-10" />
                </div>
              </div>

              {/* Remuneração */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Último Salário</Label>
                  <Input type="number" value={form.lastSalary || ''} onChange={e => setForm(f => ({ ...f, lastSalary: Number(e.target.value) }))} className="bg-white/5 border-white/10 h-10" placeholder="R$ 0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Periculosidade</Label>
                  <Input type="number" value={form.hazardPay || ''} onChange={e => setForm(f => ({ ...f, hazardPay: Number(e.target.value) }))} className="bg-white/5 border-white/10 h-10" placeholder="R$ 0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Insalubridade</Label>
                  <Input type="number" value={form.unhealthyPay || ''} onChange={e => setForm(f => ({ ...f, unhealthyPay: Number(e.target.value) }))} className="bg-white/5 border-white/10 h-10" placeholder="R$ 0,00" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Adic. Noturno</Label>
                  <Input type="number" value={form.nightShiftPay || ''} onChange={e => setForm(f => ({ ...f, nightShiftPay: Number(e.target.value) }))} className="bg-white/5 border-white/10 h-10" placeholder="R$ 0,00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Saldo FGTS (para multa)</Label>
                  <Input type="number" value={form.fgtsBalance || ''} onChange={e => setForm(f => ({ ...f, fgtsBalance: Number(e.target.value) }))} className="bg-white/5 border-white/10 h-10" placeholder="Se 0, estima automaticamente" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Dependentes (IRRF)</Label>
                  <Input type="number" min={0} max={10} value={form.dependents || ''} onChange={e => setForm(f => ({ ...f, dependents: Number(e.target.value) }))} className="bg-white/5 border-white/10 h-10" />
                </div>
              </div>

              {/* Horas Extras */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Horas Extras a Pagar</Label>
                  <Input type="number" value={form.extraHours || ''} onChange={e => setForm(f => ({ ...f, extraHours: Number(e.target.value) }))} className="bg-white/5 border-white/10 h-10" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">% Hora Extra</Label>
                  <Select value={String(form.extraHoursPercent)} onValueChange={v => setForm(f => ({ ...f, extraHoursPercent: Number(v) }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-white/10 text-white">
                      <SelectItem value="0.5">50% (Padrão)</SelectItem>
                      <SelectItem value="1.0">100% (Feriados/Dom)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lista de Descontos Manuais */}
              <div className="space-y-3 p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black text-rose-400 uppercase tracking-widest">Descontos Manuais / Ajustes</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[10px] font-bold text-rose-400 hover:bg-rose-500/10 gap-1"
                    onClick={() => setForm(f => ({ 
                      ...f, 
                      manualDeductions: [...f.manualDeductions, { id: crypto.randomUUID(), description: '', value: 0 }] 
                    }))}
                  >
                    <Plus className="w-3 h-3" /> Adicionar Desconto
                  </Button>
                </div>

                <div className="space-y-2">
                  {form.manualDeductions.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic text-center py-2">Nenhum desconto manual adicionado.</p>
                  )}
                  {form.manualDeductions.map((ded, idx) => (
                    <div key={ded.id} className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1">
                      <Input 
                        placeholder="Ex: Quebra de Caixa" 
                        value={ded.description}
                        onChange={e => {
                          const newList = [...form.manualDeductions];
                          newList[idx].description = e.target.value;
                          setForm(f => ({ ...f, manualDeductions: newList }));
                        }}
                        className="bg-white/5 border-white/10 h-9 text-[12px]"
                      />
                      <div className="relative w-[150px] shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-500/50">R$</span>
                        <Input 
                          type="number" 
                          placeholder="0,00" 
                          value={ded.value || ''}
                          onChange={e => {
                            const newList = [...form.manualDeductions];
                            newList[idx].value = Number(e.target.value);
                            setForm(f => ({ ...f, manualDeductions: newList }));
                          }}
                          className="bg-white/5 border-white/10 h-9 pl-7 text-[12px] font-bold text-rose-400"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-muted-foreground hover:text-rose-500"
                        onClick={() => {
                          setForm(f => ({ 
                            ...f, 
                            manualDeductions: f.manualDeductions.filter(d => d.id !== ded.id) 
                          }));
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Switches */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3">
                  <div>
                    <p className="text-[12px] font-bold text-white">Férias Vencidas</p>
                    <p className="text-[10px] text-muted-foreground">Período anterior completo</p>
                  </div>
                  <Switch checked={form.hasVestedVacation} onCheckedChange={v => setForm(f => ({ ...f, hasVestedVacation: v }))} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-3">
                  <div>
                    <p className="text-[12px] font-bold text-white">Aviso Trabalhado</p>
                    <p className="text-[10px] text-muted-foreground">Não desconta do líquido</p>
                  </div>
                  <Switch checked={form.noticePeriodWorked} onCheckedChange={v => setForm(f => ({ ...f, noticePeriodWorked: v }))} />
                </div>
              </div>

              {/* Preview */}
              {preview && (
                <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-5 space-y-3">
                  <h4 className="text-[11px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                    <Calculator className="w-3.5 h-3.5" /> Demonstrativo Rescisório (Prévia)
                  </h4>
                  <div className="space-y-1.5">
                    {preview.items.map(item => (
                      <div key={item.description} className="flex justify-between text-[12px]">
                        <span className="text-muted-foreground">{item.description}</span>
                        <span className={item.type === 'CREDIT' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {item.type === 'DEDUCTION' ? '-' : '+'}{fmt(item.value)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-[14px] font-black pt-3 border-t border-rose-500/20 mt-2">
                      <span className="text-white">Valor Líquido</span>
                      <span className="text-white">{fmt(preview.valorLiquido)}</span>
                    </div>
                  </div>

                  {/* Timeline / Barra de Proporção (Premium Feature) */}
                  <div className="pt-2">
                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase mb-1">
                      <span>Proporção FGTS + Multa</span>
                      <span>{((preview.multaFGTS + preview.fgtsTotal) / (preview.valorLiquido + preview.multaFGTS + preview.fgtsTotal) * 100).toFixed(0)}% do montante</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500" 
                        style={{ width: `${(preview.multaFGTS + preview.fgtsTotal) / (preview.valorLiquido + preview.multaFGTS + preview.fgtsTotal) * 100}%` }} 
                      />
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowAiExp(!showAiExp)}
                    className="w-full text-[11px] font-bold text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 gap-2 h-8"
                  >
                    {showAiExp ? <ChevronUp className="w-3 h-3" /> : <Sparkles className="w-3 h-3 text-amber-400" />}
                    {showAiExp ? "Ocultar Explicação IA" : "IA: Por que este valor?"}
                  </Button>

                  {showAiExp && (
                    <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300">
                      <p className="font-bold text-white mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" /> RESUMO DO CÁLCULO
                      </p>
                      O cálculo considera <strong>{preview.type}</strong>. 
                      O saldo de salário é proporcional aos dias trabalhados no mês. 
                      {preview.avisoPrevio > 0 && " Inclui aviso prévio indenizado devido ao tipo de desligamento."}
                      {preview.dependents > 0 && ` Foi aplicada dedução de R$ 189,59 por cada um dos ${preview.dependents} dependentes na base do IRRF.`}
                      {preview.horasExtras > 0 && " As horas extras foram calculadas com divisor 220 e o adicional selecionado."}
                      <br/><br/>
                      <span className="text-rose-300">Nota: Valores de impostos (INSS/IRRF) seguem a tabela progressiva de 2024.</span>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleSave} className="w-full h-11 bg-rose-500 hover:bg-rose-600 font-black uppercase text-[12px] tracking-widest">
                Confirmar Rescisão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Líquido Pago', value: fmt(totalNetValue), sub: 'Depósitos em conta', icon: DollarSign, color: 'text-rose-400' },
          { label: 'Total FGTS + Multa', value: fmt(totalFgtsValue), sub: 'Disponível para saque', icon: Sparkles, color: 'text-amber-400' },
          { label: 'Total Bruto (Proventos)', value: fmt(totalGrossValue), sub: 'Sem descontos', icon: Wallet, color: 'text-blue-400' },
          { label: 'Total de Rescisões', value: rescissions.length, sub: 'Registros no sistema', icon: UserMinus, color: 'text-white' },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-2xl border border-white/5 p-5 relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300">
            <div className="flex items-start justify-between relative">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className={`text-xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{stat.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar rescisão..." className="pl-10 h-11 bg-white/5 border-white/5 rounded-xl text-[13px]" />
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-white/10 rounded-2xl">
            <UserMinus className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold text-muted-foreground">Nenhuma rescisão encontrada</p>
          </div>
        )}
        {filtered.map(r => (
          <div key={r.id} className="glass-card rounded-2xl border border-white/5 overflow-hidden">
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <UserMinus className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">{r.employee_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(r as any).store_name ? `${(r as any).store_name} · ` : ''}{new Date(r.termination_date).toLocaleDateString('pt-BR')} · {TYPE_NAMES[r.type] || r.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[14px] font-black text-white">{fmt(r.rescission_value)}</p>
                  {r.fgts_value > 0 && <p className="text-[11px] text-amber-400">FGTS+Multa: {fmt(r.fgts_value)}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={e => { e.stopPropagation(); handlePrint(r); }}>
                    <Printer className="w-3.5 h-3.5" />
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10" onClick={e => { e.stopPropagation(); handleDelete(r.id, r.employee_name); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {expandedId === r.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
            </div>
            {expandedId === r.id && (
              <div className="border-t border-white/5 p-5 bg-white/[0.02]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Detalhamento de Itens */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest mb-3">Detalhamento da Rescisão</p>
                    <div className="space-y-1">
                      {(r.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/5">
                          <span className="text-[12px] text-muted-foreground">{item.description}</span>
                          <span className={cn("text-[12px] font-bold", item.type === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400')}>
                            {item.type === 'DEDUCTION' ? '-' : '+'}{fmt(item.value)}
                          </span>
                        </div>
                      ))}
                      {!r.items && (
                        <p className="text-[11px] text-muted-foreground italic">Detalhamento não disponível para registros antigos.</p>
                      )}
                    </div>
                  </div>

                  {/* Resumo Financeiro */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-black text-white uppercase tracking-widest mb-3">Resumo Financeiro</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Último Salário', val: r.last_salary || 0 },
                        { label: 'Total Bruto', val: r.gross_value || r.rescission_value },
                        { label: 'Total Descontos', val: -(r.inss_deduction || 0) - (r.irrf_deduction || 0) - (r.other_deductions || 0) },
                        { label: 'Líquido Final', val: r.rescission_value, highlight: true },
                      ].map(item => (
                        <div key={item.label} className={cn("p-3 rounded-xl border", item.highlight ? "bg-rose-500/10 border-rose-500/20" : "bg-white/5 border-white/5")}>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                          <p className={cn('text-[14px] font-black', item.val != null && item.val < 0 ? 'text-rose-400' : 'text-white')}>
                            {fmt(Math.abs(item.val || 0))}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[11px] font-bold text-amber-500 uppercase">FGTS + Multa 40%</p>
                        <p className="text-[14px] font-black text-amber-500">{fmt(r.fgts_value)}</p>
                      </div>
                      <p className="text-[10px] text-amber-500/60 leading-tight">Este valor é disponibilizado via chave de saque e não compõe o líquido depositado em conta.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
