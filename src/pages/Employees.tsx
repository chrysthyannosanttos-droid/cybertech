import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { MOCK_EMPLOYEES, MOCK_STORES, MOCK_BENEFITS, MOCK_EMPLOYEE_BENEFITS, ROLES, addAuditLog } from '@/data/mockData';
import { Employee, Benefit, EmployeeBenefit } from '@/types';
import { Search, Plus, Download, Users, UserCheck, UserX, DollarSign, Wallet, Edit2, CheckCircle2, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

// Validate CPF Helper
function isValidCPF(cpf: string) {
  const cleanCPF = cpf.replace(/[^\d]+/g, '');
  if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false;
  const split = cleanCPF.split('');
  let v1 = 0, v2 = 0;
  for (let i = 0, p = 10; i < 9; i++, p--) v1 += parseInt(split[i]) * p;
  v1 = ((v1 * 10) % 11) % 10;
  if (parseInt(split[9]) !== v1) return false;
  for (let i = 0, p = 11; i < 10; i++, p--) v2 += parseInt(split[i]) * p;
  v2 = ((v2 * 10) % 11) % 10;
  return parseInt(split[10]) === v2;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const { user: currentUser } = useAuth();
  const isCristiano = currentUser?.email === 'cristiano' || currentUser?.name?.toLowerCase() === 'cristiano';
  // States for Filters
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Add/Edit Employee Modal
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({ status: 'ACTIVE', gender: 'M', role: '', department: '', salary: 0, customFields: {} });
  const [selectedBenefits, setSelectedBenefits] = useState<Record<string, boolean>>({});
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { toast } = useToast();

  // Distinct values for filters
  const departments = useMemo(() => Array.from(new Set(employees.map(e => e.department).filter(Boolean))), [employees]);

  // Derived / Calculations
  const calcEmployeeCost = (emp: Employee) => {
    let cost = emp.salary || 0;
    const empBenefits = MOCK_EMPLOYEE_BENEFITS.filter(eb => eb.employeeId === emp.id);
    empBenefits.forEach(eb => {
      const b = MOCK_BENEFITS.find(b => b.id === eb.benefitId);
      if (!b) return;
      const val = eb.overrideValue || b.defaultValue;
      if (b.type === 'FIXED_VALUE') {
        cost += val;
      } else if (b.type === 'PERCENTAGE') {
        cost += emp.salary * val;
      }
    });
    return cost;
  };

  const filtered = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.cpf.includes(search);
      const matchStore = storeFilter === 'all' || e.storeId === storeFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchDept = departmentFilter === 'all' || e.department === departmentFilter;
      return matchSearch && matchStore && matchStatus && matchDept;
    });
  }, [employees, search, storeFilter, statusFilter, departmentFilter]);

  // Dashboard Stats
  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
  const inactiveEmployees = employees.filter(e => e.status === 'INACTIVE');
  const totalCost = activeEmployees.reduce((acc, e) => acc + calcEmployeeCost(e), 0);
  const totalBaseSalary = activeEmployees.reduce((acc, e) => acc + (e.salary || 0), 0);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const exportExcel = () => {
    const data = filtered.map(e => ({
      Nome: e.name,
      'Descrição cargo': e.role,
      CBO: e.cbo || '',
      CPF: e.cpf,
      Sexo: e.gender === 'M' ? 'Masculino' : e.gender === 'F' ? 'Feminino' : 'Outro',
      Admissão: e.admissionDate,
      Salário: e.salary,
      'conta itau': e.contaItau || '',
      Insa: e.insalubridade || 0,
      Peric: e.periculosidade || 0,
      Grat: e.gratificacao || 0,
      'Salário + Insalubridade + Periculosidade + Gratificação': 
        (e.salary || 0) + (e.insalubridade || 0) + (e.periculosidade || 0) + (e.gratificacao || 0),
      VT: e.valeTransporte || 0,
      'Vale Refeição': e.valeRefeicao || 0,
      Flexível: e.flexivel || 0,
      Mobilidade: e.mobilidade || 0,
      FLEXIVEL: e.flexivel || 0,
      Status: e.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
      Loja: e.storeName,
      Setor: e.department,
      CustoTotal: calcEmployeeCost(e),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionarios');
    XLSX.writeFile(wb, 'funcionarios.xlsx');
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setForm({ ...emp });
    
    // Pre-fill benefits
    const currentBenefits: Record<string, boolean> = {};
    MOCK_EMPLOYEE_BENEFITS.filter(eb => eb.employeeId === emp.id).forEach(eb => {
      currentBenefits[eb.benefitId] = true;
    });
    setSelectedBenefits(currentBenefits);
    
    setAddStep(1);
    setAddOpen(true);
  };

  const handleNextStep = () => {
    if (addStep === 1) {
      if (!form.name || !form.cpf || !form.storeId) {
        toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
        return;
      }
      if (!isValidCPF(form.cpf)) {
        toast({ title: 'CPF Inválido', description: 'Por favor, insira um CPF válido.', variant: 'destructive' });
        return;
      }
      setAddStep(2);
    } else {
      handleSave();
    }
  };

  const handleSave = () => {
    const store = MOCK_STORES.find(s => s.id === form.storeId) || MOCK_STORES[0];
    
    if (editingId) {
      setEmployees(prev => prev.map(e => e.id === editingId ? {
        ...e,
          ...form,
          storeName: store.name,
        } as Employee : e));

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'EDIT_EMPLOYEE',
        details: `[Employees] Editou funcionário ${form.name} (CPF: ${form.cpf}) na loja ${store.name}`,
        tenantId: store.tenantId
      });

      // Update benefits for existing employee
      // 1. Remove old
      const otherBenefits = MOCK_EMPLOYEE_BENEFITS.filter(eb => eb.employeeId !== editingId);
      MOCK_EMPLOYEE_BENEFITS.length = 0;
      MOCK_EMPLOYEE_BENEFITS.push(...otherBenefits);
      
      // 2. Add new
      Object.entries(selectedBenefits).forEach(([benefitId, active]) => {
        if (active) {
          MOCK_EMPLOYEE_BENEFITS.push({ id: `eb_${editingId}_${benefitId}`, employeeId: editingId, benefitId });
        }
      });

      toast({ title: 'Funcionário atualizado com sucesso!' });
    } else {
      const newEmp: Employee = {
        id: `e_${Date.now()}`,
        tenantId: 't1',
        storeId: store.id,
        storeName: store.name,
        name: form.name as string,
        cpf: form.cpf as string,
        gender: form.gender as 'M' | 'F' | 'OTHER',
        birthDate: form.birthDate || '',
        admissionDate: form.admissionDate || '',
        department: form.department || '',
        role: form.role || '',
        status: form.status as 'ACTIVE' | 'INACTIVE',
        salary: Number(form.salary) || 0,
        cbo: form.cbo || '',
        contaItau: form.contaItau || '',
        insalubridade: Number(form.insalubridade) || 0,
        periculosidade: Number(form.periculosidade) || 0,
        gratificacao: Number(form.gratificacao) || 0,
        valeTransporte: Number(form.valeTransporte) || 0,
        valeRefeicao: Number(form.valeRefeicao) || 0,
        flexivel: Number(form.flexivel) || 0,
        mobilidade: Number(form.mobilidade) || 0,
        valeFlexivel: Number(form.valeFlexivel) || 0,
        customFields: {},
      };
      
      // Save chosen benefits
      Object.entries(selectedBenefits).forEach(([benefitId, active]) => {
        if (active) {
          MOCK_EMPLOYEE_BENEFITS.push({ id: `eb_${newEmp.id}_${benefitId}`, employeeId: newEmp.id, benefitId });
        }
      });
      
      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'CREATE_EMPLOYEE',
        details: `[Employees] Criou funcionário ${form.name} (CPF: ${form.cpf}) na loja ${store.name}`,
        tenantId: store.tenantId
      });

      setEmployees(prev => [newEmp, ...prev]);
      toast({ title: 'Funcionário cadastrado com sucesso!' });
    }
    
    setAddOpen(false);
  };

  const toggleSelectAll = () => {
    if (paginated.length > 0 && paginated.every(e => selectedIds.includes(e.id))) {
      setSelectedIds(prev => prev.filter(id => !paginated.some(e => e.id === id)));
    } else {
      const newIds = [...selectedIds];
      paginated.forEach(e => {
        if (!newIds.includes(e.id)) newIds.push(e.id);
      });
      setSelectedIds(newIds);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeleteSelected = () => {
    if (!isCristiano) return;
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} funcionário(s)?`)) return;
    setEmployees(prev => prev.filter(e => !selectedIds.includes(e.id)));
    
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_EMPLOYEES',
      details: `[Employees] Excluiu ${selectedIds.length} funcionários em massa.`,
    });

    setSelectedIds([]);
    toast({ title: 'Exclusão concluída', description: `${selectedIds.length} funcionário(s) removido(s) com sucesso.` });
  };

  const handleDeleteOne = (id: string, name: string) => {
    if (!isCristiano) return;
    if (!window.confirm(`Deseja excluir o colaborador ${name}?`)) return;
    setEmployees(prev => prev.filter(e => e.id !== id));
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_EMPLOYEE',
      details: `[Employees] Excluiu funcionário ${name}`
    });
    setSelectedIds(prev => prev.filter(x => x !== id));
    toast({ title: 'Funcionário excluído' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gestão de Funcionários</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Cadastro e controle de colaboradores, benefícios e custos.</p>
        </div>
        <div className="flex gap-2.5">
          {isCristiano && selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" className="h-9 gap-1.5" onClick={handleDeleteSelected}>
              Excluir ({selectedIds.length})
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportExcel}>
            <Download className="w-4 h-4" /> Exportar Planilha
          </Button>
          <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if(!v) { setAddStep(1); setEditingId(null); setForm({status: 'ACTIVE', gender: 'M', salary: 0}); setSelectedBenefits({}) } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 gap-1.5"><Plus className="w-4 h-4" /> Novo Funcionário</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-base">{editingId ? 'Editar Funcionário' : 'Cadastrar Funcionário'}</DialogTitle>
              </DialogHeader>
              
              {addStep === 1 ? (
                <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50 mb-2">
                    <div className="space-y-0.5">
                      <Label className="text-[13px] font-medium">Status do Funcionário</Label>
                      <p className="text-[11px] text-muted-foreground">{form.status === 'ACTIVE' ? 'Colaborador Ativo na folha' : 'Colaborador Inativo'}</p>
                    </div>
                    <Switch 
                      checked={form.status === 'ACTIVE'} 
                      onCheckedChange={(c) => setForm(f => ({...f, status: c ? 'ACTIVE' : 'INACTIVE'}))} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Nome Completo *</Label>
                      <Input value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">CPF *</Label>
                      <Input value={form.cpf || ''} onChange={e => {
                        let v = e.target.value.replace(/\D/g, '');
                        if(v.length > 11) v = v.slice(0, 11);
                        v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                        setForm(f => ({...f, cpf: v}));
                      }} placeholder="000.000.000-00" className="h-9" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Sexo</Label>
                      <Select value={form.gender} onValueChange={v => setForm(f => ({...f, gender: v as 'M' | 'F' | 'OTHER'}))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem><SelectItem value="OTHER">Outro</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Nascimento</Label>
                      <Input type="date" value={form.birthDate || ''} onChange={e => setForm(f => ({...f, birthDate: e.target.value}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Admissão</Label>
                      <Input type="date" value={form.admissionDate || ''} onChange={e => setForm(f => ({...f, admissionDate: e.target.value}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Loja de Alocação *</Label>
                      <Select value={form.storeId} onValueChange={v => setForm(f => ({...f, storeId: v}))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{MOCK_STORES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Setor / Departamento</Label>
                      <Input value={form.department || ''} onChange={e => setForm(f => ({...f, department: e.target.value}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Cargo Oficial</Label>
                      <Select value={form.role} onValueChange={v => setForm(f => ({...f, role: v}))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o cargo..." /></SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {ROLES.map((r, i) => <SelectItem key={i} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">CBO</Label>
                      <Input value={form.cbo || ''} onChange={e => setForm(f => ({...f, cbo: e.target.value}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Conta Itaú</Label>
                      <Input value={form.contaItau || ''} onChange={e => setForm(f => ({...f, contaItau: e.target.value}))} placeholder="Ag/Conta" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Salário Base (R$)</Label>
                      <Input type="number" value={form.salary || ''} onChange={e => setForm(f => ({...f, salary: Number(e.target.value)}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Insalubridade (R$)</Label>
                      <Input type="number" value={form.insalubridade || ''} onChange={e => setForm(f => ({...f, insalubridade: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Periculosidade (R$)</Label>
                      <Input type="number" value={form.periculosidade || ''} onChange={e => setForm(f => ({...f, periculosidade: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Gratificação (R$)</Label>
                      <Input type="number" value={form.gratificacao || ''} onChange={e => setForm(f => ({...f, gratificacao: Number(e.target.value)}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Vale Transporte (R$)</Label>
                      <Input type="number" value={form.valeTransporte || ''} onChange={e => setForm(f => ({...f, valeTransporte: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Vale Refeição (R$)</Label>
                      <Input type="number" value={form.valeRefeicao || ''} onChange={e => setForm(f => ({...f, valeRefeicao: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">FLEXIVEL (Selo)</Label>
                      <Input type="number" value={form.valeFlexivel || ''} onChange={e => setForm(f => ({...f, valeFlexivel: Number(e.target.value)}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Flexível (R$)</Label>
                      <Input type="number" value={form.flexivel || ''} onChange={e => setForm(f => ({...f, flexivel: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Mobilidade (R$)</Label>
                      <Input type="number" value={form.mobilidade || ''} onChange={e => setForm(f => ({...f, mobilidade: Number(e.target.value)}))} className="h-9" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="rounded-md border border-border bg-card overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2.5 border-b border-border">
                      <h3 className="text-[13px] font-medium">Benefícios Atribuídos</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {MOCK_BENEFITS.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-4 bg-background">
                          <div>
                            <p className="text-[13px] font-medium">{b.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {b.type === 'FIXED_VALUE' ? `Valor: R$ ${b.defaultValue.toLocaleString('pt-BR', {minimumFractionDigits:2})}` : `Porcentagem: ${(b.defaultValue * 100).toFixed(0)}% do Salário Base`}
                            </p>
                          </div>
                          <Switch 
                            checked={!!selectedBenefits[b.id]} 
                            onCheckedChange={(c) => setSelectedBenefits(prev => ({...prev, [b.id]: c}))} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] text-primary font-medium mb-0.5">Custo Estimado no Mês</p>
                      <p className="text-[11px] text-muted-foreground">Soma do salário base + benefícios ativos.</p>
                    </div>
                    <p className="text-lg font-bold font-mono-data text-primary">
                      R$ {(() => {
                        let est = form.salary || 0;
                        MOCK_BENEFITS.forEach(b => {
                          if (selectedBenefits[b.id]) {
                            if(b.type === 'FIXED_VALUE') est += b.defaultValue;
                            if(b.type === 'PERCENTAGE') est += (form.salary || 0) * b.defaultValue;
                          }
                        });
                        return est.toLocaleString('pt-BR', {minimumFractionDigits:2});
                      })()}
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="border-t border-border pt-4">
                {addStep === 2 && (
                  <Button variant="ghost" className="h-9" onClick={() => setAddStep(1)}>Voltar</Button>
                )}
                <Button className="h-9 min-w-[100px]" onClick={handleNextStep}>
                  {addStep === 1 ? 'Próximo' : 'Finalizar Cadastro'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard KPI's */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Colaboradores', value: activeEmployees.length, sub: `${employees.length} no total`, icon: Users, color: 'text-primary' },
          { label: 'Custo Mensal Estimado', value: `R$ ${(totalCost/1000).toFixed(1)}k`, sub: 'Base + Benefícios', icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Salário Médio', value: `R$ ${(totalBaseSalary / (activeEmployees.length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, sub: 'Apenas base', icon: Wallet, color: 'text-blue-400' },
          { label: 'Inativos/Afastados', value: inactiveEmployees.length, sub: 'Fora de operação', icon: UserX, color: 'text-rose-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-2xl border border-white/5 p-5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors`} />
            <div className="flex items-start justify-between relative">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className={`text-2xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{stat.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="glass-card border border-white/5 rounded-2xl p-4 shadow-xl flex items-center gap-4 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por Nome ou CPF..." className="pl-9 h-10 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20" />
        </div>
        <div className="w-px h-8 bg-white/10 mx-1" />
        <Select value={storeFilter} onValueChange={v => { setStoreFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-10 bg-white/5 border-white/10 rounded-xl"><SelectValue placeholder="Lojas" /></SelectTrigger>
          <SelectContent className="glass-card border-white/10 text-white">
            <SelectItem value="all">Todas as Lojas</SelectItem>
            {MOCK_STORES.map(s => <SelectItem key={s.id} value={s.id}>{s.name.replace('SUPER ', '')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={v => { setDepartmentFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-10 bg-white/5 border-white/10 rounded-xl"><SelectValue placeholder="Setores" /></SelectTrigger>
          <SelectContent className="glass-card border-white/10 text-white">
            <SelectItem value="all">Todos Setores</SelectItem>
            {departments.map((d, i) => <SelectItem key={i} value={d as string}>{d as string}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-10 bg-white/5 border-white/10 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="glass-card border-white/10 text-white">
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="ACTIVE">Ativos</SelectItem>
            <SelectItem value="INACTIVE">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Modern Data Table */}
      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
                <th className="px-6 py-4 w-[40px]">
                  <Checkbox 
                    checked={paginated.length > 0 && paginated.every(e => selectedIds.includes(e.id))} 
                    onCheckedChange={toggleSelectAll} 
                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Unidade / Setor</th>
                <th className="px-6 py-4">Cargo Profissional</th>
                <th className="px-6 py-4 text-right">Custo Base</th>
                <th className="px-6 py-4 text-right">Custo Consolidado</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <UserX className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-[14px] font-medium tracking-tight">Nenhum registro encontrado para esta busca.</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map(emp => {
                const isInactive = emp.status === 'INACTIVE';
                const totalC = calcEmployeeCost(emp);
                return (
                  <tr key={emp.id} className={cn("hover:bg-white/[0.02] transition-colors group", isInactive && "opacity-50 grayscale-[0.5]", selectedIds.includes(emp.id) && "bg-primary/5")}>
                    <td className="px-6 py-4">
                      <Checkbox 
                        checked={selectedIds.includes(emp.id)} 
                        onCheckedChange={() => toggleSelect(emp.id)} 
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-black text-[11px] group-hover:scale-110 transition-transform">
                          {emp.name.charAt(0)}{emp.name.split(' ')[1]?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{emp.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono-data tracking-tighter mt-0.5">{emp.cpf}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                          emp.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {emp.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-bold text-white">{emp.storeName.replace('SUPER ', '')}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{emp.department}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] text-white/80">{emp.role}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-mono-data text-[13px] text-muted-foreground group-hover:text-white transition-colors">R$ {emp.salary.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-mono-data text-[14px] font-black text-primary drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]">R$ {totalC.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white/40 hover:text-white hover:bg-white/10" onClick={() => handleOpenEdit(emp)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {isCristiano && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => handleDeleteOne(emp.id, emp.name)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Mostrando <span className="text-white">{(page-1)*perPage+1}</span> até <span className="text-white">{Math.min(page*perPage, filtered.length)}</span> de <span className="text-white">{filtered.length}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-white/10 text-white hover:bg-white/10 font-bold text-[11px] uppercase tracking-wider" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <div className="flex items-center justify-center h-9 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-[12px]">{page}</div>
              <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-white/10 text-white hover:bg-white/10 font-bold text-[11px] uppercase tracking-wider" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
