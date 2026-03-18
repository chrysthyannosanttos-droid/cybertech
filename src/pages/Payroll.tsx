import { useState, useMemo } from 'react';
import { MOCK_EMPLOYEES, MOCK_CERTIFICATES } from '@/data/mockData';
import { PayrollEntry } from '@/types';
import { Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

export default function Payroll() {
  const [month, setMonth] = useState('2026-03');

  const payroll: PayrollEntry[] = useMemo(() => {
    return MOCK_EMPLOYEES.map(emp => {
      const empCerts = MOCK_CERTIFICATES.filter(c => c.employeeId === emp.id && c.date.startsWith(month));
      const certDays = empCerts.reduce((s, c) => s + c.days, 0);
      const dailyRate = emp.salary / 30;
      const absences = Math.floor(Math.random() * 3); // mock absences
      const deductions = absences * dailyRate;
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        storeName: emp.storeName,
        salary: emp.salary,
        absences,
        certificateDays: certDays,
        deductions: Math.round(deductions * 100) / 100,
        netSalary: Math.round((emp.salary - deductions) * 100) / 100,
      };
    });
  }, [month]);

  const totalNet = payroll.reduce((s, p) => s + p.netSalary, 0);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(payroll.map(p => ({
      Funcionário: p.employeeName,
      Loja: p.storeName,
      'Salário Base': p.salary,
      Faltas: p.absences,
      'Dias Atestado': p.certificateDays,
      Descontos: p.deductions,
      'Salário Líquido': p.netSalary,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Folha');
    XLSX.writeFile(wb, `folha_${month}.xlsx`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Folha de Pagamento</h1>
          <p className="text-[13px] text-muted-foreground">Total líquido: <span className="font-mono-data font-semibold text-foreground">R$ {totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="h-8 text-[13px] w-[160px]"
          />
          <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5" onClick={exportExcel}>
            <Download className="w-3.5 h-3.5" /> Exportar Excel
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              {['Funcionário', 'Loja', 'Salário Base', 'Faltas', 'Atestado', 'Descontos', 'Líquido'].map(h => (
                <th key={h} className={`text-${['Salário Base', 'Faltas', 'Atestado', 'Descontos', 'Líquido'].includes(h) ? 'right' : 'left'} text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {payroll.slice(0, 20).map(p => (
              <tr key={p.employeeId} className="border-b border-border/30 last:border-0 hover:bg-accent/50 transition-colors duration-150">
                <td className="px-4 py-2.5 text-[13px] font-medium">{p.employeeName}</td>
                <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{p.storeName.replace('SUPER ', '')}</td>
                <td className="px-4 py-2.5 text-right font-mono-data text-[13px]">R$ {p.salary.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-2.5 text-right text-[13px] tabular-nums">{p.absences}</td>
                <td className="px-4 py-2.5 text-right text-[13px] tabular-nums">{p.certificateDays}d</td>
                <td className="px-4 py-2.5 text-right font-mono-data text-[13px] text-destructive">-R$ {p.deductions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-4 py-2.5 text-right font-mono-data text-[13px] font-semibold">R$ {p.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

