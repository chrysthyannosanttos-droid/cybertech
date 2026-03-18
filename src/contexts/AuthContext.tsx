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
    email: 'admin@nexushr.com',
    password: 'admin123',
    user: { id: 'u1', email: 'admin@nexushr.com', role: 'superadmin', name: 'Admin Nexus' },
  },
  {
    email: 'tenant@superatacado.com',
    password: 'tenant123',
    user: { id: 'u2', email: 'tenant@superatacado.com', role: 'tenant', tenantId: 't1', name: 'Gestão Super Atacado' },
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('nexus_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((email: string, password: string) => {
    const found = MOCK_USERS.find(u => u.email === email && u.password === password);
    if (found) {
      setUser(found.user);
      localStorage.setItem('nexus_user', JSON.stringify(found.user));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('nexus_user');
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
