import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  AlertCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AttendanceStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
  employeeName: string | null;
  tenantId: string | null;
}

export function AttendanceStatementModal({ open, onOpenChange, employeeId, employeeName, tenantId }: AttendanceStatementModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [sheets, setSheets] = useState<any[]>([]);
  const [hourBank, setHourBank] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatementData = async () => {
    if (!employeeId || !open) return;
    setIsLoading(true);

    const start = startOfMonth(currentMonth).toISOString();
    const end = endOfMonth(currentMonth).toISOString();

    try {
      const [entriesRes, sheetsRes, hbRes] = await Promise.all([
        supabase.from('time_entries')
          .select('*')
          .eq('employee_id', employeeId)
          .gte('timestamp', start)
          .lte('timestamp', end)
          .order('timestamp', { ascending: true }),
        supabase.from('time_sheets')
          .select('*')
          .eq('employee_id', employeeId)
          .gte('date', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
          .lte('date', format(endOfMonth(currentMonth), 'yyyy-MM-dd')),
        supabase.from('hour_bank')
          .select('*')
          .eq('employee_id', employeeId)
          .gte('date', format(startOfMonth(currentMonth), 'yyyy-MM-dd'))
          .lte('date', format(endOfMonth(currentMonth), 'yyyy-MM-dd'))
      ]);

      if (entriesRes.data) setEntries(entriesRes.data);
      if (sheetsRes.data) setSheets(sheetsRes.data);
      if (hbRes.data) setHourBank(hbRes.data);
    } catch (err) {
      console.error('Error fetching statement:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatementData();
  }, [employeeId, currentMonth, open]);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const totals = {
    worked: sheets.reduce((acc, s) => acc + (s.worked_hours || 0), 0),
    extras: sheets.reduce((acc, s) => acc + (s.extra_hours || 0), 0),
    balance: hourBank.reduce((acc, h) => acc + (h.hours || 0), 0)
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background border-white/10 shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Extrato Detalhado
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-medium">
                Relatório de batidas e saldo de banco de horas de <span className="text-white font-bold">{employeeName}</span>
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-3 bg-white/5 p-1 rounded-xl border border-white/10">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-black uppercase tracking-widest min-w-[120px] text-center">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pb-6">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Total Trabalhado</p>
              <p className="text-2xl font-black text-white">{totals.worked.toFixed(1)}<span className="text-sm font-bold text-muted-foreground ml-1">horas</span></p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
              <p className="text-[10px] font-black uppercase text-emerald-500 mb-1 tracking-widest">Horas Extras</p>
              <p className="text-2xl font-black text-emerald-400">+{totals.extras.toFixed(1)}<span className="text-sm font-bold opacity-50 ml-1">h</span></p>
            </div>
            <div className={cn(
              "p-4 rounded-2xl border",
              totals.balance >= 0 ? "bg-primary/10 border-primary/20" : "bg-rose-500/10 border-rose-500/20"
            )}>
              <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Saldo do Mês</p>
              <p className={cn(
                "text-2xl font-black",
                totals.balance >= 0 ? "text-primary" : "text-rose-400"
              )}>
                {totals.balance >= 0 ? `+${totals.balance.toFixed(1)}` : totals.balance.toFixed(1)}
                <span className="text-sm font-bold opacity-50 ml-1">h</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          <div className="h-full border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="bg-white/5 sticky top-0 z-10">
                  <TableRow className="border-white/10 h-10">
                    <TableHead className="w-[120px] text-[10px] font-black uppercase">Data</TableHead>
                    <TableHead className="text-[10px] font-black uppercase">Batidas do Dia</TableHead>
                    <TableHead className="w-[100px] text-[10px] font-black uppercase text-center">Trabalhado</TableHead>
                    <TableHead className="w-[100px] text-[10px] font-black uppercase text-center">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daysInMonth.map((day) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const dayEntries = entries.filter(e => isSameDay(parseISO(e.timestamp), day));
                    const sheet = sheets.find(s => s.date === dayStr);
                    const hb = hourBank.find(h => h.date === dayStr);
                    
                    if (dayEntries.length === 0 && !sheet) {
                      return (
                        <TableRow key={dayStr} className="border-white/5 hover:bg-white/[0.01] opacity-40">
                          <TableCell className="text-xs font-bold text-muted-foreground">
                            {format(day, 'dd/MM')} <span className="text-[10px] uppercase font-black ml-1">{format(day, 'eee', { locale: ptBR })}</span>
                          </TableCell>
                          <TableCell className="text-[10px] italic text-muted-foreground">- sem registros -</TableCell>
                          <TableCell className="text-center font-mono-data text-xs text-muted-foreground">0.0h</TableCell>
                          <TableCell className="text-center font-mono-data text-xs text-muted-foreground">0.0</TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <TableRow key={dayStr} className="border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="text-xs font-bold text-white">
                          {format(day, 'dd/MM')} <span className="text-[10px] uppercase font-black text-primary ml-1">{format(day, 'eee', { locale: ptBR })}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {dayEntries.map((e, idx) => (
                              <Badge 
                                key={e.id} 
                                variant="outline" 
                                className={cn(
                                  "text-[10px] font-black py-0.5 px-2 bg-background/50",
                                  idx % 2 === 0 ? "border-emerald-500/30 text-emerald-400" : "border-rose-500/30 text-rose-400"
                                )}
                              >
                                {format(parseISO(e.timestamp), 'HH:mm')}
                              </Badge>
                            ))}
                            {dayEntries.length === 0 && <span className="text-[10px] text-muted-foreground">--:--</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-xs text-white">
                          {sheet?.worked_hours ? `${sheet.worked_hours.toFixed(1)}h` : '0.0h'}
                        </TableCell>
                        <TableCell className="text-center">
                          {hb?.hours !== undefined ? (
                            <div className={cn(
                              "text-xs font-black inline-flex items-center gap-1",
                              hb.hours >= 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                              {hb.hours > 0 ? <TrendingUp className="w-3 h-3" /> : hb.hours < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                              {hb.hours > 0 ? `+${hb.hours.toFixed(1)}` : hb.hours.toFixed(1)}
                            </div>
                          ) : (
                            <span className="text-xs font-black text-muted-foreground">0.0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
