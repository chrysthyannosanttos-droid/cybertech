import { useState, useEffect } from "react";
import { Users, Search, Send, CheckCircle2, MessageSquare, Plus, X, ChevronRight, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

type Client = {
  name: string;
  phone: string;
  whatsapp: string;
};

export function BulkCampaignSender() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("Olá {nome}! Tudo bem? Passando para avisar que temos novos horários disponíveis na CYBERBARBERSHOP. Que tal dar um upgrade no visual hoje?");
  
  const [isSending, setIsSending] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("cybertech_clientes");
    if (saved) {
      setClients(JSON.parse(saved));
    }
  }, []);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (phone: string) => {
    setSelectedIds(prev => 
      prev.includes(phone) ? prev.filter(id => id !== phone) : [...prev, phone]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredClients.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map(c => c.phone));
    }
  };

  const selectedClients = clients.filter(c => selectedIds.includes(c.phone));

  const startSending = () => {
    if (selectedIds.length === 0) {
      alert("Selecione pelo menos um cliente.");
      return;
    }
    setIsSending(true);
    setCurrentIndex(0);
  };

  const stopSending = () => {
    setIsSending(false);
  };

  const getPersonalizedMessage = (clientName: string) => {
    return message.replace(/{nome}/g, clientName);
  };

  const formatWhatsappNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
  };

  const sendNext = () => {
    const client = selectedClients[currentIndex];
    if (!client) return;

    const number = client.whatsapp || formatWhatsappNumber(client.phone);
    const text = encodeURIComponent(getPersonalizedMessage(client.name));
    
    window.open(`https://wa.me/${number}?text=${text}`, "_blank");
    
    if (currentIndex < selectedClients.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsSending(false);
      alert("Disparo concluído!");
    }
  };

  return (
    <div className="space-y-6">
      {!isSending ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Coluna 1: Composição */}
          <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-white/10">
              <div className="flex items-center gap-3 mb-4 text-primary">
                <MessageSquare size={24} />
                <h2 className="text-xl font-bold uppercase tracking-widest">Criar Mensagem</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4 uppercase font-bold tracking-tighter">
                Use <span className="text-primary">{`{nome}`}</span> para inserir o nome do cliente.
              </p>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full min-h-[150px] bg-black/20 border border-white/10 rounded-xl p-4 text-sm focus:border-primary/50 outline-none transition-all resize-none text-foreground"
                placeholder="Escreva sua mensagem aqui..."
              />
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase italic text-muted-foreground">
                 <span>Preview: {getPersonalizedMessage("João")}</span>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-white/10">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3 text-primary">
                    <Users size={24} />
                    <h2 className="text-xl font-bold uppercase tracking-widest">Público Alvo</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-[10px] font-bold uppercase text-primary border border-primary/20 bg-primary/5">
                     {selectedIds.length === filteredClients.length ? "Desmarcar Todos" : "Selecionar Todos"}
                  </Button>
               </div>
               
               <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input 
                    placeholder="Buscar clientes por nome..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-black/20 border-white/10 h-10 rounded-xl text-xs"
                  />
               </div>

               <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {filteredClients.map(client => (
                    <label key={client.phone} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all cursor-pointer group">
                       <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(client.phone)}
                            onChange={() => toggleSelect(client.phone)}
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          <div className="flex flex-col">
                             <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{client.name}</span>
                             <span className="text-[10px] text-muted-foreground">{client.phone}</span>
                          </div>
                       </div>
                       {selectedIds.includes(client.phone) && <CheckCircle2 size={16} className="text-primary animate-in zoom-in" />}
                    </label>
                  ))}
               </div>
            </div>
          </div>

          {/* Coluna 2: Resumo e Envio */}
          <div className="space-y-6">
             <div className="glass-card p-8 rounded-2xl border border-white/10 flex flex-col items-center text-center justify-center min-h-[400px]">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/30 animate-pulse">
                   <Send className="text-primary" size={40} />
                </div>
                <h3 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter">Iniciar Disparo</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-[280px]">
                   Você selecionou <span className="text-primary font-bold">{selectedIds.length} clientes</span> para receber esta campanha via WhatsApp.
                </p>

                <Button 
                  onClick={startSending}
                  disabled={selectedIds.length === 0}
                  className="w-full max-w-[280px] h-14 bg-gradient-cyan text-black font-black text-lg rounded-2xl shadow-[0_0_30px_rgba(var(--primary),0.3)] hover:scale-105 transition-transform"
                >
                   GERAR FILA DE ENVIO
                </Button>
                
                <p className="mt-6 text-[10px] text-muted-foreground uppercase font-bold tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                   Enviará {selectedIds.length} mensagens personalizadas
                </p>
             </div>
          </div>
        </div>
      ) : (
        /* Modo Fila de Envio (Sending Mode) */
        <div className="max-w-2xl mx-auto">
          <div className="glass-card p-10 rounded-[2.5rem] border border-white/10 text-center space-y-8 animate-in zoom-in-95 duration-500">
             <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-primary">Disparo em Progresso</span>
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{currentIndex + 1} de {selectedClients.length}</span>
             </div>
             
             <Progress value={(currentIndex / selectedClients.length) * 100} className="h-3 bg-white/5" />

             <div className="py-8 space-y-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-muted text-3xl font-black text-primary mx-auto shadow-[0_0_40px_rgba(var(--primary),0.2)]">
                  {selectedClients[currentIndex]?.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">Mensagem para {selectedClients[currentIndex]?.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedClients[currentIndex]?.phone}</p>
                </div>
                <div className="bg-black/30 p-6 rounded-2xl border border-white/5 italic text-sm text-muted-foreground relative">
                   <MessageSquare className="absolute -top-3 -left-3 text-primary/30" size={32} />
                   "{getPersonalizedMessage(selectedClients[currentIndex]?.name)}"
                </div>
             </div>

             <div className="flex flex-col gap-3 pt-4">
                <Button 
                  onClick={sendNext}
                  className="w-full h-16 bg-gradient-cyan text-black font-black text-xl rounded-2xl shadow-[0_0_40px_rgba(var(--primary),0.3)] group"
                >
                   ABRIR WHATSAPP E PRÓXIMO
                   <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                
                <Button 
                  variant="ghost"
                  onClick={stopSending}
                  className="w-full h-12 text-red-500/70 hover:text-red-400 hover:bg-red-500/5 font-bold uppercase tracking-widest text-xs"
                >
                   CANCELAR DISPARO
                </Button>
             </div>
             
             <div className="grid grid-cols-3 gap-2 text-[8px] font-black uppercase text-muted-foreground pt-4">
                <div className="p-2 bg-white/2 rounded flex items-center justify-center gap-1 border border-white/5 italic">
                  <Play size={8} /> Sequencial
                </div>
                <div className="p-2 bg-white/2 rounded flex items-center justify-center gap-1 border border-white/5 italic">
                  <CheckCircle2 size={8} /> Personalizado
                </div>
                <div className="p-2 bg-white/2 rounded flex items-center justify-center gap-1 border border-white/5 italic">
                  <Square size={8} /> Sistema Seguro
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
