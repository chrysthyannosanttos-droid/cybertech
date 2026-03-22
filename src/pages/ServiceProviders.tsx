import { useState } from 'react';
import { MOCK_SERVICE_PROVIDERS, addAuditLog } from '@/data/mockData';
import { ServiceProvider } from '@/types';
import { Briefcase, Plus, Search, Mail, Phone, Calendar, AlertCircle, FileText, Upload, Edit2, CheckCircle2, Trash2, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

export default function ServiceProviders() {
  const [providers, setProviders] = useState(MOCK_SERVICE_PROVIDERS);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'cristiano';

  const [form, setForm] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    startDate: '',
    endDate: '',
    contractValue: '',
    duties: '',
    observations: '',
    additionalCosts: [] as { desc: string; value: number; date: string }[],
  });

  const [newCost, setNewCost] = useState({ desc: '', value: '', date: '' });

  const filtered = providers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.cnpj.includes(search)
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({ 
      name: '', 
      cnpj: '', 
      email: '', 
      phone: '', 
      startDate: '', 
      endDate: '', 
      contractValue: '', 
      duties: '', 
      observations: '', 
      additionalCosts: [] 
    });
    setOpen(true);
  };

  const handleOpenEdit = (p: ServiceProvider) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      cnpj: p.cnpj,
      email: p.email,
      phone: p.phone,
      startDate: p.startDate,
      endDate: p.endDate,
      contractValue: p.contractValue.toString(),
      duties: p.duties || '',
      observations: p.observations || '',
      additionalCosts: p.additionalCosts || [],
    });
    setOpen(true);
  };

  const handleAddCost = () => {
    if (!newCost.desc || !newCost.value || !newCost.date) return;
    setForm(f => ({
      ...f,
      additionalCosts: [...f.additionalCosts, { desc: newCost.desc, value: Number(newCost.value), date: newCost.date }]
    }));
    setNewCost({ desc: '', value: '', date: '' });
  };

  const handleRemoveCost = (index: number) => {
    setForm(f => ({
      ...f,
      additionalCosts: f.additionalCosts.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!form.name || !form.cnpj) return;

    if (editingId) {
      setProviders(prev => prev.map(p =>
        p.id === editingId ? {
          ...p,
          name: form.name,
          cnpj: form.cnpj,
          email: form.email,
          phone: form.phone,
          startDate: form.startDate,
          endDate: form.endDate,
          contractValue: Number(form.contractValue) || 0,
          duties: form.duties,
          observations: form.observations,
          additionalCosts: form.additionalCosts,
        } : p
      ));
      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'EDIT_SERVICE_PROVIDER',
        details: `[ServiceProviders] Editou prestador ${form.name} (CNPJ: ${form.cnpj})`,
        tenantId: providers.find(p => p.id === editingId)?.tenantId
      });
      toast({ title: 'Prestador atualizado', description: `${form.name} atualizado com sucesso.` });
    } else {
      const newProvider: ServiceProvider = {
        id: `sp${Date.now()}`,
        tenantId: 't1',
        name: form.name,
        cnpj: form.cnpj,
        email: form.email,
        phone: form.phone,
        startDate: form.startDate,
        endDate: form.endDate,
        contractValue: Number(form.contractValue) || 0,
        duties: form.duties,
        observations: form.observations,
        additionalCosts: form.additionalCosts,
      };
      setProviders(prev => [...prev, newProvider]);
      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'CREATE_SERVICE_PROVIDER',
        details: `[ServiceProviders] Criou prestador ${form.name} (CNPJ: ${form.cnpj})`,
        tenantId: newProvider.tenantId
      });
      toast({ title: 'Prestador cadastrado', description: `${form.name} adicionada com sucesso.` });
    }
    setOpen(false);
  };

  const handleDeleteProvider = (id: string, name: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`Tem certeza que deseja excluir o prestador ${name}?`)) return;
    const provider = providers.find(p => p.id === id);
    setProviders(prev => prev.filter(p => p.id !== id));
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_SERVICE_PROVIDER',
      details: `[ServiceProviders] Excluiu prestador ${name}`,
      tenantId: provider?.tenantId
    });
    toast({ title: 'Prestador removido' });
  };

  const getDaysRemaining = (dateStr: string) => {
    const end = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Prestadores de Serviços</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Gestão de contratos e fluxos externos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-10 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-[12px] gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4" /> Novo Prestador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[15px]">{editingId ? 'Editar Prestador' : 'Cadastrar Prestador de Serviço'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2 mt-2">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Nome da Empresa *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-[13px]" placeholder="Ex: Limpeza Express Ltda" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">CNPJ *</label>
                <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} className="h-9 text-[13px]" placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Telefone</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-9 text-[13px]" placeholder="(00) 00000-0000" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">E-mail</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-9 text-[13px]" placeholder="contato@empresa.com.br" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Início do Contrato</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Término do Contrato</label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Valor do Contrato (Mensal R$)</label>
                <Input type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))} className="h-9 text-[13px]" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Documento (PDF/Foto)</label>
                <Button variant="outline" className="h-9 w-full text-[12px] border-dashed border-2 gap-2">
                  <Upload className="w-3.5 h-3.5" /> Importar
                </Button>
              </div>

              <div className="col-span-2 space-y-1.5 text-black">
                <label className="text-[12px] font-medium text-muted-foreground">Atribuições</label>
                <Textarea value={form.duties} onChange={e => setForm(f => ({ ...f, duties: e.target.value }))} className="text-[13px] min-h-[80px]" placeholder="Descreva as responsabilidades do prestador..." />
              </div>

              <div className="col-span-2 space-y-1.5 text-black">
                <label className="text-[12px] font-medium text-muted-foreground">Observações</label>
                <Textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} className="text-[13px] min-h-[60px]" placeholder="Notas adicionais..." />
              </div>

              {/* Dynamic Additional Costs */}
              <div className="col-span-2 border-t pt-4 mt-2">
                <h4 className="text-[13px] font-semibold mb-3">Custos Adicionais</h4>
                <div className="flex gap-2 items-end mb-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                    <Input value={newCost.desc} onChange={e => setNewCost(c => ({ ...c, desc: e.target.value }))} className="h-8 text-[12px]" placeholder="Ex: Taxa extra" />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Valor</label>
                    <Input type="number" value={newCost.value} onChange={e => setNewCost(c => ({ ...c, value: e.target.value }))} className="h-8 text-[12px]" placeholder="0.00" />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Data</label>
                    <Input type="date" value={newCost.date} onChange={e => setNewCost(c => ({ ...c, date: e.target.value }))} className="h-8 text-[12px]" />
                  </div>
                  <Button type="button" size="sm" onClick={handleAddCost} className="h-8 w-8 p-0">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {form.additionalCosts.length > 0 && (
                  <div className="space-y-2 mb-4 bg-muted/30 p-2 rounded-md">
                    {form.additionalCosts.map((cost, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[12px] p-2 bg-card rounded border border-border/50">
                        <div className="flex flex-col">
                          <span className="font-medium">{cost.desc}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(cost.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-black">
                          <span className="font-semibold text-primary">R$ {cost.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveCost(idx)}>
                            <Trash2 className="w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button onClick={handleSave} className="col-span-2 h-9 text-[13px] mt-2">{editingId ? 'Salvar Alterações' : 'Cadastrar Prestador'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar prestador por nome ou CNPJ..." className="pl-11 h-11 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 text-[13px] transition-all" />
      </div>

      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
                <th className="px-6 py-4">Prestador</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Vigência</th>
                <th className="px-6 py-4 text-right">Valor Contrato</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(p => {
                const daysLeft = getDaysRemaining(p.endDate);
                const isExpiringSoon = daysLeft <= 10 && daysLeft >= 0;
                const isExpired = daysLeft < 0;

                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono-data tracking-tighter mt-0.5">{p.cnpj}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground group-hover:text-white/70 transition-colors">
                          <Mail className="w-3 h-3" /> {p.email}
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground group-hover:text-white/70 transition-colors">
                          <Phone className="w-3 h-3" /> {p.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[12px] text-white/90">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span className="font-bold">{new Date(p.endDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest pl-5">Vencimento</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono-data text-[14px] font-black text-white group-hover:text-primary transition-colors">R$ {p.contractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        {p.additionalCosts && p.additionalCosts.length > 0 && (
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-tighter">
                            + {p.additionalCosts.length} custos extras
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {isExpired ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                            Vencido
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                            Em {daysLeft} dias
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            Ativo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10" title="Ver Detalhes/Contrato">
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10" onClick={() => handleOpenEdit(p)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-500/40 hover:text-rose-400 hover:bg-rose-500/10" onClick={() => handleDeleteProvider(p.id, p.name)}>
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
      </div>
    </div>
  );
}
