import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AttendanceHourBankTabProps {
  allEmployees: any[];
  hourBank: any[];
  onOpenStatement: (empId: string, empName: string) => void;
}

export function AttendanceHourBankTab({
  allEmployees,
  hourBank,
  onOpenStatement,
}: AttendanceHourBankTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {allEmployees.map((emp) => {
        const total = hourBank
          .filter((h) => h.employee_id === emp.id)
          .reduce((acc, curr) => acc + curr.hours, 0);
        return (
          <div
            key={emp.id}
            className="glass-card p-5 border border-white/5 rounded-2xl group hover:border-primary/30 transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase opacity-50">
                  Saldo Acumulado
                </p>
                <h4 className="text-xl font-black text-white truncate max-w-[150px]">{emp.name}</h4>
              </div>
              <div
                className={cn(
                  'p-4 rounded-xl font-black text-lg',
                  total >= 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                )}
              >
                {total >= 0 ? `+${total.toFixed(1)}h` : `${total.toFixed(1)}h`}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-bold text-muted-foreground hover:text-white border border-white/5"
              onClick={() => onOpenStatement(emp.id, emp.name)}
            >
              Ver Extrato Detalhado
            </Button>
          </div>
        );
      })}
    </div>
  );
}
