import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AttendanceReportsTabProps {
  timeSheets: any[];
  allEmployees: any[];
  onRecalculate: () => void;
  isProcessing: boolean;
}

export function AttendanceReportsTab({
  timeSheets,
  allEmployees,
  onRecalculate,
  isProcessing,
}: AttendanceReportsTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
        <div className="flex gap-4">
          <div className="text-center px-4">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Total Horas</p>
            <p className="text-xl font-black text-white">
              {timeSheets.reduce((acc, s) => acc + (s.worked_hours || 0), 0).toFixed(1)}h
            </p>
          </div>
          <div className="text-center px-4 border-l border-white/10">
            <p className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Extra Total</p>
            <p className="text-xl font-black text-primary">
              {timeSheets.reduce((acc, s) => acc + (s.extra_hours || 0), 0).toFixed(1)}h
            </p>
          </div>
        </div>
        <Button
          onClick={onRecalculate}
          disabled={isProcessing}
          className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 font-black uppercase text-[11px]"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
          )}
          Recalcular Folha (Hoje)
        </Button>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black text-primary uppercase h-12">
                <th className="px-6">Data</th>
                <th className="px-6">Colaborador</th>
                <th className="px-6">Entrada</th>
                <th className="px-6">Saída</th>
                <th className="px-6">Trabalhado</th>
                <th className="px-6">Extras</th>
                <th className="px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {timeSheets.map((sheet) => (
                <tr key={sheet.id} className="hover:bg-white/[0.02] h-14">
                  <td className="px-6 text-[12px] font-bold text-muted-foreground">{sheet.date}</td>
                  <td className="px-6 font-bold text-white text-[13px]">
                    {allEmployees.find((e) => e.id === sheet.employee_id)?.name}
                  </td>
                  <td className="px-6 font-mono-data text-[12px]">
                    {sheet.first_entry
                      ? new Date(sheet.first_entry).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--:--'}
                  </td>
                  <td className="px-6 font-mono-data text-[12px]">
                    {sheet.last_exit
                      ? new Date(sheet.last_exit).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '--:--'}
                  </td>
                  <td className="px-6 text-[13px] font-black">{sheet.worked_hours?.toFixed(2)}h</td>
                  <td className="px-6 text-[13px] font-black text-primary">
                    +{sheet.extra_hours?.toFixed(2)}h
                  </td>
                  <td className="px-6 text-center">
                    <span
                      className={cn(
                        'px-2 py-1 rounded text-[9px] font-black uppercase',
                        sheet.status === 'OK'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      )}
                    >
                      {sheet.status}
                    </span>
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
