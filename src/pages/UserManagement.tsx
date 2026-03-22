import { useState } from 'react';
import { useAuth, AppModule, ManagedUser } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Eye, EyeOff, ShieldCheck, Building2, Save, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { addAuditLog } from '@/data/mockData';
import { MOCK_TENANTS } from '@/data/mockData';

// Módulos disponíveis para configurar permissões
const MODULE_OPTIONS: Array<{ module: AppModule; label: string; description: string }> = [
  { module: 'dashboard',         label: 'Dashboard',      description: 'Visão geral e indicadores' },
  { module: 'employees',         label: 'Funcionários',   description: 'Cadastro e gestão de colaboradores' },
  { module: 'certificates',      label: 'Atestados',      description: 'Controle de atestados médicos' },
  { module: 'payroll',           label: 'Folha',          description: 'Folha de pagamento e cálculos' },
  { module: 'reports',           label: 'Relatórios',     description: 'Relatórios e análises' },
  { module: 'service-providers', label: 'Prestadores',    description: 'Controle de prestadores de serviço' },
  { module: 'rescissions',       label: 'Rescisões',      description: 'Registro de rescisões contratuais' },
  { module: 'stores',            label: 'Lojas',          description: 'Gestão de unidades/lojas' },
];

const DEFAULT_PERMISSIONS: AppModule[] = MODULE_OPTIONS.map(m => m.module);

export default function UserManagement() {
  const { user: currentUser, getAllUsers, saveUser, deleteUser } = useAuth();
  const { toast } = useToast();
  
  const isCristiano = currentUser?.email === 'cristiano' || currentUser?.name?.toLowerCase() === 'cristiano';
  const isAdmin = currentUser?.role === 'superadmin' || isCristiano;

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const [users, setUsers] = useState(() => getAllUsers());
  const [open, setOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '123',
    name: '',
    role: 'tenant' as 'superadmin' | 'tenant',
    tenantId: '',
    appPermissions: { 'ponto': true } as Record<string, boolean>,
  });
  const [selectedPermissions, setSelectedPermissions] = useState<AppModule[]>(DEFAULT_PERMISSIONS);

  const resetForm = () => {
    setForm({ email: '', password: '123', name: '', role: 'tenant', tenantId: '', appPermissions: { 'ponto': true } });
    setSelectedPermissions(DEFAULT_PERMISSIONS);
    setEditingEmail(null);
    setShowPassword(false);
  };

  const handleOpen = (userData?: ManagedUser) => {
    if (userData) {
      setEditingEmail(userData.email);
      setForm({
        email: userData.email,
        password: '', // Deixa em branco para não mostrar a senha atual, mas permitir sobrescrever
        name: userData.user.name,
        role: userData.user.role as 'superadmin' | 'tenant',
        tenantId: userData.user.tenantId || '',
        appPermissions: userData.appPermissions || { 'ponto': true },
      });
      setSelectedPermissions(userData.permissions ?? DEFAULT_PERMISSIONS);
    } else {
      resetForm();
    }
    setOpen(true);
  };

  const togglePermission = (module: AppModule) => {
    setSelectedPermissions(prev =>
      prev.includes(module) ? prev.filter(p => p !== module) : [...prev, module]
    );
  };

  const handleSave = () => {
    if (!form.email || !form.name) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    const isNew = !editingEmail;
    const existingUsers = getAllUsers();

    if (isNew && existingUsers.find(u => u.email === form.email)) {
      toast({ title: 'Usuário já existe', description: `O login "${form.email}" já está em uso.`, variant: 'destructive' });
      return;
    }

    const id = editingEmail
      ? existingUsers.find(u => u.email === editingEmail)?.user.id || `u_${Date.now()}`
      : `u_${Date.now()}`;

    const existingRecord = editingEmail ? existingUsers.find(u => u.email === editingEmail) : undefined;
    const passwordToSave = (editingEmail && !form.password) ? (existingRecord?.password || '123') : form.password;

    const newUserData: ManagedUser = {
      email: form.email,
      password: passwordToSave,
      mustChangePassword: isNew ? true : existingRecord?.mustChangePassword,
      permissions: form.role === 'superadmin' ? undefined : selectedPermissions,
      user: {
        id,
        email: form.email,
        name: form.name,
        role: form.role,
        ...(form.role === 'tenant' && form.tenantId ? { tenantId: form.tenantId } : {}),
      },
    };

    saveUser(newUserData);
    setUsers(getAllUsers());

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: isNew ? 'CREATE_USER' : 'EDIT_USER',
      details: `[Usuários] ${isNew ? 'Criou' : 'Editou'} usuário "${form.name}" (login: ${form.email}) — ${selectedPermissions.length} módulos liberados`,
    });

    toast({ title: isNew ? 'Usuário criado!' : 'Usuário atualizado!' });
    setOpen(false);
    resetForm();
  };

  const handleDelete = (email: string, name: string) => {
    if (email === 'cristiano') {
      toast({ title: 'Não permitido', description: 'O usuário Cristiano não pode ser excluído.', variant: 'destructive' });
      return;
    }
    if (!window.confirm(`Deseja excluir permanentemente o usuário "${name}"?`)) return;

    deleteUser(email);
    setUsers(getAllUsers());

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_USER',
      details: `[Usuários] Excluiu usuário "${name}" (login: ${email})`,
    });

    toast({ title: 'Usuário excluído' });
  };

  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Gerenciamento de Usuários</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Controle de acessos e permissões por usuário</p>
        </div>
        <Button onClick={() => handleOpen()} className="h-10 gap-2 bg-primary hover:bg-primary/90 font-bold">
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest">
              <th className="px-6 py-4">Usuário</th>
              <th className="px-6 py-4">Login</th>
              <th className="px-6 py-4 text-center">Perfil</th>
              <th className="px-6 py-4">Empresa</th>
              <th className="px-6 py-4 text-center">Módulos Liberados</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => {
              const tenant = MOCK_TENANTS.find(t => t.id === u.user.tenantId);
              const isAdmin = u.user.role === 'superadmin';
              const permCount = isAdmin ? 'Tudo' : `${(u.permissions ?? DEFAULT_PERMISSIONS).length}/${MODULE_OPTIONS.length}`;
              return (
                <tr key={u.email} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-sm">
                        {u.user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">{u.user.name}</p>
                        {u.mustChangePassword && (
                          <p className="text-[10px] text-amber-400 font-bold">⚠ Aguarda troca de senha</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[13px] text-muted-foreground">{u.email}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                      isAdmin ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                             : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {isAdmin ? 'Super Admin' : 'Empresa'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-muted-foreground">
                      {tenant?.name || (isAdmin ? '— Todos —' : 'Não vinculado')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-[11px] font-bold border ${
                      isAdmin ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
                              : 'text-primary border-primary/20 bg-primary/10'
                    }`}>
                      {permCount}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/10" onClick={() => handleOpen(u)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {u.email !== 'cristiano' && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-500/10 hover:text-rose-500" onClick={() => handleDelete(u.email, u.user.name)}>
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

      {/* Modal de Criação/Edição */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); resetForm(); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmail ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Dados básicos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Nome Completo *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: João da Silva" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Login (Usuário) *</Label>
                <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value.toLowerCase().trim() }))} placeholder="Ex: joao.silva" disabled={!!editingEmail} className="h-10" />
              </div>
            </div>

            {/* Senha */}
            {!editingEmail ? (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-[12px] text-primary font-medium">ℹ️ Senha padrão: <span className="font-mono font-black">123</span></p>
                <p className="text-[11px] text-muted-foreground mt-0.5">O usuário será obrigado a criar uma nova senha no primeiro acesso.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Nova Senha (deixe em branco para manter)</Label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Nova senha..." className="h-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Perfil e empresa */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-muted-foreground">Perfil de Acesso</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as 'superadmin' | 'tenant' }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant"><Building2 className="w-4 h-4 inline mr-2" />Empresa</SelectItem>
                    <SelectItem value="superadmin"><ShieldCheck className="w-4 h-4 inline mr-2" />Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === 'tenant' && (
                <div className="space-y-1.5">
                  <Label className="text-[12px] text-muted-foreground">Empresa Vinculada</Label>
                  <Select value={form.tenantId} onValueChange={v => setForm(f => ({ ...f, tenantId: v }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {MOCK_TENANTS.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Permissões - só para não-superadmin */}
            {form.role !== 'superadmin' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-[13px] font-bold text-white">Módulos de Acesso</Label>
                    <p className="text-[11px] text-muted-foreground">Selecione quais seções este usuário pode ver</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedPermissions(DEFAULT_PERMISSIONS)} className="text-[11px] text-primary hover:underline">Tudo</button>
                    <span className="text-muted-foreground">|</span>
                    <button onClick={() => setSelectedPermissions([])} className="text-[11px] text-rose-400 hover:underline">Nenhum</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {MODULE_OPTIONS.map(({ module, label, description }) => (
                    <div
                      key={module}
                      onClick={() => togglePermission(module)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedPermissions.includes(module)
                          ? 'bg-primary/10 border-primary/30 text-white'
                          : 'bg-white/3 border-white/10 text-muted-foreground hover:border-white/20'
                      }`}
                    >
                      <div>
                        <p className="text-[12px] font-bold">{label}</p>
                        <p className="text-[10px] opacity-60">{description}</p>
                      </div>
                      <Switch checked={selectedPermissions.includes(module)} onCheckedChange={() => togglePermission(module)} onClick={e => e.stopPropagation()} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.role === 'superadmin' && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-[12px] text-amber-400 font-medium flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Super Admin tem acesso irrestrito a todos os módulos.</p>
              </div>
            )}

            {/* Controle de Apps (Apenas Cristiano) */}
            {isCristiano && (
              <div className="pt-4 border-t border-white/10">
                <Label className="text-[13px] font-bold text-white mb-3 block">Liberação de Aplicativos</Label>
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-bold">App Ponto Digital</p>
                    <p className="text-[10px] text-muted-foreground">Permite que o usuário acesse o app de batida de ponto</p>
                  </div>
                  <Switch 
                    checked={!!form.appPermissions['ponto']} 
                    onCheckedChange={(c) => setForm(f => ({ ...f, appPermissions: { ...f.appPermissions, 'ponto': c } }))} 
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
            <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> {editingEmail ? 'Salvar Alterações' : 'Criar Usuário'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
