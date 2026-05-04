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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Check, 
  ChevronsUpDown, 
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
  TrendingUp
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-[#0a0f1e] border-white/5 shadow-2xl rounded-[2.5rem]">
        <div className="flex flex-col h-[85vh]">
          {/* Header Superior com Identidade 360 */}
          <div className="relative p-8 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-b border-white/5">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32" />
             <div className="flex items-center gap-8 relative z-10">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-3xl bg-white/5 border-2 border-primary/20 flex items-center justify-center overflow-hidden group-hover:border-primary/50 transition-all duration-500 shadow-2xl">
                     {form.photo_url ? (
                       <img src={form.photo_url} alt="Foto" className="w-full h-full object-cover" />
                     ) : (
                       <User className="w-10 h-10 text-primary/40 group-hover:scale-110 transition-transform" />
                     )}
                  </div>
                  <div className={cn(
                    "absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-xl",
                    form.status === 'ACTIVE' ? "bg-emerald-500 text-white border-emerald-400" : "bg-rose-500 text-white border-rose-400"
                  )}>
                    {form.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                   <div className="flex items-center gap-3">
                     <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">{form.name || 'Novo Colaborador'}</h2>
                     {form.flexivelSelo && <Star className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />}
                   </div>
                   <div className="flex flex-wrap items-center gap-4 text-muted-foreground font-bold text-[11px] uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-primary" /> {form.role || 'Cargo não definido'}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" /> {dbStores.find(s => s.id === form.storeId)?.name || 'Sem Loja'}</span>
                      <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> R$ {totalCost.toLocaleString('pt-BR')} (Custo Total)</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Abas de Navegação */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-8 bg-white/[0.02]">
              <TabsList className="h-14 bg-transparent gap-8 p-0">
                <TabsTrigger value="perfil" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full text-[11px] font-black uppercase tracking-widest gap-2">
                  <User className="w-3.5 h-3.5" /> Perfil & Bio
                </TabsTrigger>
                <TabsTrigger value="contratual" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full text-[11px] font-black uppercase tracking-widest gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Contratual
                </TabsTrigger>
                <TabsTrigger value="beneficios" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full text-[11px] font-black uppercase tracking-widest gap-2">
                  <Wallet className="w-3.5 h-3.5" /> Benefícios
                </TabsTrigger>
                <TabsTrigger value="jornada" className="data-[state=active]:bg-transparent data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none px-0 h-full text-[11px] font-black uppercase tracking-widest gap-2">
                  <Clock className="w-3.5 h-3.5" /> Jornada & Ponto
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {/* ABA PERFIL */}
              <TabsContent value="perfil" className="mt-0 space-y-8 animate-in fade-in duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Dados de Identidade</h3>
                       <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome Completo *</Label>
                            <Input value={form.name || ''} onChange={e => {
                               const name = e.target.value.toUpperCase();
                               setForm(f => ({ ...f, name, gender: guessGender(name) }));
                            }} className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">CPF *</Label>
                                <Input value={form.cpf || ''} onChange={e => {
                                  let v = e.target.value.replace(/\D/g, '');
                                  if (v.length > 11) v = v.slice(0, 11);
                                  v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                                  setForm(f => ({ ...f, cpf: v }));
                                }} placeholder="000.000.000-00" className="h-12 bg-white/5 border-white/10 rounded-xl" />
                             </div>
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sexo</Label>
                                <Select value={form.gender} onValueChange={(v: any) => setForm(f => ({ ...f, gender: v }))}>
                                  <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="glass-card border-white/10">
                                    <SelectItem value="M">MASCULINO</SelectItem>
                                    <SelectItem value="F">FEMININO</SelectItem>
                                    <SelectItem value="OTHER">OUTRO</SelectItem>
                                  </SelectContent>
                                </Select>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Canais de Contato</h3>
                       <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">E-mail Corporativo</Label>
                            <div className="relative">
                               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                               <Input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase() }))} placeholder="empresa@email.com" className="h-12 pl-12 bg-white/5 border-white/10 rounded-xl" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">WhatsApp (Celular)</Label>
                            <div className="relative">
                               <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                               <Input value={form.phone || ''} onChange={e => {
                                  let v = e.target.value.replace(/\D/g, '');
                                  if (v.length > 11) v = v.slice(0, 11);
                                  v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
                                  setForm(f => ({ ...f, phone: v }));
                               }} placeholder="(00) 00000-0000" className="h-12 pl-12 bg-white/5 border-white/10 rounded-xl" />
                            </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              {/* ABA CONTRATUAL */}
              <TabsContent value="contratual" className="mt-0 space-y-8 animate-in fade-in duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Alocação Operacional</h3>
                       <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Unidade / Loja *</Label>
                            <Select value={form.storeId} onValueChange={v => setForm(f => ({ ...f, storeId: v }))}>
                              <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                                <SelectValue placeholder="Selecione a loja..." />
                              </SelectTrigger>
                              <SelectContent className="glass-card border-white/10">
                                {dbStores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Setor</Label>
                                <Input value={form.department || ''} onChange={e => setForm(f => ({ ...f, department: e.target.value.toUpperCase() }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                             </div>
                             <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">CBO</Label>
                                <Input value={form.cbo || ''} onChange={e => setForm(f => ({ ...f, cbo: e.target.value.toUpperCase() }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                             </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cargo Oficial</Label>
                            <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                              <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                                <SelectValue placeholder="Selecione o cargo..." />
                              </SelectTrigger>
                              <SelectContent className="glass-card border-white/10 h-64">
                                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Dados Financeiros</h3>
                       <div className="space-y-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Salário Base (CLT)</Label>
                            <div className="relative">
                               <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
                               <Input type="number" value={form.salary || ''} onChange={e => setForm(f => ({ ...f, salary: Number(e.target.value) }))} className="h-12 pl-12 bg-emerald-500/5 border-emerald-500/20 rounded-xl font-black text-emerald-400" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Conta para Pagamento (Itaú)</Label>
                            <Input value={form.contaItau || ''} onChange={e => setForm(f => ({ ...f, contaItau: e.target.value.toUpperCase() }))} placeholder="AG / CONTA" className="h-12 bg-white/5 border-white/10 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Data de Admissão</Label>
                            <Input type="date" value={form.admissionDate || ''} onChange={e => setForm(f => ({ ...f, admissionDate: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              {/* ABA BENEFÍCIOS */}
              <TabsContent value="beneficios" className="mt-0 space-y-8 animate-in fade-in duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { id: 'valeTransporte', label: 'Vale Transporte', icon: MapPin },
                      { id: 'valeRefeicao', label: 'Vale Refeição', icon: Wallet },
                      { id: 'insalubridade', label: 'Insalubridade', icon: ShieldCheck },
                      { id: 'periculosidade', label: 'Periculosidade', icon: Zap },
                      { id: 'flexivel', label: 'Ajuda de Custo', icon: Star },
                      { id: 'gratificacao', label: 'Gratificação', icon: TrendingUp },
                      { id: 'valeFlexivel', label: 'Vale Flexível', icon: CreditCard },
                      { id: 'mobilidade', label: 'Mobilidade', icon: MapPin },
                      { id: 'adicionalNoturno', label: 'Adicional Noturno', icon: Clock },
                    ].map(item => (
                      <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 group hover:border-primary/30 transition-all">
                        <div className="flex items-center justify-between">
                           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                             <item.icon className="w-4 h-4 text-primary" />
                           </div>
                           <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{item.label}</span>
                        </div>
                        <Input 
                          type="number" 
                          value={form[item.id as keyof Employee] as number || ''} 
                          onChange={e => setForm(f => ({ ...f, [item.id]: Number(e.target.value) }))} 
                          className="h-10 bg-black/20 border-white/5 rounded-xl text-xs font-bold" 
                        />
                      </div>
                    ))}
                 </div>

                 <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                          <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                       </div>
                       <div>
                          <p className="text-[13px] font-black text-white uppercase tracking-widest">Selo de Premiação Virtual</p>
                          <p className="text-[11px] text-muted-foreground">Exibir badge de colaborador destaque no perfil digital.</p>
                       </div>
                    </div>
                    <Switch checked={!!form.flexivelSelo} onCheckedChange={c => setForm(f => ({ ...f, flexivelSelo: c }))} />
                 </div>
              </TabsContent>

              {/* ABA JORNADA */}
              <TabsContent value="jornada" className="mt-0 space-y-8 animate-in fade-in duration-300">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Horários da Grade</h3>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Entrada</Label>
                             <Input type="time" value={form.jornadaEntrada || '08:00'} onChange={e => setForm(f => ({ ...f, jornadaEntrada: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Saída Almoço</Label>
                             <Input type="time" value={form.jornadaSaidaAlmoco || '12:00'} onChange={e => setForm(f => ({ ...f, jornadaSaidaAlmoco: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Retorno Almoço</Label>
                             <Input type="time" value={form.jornadaRetornoAlmoco || '13:00'} onChange={e => setForm(f => ({ ...f, jornadaRetornoAlmoco: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Saída Final</Label>
                             <Input type="time" value={form.jornadaSaida || '17:00'} onChange={e => setForm(f => ({ ...f, jornadaSaida: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                          </div>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Controle de Campo</h3>
                       <div className="space-y-4">
                          <div className="space-y-1.5">
                             <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Raio Geofence (Metros)</Label>
                             <Input type="number" value={form.geofenceRadius || 0} onChange={e => setForm(f => ({ ...f, geofenceRadius: Number(e.target.value) }))} className="h-12 bg-white/5 border-white/10 rounded-xl" />
                             <p className="text-[9px] text-muted-foreground">Distância máxima permitida da loja para registro de ponto. (0 = Sem limite)</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer com Resumo de Custo */}
          <DialogFooter className="p-8 border-t border-white/5 bg-white/[0.01] items-center">
             <div className="flex-1 flex items-center gap-6">
                <div className="flex flex-col">
                   <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Investimento Mensal</span>
                   <span className="text-xl font-black text-emerald-400 tabular-nums">R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="h-8 w-px bg-white/10" />
                <p className="text-[11px] text-muted-foreground/60 leading-tight max-w-xs font-medium">
                  Custo total projetado incluindo Salário Base e todos os benefícios e encargos adicionais habilitados.
                </p>
             </div>
             <div className="flex gap-4">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-14 px-8 rounded-2xl font-black uppercase text-[11px] tracking-widest text-muted-foreground">Cancelar</Button>
                <Button onClick={handleSave} className="h-14 px-10 rounded-2xl bg-primary text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                  {editingId ? 'Salvar Alterações' : 'Finalizar Cadastro'}
                </Button>
             </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
