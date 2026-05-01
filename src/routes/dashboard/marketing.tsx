import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { MessageSquare, Send, Users, Clock, X, Plus, Edit2 } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MenuGenerator } from "@/components/dashboard/MenuGenerator";
import { RetentionAlerts } from "@/components/dashboard/RetentionAlerts";
import { BulkCampaignSender } from "@/components/dashboard/BulkCampaignSender";

import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/dashboard/marketing")({
  head: () => ({ meta: [{ title: "Marketing — CYBERBARBERSHOP" }] }),
  component: MarketingPage,
});

type Campaign = {
  id?: string;
  name: string;
  channel: string;
  sent: number;
  opened: number;
  converted: number;
  status: "active" | "scheduled" | "draft";
};

function MarketingPage() {
  const { user, isReadOnly } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newChannel, setNewChannel] = useState("WhatsApp");
  const [activeTab, setActiveTab] = useState<"campanhas" | "gerador" | "retencao" | "disparo">("gerador");
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const fetchCampaigns = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('campanhas').select('*');
    if (!error && data) {
      setCampaigns(data.map(c => ({
        id: c.id,
        name: c.nome,
        channel: c.canal || "WhatsApp",
        sent: c.enviados || 0,
        opened: c.abertos || 0,
        converted: c.convertidos || 0,
        status: (c.status as any) || "draft"
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  const handleOpenModal = (campaign: Campaign | null = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setNewName(campaign.name);
      setNewChannel(campaign.channel);
    } else {
      setEditingCampaign(null);
      setNewName("");
      setNewChannel("WhatsApp");
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string | undefined) => {
    if(!id) return;
    if (confirm("Excluir essa campanha?")) {
      setLoading(true);
      await supabase.from('campanhas').delete().eq('id', id);
      await fetchCampaigns();
    }
  };

  const handleSubmitCampaign = async () => {
    if (!newName.trim()) {
      alert("Nome da campanha é obrigatório.");
      return;
    }
    
    setLoading(true);
    const cybertechId = "579ea8ea-979e-4b38-a6af-529792882aa9";

    try {
      if (editingCampaign && editingCampaign.id) {
         await supabase.from('campanhas').update({
           nome: newName.trim(),
           canal: newChannel
         }).eq('id', editingCampaign.id);
      } else {
         await supabase.from('campanhas').insert({
           empresa_id: user?.empresa_id || cybertechId,
           nome: newName.trim(),
           canal: newChannel,
           status: "draft"
         });
      }
      await fetchCampaigns();
      setNewName("");
      setNewChannel("WhatsApp");
      setEditingCampaign(null);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar campanha.");
    } finally {
      setLoading(false);
    }
  };

  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
  const totalOpened = campaigns.reduce((sum, c) => sum + c.opened, 0);
  const totalConverted = campaigns.reduce((sum, c) => sum + c.converted, 0);
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;


  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing</h1>
          <p className="text-sm text-muted-foreground">Campanhas e retenção de clientes</p>
        </div>
        <Button
          disabled={isReadOnly}
          size="sm"
          className="bg-gradient-cyan text-primary-foreground gap-1 hover:opacity-90 disabled:opacity-50"
          onClick={() => handleOpenModal()}
        >
          <Send size={16} /> Nova campanha
        </Button>
      </div>


      {/* Tabs */}
      <div className="mb-6 flex space-x-1 rounded-xl bg-white/5 p-1 border border-white/10 max-w-fit">
        <button
          onClick={() => setActiveTab("gerador")}
          className={`rounded-lg px-6 py-2 text-sm font-bold transition-all ${
            activeTab === "gerador"
              ? "bg-primary text-black shadow-md"
              : "text-muted-foreground hover:bg-white/10"
          }`}
        >
          Gerador de Cardápios (IA)
        </button>
        <button
          onClick={() => setActiveTab("campanhas")}
          className={`rounded-lg px-6 py-2 text-sm font-bold transition-all ${
            activeTab === "campanhas"
              ? "bg-primary text-black shadow-md"
              : "text-muted-foreground hover:bg-white/10"
          }`}
        >
          Campanhas WhatsApp
        </button>
        <button
          onClick={() => setActiveTab("retencao")}
          className={`rounded-lg px-6 py-2 text-sm font-bold transition-all ${
            activeTab === "retencao"
              ? "bg-primary text-black shadow-md"
              : "text-muted-foreground hover:bg-white/10"
          }`}
        >
          Retenção (CRM)
        </button>
        <button
          onClick={() => setActiveTab("disparo")}
          className={`rounded-lg px-6 py-2 text-sm font-bold transition-all ${
            activeTab === "disparo"
              ? "bg-primary text-black shadow-md"
              : "text-muted-foreground hover:bg-white/10"
          }`}
        >
          Disparo em Massa
        </button>
      </div>

      {activeTab === "gerador" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <MenuGenerator />
        </div>
      )}

      {activeTab === "campanhas" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Send} label="Mensagens enviadas" value={String(totalSent)} change="22%" positive />
            <StatCard icon={Users} label="Clientes alcançados" value={String(totalOpened)} />
            <StatCard icon={MessageSquare} label="Taxa de abertura" value={`${openRate}%`} />
            <StatCard icon={Clock} label="Retornos gerados" value={String(totalConverted)} change="18%" positive />
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-card-foreground">Campanhas ({campaigns.length})</h2>
            <div className="space-y-3">
              {campaigns.map((c, i) => (
                <div key={`${c.name}-${i}`} className="flex items-center gap-4 rounded-lg bg-surface p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-muted">
                    <MessageSquare size={18} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-surface-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.channel} · {c.sent} enviados</p>
                  </div>
                  <div className="hidden text-center sm:block">
                    <p className="text-sm font-semibold text-card-foreground">{c.opened}</p>
                    <p className="text-xs text-muted-foreground">Abertos</p>
                  </div>
                  <div className="hidden text-center sm:block">
                    <p className="text-sm font-semibold text-primary">{c.converted}</p>
                    <p className="text-xs text-muted-foreground">Conversões</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === "active"
                      ? "bg-green-500/10 text-green-400"
                      : c.status === "scheduled"
                      ? "bg-primary/10 text-primary"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    {c.status === "active" ? "Ativa" : c.status === "scheduled" ? "Agendada" : "Rascunho"}
                  </span>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(c)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {loading ? (
                 <p className="text-center text-muted-foreground italic py-8">Carregando campanhas...</p>
              ) : campaigns.length === 0 ? (
                <p className="text-center text-muted-foreground italic py-8">Nenhuma campanha cadastrada.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {activeTab === "retencao" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <RetentionAlerts />
        </div>
      )}

      {activeTab === "disparo" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <BulkCampaignSender />
        </div>
      )}

      {/* Modal Nova Campanha */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingCampaign ? "Editar Campanha" : "Nova Campanha"}
              </h2>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setEditingCampaign(null);
                }} 
                className="text-muted-foreground hover:text-foreground transition-colors"
               >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome da Campanha *</label>
                <Input
                  placeholder="Ex: Promoção de Verão"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-white/5 border-white/10 h-11 rounded-xl focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Canal</label>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 h-11 rounded-xl px-4 outline-none focus:border-primary/50 transition-all text-foreground"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Email">Email</option>
                  <option value="Instagram">Instagram</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCampaign(null);
                  }}
                  className="flex-1 h-11 border border-white/10 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitCampaign}
                  className="flex-1 h-11 bg-gradient-cyan rounded-xl text-black font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:opacity-90"
                >
                  {editingCampaign ? "Salvar Alterações" : "Criar Campanha"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
