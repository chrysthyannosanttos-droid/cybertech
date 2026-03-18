import { useState, useMemo } from 'react';
import { MOCK_EMPLOYEES, MOCK_CERTIFICATES, MOCK_STORES } from '@/data/mockData';
import { PayrollEntry } from '@/types';
import { Download, FileText, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

// Mock payroll verbas (códigos de verba)
const VERBAS = [
  { code: 1, name: 'Salário Base' },
  { code: 2, name: 'Horas Extras' },
  { code: 100, name: 'Adicional Noturno' },
  { code: 200, name: 'Vale Transporte' },
  { code: 300, name: 'INSS' },
  { code: 400, name: 'IRRF' },
];

export default function Payroll() {
  const [storeFilter, setStoreFilter] = useState('all');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStoreId, setExportStoreId] = useState('');
  const [exportStartDate, setExportStartDate] = useState<Date>();
  const [exportEndDate, setExportEndDate] = useState<Date>();
  const [includeCpf, setIncludeCpf] = useState(false);
  const { toast } = useToast();

  const payroll: PayrollEntry[] = useMemo(() => {
    return MOCK_EMPLOYEES
      .filter(emp => storeFilter === 'all' || emp.storeId === storeFilter)
      .map(emp => {
        const empCerts = MOCK_CERTIFICATES.filter(c => c.employeeId === emp.id);
        const certDays = empCerts.reduce((s, c) => s + c.days, 0);
        const dailyRate = emp.salary / 30;
        const absences = Math.floor(Math.random() * 3);
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
  }, [storeFilter]);

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
    XLSX.writeFile(wb, `folha_pagamento.xlsx`);
  };

  const exportTxt = () => {
    if (!exportStoreId || !exportStartDate || !exportEndDate) {
      toast({ title: 'Preencha todos os campos', description: 'Selecione a loja, data inicial e data final.', variant: 'destructive' });
      return;
    }

    const store = MOCK_STORES.find(s => s.id === exportStoreId);
    if (!store) return;

    const cnpjClean = store.cnpj.replace(/[./-]/g, '');
    const startStr = format(exportStartDate, 'ddMMyyyy');
    const endStr = format(exportEndDate, 'ddMMyyyy');

    const storeEmployees = MOCK_EMPLOYEES.filter(e => e.storeId === exportStoreId);

    // Build lines
    const lines: string[] = [];
    // Header line
    lines.push(`${cnpjClean}|${startStr}|${endStr}`);

    // Generate verba lines per employee
    storeEmployees.forEach(emp => {
      VERBAS.forEach(verba => {
        let valor = 0;
        switch (verba.code) {
          case 1: valor = emp.salary; break;
          case 2: valor = Math.round(Math.random() * 500 * 100) / 100; break;
          case 100: valor = Math.round(Math.random() * 200 * 100) / 100; break;
          case 200: valor = 220; break;
          case 300: valor = Math.round(emp.salary * 0.11 * 100) / 100; break;
          case 400: valor = Math.round(emp.salary * 0.075 * 100) / 100; break;
        }

        const valorFormatted = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        if (includeCpf) {
          const cpfClean = emp.cpf.replace(/[.-]/g, '');
          lines.push(`${verba.code}|${valorFormatted}|${cpfClean}`);
        } else {
          lines.push(`${verba.code}|${valorFormatted}`);
        }
      });
    });

    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `folha_${cnpjClean}_${startStr}_${endStr}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setExportOpen(false);
    toast({ title: 'Folha exportada', description: `Arquivo TXT gerado com ${storeEmployees.length} funcionários e ${VERBAS.length} verbas.` });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Folha de Pagamento</h1>
          <p className="text-[13px] text-muted-foreground">Total líquido: <span className="font-mono-data font-semibold text-foreground">R$ {totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-[200px] h-8 text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Lojas</SelectItem>
              {MOCK_STORES.map(s => <SelectItem key={s.id} value={s.id}>{s.name.replace('SUPER ', '')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5" onClick={exportExcel}>
            <Download className="w-3.5 h-3.5" /> Excel
          </Button>

          <Dialog open={exportOpen} onOpenChange={setExportOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-[13px] gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Exportar Folha TXT
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[15px]">Exportar Folha de Pagamento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Store Select */}
                <div>
                  <Label className="text-[12px] font-medium text-muted-foreground mb-1 block">Loja</Label>
                  <Select value={exportStoreId} onValueChange={setExportStoreId}>
                    <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Selecione a loja" /></SelectTrigger>
                    <SelectContent>
                      {MOCK_STORES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {exportStoreId && (
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono-data">
                      CNPJ: {MOCK_STORES.find(s => s.id === exportStoreId)?.cnpj}
                    </p>
                  )}
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[12px] font-medium text-muted-foreground mb-1 block">Data Inicial</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full h-9 text-[13px] justify-start font-normal", !exportStartDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {exportStartDate ? format(exportStartDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={exportStartDate} onSelect={setExportStartDate} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-[12px] font-medium text-muted-foreground mb-1 block">Data Final</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full h-9 text-[13px] justify-start font-normal", !exportEndDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {exportEndDate ? format(exportEndDate, "dd/MM/yyyy") : "Selecione"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={exportEndDate} onSelect={setExportEndDate} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* CPF Toggle */}
                <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5">
                  <div>
                    <Label className="text-[13px] font-medium">Incluir CPF</Label>
                    <p className="text-[11px] text-muted-foreground">Adiciona CPF ao final de cada linha</p>
                  </div>
                  <Switch checked={includeCpf} onCheckedChange={setIncludeCpf} />
                </div>

                {/* Preview */}
                {exportStoreId && exportStartDate && exportEndDate && (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Prévia do arquivo:</p>
                    <pre className="text-[11px] font-mono-data leading-relaxed text-foreground">
                      {(() => {
                        const store = MOCK_STORES.find(s => s.id === exportStoreId);
                        if (!store) return '';
                        const cnpj = store.cnpj.replace(/[./-]/g, '');
                        const start = format(exportStartDate, 'ddMMyyyy');
                        const end = format(exportEndDate, 'ddMMyyyy');
                        const lines = [`${cnpj}|${start}|${end}`];
                        if (includeCpf) {
                          lines.push('1|2.500,00|00000000000');
                          lines.push('300|275,00|00000000000');
                        } else {
                          lines.push('1|2.500,00');
                          lines.push('300|275,00');
                        }
                        lines.push('...');
                        return lines.join('\n');
                      })()}
                    </pre>
                  </div>
                )}

                <Button onClick={exportTxt} className="w-full h-9 text-[13px] gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Exportar Folha
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
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
