import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/dashboard/config")({
  head: () => ({ meta: [{ title: "Configurações — CYBERBARBERSHOP" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize sua barbearia</p>
      </div>
      <div className="flex items-center justify-center rounded-xl border border-border bg-card p-16">
        <div className="text-center">
          <Settings size={48} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium text-card-foreground">Em breve</p>
          <p className="text-sm text-muted-foreground">Configurações de horário, serviços, pagamento e personalização visual.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
