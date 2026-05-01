import { useState, useEffect } from 'react';
import { Employee, Benefit } from '@/types';
import { MOCK_BENEFITS, ROLES, addAuditLog } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isValidCPF } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmployeeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  initialData?: Partial<Employee>;
  tenantId: string | null;
  dbStores: { id: string; name: string; tenantId: string }[];
  onSaveSuccess: () => void;
}

export function EmployeeFormModal({
  open,
  onOpenChange,
  editingId,
  initialData,
  tenantId,
  dbStores,
  onSaveSuccess,
}: EmployeeFormModalProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Partial<Employee>>({
    status: 'ACTIVE',
    gender: 'M',
    salary: 0,
    email: '',
    phone: '',
    ...initialData,
  });
  const [selectedBenefits, setSelectedBenefits] = useState<Record<string, boolean>>({});
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setStep(1);
      if (initialData) {
        setForm({ ...initialData });
        // Em um cenário real, os benefícios viriam do banco. 
        // Aqui mantemos a lógica original que parece usar o MOCK_EMPLOYEE_BENEFITS no componente pai.
        // Como estamos refatorando, vamos simplificar ou manter a paridade.
      } else {
        setForm({ status: 'ACTIVE', gender: 'M', salary: 0, email: '', phone: '' });
        setSelectedBenefits({});
      }
    }
  }, [open, initialData]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!form.name || !form.cpf || !form.storeId) {
        toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
        return;
      }
      if (!isValidCPF(form.cpf)) {
        toast({ title: 'CPF Inválido', description: 'Por favor, insira um CPF válido.', variant: 'destructive' });
        return;
      }
      setStep(2);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    const store = dbStores.find((s) => s.id === form.storeId) || null;

    const dbData = {
      name: form.name,
      cpf: form.cpf,
      gender: form.gender,
      birth_date: form.birthDate,
      admission_date: form.admissionDate,
      department: form.department,
      role: form.role,
      status: form.status,
      salary: Number(form.salary || 0),
      tenant_id: tenantId,
      store_id: store?.id || null,
      cbo: form.cbo,
      conta_itau: form.contaItau,
      insalubridade: Number(form.insalubridade || 0),
      periculosidade: Number(form.periculosidade || 0),
      gratificacao: Number(form.gratificacao || 0),
      vale_transporte: Number(form.valeTransporte || 0),
      vale_refeicao: Number(form.valeRefeicao || 0),
      flexivel: Number(form.flexivel || 0),
      mobilidade: Number(form.mobilidade || 0),
      vale_flexivel: Number(form.valeFlexivel || 0),
      // adicional_noturno: Number(form.adicionalNoturno || 0), // Comentado até a coluna ser criada no Supabase
      // flexivel_selo: !!form.flexivelSelo,
      jornada_entrada: form.jornadaEntrada || '08:00',
      jornada_saida_almoco: form.jornadaSaidaAlmoco || '12:00',
      jornada_retorno_almoco: form.jornadaRetornoAlmoco || '13:00',
      jornada_saida: form.jornadaSaida || '17:00',
      geofence_radius: Number(form.geofenceRadius || 0),
      email: form.email,
      phone: form.phone,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('employees').update(dbData).eq('id', editingId);
        if (error) throw error;

        addAuditLog({
          userId: currentUser?.id || 'unknown',
          userName: currentUser?.name || 'Sistema',
          action: 'EDIT_EMPLOYEE',
          details: `[Employees] Editou funcionário ${form.name} (CPF: ${form.cpf}) na loja ${store?.name}`,
          tenantId: tenantId || '',
        });

        toast({ title: 'Funcionário atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('employees').insert([dbData]);
        if (error) throw error;

        addAuditLog({
          userId: currentUser?.id || 'unknown',
          userName: currentUser?.name || 'Sistema',
          action: 'CREATE_EMPLOYEE',
          details: `[Employees] Criou funcionário ${form.name} (CPF: ${form.cpf}) na loja ${store?.name}`,
          tenantId: tenantId || '',
        });

        toast({ title: 'Funcionário cadastrado com sucesso!' });
      }
      onSaveSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {editingId ? 'Editar Funcionário' : 'Cadastrar Funcionário'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50 mb-2">
              <div className="space-y-0.5">
                <Label className="text-[13px] font-medium">Status do Funcionário</Label>
                <p className="text-[11px] text-muted-foreground">
                  {form.status === 'ACTIVE' ? 'Colaborador Ativo na folha' : 'Colaborador Inativo'}
                </p>
              </div>
              <Switch
                checked={form.status === 'ACTIVE'}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, status: c ? 'ACTIVE' : 'INACTIVE' }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Nome Completo *</Label>
                <Input
                  value={form.name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.toUpperCase() }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">CPF *</Label>
                <Input
                  value={form.cpf || ''}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 11) v = v.slice(0, 11);
                    v = v.replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d)/, '$1.$2')
                      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    setForm((f) => ({ ...f, cpf: v }));
                  }}
                  placeholder="000.000.000-00"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">E-mail para Contato (Opcional)</Label>
                <Input
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value.toLowerCase() }))}
                  placeholder="exemplo@email.com"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">WhatsApp (Opcional)</Label>
                <Input
                  value={form.phone || ''}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 11) v = v.slice(0, 11);
                    if (v.length > 10) {
                      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                    } else if (v.length > 5) {
                      v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
                    } else if (v.length > 2) {
                      v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
                    }
                    setForm((f) => ({ ...f, phone: v }));
                  }}
                  placeholder="(00) 00000-0000"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Sexo</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, gender: v as 'M' | 'F' | 'OTHER' }))
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Nascimento</Label>
                <Input
                  type="date"
                  value={form.birthDate || ''}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Admissão</Label>
                <Input
                  type="date"
                  value={form.admissionDate || ''}
                  onChange={(e) => setForm((f) => ({ ...f, admissionDate: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 flex flex-col">
                <Label className="text-[12px] text-muted-foreground">Loja de Alocação *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-9 justify-between bg-background border-input font-normal"
                    >
                      {form.storeId 
                        ? dbStores.find((s) => s.id === form.storeId)?.name 
                        : "Selecione a loja..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar loja..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                        <CommandGroup>
                          {dbStores.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={s.name}
                              onSelect={() => setForm((f) => ({ ...f, storeId: s.id }))}
                            >
                              <Check className={cn("mr-2 h-4 w-4", form.storeId === s.id ? "opacity-100" : "opacity-0")} />
                              {s.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Setor / Departamento</Label>
                <Input
                  value={form.department || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, department: e.target.value.toUpperCase() }))
                  }
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 flex flex-col">
                <Label className="text-[12px] text-muted-foreground">Cargo Oficial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-9 justify-between bg-background border-input font-normal"
                    >
                      {form.role || "Selecione o cargo..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cargo..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>Nenhum cargo encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-[250px] overflow-y-auto">
                          {ROLES.map((r, i) => (
                            <CommandItem
                              key={i}
                              value={r}
                              onSelect={() => setForm((f) => ({ ...f, role: r }))}
                            >
                              <Check className={cn("mr-2 h-4 w-4", form.role === r ? "opacity-100" : "opacity-0")} />
                              {r}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">CBO</Label>
                <Input
                  value={form.cbo || ''}
                  onChange={(e) => setForm((f) => ({ ...f, cbo: e.target.value.toUpperCase() }))}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Conta Itaú</Label>
                <Input
                  value={form.contaItau || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contaItau: e.target.value.toUpperCase() }))
                  }
                  placeholder="Ag/Conta"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Salário Base (R$)</Label>
                <Input
                  type="number"
                  value={form.salary || ''}
                  onChange={(e) => setForm((f) => ({ ...f, salary: Number(e.target.value) }))}
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Insalubridade (R$)</Label>
                <Input
                  type="number"
                  value={form.insalubridade || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, insalubridade: Number(e.target.value) }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Periculosidade (R$)</Label>
                <Input
                  type="number"
                  value={form.periculosidade || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, periculosidade: Number(e.target.value) }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Adicional Noturno (R$)</Label>
                <Input
                  type="number"
                  value={form.adicionalNoturno || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, adicionalNoturno: Number(e.target.value) }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Gratificação (R$)</Label>
                <Input
                  type="number"
                  value={form.gratificacao || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gratificacao: Number(e.target.value) }))
                  }
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Vale Transporte (R$)</Label>
                <Input
                  type="number"
                  value={form.valeTransporte || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valeTransporte: Number(e.target.value) }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Vale Refeição (R$)</Label>
                <Input
                  type="number"
                  value={form.valeRefeicao || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valeRefeicao: Number(e.target.value) }))
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">FLEXIVEL (Selo)</Label>
                <Input
                  type="number"
                  value={form.valeFlexivel || ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valeFlexivel: Number(e.target.value) }))
                  }
                  className="h-9"
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
              <div className="space-y-0.5">
                <Label className="text-[13px] font-bold text-amber-500">Premição Virtual</Label>
                <p className="text-[11px] text-muted-foreground">
                  Habilitar selo de premiação no perfil
                </p>
              </div>
              <Switch
                checked={!!form.flexivelSelo}
                onCheckedChange={(c) =>
                  setForm((f) => ({ ...f, flexivelSelo: c }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Flexível (R$)</Label>
                <Input
                  type="number"
                  value={form.flexivel || ''}
                  onChange={(e) => setForm((f) => ({ ...f, flexivel: Number(e.target.value) }))}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Mobilidade (R$)</Label>
                <Input
                  type="number"
                  value={form.mobilidade || ''}
                  onChange={(e) => setForm((f) => ({ ...f, mobilidade: Number(e.target.value) }))}
                  className="h-9"
                />
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
              <Label className="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                ⏱ Jornada de Trabalho
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Entrada</Label>
                  <Input
                    type="time"
                    value={form.jornadaEntrada || '08:00'}
                    onChange={(e) => setForm((f) => ({ ...f, jornadaEntrada: e.target.value }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Saída p/ Almoço</Label>
                  <Input
                    type="time"
                    value={form.jornadaSaidaAlmoco || '12:00'}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, jornadaSaidaAlmoco: e.target.value }))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Retorno Almoço</Label>
                  <Input
                    type="time"
                    value={form.jornadaRetornoAlmoco || '13:00'}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, jornadaRetornoAlmoco: e.target.value }))
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Saída Final</Label>
                  <Input
                    type="time"
                    value={form.jornadaSaida || '17:00'}
                    onChange={(e) => setForm((f) => ({ ...f, jornadaSaida: e.target.value }))}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1 pt-1">
                <Label className="text-[11px] text-muted-foreground">Raio Geofence (metros, 0 = desativado)</Label>
                <Input
                  type="number"
                  value={form.geofenceRadius || 0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, geofenceRadius: Number(e.target.value) }))
                  }
                  className="h-9"
                  placeholder="Ex: 200"
                />
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
                {MOCK_BENEFITS.map((b) => {
                  // Mapear o benefício do Mock para o campo real do formulário
                  const fieldMap: Record<string, keyof Employee> = {
                    'vt': 'valeTransporte',
                    'vr': 'valeRefeicao',
                    'ins': 'insalubridade',
                    'per': 'periculosidade',
                    'flex': 'flexivel',
                    'mob': 'mobilidade',
                    'grat': 'gratificacao'
                  };
                  const field = fieldMap[b.id];
                  const isActive = !!selectedBenefits[b.id];
                  const currentValue = field ? (form[field] as number) || 0 : b.defaultValue;

                  return (
                    <div key={b.id} className="flex items-center justify-between p-4 bg-background">
                      <div className="flex-1">
                        <p className="text-[13px] font-medium">{b.name}</p>
                        {isActive ? (
                          <div className="flex items-center gap-2 mt-1 animate-in fade-in zoom-in-95 duration-200">
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Valor: R$</span>
                            <Input
                              type="number"
                              value={currentValue}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (field) setForm(f => ({ ...f, [field]: val }));
                              }}
                              className="h-7 w-24 text-[11px] px-2 bg-white/5 border-white/10"
                            />
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            {b.type === 'FIXED_VALUE'
                              ? `Valor padrão: R$ ${b.defaultValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                              : `Porcentagem: ${(b.defaultValue * 100).toFixed(0)}% do Salário Base`}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(c) => {
                          setSelectedBenefits((prev) => ({ ...prev, [b.id]: c }));
                          // Se desligar, podemos opcionalmente zerar o valor ou manter. Vamos manter para facilitar a reativação.
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] text-primary font-medium mb-0.5">Custo Estimado no Mês</p>
                <p className="text-[11px] text-muted-foreground">
                  Soma do salário base + benefícios ativos.
                </p>
              </div>
              <p className="text-lg font-bold font-mono-data text-primary">
                R${' '}
                {(() => {
                  let est = form.salary || 0;
                  // Usar os valores reais do formulário para o cálculo
                  est += Number(form.valeTransporte || 0);
                  est += Number(form.valeRefeicao || 0);
                  est += Number(form.insalubridade || 0);
                  est += Number(form.periculosidade || 0);
                  est += Number(form.flexivel || 0);
                  est += Number(form.mobilidade || 0);
                  est += Number(form.gratificacao || 0);
                  est += Number(form.valeFlexivel || 0);
                  est += Number(form.adicionalNoturno || 0);
                  
                  return est.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                })()}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border pt-4">
          {step === 2 && (
            <Button variant="ghost" className="h-9" onClick={() => setStep(1)}>
              Voltar
            </Button>
          )}
          <Button className="h-9 min-w-[100px]" onClick={handleNextStep}>
            {step === 1 ? 'Próximo' : 'Finalizar Cadastro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
