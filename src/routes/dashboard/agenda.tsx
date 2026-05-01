import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, X, User, Scissors, Clock, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";

import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/dashboard/agenda")({
  head: () => ({
    meta: [{ title: "Agenda — CYBERBARBERSHOP" }],
  }),
  component: AgendaPage,
});

const barbers = ["Carlos", "Rafael", "Felipe"];
const hours = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);

function AgendaPage() {
  const { user, isReadOnly } = useAuth();
  const [appointments, setAppointments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState(barbers[0]);
  const [selectedHour, setSelectedHour] = useState(hours[0]);
  const [clientName, setClientName] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [date] = useState(new Date());
  const dateStr = date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  
  // Format date as YYYY-MM-DD for DB
  const todayForDB = date.toISOString().split("T")[0];

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);

    if (user.isDemo) {
      const demoApts: Record<string, any> = {
        "Carlos-09:00": { id: "d1", client: "Ricardo Oliveira", service: "Corte Social" },
        "Carlos-10:00": { id: "d2", client: "André Luiz", service: "Degradê" },
        "Rafael-08:00": { id: "d3", client: "Felipe Mendes", service: "Barba Terapia" },
        "Rafael-11:00": { id: "d4", client: "Gustavo Santos", service: "Corte + Barba" },
        "Felipe-09:00": { id: "d5", client: "Pedro Rocha", service: "Corte Infantil" },
        "Felipe-10:00": { id: "d6", client: "João Silva", service: "Pigmentação" },
      };
      setAppointments(demoApts);
      setLoading(false);
      return;
    }
    
    // We only fetch today's appointments for this basic migration view
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*')
      .eq('data', todayForDB);
      
    if (!error && data) {
      const aptsMap: Record<string, any> = {};
      data.forEach(apt => {
        const key = `${apt.barbeiro}-${apt.hora}`;
        aptsMap[key] = {
          id: apt.id,
          client: apt.cliente,
          service: apt.servico,
        };
      });
      setAppointments(aptsMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const handleOpenModal = (key: string | null = null) => {
    if (key && appointments[key]) {
      const apt = appointments[key];
      setEditingKey(key);
      const [barber, hour] = key.split("-");
      setSelectedBarber(barber);
      setSelectedHour(hour);
      setClientName(apt.client);
      setServiceName(apt.service);
    } else {
      setEditingKey(null);
      setClientName("");
      setServiceName("");
    }
    setShowModal(true);
  };

  const handleAddAppointment = async () => {
    if (!clientName.trim() || !serviceName.trim()) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    
    // Fallback cybertech Id just in case
    const cybertechId = "579ea8ea-979e-4b38-a6af-529792882aa9";

    try {
      if (user?.isDemo) {
        const key = `${selectedBarber}-${selectedHour}`;
        const newApts = { ...appointments };
        newApts[key] = {
          id: editingKey ? appointments[editingKey].id : `sim-a-${Date.now()}`,
          client: clientName.trim(),
          service: serviceName.trim(),
        };
        // if key changed, delete old
        if (editingKey && editingKey !== key) {
          delete newApts[editingKey];
        }
        setAppointments(newApts);
      } else if (editingKey) {
        // ... (existing Supabase logic)
        if (editingKey !== `${selectedBarber}-${selectedHour}`) {
          const oldApt = appointments[editingKey];
          if (oldApt && oldApt.id) {
            await supabase.from('agendamentos').delete().eq('id', oldApt.id);
          }
        } else {
          // just updating names
          const oldApt = appointments[editingKey];
          if (oldApt && oldApt.id) {
            await supabase.from('agendamentos').update({
              cliente: clientName.trim(),
              servico: serviceName.trim()
            }).eq('id', oldApt.id);
            await fetchAppointments();
            setShowModal(false);
            return;
          }
        }
        // Insert new
        await supabase.from('agendamentos').insert({
          empresa_id: user?.empresa_id || cybertechId,
          barbeiro: selectedBarber,
          hora: selectedHour,
          data: todayForDB,
          cliente: clientName.trim(),
          servico: serviceName.trim(),
        });
        await fetchAppointments();
      } else {
        // Insert new
        await supabase.from('agendamentos').insert({
          empresa_id: user?.empresa_id || cybertechId,
          barbeiro: selectedBarber,
          hora: selectedHour,
          data: todayForDB,
          cliente: clientName.trim(),
          servico: serviceName.trim(),
        });

        await fetchAppointments();
      }
      setClientName("");
      setServiceName("");
      setEditingKey(null);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar o agendamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (key: string) => {
    const apt = appointments[key];
    if (apt) {
      if (confirm("Cancelar este agendamento?")) {
        setLoading(true);
        if (user?.isDemo) {
          const newApts = { ...appointments };
          delete newApts[key];
          setAppointments(newApts);
        } else if (apt.id) {
          await supabase.from('agendamentos').delete().eq('id', apt.id);
          await fetchAppointments();
        }
        setLoading(false);
      }
    }
  };


  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm capitalize text-muted-foreground">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="border-border">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="sm" className="border-border">Hoje</Button>
          <Button variant="outline" size="icon" className="border-border">
            <ChevronRight size={16} />
          </Button>
          <Button 
            size="sm" 
            className="ml-2 bg-gradient-cyan text-primary-foreground gap-1 hover:opacity-90 disabled:opacity-50"
            onClick={() => handleOpenModal()}
          >
            <Plus size={16} /> Agendar
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="grid border-b border-border" style={{ gridTemplateColumns: "80px repeat(3, 1fr)" }}>
            <div className="p-3 text-xs font-medium text-muted-foreground">Horário</div>
            {barbers.map((b) => (
              <div key={b} className="border-l border-border p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-muted text-xs font-bold text-primary">
                    {b[0]}
                  </div>
                  <span className="text-sm font-medium text-card-foreground">{b}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-border/50 last:border-0"
              style={{ gridTemplateColumns: "80px repeat(3, 1fr)" }}
            >
              <div className="p-3 text-xs text-muted-foreground">{hour}</div>
              {barbers.map((barber) => {
                const key = `${barber}-${hour}`;
                const apt = appointments[key]?.[0];
                return (
                  <div key={key} className="min-h-[52px] border-l border-border/50 p-1">
                    {apt && (
                      <div className="rounded-lg bg-primary/10 border border-primary/20 p-2 text-xs relative group">
                        <p className="font-medium text-primary">{apt.client}</p>
                        <p className="text-muted-foreground">{apt.service}</p>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button 
                              onClick={() => handleOpenModal(key)}
                              className="text-primary hover:text-white"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => {
                                const newApts = { ...appointments };
                                delete newApts[key];
                                setAppointments(newApts);
                                localStorage.setItem("cybertech_appointments", JSON.stringify(newApts));
                              }}
                              className="text-primary hover:text-red-500"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Agendamento */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-3xl p-8 border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {editingKey ? "Editar Agendamento" : "Novo Agendamento"}
              </h2>
              <button 
                onClick={() => {
                   setShowModal(false);
                   setEditingKey(null);
                }} 
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cliente</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Nome do cliente" 
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Serviço</label>
                <div className="relative">
                  <Scissors size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Ex: Corte e Barba" 
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Barbeiro</label>
                  <select 
                    value={selectedBarber}
                    onChange={(e) => setSelectedBarber(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 h-11 rounded-xl px-4 outline-none focus:border-primary/50 transition-all text-sm text-foreground"
                  >
                    {barbers.map(b => (
                      <option key={b} value={b} className="bg-background text-foreground">{b}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Horário</label>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <select 
                      value={selectedHour}
                      onChange={(e) => setSelectedHour(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 h-11 rounded-xl pl-10 pr-4 outline-none focus:border-primary/50 transition-all text-sm text-foreground appearance-none"
                    >
                      {hours.map(h => (
                        <option key={h} value={h} className="bg-background text-foreground">{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-12 border border-white/10 text-foreground"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddAppointment}
                  className="flex-1 h-12 bg-gradient-cyan text-primary-foreground font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)]"
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
