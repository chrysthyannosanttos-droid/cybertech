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
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Loja de Alocação *</Label>
                <Select
                  value={form.storeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, storeId: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dbStores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Cargo Oficial</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o cargo..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {ROLES.map((r, i) => (
                      <SelectItem key={i} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                {MOCK_BENEFITS.map((b) => (
                  <div key={b.id} className="flex items-center justify-between p-4 bg-background">
                    <div>
                      <p className="text-[13px] font-medium">{b.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {b.type === 'FIXED_VALUE'
                          ? `Valor: R$ ${b.defaultValue.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}`
                          : `Porcentagem: ${(b.defaultValue * 100).toFixed(0)}% do Salário Base`}
                      </p>
                    </div>
                    <Switch
                      checked={!!selectedBenefits[b.id]}
                      onCheckedChange={(c) =>
                        setSelectedBenefits((prev) => ({ ...prev, [b.id]: c }))
                      }
                    />
                  </div>
                ))}
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
                  MOCK_BENEFITS.forEach((b) => {
                    if (selectedBenefits[b.id]) {
                      if (b.type === 'FIXED_VALUE') est += b.defaultValue;
                      if (b.type === 'PERCENTAGE') est += (form.salary || 0) * b.defaultValue;
                    }
                  });
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
