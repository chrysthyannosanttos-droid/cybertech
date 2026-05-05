import { useState, useEffect, useMemo } from 'react';
import { Employee } from '@/types';
import { ROLES, addAuditLog } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isValidCPF, cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Briefcase, 
  Wallet, 
  Clock, 
  ShieldCheck, 
  Smartphone, 
  Mail, 
  MapPin, 
  CreditCard,
  Zap,
  Star,
  TrendingUp,
  X
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState("perfil");
  const [form, setForm] = useState<Partial<Employee>>({
    status: 'ACTIVE',
    gender: 'M',
    salary: 0,
    email: '',
    phone: '',
    ...initialData,
  });
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const guessGender = (name: string): 'M' | 'F' | 'OTHER' => {
    if (!name) return 'M';
    const firstName = name.trim().split(' ')[0].toLowerCase();
    if (
      firstName.endsWith('a') || 
      firstName.endsWith('ia') || 
      firstName.endsWith('ana') || 
      firstName.endsWith('ine') || 
      firstName.endsWith('ele') ||
      ['beatriz', 'iris', 'alice', 'ruth'].includes(firstName)
    ) return 'F';
    return 'M';
  };

  useEffect(() => {
    if (open) {
      setActiveTab("perfil");
      if (initialData) {
        setForm({ ...initialData });
      } else {
        setForm({ status: 'ACTIVE', gender: 'M', salary: 0, email: '', phone: '', admissionDate: new Date().toISOString().split('T')[0] });
      }
    }
  }, [open, initialData]);

  const totalCost = useMemo(() => {
    let est = Number(form.salary || 0);
    est += Number(form.valeTransporte || 0);
    est += Number(form.valeRefeicao || 0);
    est += Number(form.insalubridade || 0);
    est += Number(form.periculosidade || 0);
    est += Number(form.flexivel || 0);
    est += Number(form.mobilidade || 0);
    est += Number(form.gratificacao || 0);
    est += Number(form.valeFlexivel || 0);
    est += Number(form.adicionalNoturno || 0);
    return est;
  }, [form]);

  const handleSave = async () => {
    if (!form.name || !form.cpf || !form.storeId) {
      toast({ title: 'Dados obrigatórios ausentes', description: 'Preencha Nome, CPF e Loja.', variant: 'destructive' });
      return;
    }
    if (!isValidCPF(form.cpf)) {
      toast({ title: 'CPF Inválido', variant: 'destructive' });
      return;
    }

    const store = dbStores.find((s) => s.id === form.storeId) || null;
    const dbData = {
      name: form.name.toUpperCase(),
      cpf: form.cpf,
      gender: form.gender,
      birth_date: form.birthDate,
      admission_date: form.admissionDate,
      department: form.department?.toUpperCase(),
      role: form.role,
      status: form.status,
      salary: Number(form.salary || 0),
      tenant_id: tenantId,
      store_id: store?.id || null,
      cbo: form.cbo?.toUpperCase(),
      conta_itau: form.contaItau?.toUpperCase(),
      insalubridade: Number(form.insalubridade || 0),
      periculosidade: Number(form.periculosidade || 0),
      gratificacao: Number(form.gratificacao || 0),
      vale_transporte: Number(form.valeTransporte || 0),
      vale_refeicao: Number(form.valeRefeicao || 0),
      flexivel: Number(form.flexivel || 0),
      mobilidade: Number(form.mobilidade || 0),
      vale_flexivel: Number(form.valeFlexivel || 0),
      adicional_noturno: Number(form.adicionalNoturno || 0),
      flexivel_selo: !!form.flexivelSelo,
      jornada_entrada: form.jornadaEntrada || '08:00',
      jornada_saida_almoco: form.jornadaSaidaAlmoco || '12:00',
      jornada_retorno_almoco: form.jornadaRetornoAlmoco || '13:00',
      jornada_saida: form.jornadaSaida || '17:00',
      geofence_radius: Number(form.geofenceRadius || 0),
      email: form.email?.toLowerCase(),
      phone: form.phone,
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('employees').update(dbData).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Perfil atualizado!' });
      } else {
        const { error } = await supabase.from('employees').insert([dbData]);
        if (error) throw error;
        toast({ title: 'Colaborador cadastrado!' });
      }
      onSaveSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-[#020408] border-white/5 shadow-2xl rounded-[2rem] flex flex-col max-h-[90vh]">
        {/* Header Fixo */}
        <div className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-b border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-primary/20 flex items-center justify-center overflow-hidden shadow-xl">
                 {form.photo_reference_url ? (
                   <img src={form.photo_reference_url} className="w-full h-full object-cover" />
                 ) : (
                   <User className="w-8 h-8 text-primary/30" />
                 )}
              </div>
              <div>
                 <h2 className="text-xl font-black text-white uppercase italic tracking-tight">{form.name || 'Novo Cadastro'}</h2>
                 <p className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">{form.role || 'Cargo não definido'}</p>
              </div>
           </div>
           <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-xl hover:bg-white/5 text-white/40">
             <X className="w-5 h-5" />
           </Button>
        </div>

        {/* Área de Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 sticky top-0 bg-[#020408] z-20 border-b border-white/5">
              <TabsList className="h-12 bg-transparent gap-6 p-0">
                <TabsTrigger value="perfil" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full text-[10px] font-black uppercase tracking-widest gap-2">Perfil</TabsTrigger>
                <TabsTrigger value="contratual" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full text-[10px] font-black uppercase tracking-widest gap-2">Contrato</TabsTrigger>
                <TabsTrigger value="beneficios" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full text-[10px] font-black uppercase tracking-widest gap-2">Benefícios</TabsTrigger>
                <TabsTrigger value="jornada" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full text-[10px] font-black uppercase tracking-widest gap-2">Ponto</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-8">
              <TabsContent value="perfil" className="mt-0 space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Nome Completo *</Label>
                      <Input value={form.name || ''} onChange={e => {
                        const name = e.target.value.toUpperCase();
                        setForm(f => ({ ...f, name, gender: guessGender(name) }));
                      }} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">CPF *</Label>
                        <Input value={form.cpf || ''} onChange={e => {
                          let v = e.target.value.replace(/\D/g, '');
                          if (v.length > 11) v = v.slice(0, 11);
                          v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                          setForm(f => ({ ...f, cpf: v }));
                        }} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Sexo</Label>
                        <Select value={form.gender} onValueChange={(v: any) => setForm(f => ({ ...f, gender: v }))}>
                          <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0a0f1e] border-white/10">
                            <SelectItem value="M">MASCULINO</SelectItem>
                            <SelectItem value="F">FEMININO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">E-mail Corporativo</Label>
                      <Input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase() }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">WhatsApp</Label>
                      <Input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contratual" className="mt-0 space-y-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Unidade / Loja *</Label>
                      <Select value={form.storeId} onValueChange={v => setForm(f => ({ ...f, storeId: v }))}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0f1e] border-white/10">
                          {dbStores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Cargo Oficial</Label>
                      <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                        <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0f1e] border-white/10">
                          {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Salário Base (CLT)</Label>
                      <Input type="number" value={form.salary || ''} onChange={e => setForm(f => ({ ...f, salary: Number(e.target.value) }))} className="h-12 bg-emerald-500/5 border-emerald-500/20 rounded-xl font-black text-emerald-400" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Data de Admissão</Label>
                      <Input type="date" value={form.admissionDate || ''} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="beneficios" className="mt-0 space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'valeTransporte', label: 'Vale Transporte' },
                    { id: 'valeRefeicao', label: 'Vale Refeição' },
                    { id: 'insalubridade', label: 'Insalubridade' },
                    { id: 'periculosidade', label: 'Periculosidade' },
                    { id: 'flexivel', label: 'Ajuda de Custo' },
                    { id: 'gratificacao', label: 'Gratificação' },
                  ].map(item => (
                    <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                      <Label className="text-[9px] font-black uppercase text-white/40 tracking-widest">{item.label}</Label>
                      <Input type="number" value={form[item.id as keyof Employee] as number || ''} onChange={e => setForm(f => ({ ...f, [item.id]: Number(e.target.value) }))} className="h-10 bg-black/20 border-white/5 rounded-lg text-xs" />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="jornada" className="mt-0 space-y-6 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { id: 'jornadaEntrada', label: 'Entrada' },
                    { id: 'jornadaSaidaAlmoco', label: 'Saída Almoço' },
                    { id: 'jornadaRetornoAlmoco', label: 'Volta Almoço' },
                    { id: 'jornadaSaida', label: 'Saída Final' },
                  ].map(item => (
                    <div key={item.id} className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">{item.label}</Label>
                      <Input type="time" value={form[item.id as keyof Employee] as string || ''} onChange={e => setForm(f => ({ ...f, [item.id]: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer Fixo */}
        <div className="p-8 border-t border-white/5 bg-white/[0.01] flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1">
             <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Custo Total Estimado</p>
             <p className="text-2xl font-black text-emerald-400">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none h-14 px-8 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white/40">Cancelar</Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-none h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 italic hover:scale-105 transition-all">
              {editingId ? 'Salvar Alterações' : 'Finalizar Cadastro'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
