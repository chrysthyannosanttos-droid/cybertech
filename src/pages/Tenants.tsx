import { useState, useEffect } from 'react';
import { MOCK_TENANTS, MOCK_STORES, MOCK_USERS, addAuditLog, getAuditLogs } from '@/data/mockData';
import { Tenant, Store as StoreType, User, AuditLog } from '@/types';
import { Building2, Plus, Search, Store as StoreIcon, Users, ArrowLeft, Key, History, Eye, EyeOff, Edit2, PowerOff, ShieldCheck, Trash2, ShieldAlert, Save, X, Download, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { useAuth, AppModule, ManagedUser } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Palette, Globe, LogIn, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
  const { user: currentUser, getAllUsers, saveUser, deleteUser, isImpersonating, impersonateTenant, stopImpersonating } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  
  const { toast } = useToast();
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editTenantId, setEditTenantId] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'cristiano';
  const [showLogs, setShowLogs] = useState(false);
  const [backupLoading, setBackupLoading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Variáveis derivadas para filtrar dados da empresa selecionada
  const tenantStores = stores.filter(s => s.tenantId === selectedTenant?.id);
  const tenantUsers = managedUsers.filter(u => u.user.tenantId === selectedTenant?.id);

  const fetchData = async () => {
    setIsLoading(true);
    const [{ data: tData }, { data: sData }] = await Promise.all([
      supabase.from('tenants').select('*').order('name'),
      supabase.from('stores').select('*').order('name')
    ]);

    if (tData) {
      setTenants(tData.map(t => ({
        id: t.id,
        name: t.name,
        cnpj: t.cnpj || '',
        subscription: t.subscription || { status: 'active', startDate: '', expiryDate: '', monthlyFee: 0, additionalCosts: [] },
        employeeCount: t.employee_count || 0,
        plan: t.plan || 'BASIC',
        branding: t.branding || {},
        slug: t.branding?.slug || '',
        background_url: t.branding?.background_url || ''
      })));
    }

    if (sData) {
      setStores(sData.map(s => ({
        id: s.id,
        name: s.name,
        cnpj: s.cnpj || '',
        tenantId: s.tenant_id
      })));
    }

    setManagedUsers(await getAllUsers());
    
    // Refresh selected tenant if we are in management view
    if (selectedTenant) {
      const updated = tData?.find(t => t.id === selectedTenant.id);
      if (updated) {
        setSelectedTenant({
          id: updated.id,
          name: updated.name,
          cnpj: updated.cnpj || '',
          subscription: updated.subscription || { status: 'active', startDate: '', expiryDate: '', monthlyFee: 0, additionalCosts: [] },
          employeeCount: updated.employee_count || 0,
          plan: updated.plan || 'BASIC',
          branding: updated.branding || {},
          slug: updated.branding?.slug || '',
          background_url: updated.branding?.background_url || ''
        });
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Assinaturas em Realtime para Sincronização Simultânea total
    const channel = supabase
      .channel('tenants_system_realtime')
      .on('postgres_changes', { event: '*', table: 'profiles', schema: 'public' }, async () => {
        console.log('🔄 Usuários atualizados em tempo real');
        setManagedUsers(await getAllUsers());
      })
      .on('postgres_changes', { event: '*', table: 'tenants', schema: 'public' }, () => {
        console.log('🔄 Empresas atualizadas em tempo real');
        fetchData();
      })
      .on('postgres_changes', { event: '*', table: 'stores', schema: 'public' }, () => {
        console.log('🔄 Unidades atualizadas em tempo real');
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getAllUsers]);

  // Security check: Only Cristiano can access this page
  useEffect(() => {
    if (!isLoading && !isAdmin) {
      toast({ title: 'Acesso negado', description: 'Você não tem permissão para acessar o gerenciamento global.', variant: 'destructive' });
      navigate('/dashboard');
    }
  }, [isLoading, isAdmin, navigate]);

  // Sync form state with selected tenant for White Label
  useEffect(() => {
    if (selectedTenant) {
      setForm({
        name: selectedTenant.name,
        cnpj: selectedTenant.cnpj,
        monthlyFee: selectedTenant.subscription.monthlyFee.toString(),
        startDate: selectedTenant.subscription.startDate,
        expiryDate: selectedTenant.subscription.expiryDate,
        plan: selectedTenant.plan || 'BASIC',
        systemName: selectedTenant.branding?.system_name || '',
        primaryColor: selectedTenant.branding?.primary_color || '',
        logoUrl: selectedTenant.branding?.logo_url || '',
        slug: selectedTenant.branding?.slug || '',
        backgroundUrl: selectedTenant.branding?.background_url || ''
      });
    }
  }, [selectedTenant]);

  const [form, setForm] = useState({ 
    name: '', 
    cnpj: '', 
    monthlyFee: '', 
    startDate: '', 
    expiryDate: '',
    plan: 'BASIC' as 'BASIC' | 'PRO' | 'ENTERPRISE',
    systemName: '',
    primaryColor: '',
    logoUrl: '',
    slug: '',
    backgroundUrl: ''
  });
  
  // Forms for the Details View
  const [addStoreOpen, setAddStoreOpen] = useState(false);
  const [editStoreId, setEditStoreId] = useState<string | null>(null);
  const [storeForm, setStoreForm] = useState({ name: '', cnpj: '' });
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [userForm, setUserForm] = useState({ 
    name: '', 
    email: '', 
    password: '123',
    appPermissions: { 'ponto': true } as Record<string, boolean>
  });
  
  const MODULE_OPTIONS: Array<{ module: AppModule; label: string; description: string }> = [
    { module: 'dashboard',         label: 'Dashboard',      description: 'Visão geral e indicadores' },
    { module: 'employees',         label: 'Funcionários',   description: 'Cadastro e gestão de colaboradores' },
    { module: 'certificates',      label: 'Atestados',      description: 'Controle de atestados médicos' },
    { module: 'payroll',           label: 'Folha',          description: 'Folha de pagamento e cálculos' },
    { module: 'reports',           label: 'Relatórios',     description: 'Relatórios e análises' },
    { module: 'service-providers', label: 'Prestadores',    description: 'Controle de prestadores de serviço' },
    { module: 'rescissions',       label: 'Rescisões',      description: 'Registro de rescisões contratuais' },
    { module: 'stores',            label: 'Lojas',          description: 'Gestão de unidades/lojas' },
    { module: 'attendance',        label: 'Ponto Eletrônico', description: 'Configuração de relógios e histórico' },
    { module: 'settings',          label: 'Configurações',  description: 'Gestão de acessos e usuários' },
  ];

  const DEFAULT_PERMISSIONS: AppModule[] = MODULE_OPTIONS.map(m => m.module);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<AppModule[]>(DEFAULT_PERMISSIONS);

  const handleBackup = async (tenant: Tenant) => {
    setBackupLoading(tenant.id);
    try {
      const [{ data: employees }, { data: certs }, { data: rescissions }] = await Promise.all([
        supabase.from('employees').select('*').eq('tenant_id', tenant.id),
        supabase.from('certificates').select('*'),
        supabase.from('rescissions').select('*').eq('tenant_id', tenant.id),
      ]);

      const wb = XLSX.utils.book_new();

      // Sheet 1: Funcionários
      const empRows = (employees || []).map(e => ({
        'Nome': e.name, 'CPF': e.cpf, 'Sexo': e.gender, 'Nascimento': e.birth_date,
        'Admissão': e.admission_date, 'Cargo': e.role, 'Setor': e.department,
        'Status': e.status, 'Salário': e.salary, 'CBO': e.cbo,
        'Insalubridade': e.insalubridade, 'Periculosidade': e.periculosidade,
        'Gratificação': e.gratificacao, 'VT': e.vale_transporte,
        'Vale Refeição': e.vale_refeicao, 'Flexível': e.flexivel,
        'Mobilidade': e.mobilidade, 'Vale Flexível': e.vale_flexivel,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows.length ? empRows : [{ 'Sem dados': '' }]), 'Funcionários');

      // Sheet 2: Atestados
      const empIds = new Set((employees || []).map(e => e.id));
      const certRows = (certs || []).filter(c => empIds.has(c.employee_id)).map(c => ({
        'Funcionário': c.employee_name, 'Data': c.date, 'CID': c.cid, 'Dias': c.days,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(certRows.length ? certRows : [{ 'Sem dados': '' }]), 'Atestados');

      // Sheet 3: Rescisões
      const rescRows = (rescissions || []).map(r => ({
        'Funcionário': r.employee_name, 'Data Saída': r.termination_date,
        'Tipo': r.type, 'FGTS': r.fgts_value, 'Valor Total': r.rescission_value,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rescRows.length ? rescRows : [{ 'Sem dados': '' }]), 'Rescisões');

      const date = new Date().toISOString().split('T')[0];
      const filename = `backup_${tenant.name.replace(/[^a-zA-Z0-9]/g, '_')}_${date}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (e: any) {
      toast({ title: 'Erro no backup', description: e.message, variant: 'destructive' });
    } finally {
      setBackupLoading(null);
    }
  };

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.cnpj.includes(search)
  );

  const handleOpenAdd = () => {
    setEditTenantId(null);
    setForm({ 
      name: '', 
      cnpj: '', 
      monthlyFee: '', 
      startDate: new Date().toISOString().split('T')[0], 
      expiryDate: '',
      plan: 'BASIC',
      systemName: '',
      primaryColor: '',
      logoUrl: '',
      slug: '',
      backgroundUrl: ''
    });
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
      plan: t.plan || 'BASIC',
      systemName: t.branding?.system_name || '',
      primaryColor: t.branding?.primary_color || '',
      logoUrl: t.branding?.logo_url || '',
      slug: t.branding?.slug || '',
      backgroundUrl: t.branding?.background_url || ''
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.cnpj) return;
    
    const subscription = {
      status: 'active' as const,
      startDate: form.startDate || new Date().toISOString().split('T')[0],
      expiryDate: form.expiryDate || '2027-01-01',
      monthlyFee: Number(form.monthlyFee) || 0,
      additionalCosts: [],
    };

      system_name: form.systemName,
      primary_color: form.primaryColor,
      logo_url: form.logoUrl,
      slug: form.slug,
      background_url: form.backgroundUrl
    };

    const targetId = editTenantId || selectedTenant?.id;

    if (targetId) {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: form.name,
          cnpj: form.cnpj,
          subscription,
          plan: form.plan,
          branding
        })
        .eq('id', targetId);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        return;
      }

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'EDIT_TENANT',
        details: `[Tenants] Editou empresa ${form.name} (CNPJ: ${form.cnpj})`,
        tenantId: targetId
      });
      toast({ title: 'Empresa atualizada', description: `${form.name} atualizada com sucesso.` });
    } else {
      const { error } = await supabase
        .from('tenants')
        .insert({
          id: `t${Date.now()}`,
          name: form.name,
          cnpj: form.cnpj,
          subscription,
          plan: form.plan,
          branding
        });

      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
        return;
      }

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'CREATE_TENANT',
        details: `[Tenants] Criou empresa ${form.name} (CNPJ: ${form.cnpj})`,
      });
      toast({ title: 'Empresa cadastrada', description: `${form.name} adicionada com sucesso.` });
    }
    
    await fetchData();
    setOpen(false);
    toast({ title: editTenantId ? 'Empresa atualizada' : 'Empresa cadastrada' });
  };

  const handleDeleteTenant = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`ATENÇÃO: Deseja excluir permanentemente a empresa ${name} e todos os seus dados?`)) return;
    
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_TENANT',
      details: `[Tenants] Excluiu empresa ${name}`
    });
    
    await fetchData();
    toast({ title: 'Empresa excluída' });
  };

  const toggleStatus = async (id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return;

    const newStatus = tenant.subscription.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase
      .from('tenants')
      .update({
        subscription: { ...tenant.subscription, status: newStatus }
      })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' });
      return;
    }

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Sistema',
      action: 'TOGGLE_TENANT_STATUS',
      details: `Alterou status da empresa ID: ${id} para ${newStatus}`,
      tenantId: id
    });
    
    await fetchData();
  };

  const handleAddStore = async () => {
    if (!selectedTenant || !storeForm.name || !storeForm.cnpj) return;
    
    if (editStoreId) {
      const { error } = await supabase
        .from('stores')
        .update({
          name: storeForm.name,
          cnpj: storeForm.cnpj
        })
        .eq('id', editStoreId);

      if (error) {
        toast({ title: 'Erro ao atualizar loja', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Loja atualizada', description: `${storeForm.name} atualizada com sucesso.` });
    } else {
      const { error } = await supabase.from('stores').insert({
        id: `s_${Date.now()}`,
        tenant_id: selectedTenant.id,
        name: storeForm.name,
        cnpj: storeForm.cnpj
      });

      if (error) {
        toast({ title: 'Erro ao cadastrar loja', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Loja cadastrada', description: `${storeForm.name} adicionada com sucesso.` });
    }

    setStoreForm({ name: '', cnpj: '' });
    setEditStoreId(null);
    setAddStoreOpen(false);
    await fetchData();
  };

  const handleOpenEditStore = (s: StoreType) => {
    setEditStoreId(s.id);
    setStoreForm({ name: s.name, cnpj: s.cnpj });
    setAddStoreOpen(true);
  };

  const handleAddUser = async () => {
    if (!selectedTenant || !userForm.name || !userForm.email) return;
    
    setManagedUsers(await getAllUsers()); // Refresh count
    const isNew = !editingEmail;
    const currentAllUsers = await getAllUsers();
    
    if (isNew && currentAllUsers.find(u => u.email === userForm.email)) {
      toast({ title: 'Usuário já existe', description: `O login "${userForm.email}" já está em uso.`, variant: 'destructive' });
      return;
    }

    const userId = editingEmail 
      ? currentAllUsers.find(u => u.email === editingEmail)?.user.id || crypto.randomUUID()
      : crypto.randomUUID();

    const existingRecord = editingEmail ? currentAllUsers.find(u => u.email === editingEmail) : undefined;
    const passwordToSave = (editingEmail && !userForm.password) ? (existingRecord?.password || '123') : userForm.password;

    const newUserData: ManagedUser = {
      email: userForm.email,
      password: passwordToSave,
      mustChangePassword: isNew ? true : existingRecord?.mustChangePassword,
      permissions: selectedUserPermissions,
      appPermissions: userForm.appPermissions,
      user: {
        id: userId,
        email: userForm.email,
        name: userForm.name,
        role: 'tenant',
        tenantId: selectedTenant.id,
      },
    };

    const { error } = await saveUser(newUserData);
    if (error) {
      toast({ title: 'Erro ao salvar usuário', description: error.message, variant: 'destructive' });
      return;
    }
    setManagedUsers(await getAllUsers());
    
    setUserForm({ name: '', email: '', password: '123', appPermissions: { 'ponto': true } });
    setSelectedUserPermissions(DEFAULT_PERMISSIONS);
    setAddUserOpen(false);
    setEditingEmail(null);
    toast({ title: isNew ? 'Usuário cadastrado' : 'Usuário atualizado' });
  };

  const handleEditUser = (u: ManagedUser) => {
    setEditingEmail(u.email);
    setUserForm({
      name: u.user.name,
      email: u.email,
      password: '',
      appPermissions: u.appPermissions || { 'ponto': true }
    });
    setSelectedUserPermissions(u.permissions ?? DEFAULT_PERMISSIONS);
    setAddUserOpen(true);
  };

  const handleDeleteUser = (email: string, name: string) => {
    if (email === 'cristiano') return;
    if (!window.confirm(`Deseja excluir permanentemente o acesso de "${name}"?`)) return;
    
    deleteUser(email).then(({ error }) => {
      if (error) {
        toast({ title: 'Erro ao excluir usuário', description: error.message, variant: 'destructive' });
      } else {
        getAllUsers().then(setManagedUsers);
        toast({ title: 'Usuário removido' });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Global Tenant Editor Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
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
              <label className="text-[12px] font-medium text-muted-foreground">Plano de Assinatura *</label>
              <Select value={form.plan} onValueChange={(v: any) => setForm(f => ({ ...f, plan: v }))}>
                <SelectTrigger className="h-9 text-[13px] bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10 text-white">
                  <SelectItem value="BASIC">PLANO BÁSICO</SelectItem>
                  <SelectItem value="PRO">PLANO PRO (MULTILojas)</SelectItem>
                  <SelectItem value="ENTERPRISE">PLANO ENTERPRISE (WHITE LABEL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground">Mensalidade (R$)</label>
              <Input type="number" value={form.monthlyFee} onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))} className="h-9 text-[13px]" placeholder="0.00" />
            </div>
            <Button onClick={handleSave} className="w-full h-9 text-[13px] mt-2">{editTenantId ? 'Salvar Alterações' : 'Cadastrar Empresa'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {selectedTenant ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setSelectedTenant(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{selectedTenant.name}</h1>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 gap-1.5 border-primary/20 text-primary hover:bg-primary/10 font-bold text-[11px] uppercase tracking-widest" 
                  onClick={() => handleOpenEdit(selectedTenant)}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar Cadastro
                </Button>
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">CNPJ: {selectedTenant.cnpj}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`h-8 gap-1.5 font-bold text-[11px] uppercase tracking-widest ${
                selectedTenant.subscription.status === 'active'
                  ? 'border-rose-500/20 text-rose-400 hover:bg-rose-500/10'
                  : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
              }`}
              onClick={() => toggleStatus(selectedTenant.id)}
            >
              <PowerOff className="w-3.5 h-3.5" />
              {selectedTenant.subscription.status === 'active' ? 'Suspender Empresa' : 'Ativar Empresa'}
            </Button>
            
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 font-bold text-[11px] uppercase tracking-widest"
                onClick={() => handleBackup(selectedTenant)}
                disabled={backupLoading === selectedTenant.id}
              >
                {backupLoading === selectedTenant.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Download className="w-3.5 h-3.5" />}
                Backup
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="stores" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="stores" className="gap-2 text-[13px]"><StoreIcon className="w-4 h-4" /> Lojas da Rede</TabsTrigger>
            <TabsTrigger value="users" className="gap-2 text-[13px]"><Users className="w-4 h-4" /> Usuários Administrativos</TabsTrigger>
            <TabsTrigger value="whitelabel" className="gap-2 text-[13px]"><Palette className="w-4 h-4" /> White Label</TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="logs" className="gap-2 text-[13px]"><History className="w-4 h-4" /> Logs de Auditoria</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="stores" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addStoreOpen} onOpenChange={(v) => { setAddStoreOpen(v); if(!v) setEditStoreId(null); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5" onClick={() => { setEditStoreId(null); setStoreForm({ name: '', cnpj: '' }); }}>
                    <Plus className="w-3.5 h-3.5" /> Nova Loja
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-[15px]">{editStoreId ? 'Editar Loja' : 'Cadastrar Loja'}: {selectedTenant.name}</DialogTitle>
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
                    <Button onClick={handleAddStore} className="w-full h-9 text-[13px] mt-2">{editStoreId ? 'Salvar Alterações' : 'Salvar Loja'}</Button>
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
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest text-right">Ações</th>
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
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10" onClick={() => handleOpenEditStore(s)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 border-primary/20 text-primary hover:bg-primary/5" onClick={async () => {
                const tenantUsers = managedUsers.filter(u => u.user.tenantId === selectedTenant.id);
                for (const u of tenantUsers) {
                  const { error } = await saveUser(u);
                  if (error) {
                    toast({ title: `Erro ao sincronizar ${u.email}`, description: error.message, variant: 'destructive' });
                    return;
                  }
                }
                setManagedUsers(await getAllUsers());
                toast({ title: 'Sincronização concluída!' });
              }}>
                <RefreshCw className="w-3.5 h-3.5" /> Sincronizar Tudo
              </Button>
              <Dialog open={addUserOpen} onOpenChange={(v) => { setAddUserOpen(v); if(!v) setEditingEmail(null); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 gap-1.5" onClick={() => {
                    setEditingEmail(null);
                    setUserForm({ name: '', email: '', password: '123', appPermissions: { 'ponto': true } });
                    setSelectedUserPermissions(DEFAULT_PERMISSIONS);
                  }}>
                    <Plus className="w-3.5 h-3.5" /> Novo Usuário
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-[15px]">{editingEmail ? 'Editar Acesso' : 'Criar Acesso'}: {selectedTenant.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2 mt-2 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-muted-foreground">Nome do Usuário *</label>
                        <Input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-[13px]" placeholder="Ex: Roberto Carlos" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-medium text-muted-foreground">Login (E-mail) *</label>
                        <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value.toLowerCase().trim() }))} className="h-9 text-[13px]" placeholder="email@empresa.com.br" disabled={!!editingEmail} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-medium text-muted-foreground">{editingEmail ? 'Nova Senha (vazio p/ manter)' : 'Senha Inicial *'}</label>
                      <div className="relative">
                        <Input type={showUserPassword ? 'text' : 'password'} value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} className="h-9 text-[13px] pr-10" />
                        <button type="button" onClick={() => setShowUserPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                          {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[13px] font-bold text-white">Módulos de Acesso</label>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedUserPermissions(DEFAULT_PERMISSIONS)} className="text-[11px] text-primary hover:underline">Todos</button>
                          <span className="text-muted-foreground">|</span>
                          <button onClick={() => setSelectedUserPermissions([])} className="text-[11px] text-rose-400 hover:underline">Limpar</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {MODULE_OPTIONS.map(({ module, label, description }) => (
                          <div
                            key={module}
                            onClick={() => setSelectedUserPermissions(prev => prev.includes(module) ? prev.filter(p => p !== module) : [...prev, module])}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              selectedUserPermissions.includes(module)
                                ? 'bg-primary/10 border-primary/30 text-white'
                                : 'bg-white/3 border-white/10 text-muted-foreground hover:border-white/20'
                            }`}
                          >
                            <div>
                              <p className="text-[12px] font-bold">{label}</p>
                              <p className="text-[10px] opacity-60">{description}</p>
                            </div>
                            <Switch checked={selectedUserPermissions.includes(module)} onCheckedChange={() => {}} onClick={e => e.stopPropagation()} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <label className="text-[13px] font-bold text-white mb-3 block">Liberação de Aplicativos</label>
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between cursor-pointer" onClick={() => setUserForm(f => ({ ...f, appPermissions: { ...f.appPermissions, 'ponto': !f.appPermissions['ponto'] } }))}>
                        <div>
                          <p className="text-[12px] font-bold">App Ponto Digital</p>
                          <p className="text-[10px] text-muted-foreground">Acesso para batida de ponto via mobile/tablet</p>
                        </div>
                        <Switch checked={!!userForm.appPermissions['ponto']} onCheckedChange={() => {}} />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="ghost" onClick={() => { setAddUserOpen(false); setEditingEmail(null); }} className="flex-1 h-10"><X className="w-4 h-4 mr-1" /> Cancelar</Button>
                      <Button onClick={handleAddUser} className="flex-1 h-10"><Save className="w-4 h-4 mr-1" /> {editingEmail ? 'Salvar' : 'Criar Usuário'}</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest">Usuário</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest">Login / E-mail</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest text-center">Permissões</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-primary uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantUsers.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-[13px] text-muted-foreground">Nenhum usuário administrativo cadastrado para esta empresa.</td></tr>
                  ) : tenantUsers.map(u => (
                    <tr key={u.email} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-[13px] font-medium text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] border border-primary/20">
                            {u.user.name.charAt(0)}
                          </div>
                          <div>
                            {u.user.name}
                            {u.mustChangePassword && <span className="block text-[9px] text-amber-500 font-bold uppercase tracking-tighter">Troca pendente</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] text-muted-foreground group-hover:text-white transition-colors">{u.email}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase">
                            {(u.permissions ?? []).length} Módulos
                          </span>
                          {u.appPermissions?.['ponto'] && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold uppercase">
                              + App Ponto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-white/10" onClick={() => handleEditUser(u)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500" onClick={() => handleDeleteUser(u.email, u.user.name)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="whitelabel" className="space-y-6">
            <div className="glass-card rounded-2xl border border-white/5 p-8 max-w-2xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Palette className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Personalização White Label <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded ml-2">V2.1</span></h3>
                  <p className="text-[13px] text-muted-foreground">Configure a identidade visual do cliente</p>
                </div>
              </div>

              {selectedTenant.plan !== 'ENTERPRISE' ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-white/10 rounded-2xl bg-white/[0.02] text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                    <ShieldAlert className="w-8 h-8 text-amber-500" />
                  </div>
                  <h4 className="text-[15px] font-bold text-white mb-2">Recurso Indisponível</h4>
                  <p className="text-[13px] text-muted-foreground mb-6 max-w-sm">
                    O plano atual ({selectedTenant.plan || 'BÁSICO'}) não possui suporte a White Label. 
                    Faça o upgrade para o plano <strong>ENTERPRISE</strong> para habilitar.
                  </p>
                  <Button variant="outline" className="h-9 text-[12px] font-bold border-primary/20 text-primary hover:bg-primary/10" onClick={() => handleOpenEdit(selectedTenant)}>
                    Alterar Plano do Cliente
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[12px] font-black text-primary uppercase tracking-widest">Nome do Sistema</Label>
                      <Input 
                        value={form.systemName} 
                        onChange={e => setForm(f => ({ ...f, systemName: e.target.value }))}
                        className="bg-white/5 border-white/10 h-11 text-[13px] font-bold"
                        placeholder="Ex: Hub RH MARECHAL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[12px] font-black text-primary uppercase tracking-widest">Cor Primária (Hex)</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={form.primaryColor} 
                          onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                          className="bg-white/5 border-white/10 h-11 text-[13px] font-mono font-bold"
                          placeholder="#0066FF"
                        />
                        <div className="relative">
                          <input 
                            type="color" 
                            value={form.primaryColor || '#0066FF'} 
                            onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                            className="w-11 h-11 rounded-xl border-none cursor-pointer p-0 overflow-hidden absolute inset-0 opacity-0"
                          />
                          <div className="w-11 h-11 rounded-xl border border-white/10 shadow-lg" style={{ backgroundColor: form.primaryColor || '#0066FF' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[12px] font-black text-primary uppercase tracking-widest">Link de Acesso (Slug)</Label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground font-mono">/</span>
                          <Input 
                            value={form.slug} 
                            onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                            className="bg-white/5 border-white/10 h-11 text-[13px] font-mono font-bold pl-6"
                            placeholder="ex: rh-marechal"
                          />
                        </div>
                        <Button 
                          variant="outline" 
                          type="button"
                          className="h-11 border-white/10 hover:bg-white/5"
                          onClick={() => {
                            const url = `${window.location.origin}/login?t=${form.slug || selectedTenant.id}`;
                            navigator.clipboard.writeText(url);
                            toast({ title: 'Link copiado!', description: 'O link exclusivo deste cliente foi copiado.' });
                          }}
                        >
                          <Globe className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">Esse será o endereço único do seu cliente (ex: cybertech.rh/login?t=rh-marechal)</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[12px] font-black text-primary uppercase tracking-widest text-emerald-400">Fundo da Tela de Login</Label>
                      <Input 
                        value={form.backgroundUrl} 
                        onChange={e => setForm(f => ({ ...f, backgroundUrl: e.target.value }))}
                        className="bg-white/5 border-white/10 h-11 text-[13px] font-bold"
                        placeholder="URL da Imagem (4K/FullHD)"
                      />
                      <p className="text-[10px] text-muted-foreground italic">Deixe em branco para usar o fundo padrão.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[12px] font-black text-primary uppercase tracking-widest">Logotipo do Sistema (Beta Upload)</Label>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="flex-1 w-full space-y-2">
                        <Input 
                          value={form.logoUrl} 
                          onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                          className="bg-white/5 border-white/10 h-11 text-[13px] font-bold"
                          placeholder="Cole a URL ou faça o upload ao lado"
                        />
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            className="h-9 text-[11px] font-bold border-white/10 hover:bg-white/5 relative"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                          >
                            <Plus className="w-3.5 h-3.5 mr-2" /> Upload de Arquivo
                            <input 
                              id="logo-upload"
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                try {
                                  // Tentativa direta de upload para o bucket 'system-assets'
                                  const fileExt = file.name.split('.').pop();
                                  const fileName = `${selectedTenant.id}_${Date.now()}.${fileExt}`;
                                  const filePath = `logos/${fileName}`;
                                  
                                  const { error: uploadError } = await supabase.storage
                                    .from('system-assets')
                                    .upload(filePath, file);
                                    
                                  if (uploadError) {
                                    if (uploadError.message.includes('not found')) {
                                      throw new Error('O bucket "system-assets" não foi encontrado no Supabase. Por favor, crie-o no painel do Supabase > Storage e defina como Público.');
                                    }
                                    throw uploadError;
                                  }
                                  
                                  const { data: { publicUrl } } = supabase.storage
                                    .from('system-assets')
                                    .getPublicUrl(filePath);
                                    
                                  setForm(f => ({ ...f, logoUrl: publicUrl }));
                                  toast({ title: 'Upload concluído!' });
                                } catch (err: any) {
                                  toast({ 
                                    title: 'Erro no upload', 
                                    description: err.message, 
                                    variant: 'destructive' 
                                  });
                                }
                              }}
                            />
                          </Button>
                          <span className="text-[10px] text-muted-foreground italic">Recomendado: PNG Transparente 512x512px</span>
                        </div>
                      </div>
                      
                      <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center p-2 overflow-hidden shrink-0 group relative">
                        {form.logoUrl ? (
                          <>
                            <img src={form.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer" onClick={() => setForm(f => ({ ...f, logoUrl: '' }))}>
                              <X className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <Plus className="w-6 h-6 text-white/20 mx-auto" />
                            <span className="text-[9px] text-white/20 font-bold uppercase mt-1 block">Logo</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/10">
                    <Label className="text-[12px] font-black text-primary uppercase tracking-widest mb-4 block">Prévia em Tempo Real</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white/[0.02] rounded-2xl p-6 border border-white/5">
                      {/* Sidebar Preview */}
                      <div className="space-y-4">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Interface do Sistema</p>
                        <div className="flex gap-3">
                          <div className="w-12 h-32 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center py-4 gap-4">
                            <div className="w-6 h-6 rounded-lg" style={{ backgroundColor: form.primaryColor || '#0066FF' }} />
                            <div className="w-6 h-0.5 bg-white/10" />
                            <div className="w-6 h-0.5 bg-white/10" />
                            <div className="w-6 h-0.5 bg-white/10" />
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="h-6 w-3/4 rounded bg-white/5" />
                            <div className="h-20 w-full rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between">
                              <div className="h-2 w-1/2 rounded bg-white/10" />
                              <div className="h-8 w-full rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-lg" style={{ backgroundColor: form.primaryColor || '#0066FF', boxShadow: `0 4px 12px ${form.primaryColor}44` }}>
                                BOTÃO DE AÇÃO
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 border border-white/10">
                            {form.logoUrl ? (
                              <img src={form.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <Building2 className="w-5 h-5 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-[14px] font-bold text-white">{form.systemName || 'CyberTech RH'}</p>
                            <p className="text-[11px] text-muted-foreground">ID: {selectedTenant.id}</p>
                          </div>
                        </div>
                        <p className="text-[12px] text-muted-foreground leading-relaxed">
                          As alterações acima serão aplicadas a todos os usuários da empresa <strong>{selectedTenant.name}</strong> assim que você clicar em salvar.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <Button onClick={handleSave} className="h-12 px-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[13px] uppercase tracking-widest shadow-[0_8px_30px_rgba(var(--primary),0.3)] transition-all hover:-translate-y-1 active:translate-y-0">
                      <Save className="w-4 h-4 mr-2" /> Salvar Configurações
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {isAdmin && (
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
      ) : (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Empresas</h1>
          <p className="text-[13px] text-muted-foreground">Gerencie clientes e licenças</p>
        </div>
        <Button size="sm" className="h-8 text-[12px] gap-1.5" onClick={handleOpenAdd}>
          <Plus className="w-3.5 h-3.5" /> Nova Empresa
        </Button>
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
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{t.name}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${
                          t.plan === 'ENTERPRISE' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' : 
                          t.plan === 'PRO' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' : 
                          'border-white/10 text-muted-foreground bg-white/5'
                        }`}>
                          {t.plan || 'BÁSICO'}
                        </span>
                      </div>
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
                      className="h-8 w-8 rounded-lg text-primary/40 hover:text-primary hover:bg-primary/10"
                      title="Copiar Link de Acesso"
                      onClick={() => {
                        const url = `${window.location.origin}/login?t=${t.branding?.slug || t.id}`;
                        navigator.clipboard.writeText(url);
                        toast({ title: 'Link copiado!', description: `Link exclusivo para ${t.name} pronto para envio.` });
                      }}
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 font-bold text-[11px]"
                        onClick={() => {
                          impersonateTenant(t.id, t.branding);
                          toast({ title: `Acessando como ${t.name}`, description: 'Você agora está visualizando os dados desta empresa.' });
                          navigate('/dashboard');
                        }}
                      >
                        <Eye className="w-3.5 h-3.5" /> Acessar
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                      onClick={() => handleOpenEdit(t)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Backup de dados"
                          className="h-8 w-8 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          onClick={() => handleBackup(t)}
                          disabled={backupLoading === t.id}
                        >
                          {backupLoading === t.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Download className="w-3.5 h-3.5" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          onClick={() => handleDeleteTenant(t.id, t.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        </div>
      )}
    </div>
  );
}
