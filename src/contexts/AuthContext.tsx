import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, UserRole } from '@/types';

export type AppModule =
  | 'dashboard'
  | 'employees'
  | 'certificates'
  | 'payroll'
  | 'reports'
  | 'service-providers'
  | 'rescissions'
  | 'stores'
  | 'tenants'
  | 'logs'
  | 'users'
  | 'attendance'
  | 'settings';

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

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
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
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_PERMISSIONS: AppModule[] = [
  'dashboard', 'employees', 'certificates', 'payroll', 'reports', 'service-providers', 'rescissions', 'stores', 'attendance'
];

const DEFAULT_USERS: ManagedUser[] = [
  {
    email: 'cristiano',
    password: '91126395',
    user: { id: 'u1', email: 'cristiano', role: 'superadmin', name: 'Cristiano Admin' },
    // undefined permissions = acesso total
  },
  {
    email: 'teste',
    password: '123',
    mustChangePassword: true,
    permissions: DEFAULT_PERMISSIONS,
    user: { id: 'u2', email: 'teste', role: 'tenant', tenantId: 't1', name: 'Usuário Teste' },
  },
  {
    email: 'tayna',
    password: '123',
    mustChangePassword: true,
    permissions: DEFAULT_PERMISSIONS,
    user: { id: 'u3', email: 'tayna', role: 'tenant', tenantId: 't1', name: 'Tayna Gomes da Silva' },
  },
  {
    email: 'super',
    password: '123',
    permissions: DEFAULT_PERMISSIONS,
    user: { id: 'u4', email: 'super', role: 'tenant', tenantId: 't1', name: 'Super Admin Atacado' },
  },
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

  const toggleEmployeeView = useCallback((v: boolean) => {
    setIsEmployeeView(v);
    sessionStorage.setItem('is_employee_view', v ? 'true' : 'false');
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // 1. Tentar buscar do banco de dados (Sincronizado)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle();

      if (profile) {
        const userData: User = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          tenantId: profile.tenant_id,
          canEditEmployees: profile.can_edit_employees,
          canDeleteEmployees: profile.can_delete_employees
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
        
        return true;
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
        return true;
      }
    } catch (err) {
      console.error('Erro no login:', err);
    }
    return false;
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setMustChangePassword(false);
    setCurrentPermissions(undefined);
    sessionStorage.removeItem('nexus_user');
    sessionStorage.removeItem('must_change_password');
    sessionStorage.removeItem('user_permissions');
    sessionStorage.removeItem('app_permissions');
  }, []);

  // Limpeza ao fechar a aba
  useEffect(() => {
    const handleUnload = () => {
      // Usar beacon ou feto síncrono é difícil, mas tentamos a deleção
      // Como o browser fecha, o beacon é o mais recomendado, mas o supabase não expõe beacon direto.
      // Vamos apenas registrar o listener para tentar agir no fechamento.
      const userStr = sessionStorage.getItem('nexus_user');
      if (userStr) {
        // Tenta limpar se estiver logado
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/certificates?tenant_id=eq.t1`, {
          method: 'DELETE',
          keepalive: true,
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rescissions?tenant_id=eq.t1`, {
          method: 'DELETE',
          keepalive: true,
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        });
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

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
          canDeleteEmployees: p.can_delete_employees
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
