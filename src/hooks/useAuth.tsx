import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserRole = "SUPER_ADMIN" | "USER" | "VIEW_ONLY";

type User = {
  id: string;
  name: string;
  role: UserRole;
  empresa_id?: string;
  empresa?: string;
  modulos?: string[];
  isDemo?: boolean;
};

type AuthContextType = {
  user: User | null;
  isSuperAdmin: boolean;
  isReadOnly: boolean;
  isLoading: boolean;
  login: (name: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const initializeAuth = async () => {
      const demoUser = sessionStorage.getItem("is_demo_user");
      const adminUser = sessionStorage.getItem("is_admin_user");

      if (demoUser === "true") {
        setUser({
          id: "demo-user-id",
          name: "Visitante",
          role: "VIEW_ONLY",
          isDemo: true
        });
        setIsLoading(false);
        return;
      }

      if (adminUser === "true") {
        setUser({
          id: "cristiano-admin-id",
          name: "Cristiano",
          role: "SUPER_ADMIN",
          isDemo: false
        });
        setIsLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user.email);
      } else {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string, email?: string) => {
    try {
      // Mock for super admin for now, until we seed the DB properly
      if (email === "cristiano@cyberbarbershop.com") {
        setUser({
          id: userId,
          name: "Cristiano",
          role: "SUPER_ADMIN",
        });
        setIsLoading(false);
        return;
      }

      // TODO: Load from 'usuarios' table mapped to 'empresas' later
      // For now, if logged in, just give basic access
      setUser({
        id: userId,
        name: email?.split("@")[0] || "User",
        role: "USER"
      });
    } catch (error) {
      console.error("Error loading profile", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (loginInput: string, password: string): Promise<string | null> => {
    try {
      setIsLoading(true);
      const loginLower = loginInput.toLowerCase().trim();
      
      // Convert username to email format for Supabase Auth
      const email = loginLower.includes("@") ? loginLower : `${loginLower}@cyberbarbershop.com`;

      // Special case: Cristiano (Admin) Bypass
      if (email === "cristiano@cyberbarbershop.com" && password === "91126395") {
        setUser({
          id: "cristiano-admin-id",
          name: "Cristiano",
          role: "SUPER_ADMIN",
          isDemo: false
        });
        sessionStorage.setItem("is_admin_user", "true");
        return null;
      }

      // Special case: Test User for Demo
      if (loginLower === "teste" && password === "123") {
        setUser({
          id: "demo-user-id",
          name: "Visitante",
          role: "VIEW_ONLY",
          isDemo: true
        });
        sessionStorage.setItem("is_demo_user", "true");
        return null;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return "Usuário ou senha inválidos.";
      }

      return null;
    } catch (error: any) {
      return error.message || "Erro ao conectar com o servidor.";
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    sessionStorage.removeItem("is_demo_user");
    sessionStorage.removeItem("is_admin_user");
    await supabase.auth.signOut();
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isSuperAdmin: user?.role === "SUPER_ADMIN",
      isReadOnly: user?.role === "VIEW_ONLY",
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
