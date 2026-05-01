import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Phone, Mail, X, MessageCircle, Edit2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/clientes")({
  head: () => ({
    meta: [{ title: "Clientes — CYBERBARBERSHOP" }],
  }),
  component: ClientesPage,
});

type Client = {
  id?: string;
  empresa_id?: string;
  name: string;
  nome?: string; // from db
  telefone?: string; // from db
  phone: string;
  whatsapp: string;
  email: string;
  visits: number;
  visitas?: number; // db
  lastVisit: string;
  ultima_visita?: string; // db
  avgTicket: string;
  since: string;
  is_subscriber?: boolean;
  subscription_value?: number;
  credits_remaining?: number;
  tipo_plano?: string; // e.g. "Mensal"
};

function ClientesPage() {
  const { user, isReadOnly } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  
  // Form states
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newWhatsapp, setNewWhatsapp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  
  // Subscription states
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [subValue, setSubValue] = useState(150);
  const [credits, setCredits] = useState(5);
  
  const demoClients: Client[] = [
    { id: "demo-c1", name: "Ricardo Oliveira", phone: "(11) 98877-2211", email: "ricardo@email.com", visits: 12, lastVisit: "10/04/2026", avgTicket: "R$ 65,00", since: "Jan 2024", is_subscriber: true, subscription_value: 150, credits_remaining: 3 },
    { id: "demo-c2", name: "Felipe Mendes", phone: "(11) 97766-3322", email: "felipe@email.com", visits: 5, lastVisit: "12/04/2026", avgTicket: "R$ 45,00", since: "Mar 2024", is_subscriber: false },
    { id: "demo-c3", name: "Gustavo Santos", phone: "(11) 96655-4433", email: "gustavo@email.com", visits: 22, lastVisit: "05/04/2026", avgTicket: "R$ 110,00", since: "Ago 2023", is_subscriber: true, subscription_value: 200, credits_remaining: 8 },
    { id: "demo-c4", name: "André Luiz", phone: "(11) 95544-5566", email: "andre@email.com", visits: 1, lastVisit: "14/04/2026", avgTicket: "R$ 35,00", since: "Abr 2024", is_subscriber: false },
    { id: "demo-c5", name: "Pedro Rocha", phone: "(11) 94433-6677", email: "pedro@email.com", visits: 8, lastVisit: "01/04/2026", avgTicket: "R$ 55,00", since: "Dez 2023", is_subscriber: true, subscription_value: 150, credits_remaining: 1 },
  ];

  const fetchClients = async () => {
    if (!user) return;
    setLoading(true);

    if (user.isDemo) {
      if (clients.length === 0) {
        setClients(demoClients);
      }
      setLoading(false);
      return;
    }

    // Since we don't have auth completely locked down to companies yet, just load all for now
    const { data, error } = await supabase.from('clientes').select('*');
    
    if (!error && data) {
      // Formata os dados vindos do banco para o formato antigo do frontend (temporário até alinhar 100%)
      const formatted = data.map(dbClient => ({
        id: dbClient.id,
        name: dbClient.nome,
        nome: dbClient.nome,
        phone: dbClient.telefone || "",
        telefone: dbClient.telefone,
        whatsapp: dbClient.whatsapp || "",
        email: dbClient.email || "",
        visits: dbClient.visitas || 0,
        avgTicket: "R$ 0", // We calculate this later from transactions
        since: new Date(dbClient.created_at).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        is_subscriber: dbClient.is_subscriber || false,
        subscription_value: dbClient.subscription_value || 0,
        credits_remaining: dbClient.credits_remaining || 0,
      }));
      setClients(formatted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, [user]);

  const formatWhatsappNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
  };

  const handleOpenModal = (client: Client | null = null) => {
    if (client) {
      setEditingClient(client);
      setNewName(client.name);
      setNewPhone(client.phone);
      setNewWhatsapp(client.whatsapp);
      setNewEmail(client.email);
      setIsSubscriber(client.is_subscriber || false);
      setSubValue(client.subscription_value || 150);
      setCredits(client.credits_remaining || 5);
    } else {
      setEditingClient(null);
      setNewName("");
      setNewPhone("");
      setNewWhatsapp("");
      setNewEmail("");
      setIsSubscriber(false);
      setSubValue(150);
      setCredits(5);
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!newName.trim()) {
      alert("Nome do cliente é obrigatório.");
      return;
    }
    
    const whatsappFormatted = newWhatsapp.trim() ? formatWhatsappNumber(newWhatsapp) : (newPhone.trim() ? formatWhatsappNumber(newPhone) : "");
    
    setLoading(true);
    
    try {
      if (user?.isDemo) {
        // Simulation for Demo User
        if (editingClient && editingClient.id) {
          setClients(clients.map(c => c.id === editingClient.id ? {
            ...c,
            name: newName.trim(),
            phone: newPhone.trim(),
            whatsapp: whatsappFormatted,
            email: newEmail.trim(),
            is_subscriber: isSubscriber,
            subscription_value: subValue,
            credits_remaining: credits
          } : c));
        } else {
          const newClient: Client = {
            id: `sim-${Date.now()}`,
            name: newName.trim(),
            phone: newPhone.trim(),
            whatsapp: whatsappFormatted,
            email: newEmail.trim(),
            visits: 0,
            lastVisit: "Hoje",
            avgTicket: "R$ 0",
            since: "Abr 2026",
            is_subscriber: isSubscriber,
            subscription_value: subValue,
            credits_remaining: credits
          };
          setClients([newClient, ...clients]);
        }
      } else if (editingClient && editingClient.id) {
        // Edit in Supabase
        await supabase.from('clientes').update({
          nome: newName.trim(),
          telefone: newPhone.trim(),
          whatsapp: whatsappFormatted,
          email: newEmail.trim(),
          is_subscriber: isSubscriber,
          subscription_value: subValue,
          credits_remaining: credits
        }).eq('id', editingClient.id);
      } else {
        // Insert into Supabase
        const cybertechId = "579ea8ea-979e-4b38-a6af-529792882aa9";
        
        await supabase.from('clientes').insert({
          empresa_id: user?.empresa_id || cybertechId,
          nome: newName.trim(),
          telefone: newPhone.trim(),
          whatsapp: whatsappFormatted,
          email: newEmail.trim(),
          is_subscriber: isSubscriber,
          subscription_value: subValue,
          credits_remaining: credits
        });
        await fetchClients(); // Only reload from DB if not demo
      }
      setShowModal(false);
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar cliente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!client.id) return;
    if (confirm(`Excluir cliente "${client.name}"?`)) {
      setLoading(true);
      if (user?.isDemo) {
        setClients(clients.filter(c => c.id !== client.id));
      } else {
        await supabase.from('clientes').delete().eq('id', client.id);
        await fetchClients();
      }
      setLoading(false);
    }
  };

  const sendWhatsApp = (client: Client) => {
    const number = client.whatsapp || formatWhatsappNumber(client.phone);
    if (!number || number.length < 10) {
      alert("Este cliente não possui número de WhatsApp cadastrado.");
      return;
    }
    const message = encodeURIComponent(
      `Olá ${client.name}! 👋\n\n` +
      `Aqui é a *CYBERBARBERSHOP* 💈\n\n` +
      `Gostaríamos de confirmar seu próximo agendamento.\n\n` +
      `📅 Acesse nosso sistema para ver os horários disponíveis.\n\n` +
      `Obrigado pela preferência! ✂️`
    );
    window.open(`https://wa.me/${number}?text=${message}`, "_blank");
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">{clients.length} clientes cadastrados</p>
        </div>
        <Button
          size="sm"
          className="bg-gradient-cyan text-primary-foreground gap-1 hover:opacity-90 disabled:opacity-50"
          onClick={() => handleOpenModal()}
        >
          <Plus size={16} /> Novo cliente
        </Button>
      </div>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            className="bg-input border-border pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-4 text-left text-xs font-medium text-muted-foreground">Cliente</th>
              <th className="p-4 text-left text-xs font-medium text-muted-foreground">Contato</th>
              <th className="p-4 text-center text-xs font-medium text-muted-foreground">Visitas</th>
              <th className="p-4 text-center text-xs font-medium text-muted-foreground">Plano / Créditos</th>
              <th className="p-4 text-center text-xs font-medium text-muted-foreground">Última visita</th>
              <th className="p-4 text-center text-xs font-medium text-muted-foreground">Ticket médio</th>
              <th className="p-4 text-center text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={`${c.name}-${i}`} className="border-b border-border/50 last:border-0 transition-colors hover:bg-surface">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-muted text-xs font-bold text-primary">
                      {c.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <span className="font-medium text-card-foreground block">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">Desde {c.since}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Phone size={12} /> {c.phone || "—"}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                      <Mail size={12} /> {c.email || "—"}
                    </div>
                  </div>
                </td>
                <td className="p-4 text-center text-card-foreground">{c.visits}</td>
                <td className="p-4 text-center">
                  {c.is_subscriber ? (
                    <div className="inline-flex flex-col items-center">
                      <span className="bg-primary/20 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Assinante</span>
                      <span className="text-xs font-bold text-foreground mt-1">{c.credits_remaining} créditos</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-[10px] uppercase">Casual</span>
                  )}
                </td>
                <td className="p-4 text-center text-muted-foreground">{c.lastVisit}</td>
                <td className="p-4 text-center font-medium text-card-foreground">{c.avgTicket}</td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => sendWhatsApp(c)}
                      disabled={isReadOnly || (!c.whatsapp && !c.phone)}
                      title="Enviar WhatsApp"
                      className="p-2 text-green-400 hover:text-green-300 disabled:opacity-30"
                    >
                      <MessageCircle size={16} />
                    </button>
                    <button
                      onClick={() => handleOpenModal(c)}
                      className="p-2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-30"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClient(c)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingClient ? "Editar Cliente" : "Novo Cliente"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome Completo *</label>
                <Input
                  placeholder="Ex: Maria Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-white/5 border-white/10 h-11 rounded-xl focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telefone</label>
                <Input
                  placeholder="(11) 99999-0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="bg-white/5 border-white/10 h-11 rounded-xl focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-400">
                  <MessageCircle size={12} />
                  WhatsApp
                </label>
                <Input
                  placeholder="5511999990000 (só números com DDD)"
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                  className="bg-white/5 border-green-500/20 h-11 rounded-xl focus:border-green-500"
                />
                <p className="text-[10px] text-muted-foreground">Se vazio, usa o número do telefone acima.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-white/5 border-white/10 h-11 rounded-xl focus:border-primary"
                />
              </div>

              {/* Subscrição Section */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground italic flex items-center gap-2">
                       <DollarSign size={16} className="text-primary" /> Modalidade de Plano
                    </h3>
                    <p className="text-[10px] text-muted-foreground">Mensalidade com créditos de cortes</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsSubscriber(!isSubscriber)}
                    className={`w-12 h-6 rounded-full transition-all relative ${isSubscriber ? 'bg-primary' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isSubscriber ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {isSubscriber && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor Mensal (R$)</label>
                      <Input
                        type="number"
                        value={subValue}
                        onChange={(e) => setSubValue(Number(e.target.value))}
                        className="bg-white/5 border-white/10 h-10 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Qtd. Créditos</label>
                      <Input
                        type="number"
                        value={credits}
                        onChange={(e) => setCredits(Number(e.target.value))}
                        className="bg-white/5 border-white/10 h-10 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-11 border border-white/10 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 h-11 bg-gradient-cyan rounded-xl text-black font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:opacity-90"
                >
                  {editingClient ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
