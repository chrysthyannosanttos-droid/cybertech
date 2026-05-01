import { DashboardSidebar } from "./DashboardSidebar";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isReadOnly } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // While hydrating, show a loading state that matches both server and client initially
  if (!isMounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // No user at all = redirect to login
  if (!user) {
    window.location.href = "/login";
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground animate-pulse">
        Redirecionando para o login...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar />
      <main className="lg:pl-60 pt-16 lg:pt-0 pb-20 lg:pb-0">
        {isReadOnly && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-8 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle size={16} />
              <span className="text-xs font-bold uppercase tracking-widest text-center lg:text-left">Modo de Visualização</span>
            </div>
            <span className="hidden lg:inline text-[10px] text-amber-500/60 font-medium">Logado como: {user.name}</span>
          </div>
        )}
        <div className="p-4 lg:p-8 max-w-[100vw] overflow-x-hidden">{children}</div>
      </main>
    </div>
  );
}
