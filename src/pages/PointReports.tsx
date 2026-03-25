import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, Download, User, Calendar, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { supabase } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';

export default function PointReports() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmp, setSelectedEmp] = useState<string>('');
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ totalWorked: 0, totalExtra: 0, totalMissing: 0 });

  useEffect(() => {
    const loadEmps = async () => {
      const { data } = await supabase.from('employees').select('id, name');
      setEmployees(data || []);
    };
    loadEmps();
  }, []);

  const generateReport = async () => {
    if (!selectedEmp) return;
    setLoading(true);
    try {
      // 1. Buscar pontos do mês
      const startDate = `${month}-01T00:00:00Z`;
      const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString();

      const { data: points } = await supabase
        .from('pontos')
        .select('*')
        .eq('funcionario_id', selectedEmp)
        .gte('data_hora', startDate)
        .lt('data_hora', endDate)
        .order('data_hora', { ascending: true });

      // 2. Buscar jornada do funcionário
      const { data: jornada } = await supabase.from('jornadas').select('*').eq('funcionario_id', selectedEmp).maybeSingle();

      // 3. Agrupar por dia e calcular
      const daysInMonth = new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 0).getDate();
      const dailyData = [];
      let totalM = 0, totalE = 0, totalMis = 0;

      for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = `${month}-${String(i).padStart(2, '0')}`;
        const dayPoints = points?.filter(p => p.data_hora.startsWith(dayStr)) || [];
        
        // Lógica simplificada de cálculo (Entrada - Saída - Almoço)
        let workedMins = 0;
        const entry = dayPoints.find(p => p.tipo === 'ENTRY');
        const exit = dayPoints.find(p => p.tipo === 'EXIT');
        const lunchStart = dayPoints.find(p => p.tipo === 'INTERVAL_START');
        const lunchEnd = dayPoints.find(p => p.tipo === 'INTERVAL_END');

        if (entry && exit) {
            const total = (new Date(exit.data_hora).getTime() - new Date(entry.data_hora).getTime()) / 60000;
            let lunch = 0;
            if (lunchStart && lunchEnd) {
                lunch = (new Date(lunchEnd.data_hora).getTime() - new Date(lunchStart.data_hora).getTime()) / 60000;
            } else if (jornada) {
                // Se não bateu almoço, assume 1h se jornada prevê
                lunch = 60; 
            }
            workedMins = Math.max(0, total - lunch);
        }

        const expectedMins = jornada ? 480 : 0; // 8h padrão
        const balance = workedMins > 0 ? workedMins - expectedMins : 0;

        if (workedMins > 0) {
            totalM += workedMins;
            if (balance > 0) totalE += balance;
            if (balance < 0) totalMis += Math.abs(balance);
        }

        dailyData.push({
          date: dayStr,
          points: dayPoints,
          workedMins,
          balance
        });
      }

      setReportData(dailyData);
      setSummary({ totalWorked: totalM, totalExtra: totalE, totalMissing: totalMis });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const minsToHHMM = (m: number) => {
    const h = Math.floor(Math.abs(m) / 60);
    const mins = Math.round(Math.abs(m) % 60);
    return `${m < 0 ? '-' : ''}${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Relatórios de Ponto</h1>
          <p className="text-muted-foreground">Análise de horas, faltas e banco de horas.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <FileText className="w-4 h-4" /> Imprimir Espelho
          </Button>
        </div>
      </div>

      <Card className="glass-card border-white/5">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><User className="w-3 h-3" /> Funcionário</label>
              <Select value={selectedEmp} onValueChange={setSelectedEmp}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-48">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2"><Calendar className="w-3 h-3" /> Mês/Ano</label>
              <input 
                type="month" 
                value={month} 
                onChange={e => setMonth(e.target.value)}
                className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <Button onClick={generateReport} disabled={!selectedEmp || loading} className="gap-2">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Gerar Relatório
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Trabalhado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{minsToHHMM(summary.totalWorked)}h</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Horas Extras</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">+{minsToHHMM(summary.totalExtra)}h</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Débito/Atrasos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-500">-{minsToHHMM(summary.totalMissing)}h</div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-[10px] uppercase font-bold text-muted-foreground border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Entrada</th>
                    <th className="px-4 py-3">Almoço</th>
                    <th className="px-4 py-3">Retorno</th>
                    <th className="px-4 py-3">Saída</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {reportData.map((d, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.points.find(p => p.tipo === 'ENTRY')?.data_hora.slice(11, 16) || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.points.find(p => p.tipo === 'INTERVAL_START')?.data_hora.slice(11, 16) || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.points.find(p => p.tipo === 'INTERVAL_END')?.data_hora.slice(11, 16) || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{d.points.find(p => p.tipo === 'EXIT')?.data_hora.slice(11, 16) || '-'}</td>
                      <td className="px-4 py-3 text-white">{d.workedMins > 0 ? minsToHHMM(d.workedMins) : '-'}</td>
                      <td className={cn(
                        "px-4 py-3 font-bold",
                        d.balance > 0 ? "text-emerald-500" : d.balance < 0 ? "text-rose-500" : "text-muted-foreground"
                      )}>
                        {d.workedMins > 0 ? (d.balance > 0 ? `+${minsToHHMM(d.balance)}` : minsToHHMM(d.balance)) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
