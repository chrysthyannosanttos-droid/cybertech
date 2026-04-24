import { History, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Entry {
  id: string;
  employee_id: string;
  employee_name: string;
  type: string;
  timestamp: string;
  device_id: string;
}

interface AttendanceLogTabProps {
  entries: Entry[];
  devices: any[];
  isAdmin: boolean;
  onEditEntry: (entry: Entry) => void;
  onDeleteEntry: (id: string, name: string, time: string) => void;
}

export function AttendanceLogTab({
  entries,
  devices,
  isAdmin,
  onEditEntry,
  onDeleteEntry,
}: AttendanceLogTabProps) {
  return (
    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black text-primary uppercase tracking-widest h-14">
              <th className="px-6">Data / Hora</th>
              <th className="px-6">Funcionário</th>
              <th className="px-6">Tipo</th>
              <th className="px-6">Origem (Relógio)</th>
              {isAdmin && <th className="px-6 text-center">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-6 py-20 text-center">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Nenhuma batida registrada
                  </p>
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors h-14">
                  <td className="px-6 font-mono-data text-[13px] text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6">
                    <span className="text-[13px] font-bold text-white">{entry.employee_name}</span>
                  </td>
                  <td className="px-6">
                    {entry.type === 'ENTRY' ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                        Entrada
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">
                        Saída
                      </span>
                    )}
                  </td>
                  <td className="px-6">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {devices.find((d) => d.id === entry.device_id)?.name || 'Desconhecido'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 text-center">
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEditEntry(entry)}
                          className="h-8 w-8 text-primary/50 hover:text-primary hover:bg-primary/10"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteEntry(entry.id, entry.employee_name, entry.timestamp)}
                          className="h-8 w-8 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
