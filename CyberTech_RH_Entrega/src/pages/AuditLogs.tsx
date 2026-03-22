import { useState, useMemo } from 'react';
import { getAuditLogs } from '@/data/mockData';
import { AuditLog } from '@/types';
import { Search, History, User, Calendar, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AuditLogs() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const logs = useMemo(() => getAuditLogs(), []);

  const isCristiano = currentUser?.email === 'cristiano' || currentUser?.name?.toLowerCase() === 'cristiano';

  if (!isCristiano) {
    return <Navigate to="/dashboard" replace />;
  }

  const filtered = logs.filter(l => 
    l.userName.toLowerCase().includes(search.toLowerCase()) || 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Logs de Auditoria</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Monitoramento de ações administrativas</p>
        </div>
      </div>

      <div className="relative mb-8 group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Filtrar por usuário, ação ou detalhe..." 
          className="pl-11 h-11 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 text-[13px] transition-all" 
        />
      </div>

      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Ação</th>
                <th className="px-6 py-4">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                    Nenhum log encontrado.
                  </td>
                </tr>
              ) : filtered.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                        {log.userName.charAt(0)}
                      </div>
                      <span className="text-[13px] font-bold text-white">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-white/10 bg-white/5 text-white/70`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[13px] text-muted-foreground max-w-[400px] truncate group-hover:text-white transition-colors">
                      {log.details}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
