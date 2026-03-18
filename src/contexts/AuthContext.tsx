import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const MOCK_USERS: Array<{ email: string; password: string; user: User }> = [
  {
    email: 'cristiano',
    password: '91126395',
    user: { id: 'u1', email: 'cristiano', role: 'superadmin', name: 'Cristiano Admin' },
  },
  {
    email: 'teste',
    password: '123',
    user: { id: 'u2', email: 'teste', role: 'tenant', tenantId: 't1', name: 'Usuário Teste' },
  },
  {
    email: 'tayna',
    password: '123',
    user: { id: 'u3', email: 'tayna', role: 'tenant', tenantId: 't1', name: 'Tayna Gomes da Silva' },
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('nexus_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((email: string, password: string) => {
    const found = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (found) {
      setUser(found.user);
      sessionStorage.setItem('nexus_user', JSON.stringify(found.user));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('nexus_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
