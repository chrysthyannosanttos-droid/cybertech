import { useState } from 'react';
import { MOCK_TENANTS, MOCK_STORES, MOCK_USERS, addAuditLog, getAuditLogs } from '@/data/mockData';
import { Tenant, Store as StoreType, User, AuditLog } from '@/types';
import { Building2, Plus, Search, Store as StoreIcon, Users, ArrowLeft, Key, History, Eye, EyeOff, Edit2, PowerOff, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

function StatusBadge({ status }: { status: Tenant['subscription']['status'] }) {
  const map = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    past_due: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
    suspended: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
  };
  const labels = { active: 'Ativo', past_due: 'Vencido', suspended: 'Suspenso' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function Tenants() {
  const [tenants, setTenants] = useState(MOCK_TENANTS);
  const [stores, setStores] = useState(MOCK_STORES);
  const [users, setUsers] = useState(MOCK_USERS);
  
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editTenantId, setEditTenantId] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isCristiano = currentUser?.email === 'cristiano' || currentUser?.name?.toLowerCase() === 'cristiano';
  const [showLogs, setShowLogs] = useState(false);

  const [form, setForm] = useState({ name: '', cnpj: '', monthlyFee: '', startDate: '', expiryDate: '' });
  
  // Forms for the Details View
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', cnpj: '' });
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '' });

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.cnpj.includes(search)
  );

  const handleOpenAdd = () => {
    setEditTenantId(null);
    setForm({ name: '', cnpj: '', monthlyFee: '', startDate: new Date().toISOString().split('T')[0], expiryDate: '' });
    setOpen(true);
  };

  const handleOpenEdit = (t: Tenant) => {
    setEditTenantId(t.id);
    setForm({
      name: t.name,
      cnpj: t.cnpj,
      monthlyFee: t.subscription.monthlyFee.toString(),
      startDate: t.subscription.startDate,
      expiryDate: t.subscription.expiryDate,
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.cnpj) return;
    
    if (editTenantId) {
      setTenants(prev => prev.map(t => 
        t.id === editTenantId ? {
          ...t,
          name: form.name,
          cnpj: form.cnpj,
          subscription: {
            ...t.subscription,
            startDate: form.startDate,
            expiryDate: form.expiryDate,
            monthlyFee: Number(form.monthlyFee) || 0,
          }
        } : t
      ));
      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'EDIT_TENANT',
        details: `[Tenants] Editou empresa ${form.name} (CNPJ: ${form.cnpj})`,
        tenantId: editTenantId
      });
      toast({ title: 'Empresa atualizada', description: `${form.name} atualizada com sucesso.` });
    } else {
      const newTenant: Tenant = {
        id: `t${Date.now()}`,
        name: form.name,
        cnpj: form.cnpj,
        subscription: {
          status: 'active',
          startDate: form.startDate || new Date().toISOString().split('T')[0],
          expiryDate: form.expiryDate || '2027-01-01',
          monthlyFee: Number(form.monthlyFee) || 0,
          additionalCosts: [],
        },
        employeeCount: 0,
      };
      setTenants(prev => [...prev, newTenant]);
      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'CREATE_TENANT',
        details: `[Tenants] Criou empresa ${form.name} (CNPJ: ${form.cnpj})`,
        tenantId: newTenant.id
      });
      toast({ title: 'Empresa cadastrada', description: `${form.name} adicionada com sucesso.` });
    }
    setOpen(false);
  };

  const handleDeleteTenant = (id: string, name: string) => {
    if (!isCristiano) return;
    if (!window.confirm(`ATENÇÃO: Deseja excluir permanentemente a empresa ${name} e todos os seus dados?`)) return;
    setTenants(prev => prev.filter(t => t.id !== id));
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_TENANT',
      details: `[Tenants] Excluiu empresa ${name}`
    });
    toast({ title: 'Empresa excluída' });
  };

  const toggleStatus = (id: string) => {
    setTenants(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, subscription: { ...t.subscription, status: t.subscription.status === 'active' ? 'suspended' : 'active' } }
          : t
      )
    );
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Sistema',
      action: 'TOGGLE_TENANT_STATUS',
      details: `Alterou status da empresa ID: ${id}`,
      tenantId: id
    });
  };

  const handleAddStore = () => {
    if (!selectedTenant || !storeForm.name || !storeForm.cnpj) return;
    const newStore: StoreType = {
      id: `s_${Date.now()}`,
      tenantId: selectedTenant.id,
      name: storeForm.name,
      cnpj: storeForm.cnpj,
    };
    setStores(prev => [...prev, newStore]);
    setStoreForm({ name: '', cnpj: '' });
    setAddStoreOpen(false);
    toast({ title: 'Loja cadastrada', description: `${storeForm.name} adicionada com sucesso.` });
  };

  const handleAddUser = () => {
    if (!selectedTenant || !userForm.name || !userForm.email) return;
    const newUser: User = {
      id: `u_${Date.now()}`,
      tenantId: selectedTenant.id,
      name: userForm.name,
      email: userForm.email,
      role: 'tenant',
    };
    setUsers(prev => [...prev, newUser]);
    setUserForm({ name: '', email: '' });
    setAddUserOpen(false);
    toast({ title: 'Usuário cadastrado', description: `${userForm.name} adicionado com sucesso.` });
  };

  if (selectedTenant) {
    const tenantStores = stores.filter(s => s.tenantId === selectedTenant.id);
    const tenantUsers = users.filter(u => u.tenantId === selectedTenant.id);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setSelectedTenant(null)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{selectedTenant.name}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">CNPJ: {selectedTenant.cnpj}</p>
          </div>
        </div>

        <Tabs defaultValue="stores" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="stores" className="gap-2 text-[13px]"><StoreIcon className="w-4 h-4" /> Lojas da Rede</TabsTrigger>
            <TabsTrigger value="users" className="gap-2 text-[13px]"><Users className="w-4 h-4" /> Usuários Administrativos</TabsTrigger>
            {isCristiano && (
              <TabsTrigger value="logs" className="gap-2 text-[13px]"><History className="w-4 h-4" /> Logs de Auditoria</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="stores" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addStoreOpen} onOpenChange={setAddStoreOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5"><Plus className="w-3.5 h-3.5" /> Nova Loja</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-[15px]">Cadastrar Loja: {selectedTenant.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">Nome da Loja *</label>
                      <Input value={storeForm.name} onChange={e => setStoreForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-[13px]" placeholder="Ex: Filial Centro" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">CNPJ da Loja *</label>
                      <Input value={storeForm.cnpj} onChange={e => {
                        let v = e.target.value.replace(/\D/g, '');
                        if(v.length > 14) v = v.slice(0, 14);
                        v = v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
                        setStoreForm(f => ({ ...f, cnpj: v }));
                      }} className="h-9 text-[13px]" placeholder="00.000.000/0001-00" />
                    </div>
                    <Button onClick={handleAddStore} className="w-full h-9 text-[13px] mt-2">Salvar Loja</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest">Nome da Loja</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest">CNPJ</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantStores.length === 0 ? (
                    <tr><td colSpan={2} className="px-6 py-12 text-center text-[13px] text-muted-foreground">Nenhuma loja cadastrada para esta empresa.</td></tr>
                  ) : tenantStores.map(s => (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-[13px] font-medium text-white">
                        <div className="flex items-center gap-3"><StoreIcon className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100 transition-opacity" /> {s.name}</div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-mono-data text-muted-foreground group-hover:text-white transition-colors">{s.cnpj}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5"><Plus className="w-3.5 h-3.5" /> Novo Usuário</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-[15px]">Criar Acesso: {selectedTenant.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 mt-2">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">Nome do Usuário *</label>
                      <Input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-[13px]" placeholder="Ex: Roberto Carlos" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">E-mail de Acesso *</label>
                      <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} className="h-9 text-[13px]" placeholder="email@empresa.com.br" />
                    </div>
                    <div className="rounded border border-primary/20 bg-primary/5 p-3 flex gap-3 text-primary mt-4 text-[12px]">
                      <Key className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>O usuário receberá um e-mail com instruções para redefinição de senha e acesso aos dados desta empresa.</p>
                    </div>
                    <Button onClick={handleAddUser} className="w-full h-9 text-[13px] mt-2">Salvar Usuário</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest">Usuário</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest">E-mail</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest">Nível de Acesso</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantUsers.length === 0 ? (
                    <tr><td colSpan={3} className="px-6 py-12 text-center text-[13px] text-muted-foreground">Nenhum usuário criado para esta empresa.</td></tr>
                  ) : tenantUsers.map(u => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-[13px] font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] border border-primary/20">
                            {u.name.charAt(0)}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-muted-foreground group-hover:text-white transition-colors">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-primary/10 text-primary border border-primary/20 uppercase tracking-widest">
                          {u.role === 'tenant' ? 'Admin Cliente' : u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {isCristiano && (
            <TabsContent value="logs" className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> Histórico de Alterações (Audit Logs)
                </h3>
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setShowLogs(!showLogs)}>
                  {showLogs ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showLogs ? 'Ocultar Detalhes' : 'Visualizar Logs'}
                </Button>
              </div>

              {showLogs ? (
                <div className="bg-card rounded-lg shadow-card border border-border/50 overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        <th className="px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase">Data/Hora</th>
                        <th className="px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase">Usuário</th>
                        <th className="px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase">Ação</th>
                        <th className="px-5 py-3 text-[11px] font-medium text-muted-foreground uppercase">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {getAuditLogs()
                        .filter(log => log.tenantId === selectedTenant.id)
                        .length === 0 ? (
                        <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px] text-muted-foreground italic">Nenhum log registrado para esta empresa.</td></tr>
                      ) : (
                        getAuditLogs()
                          .filter(log => log.tenantId === selectedTenant.id)
                          .map(log => (
                            <tr key={log.id} className="hover:bg-accent/30 transition-colors">
                              <td className="px-5 py-3 text-[12px] font-mono-data text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                              </td>
                              <td className="px-5 py-3 text-[12px] font-medium">
                                {log.userName}
                              </td>
                              <td className="px-5 py-3">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-bold">
                                  {log.action}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-[12px] text-muted-foreground">
                                {log.details}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl opacity-50">
                  <History className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-[14px]">Clique em <strong>Visualizar Logs</strong> para carregar o histórico.</p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Empresas</h1>
          <p className="text-[13px] text-muted-foreground">Gerencie clientes e licenças</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-[12px] gap-1.5" onClick={handleOpenAdd}>
              <Plus className="w-3.5 h-3.5" /> Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[15px]">{editTenantId ? 'Editar Empresa / Licença' : 'Cadastrar Empresa Cliente'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 mt-2">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Nome da Empresa *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-[13px]" placeholder="Ex: Super Atacado Group" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">CNPJ *</label>
                <Input value={form.cnpj} onChange={e => {
                  let v = e.target.value.replace(/\D/g, '');
                  if(v.length > 14) v = v.slice(0, 14);
                  v = v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
                  setForm(f => ({ ...f, cnpj: v }));
                }} className="h-9 text-[13px]" placeholder="00.000.000/0001-00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Início Licença</label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="h-9 text-[13px]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-muted-foreground">Vencimento Licença</label>
                  <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} className="h-9 text-[13px]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Mensalidade (R$)</label>
                <Input type="number" value={form.monthlyFee} onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))} className="h-9 text-[13px]" placeholder="0.00" />
              </div>
              <Button onClick={handleSave} className="w-full h-9 text-[13px] mt-2">{editTenantId ? 'Salvar Alterações' : 'Cadastrar Empresa'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa ou CNPJ..." className="pl-9 h-9 text-[13px]" />
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="text-left text-[11px] font-bold text-primary uppercase tracking-widest px-6 py-4">Empresa</th>
              <th className="text-left text-[11px] font-bold text-primary uppercase tracking-widest px-6 py-4">CNPJ</th>
              <th className="text-center text-[11px] font-bold text-primary uppercase tracking-widest px-6 py-4">Status</th>
              <th className="text-right text-[11px] font-bold text-primary uppercase tracking-widest px-6 py-4">Mensalidade</th>
              <th className="text-right text-[11px] font-bold text-primary uppercase tracking-widest px-6 py-4">Validade</th>
              <th className="text-right text-[11px] font-bold text-primary uppercase tracking-widest px-6 py-4">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <Building2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{t.employeeCount} funcionários</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 font-mono-data text-[13px] text-muted-foreground group-hover:text-white transition-colors">{t.cnpj}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                      t.subscription.status === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                    }`}>
                      {t.subscription.status === 'active' ? 'Ativo' : 'Suspenso'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-mono-data text-[13px] font-bold text-white">R$ {t.subscription.monthlyFee.toLocaleString('pt-BR')}</td>
                <td className="px-6 py-4 text-right">
                   <div className="flex flex-col items-end">
                    <span className="text-[13px] font-bold text-white">{new Date(t.subscription.expiryDate).toLocaleDateString('pt-BR')}</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">Vencimento</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2.5">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-1.5 text-primary hover:bg-primary/10 hover:text-primary font-bold text-[11px]"
                      onClick={() => setSelectedTenant(t)}
                    >
                      Gerenciar
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                      onClick={() => handleOpenEdit(t)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {isCristiano && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-lg text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        onClick={() => handleDeleteTenant(t.id, t.name)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
