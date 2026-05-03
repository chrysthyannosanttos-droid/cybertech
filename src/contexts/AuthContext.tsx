import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, AppModule } from '@/types';

export interface ManagedUser {
  email: string;
  password: string;
  mustChangePassword?: boolean;
  permissions?: AppModule[]; // undefined = all access (superadmin)
  appPermissions?: Record<string, boolean>; // e.g. { 'ponto': true }
  canEditEmployees?: boolean;
  canDeleteEmployees?: boolean;
  user: User;
}

export type LoginResult = 
  | { success: true; mustChangePassword: boolean }
  | { success: false; reason: 'invalid_credentials' | 'suspended' | 'past_due' | 'error'; message?: string };

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  mustChangePassword: boolean;
  changePassword: (newPassword: string) => void;
  getAllUsers: () => Promise<ManagedUser[]>;
  saveUser: (userData: ManagedUser) => Promise<{ error: any }>;
  deleteUser: (email: string) => Promise<{ error: any }>;
  getUserPermissions: (email: string) => Promise<AppModule[] | undefined>;
  currentPermissions: AppModule[] | undefined; // undefined = all access
  isEmployeeView: boolean;
  setIsEmployeeView: (v: boolean) => void;
  impersonateTenant: (tenantId: string, branding?: any) => void;
  stopImpersonating: () => void;
  isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_PERMISSIONS: AppModule[] = [
  'dashboard', 'employees', 'certificates', 'payroll', 'reports', 'service-providers', 'rescissions', 'stores', 'attendance', 'settings'
];

// AVISO DE SEGURANÇA: Credenciais NÃO devem ser armazenadas em código-fonte.
// Este fallback é apenas para ambientes de desenvolvimento sem banco configurado.
// Em produção, todos os usuários devem estar na tabela 'profiles' do Supabase.
const DEFAULT_USERS: ManagedUser[] = [
  // Fallback de emergência — sem senha em texto no código.
  // Adicione usuários diretamente no Supabase (tabela profiles).
];

function getStoredUsers(): ManagedUser[] {
  const stored = localStorage.getItem('managed_users');
  if (stored) return JSON.parse(stored);
  localStorage.setItem('managed_users', JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('nexus_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(() => {
    return sessionStorage.getItem('must_change_password') === 'true';
  });
  const [currentPermissions, setCurrentPermissions] = useState<AppModule[] | undefined>(() => {
    const stored = sessionStorage.getItem('user_permissions');
    return stored ? JSON.parse(stored) : undefined;
  });
  const [isEmployeeView, setIsEmployeeView] = useState<boolean>(() => {
    return sessionStorage.getItem('is_employee_view') === 'true';
  });
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    return sessionStorage.getItem('is_impersonating') === 'true';
  });

  const toggleEmployeeView = useCallback((v: boolean) => {
    setIsEmployeeView(v);
    sessionStorage.setItem('is_employee_view', v ? 'true' : 'false');
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Sincronização em tempo real do perfil e permissões
    const channel = supabase
      .channel(`profile_sync_realtime_${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        table: 'profiles', 
        schema: 'public', 
        filter: `id=eq.${user.id}` 
      }, async () => {
        console.log('🔄 Detecção de alteração. Buscando perfil atualizado...');
        // Refetch garantido direto do banco
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        
        if (profile) {
          let branding = undefined;
          let plan = 'BASIC';
          if (profile.tenant_id) {
            const { data: tData } = await supabase.from('tenants').select('branding, plan').eq('id', profile.tenant_id).maybeSingle();
            if (tData) {
              plan = tData.plan || 'BASIC';
              branding = plan === 'ENTERPRISE' ? tData.branding : undefined;
            }
          }

          const userData: User = {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            tenantId: profile.tenant_id,
            canEditEmployees: profile.can_edit_employees,
            canDeleteEmployees: profile.can_delete_employees,
            permissions: profile.permissions,
            appPermissions: profile.app_permissions,
            tenantBranding: branding,
            plan: plan as any
          };
          
          setUser(userData);
          sessionStorage.setItem('nexus_user', JSON.stringify(userData));
          
          const perms = profile.role === 'superadmin' ? undefined : (profile.permissions ?? DEFAULT_PERMISSIONS);
          setCurrentPermissions(perms);
          sessionStorage.setItem('user_permissions', JSON.stringify(perms ?? null));
          sessionStorage.setItem('app_permissions', JSON.stringify(profile.app_permissions || { 'ponto': true }));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      // 1. Tentar buscar do banco de dados (Sincronizado)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle();

      if (profile) {
        let branding = undefined;
        let plan = 'BASIC';
        let tenantSubscription: any = null;

        if (profile.tenant_id) {
          const { data: tData } = await supabase
            .from('tenants')
            .select('branding, plan, subscription, name')
            .eq('id', profile.tenant_id)
            .maybeSingle();

          if (tData) {
            plan = tData.plan || 'BASIC';
            branding = plan === 'ENTERPRISE' ? tData.branding : undefined;
            tenantSubscription = tData.subscription;

            // ── CAMADA 1: Verificação de Licença no Login ──
            // Superadmin nunca é bloqueado
            const isSuperadmin = profile.role === 'superadmin' || email === 'cristiano';
            if (!isSuperadmin && tenantSubscription) {
              const subStatus = tenantSubscription.status;
              if (subStatus === 'suspended') {
                return {
                  success: false,
                  reason: 'suspended',
                  message: `O acesso da empresa "${tData.name}" está suspenso. Entre em contato com a CyberTech para regularizar.`
                };
              }
              // past_due: permite login mas registra o estado
              if (subStatus === 'past_due') {
                localStorage.setItem('cybertech_license_warning', JSON.stringify({
                  reason: 'past_due',
                  tenantName: tData.name,
                  expiryDate: tenantSubscription.expiryDate,
                  monthlyFee: tenantSubscription.monthlyFee
                }));
              } else {
                localStorage.removeItem('cybertech_license_warning');
              }
            }
          }
        }

        const userData: User = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          tenantId: profile.tenant_id,
          canEditEmployees: profile.can_edit_employees,
          canDeleteEmployees: profile.can_delete_employees,
          permissions: profile.permissions,
          appPermissions: profile.app_permissions,
          tenantBranding: branding,
          plan: plan as any
        };
        
        setUser(userData);
        sessionStorage.setItem('nexus_user', JSON.stringify(userData));
        
        const needsChange = !!profile.must_change_password;
        setMustChangePassword(needsChange);
        sessionStorage.setItem('must_change_password', needsChange ? 'true' : 'false');
        
        const perms = profile.role === 'superadmin' ? undefined : (profile.permissions ?? DEFAULT_PERMISSIONS);
        setCurrentPermissions(perms);
        sessionStorage.setItem('user_permissions', JSON.stringify(perms ?? null));
        
        sessionStorage.setItem('app_permissions', JSON.stringify(profile.app_permissions || { 'ponto': true }));
        
        return { success: true, mustChangePassword: !!profile.must_change_password };
      }

      // 2. Fallback para localStorage (Legado)
      const users = getStoredUsers();
      const found = users.find(u => u.email === email && u.password === password);
      if (found) {
        setUser(found.user);
        sessionStorage.setItem('nexus_user', JSON.stringify(found.user));
        const needsChange = !!(found.mustChangePassword);
        setMustChangePassword(needsChange);
        sessionStorage.setItem('must_change_password', needsChange ? 'true' : 'false');
        const perms = found.user.role === 'superadmin' ? undefined : (found.permissions ?? DEFAULT_PERMISSIONS);
        setCurrentPermissions(perms);
        sessionStorage.setItem('user_permissions', JSON.stringify(perms ?? null));
        sessionStorage.setItem('app_permissions', JSON.stringify(found.appPermissions || { 'ponto': true }));
        return { success: true, mustChangePassword: !!(found.mustChangePassword) };
      }
    } catch (err) {
      console.error('Erro no login:', err);
      return { success: false, reason: 'error', message: 'Erro interno ao autenticar. Tente novamente.' };
    }
    return { success: false, reason: 'invalid_credentials' };
  }, []);

  const logout = useCallback(async () => {
    const lastTenant = localStorage.getItem('last_tenant_slug');
    
    setUser(null);
    setMustChangePassword(false);
    setCurrentPermissions(undefined);
    sessionStorage.removeItem('nexus_user');
    sessionStorage.removeItem('must_change_password');
    sessionStorage.removeItem('user_permissions');
    sessionStorage.removeItem('app_permissions');
    sessionStorage.removeItem('is_impersonating');

    // Redirect to tenant-specific login if applicable
    if (lastTenant) {
      window.location.href = `/login?t=${lastTenant}`;
    } else {
      window.location.href = '/login';
    }
  }, []);

  const impersonateTenant = useCallback((tenantId: string, branding?: any) => {
    if (user?.role !== 'superadmin' && !user?.email?.toLowerCase().includes('cristiano')) return;
    
    const updatedUser = { ...user, tenantId, tenantBranding: branding };
    setUser(updatedUser as User);
    setIsImpersonating(true);
    sessionStorage.setItem('is_impersonating', 'true');
    sessionStorage.setItem('nexus_user', JSON.stringify(updatedUser));
  }, [user]);

  const stopImpersonating = useCallback(async () => {
    if (!user) return;
    // Recarregar dados originais do banco
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (profile) {
      const userData: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        tenantId: profile.tenant_id,
        canEditEmployees: profile.can_edit_employees,
        canDeleteEmployees: profile.can_delete_employees,
        permissions: profile.permissions,
        appPermissions: profile.app_permissions,
        tenantBranding: undefined,
        plan: 'BASIC'
      };
      setUser(userData);
      setIsImpersonating(false);
      sessionStorage.setItem('is_impersonating', 'false');
      sessionStorage.setItem('nexus_user', JSON.stringify(userData));
    }
  }, [user]);

  // Persistência definitiva de dados garantida

  const changePassword = useCallback((newPassword: string) => {
    if (!user) return;
    const users = getStoredUsers();
    const index = users.findIndex(u => u.email === user.email);
    if (index >= 0) {
      users[index].password = newPassword;
      users[index].mustChangePassword = false;
      localStorage.setItem('managed_users', JSON.stringify(users));
    }
    setMustChangePassword(false);
    sessionStorage.setItem('must_change_password', 'false');
  }, [user]);

  const getAllUsers = useCallback(async (): Promise<ManagedUser[]> => {
    try {
      const { data: profiles, error } = await supabase.from('profiles').select('*').order('name');
      
      if (error) {
        console.warn('Usando fallback do localStorage:', error.message);
        return getStoredUsers();
      }

      const dbUsers = (profiles || []).map(p => ({
        email: p.email,
        password: p.password,
        mustChangePassword: p.must_change_password,
        permissions: p.permissions,
        appPermissions: p.app_permissions,
        canEditEmployees: p.can_edit_employees,
        canDeleteEmployees: p.can_delete_employees,
        user: {
          id: p.id,
          email: p.email,
          name: p.name,
          role: p.role,
          tenantId: p.tenant_id,
          canEditEmployees: p.can_edit_employees,
          canDeleteEmployees: p.can_delete_employees,
          permissions: p.permissions,
          appPermissions: p.app_permissions
        }
      }));

      // Merge with DEFAULT_USERS if DB is completely empty (initial setup)
      if (dbUsers.length === 0) return DEFAULT_USERS;
      
      return dbUsers;
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      return getStoredUsers();
    }
  }, []);

  const saveUser = useCallback(async (userData: ManagedUser) => {
    try {
      const dbData = {
        id: userData.user.id || undefined,
        email: userData.email,
        name: userData.user.name,
        password: userData.password,
        role: userData.user.role,
        tenant_id: userData.user.tenantId || null,
        permissions: userData.permissions,
        app_permissions: userData.appPermissions,
        must_change_password: userData.mustChangePassword,
        can_edit_employees: userData.canEditEmployees,
        can_delete_employees: userData.canDeleteEmployees
      };

      const { error } = await supabase.from('profiles').upsert(dbData, { onConflict: 'email' });
      
      // Update local storage as fallback
      const users = getStoredUsers();
      const index = users.findIndex(u => u.email === userData.email);
      if (index >= 0) {
        users[index] = userData;
      } else {
        users.push(userData);
      }
      localStorage.setItem('managed_users', JSON.stringify(users));

      return { error };
    } catch (err: any) {
      console.error('Erro ao salvar usuário no banco:', err);
      return { error: err };
    }
  }, []);

  const deleteUser = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('email', email);
      const users = getStoredUsers().filter(u => u.email !== email);
      localStorage.setItem('managed_users', JSON.stringify(users));
      return { error };
    } catch (err: any) {
      console.error('Erro ao deletar usuário no banco:', err);
      return { error: err };
    }
  }, []);

  const getUserPermissions = useCallback(async (email: string): Promise<AppModule[] | undefined> => {
    try {
      const { data } = await supabase.from('profiles').select('permissions').eq('email', email).maybeSingle();
      if (data) return data.permissions;
    } catch {}
    const users = getStoredUsers();
    const found = users.find(u => u.email === email);
    return found?.permissions;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, login, logout, isAuthenticated: !!user,
      mustChangePassword, changePassword,
      getAllUsers, saveUser, deleteUser,
      getUserPermissions, currentPermissions,
      isEmployeeView, setIsEmployeeView: toggleEmployeeView,
      impersonateTenant, stopImpersonating, isImpersonating
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
