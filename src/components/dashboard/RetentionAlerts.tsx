import { useState, useEffect } from "react";
import { Users, Phone, MessageSquare, Clock, Search, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Client = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  visits: number;
  lastVisit: string;
  avgTicket: string;
  since: string;
};

export function RetentionAlerts() {
  const [clients, setClients] = useState<Client[]>([]);
  const [threshold, setThreshold] = useState(30); // Dias de inatividade
  const [searchTerm, setSearchTerm] = useState("");
  
  useEffect(() => {
    const saved = localStorage.getItem("cybertech_clientes");
    if (saved) {
      setClients(JSON.parse(saved));
    }
  }, []);

  const parseDate = (dStr: string) => {
    try {
      const parts = dStr.split('/');
      if (parts.length !== 3) return new Date(0);
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    } catch {
      return new Date(0);
    }
  };

  const getDaysDiff = (dateStr: string) => {
    const lastDate = parseDate(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatWhatsappNumber = (phone: string): string => {
    const digits = phone.replace(/\D/g, "");
    return digits.startsWith("55") ? digits : `55${digits}`;
  };

  const sendWhatsApp = (client: Client) => {
    const number = client.whatsapp || formatWhatsappNumber(client.phone);
    if (!number || number.length < 10) {
      alert("Este cliente não possui número de WhatsApp cadastrado.");
      return;
    }
    const message = encodeURIComponent(
      `Olá ${client.name}! Notamos que faz ${getDaysDiff(client.lastVisit)} dias que você não visita a CYBERBARBERSHOP. Que tal dar um upgrade no visual?`
    );
    window.open(`https://wa.me/${number}?text=${message}`, "_blank");
  };

  const inactiveClients = clients
    .map(c => ({ ...c, daysInactive: getDaysDiff(c.lastVisit) }))
    .filter(c => c.daysInactive >= threshold)
    .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.daysInactive - a.daysInactive);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Painel de Configuração */}
        <div className="glass-card p-6 rounded-2xl border border-white/10">
          <div className="flex items-center gap-3 mb-4 text-primary">
            <Clock size={24} />
            <h2 className="text-xl font-bold uppercase tracking-widest">Configuração de Alerta</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">Identifique clientes que não aparecem há mais de {threshold} dias.</p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-sm font-bold text-foreground">Limite de Inatividade</span>
              <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg font-black text-lg">{threshold} dias</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="120" 
              value={threshold} 
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase px-1">
              <span>Recente</span>
              <span>Crítico (4 meses)</span>
            </div>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="glass-card p-6 rounded-2xl border border-white/10 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/30">
            <Users className="text-red-400" size={32} />
          </div>
          <h3 className="text-3xl font-black text-white mb-1">{inactiveClients.length}</h3>
          <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Clientes Precisando de Atenção</p>
          {inactiveClients.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500/80 font-bold bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/20">
              <AlertCircle size={14} />
              ALTA PRIORIDADE
            </div>
          )}
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <h2 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Lista de Inativos
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <Input 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-black/20 border-white/10 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Última Visita</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Tempo Ausente</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {inactiveClients.map((client) => (
                <tr key={client.phone + client.name} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground text-sm">{client.name}</span>
                      <span className="text-[10px] text-muted-foreground italic">{client.email || 'Sem e-mail'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-muted-foreground">{client.lastVisit}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${client.daysInactive > 60 ? 'bg-red-500 animate-pulse' : 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'}`} />
                       <span className={`text-sm font-black ${client.daysInactive > 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                         {client.daysInactive} dias
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button 
                      size="sm"
                      onClick={() => sendWhatsApp(client)}
                      className="bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl gap-2 font-bold text-xs px-4"
                    >
                      <MessageSquare size={14} />
                      Atrair Cliente
                    </Button>
                  </td>
                </tr>
              ))}
              {inactiveClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic text-sm">
                    Tudo certo! Nenhum cliente encontrado com este limite de inatividade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
