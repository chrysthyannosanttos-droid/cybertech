import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminModule } from "@/components/admin/AdminModule";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "SaaS Admin — CYBERBARBERSHOP" },
      { name: "description", content: "Painel administrativo multiempresa." },
    ],
  }),
  component: AdminPage,
});

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

function AdminPage() {
  const { isSuperAdmin, user } = useAuth();

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        {/* ... (access denied content remains same) ... */}
        <div className="glass-card max-w-md rounded-3xl p-10 text-center border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.3)]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-[0_0_20px_rgba(var(--destructive),0.2)]">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Exclusivo</h1>
          <p className="mt-4 text-muted-foreground">
            Este módulo é restrito ao administrador <span className="text-primary font-bold">Cristiano</span>.
            Faça login para gerenciar as empresas do SaaS.
          </p>
          <div className="mt-8 flex flex-col gap-3">
             <Link to="/login">
              <Button className="w-full h-12 gap-2 bg-gradient-cyan rounded-xl text-black font-bold">
                Fazer Login Admin
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost" className="w-full h-12 gap-2 border border-white/10 text-foreground rounded-xl">
                <ArrowLeft size={18} />
                Voltar ao Sistema (View)
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <AdminModule />
    </DashboardLayout>
  );
}
