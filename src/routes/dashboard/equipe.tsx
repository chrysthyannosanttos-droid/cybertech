import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { UserCog, Trophy, Target, Star, Plus, Edit2, Trash2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/dashboard/equipe")({
  head: () => ({ meta: [{ title: "Equipe — CYBERBARBERSHOP" }] }),
  component: EquipePage,
});

type TeamMember = {
  id?: string;
  name: string;
  role: string;
  services: number;
  revenue: string;
  rating: number;
  commission: string;
};

function EquipePage() {
  const { user, isReadOnly } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [commission, setCommission] = useState("");

  const fetchTeam = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data, error } = await supabase.from('funcionarios').select('*');
    if (!error && data) {
      const formatted = data.map(f => ({
        id: f.id,
        name: f.nome,
        role: f.cargo || "Barbeiro",
        services: 0, // In a real app we'd compute from transactions
        revenue: "R$ 0", 
        rating: 5.0,
        commission: f.comissao ? `${f.comissao}%` : "0%"
      }));
      setTeam(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, [user]);

  const handleOpenModal = (member: TeamMember | null = null) => {
    if (member) {
      setEditingMember(member);
      setName(member.name);
      setRole(member.role);
      setCommission(member.commission.replace("%", ""));
    } else {
      setEditingMember(null);
      setName("");
      setRole("");
      setCommission("40");
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) return;
    
    setLoading(true);
    
    const cybertechId = "579ea8ea-979e-4b38-a6af-529792882aa9";
    const cleanCommission = parseFloat(commission.replace("%", ""));

    try {
      if (editingMember && editingMember.id) {
        await supabase.from('funcionarios').update({
          nome: name,
          cargo: role,
          comissao: isNaN(cleanCommission) ? 40 : cleanCommission
        }).eq('id', editingMember.id);
      } else {
        await supabase.from('funcionarios').insert({
          empresa_id: user?.empresa_id || cybertechId,
          nome: name,
          cargo: role,
          comissao: isNaN(cleanCommission) ? 40 : cleanCommission
        });
      }
      
      await fetchTeam();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar funcionário.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (member: TeamMember) => {
    if (confirm(`Remover "${member.name}" da equipe?`)) {
      if (member.id) {
         setLoading(true);
         await supabase.from('funcionarios').delete().eq('id', member.id);
         await fetchTeam();
      }
    }
  };


  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipe</h1>
          <p className="text-sm text-muted-foreground">Gestão de barbeiros e performance</p>
        </div>
        <Button
          disabled={isReadOnly}
          size="sm"
          className="bg-gradient-cyan text-primary-foreground gap-1 hover:opacity-90 disabled:opacity-50"
          onClick={() => handleOpenModal()}
        >
          <Plus size={16} /> Novo Membro
        </Button>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={UserCog} label="Barbeiros ativos" value={String(team.length)} />
        <StatCard icon={Trophy} label="Serviços no mês" value="358" change="10%" positive />
        <StatCard icon={Target} label="Meta do mês" value="82%" />
        <StatCard icon={Star} label="Avaliação média" value="4.8" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {team.map((m) => (
          <div key={m.id} className="relative rounded-xl border border-border bg-card p-6 group h-full flex flex-col">
            <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => handleOpenModal(m)}
                disabled={isReadOnly}
                className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-30"
              >
                <Edit2 size={14} />
              </button>
              <button 
                onClick={() => handleDelete(m)}
                disabled={isReadOnly}
                className="p-1.5 text-muted-foreground hover:text-red-500 disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-cyan text-lg font-bold text-primary-foreground">
                {m.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="font-semibold text-card-foreground">{m.name}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm flex-1">
              <div><span className="text-muted-foreground">Serviços</span><p className="font-semibold text-card-foreground">{m.services}</p></div>
              <div><span className="text-muted-foreground">Faturamento</span><p className="font-semibold text-card-foreground">{m.revenue}</p></div>
              <div><span className="text-muted-foreground">Avaliação</span><p className="font-semibold text-primary">⭐ {m.rating}</p></div>
              <div><span className="text-muted-foreground">Comissão</span><p className="font-semibold text-card-foreground">{m.commission}</p></div>
            </div>
          </div>
        ))}
        {team.length === 0 && (
           <p className="col-span-3 text-center text-muted-foreground italic py-12">Nenhum barbeiro cadastrado.</p>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-8 border border-white/10 animate-in zoom-in-95">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">{editingMember ? "Editar Membro" : "Novo Membro"}</h2>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                   <X size={20} />
                </button>
             </div>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Barbeiro</label>
                   <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: Lucas Souza" className="bg-white/5 border-white/10 h-11" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cargo/Especialidade</label>
                   <Input value={role} onChange={e => setRole(e.target.value)} required placeholder="Ex: Especialista em Degradê" className="bg-white/5 border-white/10 h-11" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comissão (%)</label>
                   <Input value={commission} onChange={e => setCommission(e.target.value)} required placeholder="Ex: 50%" className="bg-white/5 border-white/10 h-11" />
                </div>
                <div className="flex gap-3 pt-4">
                   <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                   <Button type="submit" className="flex-1 bg-gradient-cyan text-black font-bold">
                     {editingMember ? "Salvar" : "Cadastrar"}
                   </Button>
                </div>
             </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
