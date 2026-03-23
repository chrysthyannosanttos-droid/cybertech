import { useState, useMemo, useEffect } from 'react';
import { MOCK_BENEFITS } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { Employee, Certificate, PayrollEntry, Store } from '@/types';
import { Download, FileText, CalendarIcon, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { addAuditLog } from '@/data/mockData';
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
  const { user: currentUser } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dbEmployees, setDbEmployees] = useState<Employee[]>([]);
  const [dbCertificates, setDbCertificates] = useState<Certificate[]>([]);
  const [dbStores, setDbStores] = useState<Store[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [
        { data: empData },
        { data: certData },
        { data: storesData }
      ] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('certificates').select('*'),
        supabase.from('stores').select('*')
      ]);

      const storesList = (storesData || []).map(s => ({ ...s, tenantId: s.tenant_id } as Store));
      setDbStores(storesList);

      if (empData) setDbEmployees(empData.map(e => {
        const store = storesList.find(s => s.id === e.store_id);
        return {
          ...e,
          storeId: e.store_id,
          storeName: store?.name || 'Unidade Geral',
          salary: Number(e.salary),
          role: e.role,
          department: e.department
        } as Employee;
      }));

      if (certData) setDbCertificates(certData.map(c => ({
        ...c,
        employeeId: c.employee_id,
        days: c.days
      } as unknown as Certificate)));
      
      setIsLoading(false);
    };
    fetchData();
    
    const channel = supabase
      .channel('payroll_sync_realtime')
      .on('postgres_changes', { event: '*', table: 'employees', schema: 'public' }, () => fetchData())
      .on('postgres_changes', { event: '*', table: 'certificates', schema: 'public' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'cristiano';

  const payroll: PayrollEntry[] = useMemo(() => {
    return dbEmployees
      .filter(emp => storeFilter === 'all' || emp.storeId === storeFilter)
      .map(emp => {
        const empCerts = dbCertificates.filter(c => c.employeeId === emp.id);
        const certDays = empCerts.reduce((s, c) => s + c.days, 0);
        const dailyRate = emp.salary / 30;
        // Keep it simple for now, can be expanded for real absences if a table exists
        const absences = 0; 
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
  }, [storeFilter, dbEmployees, dbCertificates]);

  // Use a local state to allow deletions
  useMemo(() => {
    setPayrollData(payroll);
  }, [payroll]);

  const toggleSelectAll = () => {
    if (selectedIds.length === payrollData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payrollData.map(p => p.employeeId));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = () => {
    if (!isAdmin) return;
    const count = selectedIds.length;
    setPayrollData(prev => prev.filter(p => !selectedIds.includes(p.employeeId)));
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE',
      details: `[Payroll] Excluiu ${count} registro(s) da folha em massa.`
    });
    setSelectedIds([]);
    toast({ title: `${count} registro(s) removido(s) da visualização` });
  };

  const handleDeleteOne = (id: string, name: string) => {
    if (!isAdmin) return;
    setPayrollData(prev => prev.filter(p => p.employeeId !== id));
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE',
      details: `[Payroll] Removeu ${name} da folha atual.`
    });
    setSelectedIds(prev => prev.filter(x => x !== id));
    toast({ title: 'Registro removido da folha' });
  };

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

    const store = dbStores.find(s => s.id === exportStoreId);
    if (!store) return;

    const cnpjClean = store.cnpj.replace(/[./-]/g, '');
    const startStr = format(exportStartDate, 'ddMMyyyy');
    const endStr = format(exportEndDate, 'ddMMyyyy');

    const storeEmployees = dbEmployees.filter(e => e.storeId === exportStoreId);

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
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Fluxo de Pagamentos</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Total líquido consolidado: <span className="text-primary font-black ml-2">R$ {totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></p>
        </div>
        <div className="flex gap-3 items-center">
          {isAdmin && selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" className="h-10 px-6 rounded-xl font-bold text-[12px] gap-2 animate-in fade-in zoom-in duration-200 mr-2" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4" /> Excluir Selecionados ({selectedIds.length})
            </Button>
          )}
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-[200px] h-10 bg-white/5 border-white/10 rounded-xl text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="glass-card border-white/10 text-white">
              <SelectItem value="all">Todas as Lojas</SelectItem>
              {dbStores.map(s => <SelectItem key={s.id} value={s.id}>{s.name.replace('SUPER ', '')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-10 px-4 rounded-xl text-white/60 hover:text-white hover:bg-white/10 font-bold text-[12px] gap-2 transition-all" onClick={exportExcel}>
            <Download className="w-4 h-4" /> Excel
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
                      {dbStores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {exportStoreId && (
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono-data">
                      CNPJ: {dbStores.find(s => s.id === exportStoreId)?.cnpj}
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
                        const store = dbStores.find(s => s.id === exportStoreId);
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
      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
                <th className="px-6 py-4 w-[40px]">
                  <Checkbox 
                    checked={payrollData.length > 0 && selectedIds.length === payrollData.length} 
                    onCheckedChange={toggleSelectAll}
                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Unidade</th>
                <th className="px-6 py-4 text-right">Salário Base</th>
                <th className="px-6 py-4 text-center">Intercorrências</th>
                <th className="px-6 py-4 text-right">Total Descontos</th>
                <th className="px-6 py-4 text-right">Saldo Líquido</th>
                {isAdmin && <th className="px-6 py-4 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payrollData.slice(0, 20).map(p => (
                <tr key={p.employeeId} className={cn("hover:bg-white/[0.02] transition-colors group", selectedIds.includes(p.employeeId) && "bg-primary/5")}>
                  <td className="px-6 py-4">
                    <Checkbox 
                      checked={selectedIds.includes(p.employeeId)} 
                      onCheckedChange={() => toggleSelect(p.employeeId)}
                      className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{p.employeeName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{p.storeName.replace('SUPER ', '')}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono-data text-[13px] text-white/80">R$ {p.salary.toLocaleString('pt-BR')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black text-rose-500">{p.absences}</span>
                        <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Faltas</span>
                      </div>
                      <div className="w-px h-4 bg-white/10" />
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black text-blue-400">{p.certificateDays}d</span>
                        <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Atest.</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono-data text-[13px] text-rose-500/80 font-medium">-R$ {p.deductions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-mono-data text-[14px] font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">R$ {p.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => handleDeleteOne(p.employeeId, p.employeeName)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
