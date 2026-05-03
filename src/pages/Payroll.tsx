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
import { Loader2, PlayCircle, Mail, Send, MessageSquare, ExternalLink } from 'lucide-react';
import { BulkPostModal } from '@/components/payroll/BulkPostModal';
import { calculatePayroll, round } from '@/lib/cltEngine';
import { processBatch } from '@/lib/payrollModule';

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
  const { user: currentUser, isImpersonating } = useAuth();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dbEmployees, setDbEmployees] = useState<Employee[]>([]);
  const [dbCertificates, setDbCertificates] = useState<Certificate[]>([]);
  const [dbStores, setDbStores] = useState<Store[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [dbTimeSheets, setDbTimeSheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 50;
  
  // Period state
  const [refMonth, setRefMonth] = useState(new Date().getMonth() + 1);
  const [refYear, setRefYear] = useState(new Date().getFullYear());
  
  // Batch processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<{employeeId: string, pdfUrl: string}[]>([]);
  const [batchErrors, setBatchErrors] = useState<{employeeName: string, error: string}[]>([]);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [bulkPostOpen, setBulkPostOpen] = useState(false);
  const [existingPayrolls, setExistingPayrolls] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      let qEmployees = supabase.from('employees').select('*').eq('status', 'ACTIVE');
      let qCertificates = supabase.from('certificates').select('*');
      let qStores = supabase.from('stores').select('*');
      let qSheets = supabase.from('time_sheets').select('employee_id, date, status').eq('status', 'ABSENT');

      const isSuperAdmin = currentUser?.role === 'superadmin' && !isImpersonating;

      if (!isSuperAdmin && currentUser?.tenantId) {
        qEmployees = qEmployees.eq('tenant_id', currentUser.tenantId);
        qCertificates = qCertificates.eq('tenant_id', currentUser.tenantId);
        qStores = qStores.eq('tenant_id', currentUser.tenantId);
        qSheets = qSheets.eq('tenant_id', currentUser.tenantId);
      }

      const [
        { data: empData },
        { data: certData },
        { data: storesData },
        { data: sheetsData }
      ] = await Promise.all([
        qEmployees,
        qCertificates,
        qStores,
        qSheets
      ]);

      if (sheetsData) setDbTimeSheets(sheetsData);

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

  useEffect(() => {
    const fetchExistingPayrolls = async () => {
      let q = supabase.from('payrolls').select('*').eq('reference_month', refMonth).eq('reference_year', refYear);
      let tenantId = (currentUser as any)?.tenantId || (currentUser as any)?.tenant_id;
      if (tenantId) q = q.eq('tenant_id', tenantId);
      const { data } = await q;
      setExistingPayrolls(data || []);
    };
    fetchExistingPayrolls();
  }, [refMonth, refYear, currentUser]);

  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'tenant';

  const payroll: PayrollEntry[] = useMemo(() => {
    return dbEmployees
      .filter(emp => storeFilter === 'all' || emp.storeId === storeFilter)
      .filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .map(emp => {
        const empCerts = dbCertificates.filter(c => c.employeeId === emp.id);
        const certDays = empCerts.reduce((s, c) => s + c.days, 0);
        
        // Calcula faltas reais a partir dos registros de ponto do mês de referência
        const absences = dbTimeSheets.filter(s => {
          if (s.employee_id !== emp.id) return false;
          const sheetDate = new Date(s.date);
          return sheetDate.getMonth() + 1 === refMonth && sheetDate.getFullYear() === refYear;
        }).length;
        
        const calc = calculatePayroll({
          baseSalary: emp.salary,
          absenceDays: absences,
          hazardPay: emp.periculosidade || 0,
          unhealthyPay: emp.insalubridade || 0,
          bonus: emp.gratificacao || 0,
          vtValue: emp.valeTransporte || 0,
          vrValue: emp.valeRefeicao || 0,
          dependents: 0
        });

        return {
          employeeId: emp.id,
          employeeName: emp.name,
          storeName: emp.storeName,
          salary: emp.salary,
          absences,
          certificateDays: certDays,
          deductions: round(calc.grossSalary - calc.netSalary),
          netSalary: calc.netSalary,
        };
      });
  }, [storeFilter, dbEmployees, dbCertificates, dbTimeSheets, refMonth, refYear]);

  // Sincroniza payrollData com o cálculo derivado
  useEffect(() => {
    setPayrollData(payroll);
  }, [payroll]);

  const suggestions = useMemo(() => {
    if (!searchTerm || searchTerm.length < 2) return [];
    return dbEmployees
      .filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .slice(0, 5); // Limita a 5 sugestões
  }, [searchTerm, dbEmployees]);

  const toggleSelectAll = () => {
    if (selectedIds.length === payrollData.length && payrollData.length > 0) {
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

  const handleProcessBatch = async () => {
    if (!isAdmin || selectedIds.length === 0) return;
    
    setIsProcessing(true);
    setBatchProgress({ current: 0, total: selectedIds.length });
    
    try {
      let tenantId = (currentUser as any)?.tenantId || (currentUser as any)?.tenant_id;
      
      // Fallback para superadmin sem tenantId vinculado (busca o primeiro tenant disponível)
      if (!tenantId) {
        const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        tenantId = tenantData?.id;
      }

      if (!tenantId) throw new Error("ID da Unidade (Tenant) não encontrado. Verifique seu cadastro.");

      // 1. Prepara dados rodando o motor CLT
      const dataToProcess = selectedIds.map(empId => {
        const emp = dbEmployees.find(e => e.id === empId);
        const pData = payrollData.find(p => p.employeeId === empId);
        if (!emp || !pData) return null;

        const result = calculatePayroll({
          baseSalary: emp.salary,
          absenceDays: pData.absences,
          hazardPay: emp.periculosidade || 0,
          unhealthyPay: emp.insalubridade || 0,
          bonus: emp.gratificacao || 0,
          vtValue: emp.valeTransporte || 0,
          vrValue: emp.valeRefeicao || 0,
          dependents: 0 // Simplificado por enquanto
        });

        return { employeeId: emp.id, payrollResult: result, absences: pData.absences };
      }).filter(Boolean) as any[];

      const batchSummary = await processBatch({
        tenantId,
        employees: dbEmployees,
        payrollData: dataToProcess,
        referenceMonth: refMonth,
        referenceYear: refYear,
        onProgress: (current, total) => setBatchProgress({ current, total })
      });

      if (batchSummary.errors.length > 0) {
        toast({ 
          title: 'Concluído com falhas', 
          description: `${batchSummary.errors.length} erros. Verifique console para detalhes.`, 
          variant: 'destructive' 
        });
        console.error('Erros no processamento em lote:', batchSummary.errors);
      } else {
        toast({ 
          title: 'Folha Processada!', 
          description: `${batchSummary.results.length} holerites gerados com sucesso.` 
        });
      }

      setBatchResults(prev => [...prev, ...batchSummary.results]);
      setBatchErrors(batchSummary.errors);
      
      if (batchSummary.errors.length > 0) {
        setErrorDialogOpen(true);
      }

    } catch (e: any) {
      toast({ title: 'Erro crítico', description: e.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setSelectedIds([]); // limpa seleção
    }
  };

  const generateWALink = (phone: string, name: string, pdfUrl: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}, segue seu holerite referente a ${refMonth}/${refYear}: ${pdfUrl}`);
    return `https://wa.me/55${cleanPhone}?text=${message}`;
  };

  const handleSendSingleWhatsApp = async (p: any, result: any) => {
    const emp = dbEmployees.find(e => e.id === p.employeeId);
    if (!emp?.phone) {
      toast({ 
        title: 'Telefone não cadastrado', 
        description: `O funcionário ${p.employeeName} não possui celular cadastrado.`, 
        variant: 'destructive' 
      });
      return;
    }

    // Limpa o número (remove parênteses, traços, etc) e garante o código do país
    let cleanPhone = emp.phone.replace(/\D/g, '');
    if (cleanPhone.length === 11) cleanPhone = '55' + cleanPhone;
    if (cleanPhone.length === 10) cleanPhone = '55' + cleanPhone;

    const message = encodeURIComponent(`Olá ${emp.name}, seu holerite de ${refMonth.toString().padStart(2, '0')}/${refYear} já está disponível para consulta: ${result.pdfUrl}`);
    const waLink = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${message}`;
    
    // Abre em uma nova aba
    window.open(waLink, '_blank');
    
    toast({ title: 'WhatsApp Web aberto', description: 'Clique em enviar na nova aba.' });
  };

  const handleSendSingleEmail = async (p: any, result: any) => {
    const emp = dbEmployees.find(e => e.id === p.employeeId);
    if (!emp?.email) {
      toast({ title: 'E-mail não cadastrado', description: `O funcionário ${p.employeeName} não possui e-mail cadastrado.`, variant: 'destructive' });
      return;
    }

    toast({ title: 'Enviando e-mail...', description: 'Aguarde o processamento.' });

    try {
      let tenantId = (currentUser as any)?.tenantId || (currentUser as any)?.tenant_id;
      if (!tenantId) {
        const { data: tData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        tenantId = tData?.id;
      }

      const { data: fData, error: fError } = await supabase.functions.invoke('send-payroll-email', {
        body: {
          tenant_id: tenantId,
          employee_email: emp.email,
          employee_name: emp.name,
          pdf_url: result.pdfUrl,
          month: refMonth.toString().padStart(2, '0'),
          year: refYear.toString()
        }
      });

      if (!fError && fData?.success) {
        toast({ title: 'E-mail enviado com sucesso!', description: `O holerite foi enviado para ${emp.email}` });
        await supabase.from('payrolls').update({ 
          status: 'SENT',
          sent_email_at: new Date().toISOString() 
        }).eq('employee_id', emp.id).eq('reference_month', refMonth).eq('reference_year', refYear);
      } else {
        const errorMsg = fError?.message || fData?.error || 'Erro desconhecido';
        toast({ 
          title: 'Falha no envio', 
          description: `Motivo: ${errorMsg}`, 
          variant: 'destructive' 
        });
      }
    } catch (err: any) {
      toast({ title: 'Erro de sistema', description: err.message, variant: 'destructive' });
    }
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
          case 2: valor = 0; break; // Horas extras: use dados reais do módulo de ponto
          case 100: valor = 0; break; // Adicional noturno: use dados reais do módulo de ponto
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
            <>
              <Button variant="destructive" size="sm" className="h-10 px-6 rounded-xl font-bold text-[12px] gap-2 animate-in fade-in zoom-in duration-200" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4" /> Excluir ({selectedIds.length})
              </Button>
              <Button 
                onClick={handleProcessBatch} 
                disabled={isProcessing}
                className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[12px] gap-2 animate-in fade-in zoom-in duration-200"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                {isProcessing ? `Processando...` : `Fechar Lote (${selectedIds.length})`}
              </Button>
              {(batchResults.length > 0 || existingPayrolls.length > 0) && (
                <Button 
                  onClick={() => setBulkPostOpen(true)}
                  className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[12px] gap-2 animate-in fade-in zoom-in duration-200"
                >
                  <Send className="w-4 h-4" /> Enviar em Massa
                </Button>
              )}
              {batchErrors.length > 0 && (
                <Button 
                  onClick={() => setErrorDialogOpen(true)}
                  variant="outline"
                  className="h-10 px-6 rounded-xl border-rose-500 text-rose-500 hover:bg-rose-500/10 font-black text-[12px] gap-2 animate-in fade-in zoom-in duration-200"
                >
                  <Trash2 className="w-4 h-4" /> Relatório de Erros ({batchErrors.length})
                </Button>
              )}
            </>
          )}
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
            <Select value={refMonth.toString()} onValueChange={(v) => setRefMonth(parseInt(v))}>
              <SelectTrigger className="w-[120px] h-8 bg-transparent border-none text-white text-[11px] font-bold uppercase">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10 text-white">
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <SelectItem key={m} value={m.toString()}>
                    {format(new Date(2024, m - 1), 'MMMM', { locale: ptBR }).toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="w-[1px] h-4 bg-white/10 self-center" />
            <Select value={refYear.toString()} onValueChange={(v) => setRefYear(parseInt(v))}>
              <SelectTrigger className="w-[90px] h-8 bg-transparent border-none text-white text-[11px] font-bold">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/10 text-white">
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Loader2 className={cn("w-4 h-4 animate-spin", !isLoading && "hidden")} />
              {!isLoading && <PlayCircle className="w-4 h-4" />}
            </div>
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowSuggestions(true);
              }}
              className="h-10 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-[12px] font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 w-full md:w-[250px] transition-all"
            />

            {/* Lista de Sugestões */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#0c0c14] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {suggestions.map((emp) => (
                  <button
                    key={emp.id}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Impede o blur do input antes da seleção
                      setSearchTerm(emp.name);
                      setShowSuggestions(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors border-b border-white/5 last:border-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {emp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white">{emp.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-medium">{emp.department || 'Geral'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-[180px] h-10 bg-white/5 border-white/10 rounded-xl text-white font-bold text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent className="glass-card border-white/10 text-white">
              <SelectItem value="all">TODAS AS UNIDADES</SelectItem>
              {dbStores.map(s => <SelectItem key={s.id} value={s.id}>{s.name.replace('SUPER ', '').toUpperCase()}</SelectItem>)}
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

      {isProcessing && (
        <div className="mb-6 glass-card rounded-2xl border border-primary/20 p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tighter">Processando Lote de Holerites</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-primary/80">
                  {batchProgress.current} de {batchProgress.total} Concluídos
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-primary tracking-tighter">
                {Math.round((batchProgress.current / batchProgress.total) * 100)}%
              </span>
            </div>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_15px_rgba(var(--primary),0.5)]"
              style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

        <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
                  <th className="px-3 py-4 w-[40px]">
                    <Checkbox 
                      checked={payrollData.length > 0 && selectedIds.length === payrollData.length} 
                      onCheckedChange={toggleSelectAll}
                      className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </th>
                  <th className="px-3 py-4">Colaborador</th>
                  <th className="px-3 py-4">Unidade</th>
                  <th className="px-3 py-4 text-right">Salário Base</th>
                  <th className="px-3 py-4 text-center">Intercorrências</th>
                  <th className="px-3 py-4 text-right">Total Descontos</th>
                  <th className="px-3 py-4 text-right">Saldo Líquido</th>
                  {isAdmin && <th className="px-3 py-4 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {payrollData
                  .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
                  .map(p => (
                  <tr key={p.employeeId} className={cn("hover:bg-white/[0.02] transition-colors group", selectedIds.includes(p.employeeId) && "bg-primary/5")}>
                    <td className="px-3 py-3">
                      <Checkbox 
                        checked={selectedIds.includes(p.employeeId)} 
                        onCheckedChange={() => toggleSelect(p.employeeId)}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[12px] font-bold text-white group-hover:text-primary transition-colors truncate max-w-[150px] inline-block">{p.employeeName}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{p.storeName.replace('SUPER ', '')}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono-data text-[12px] text-white/80">R$ {p.salary.toLocaleString('pt-BR')}</span>
                        {existingPayrolls.find(ep => ep.employee_id === p.employeeId) && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-blue-400 hover:bg-blue-500/10"
                            onClick={() => window.open(existingPayrolls.find(ep => ep.employee_id === p.employeeId)?.pdf_url, '_blank')}
                            title="Reimprimir Holerite"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-rose-500">{p.absences}</span>
                          <span className="text-[7px] text-muted-foreground uppercase font-bold tracking-tighter">Faltas</span>
                        </div>
                        <div className="w-px h-3 bg-white/10" />
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-blue-400">{p.certificateDays}d</span>
                          <span className="text-[7px] text-muted-foreground uppercase font-bold tracking-tighter">Atest.</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono-data text-[12px] text-rose-500/80 font-medium">-R$ {p.deductions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="font-mono-data text-[13px] font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">R$ {p.netSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {(() => {
                            const result = batchResults.find(r => r.employeeId === p.employeeId) || 
                                           existingPayrolls.find(ep => ep.employee_id === p.employeeId);
                            
                            if (!result) return null;

                            const pdfUrl = (result as any).pdfUrl || (result as any).pdf_url;

                            return (
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10"
                                  onClick={() => window.open(pdfUrl, '_blank')}
                                  title="Ver Holerite"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-emerald-500 hover:bg-emerald-500/10"
                                  onClick={() => handleSendSingleWhatsApp(p, { pdfUrl })}
                                  title="Enviar por WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"
                                  onClick={() => handleSendSingleEmail(p, { pdfUrl })}
                                  title="Enviar por E-mail"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            );
                          })()}
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => handleDeleteOne(p.employeeId, p.employeeName)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {Math.ceil(payrollData.length / PAGE_SIZE) > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-muted-foreground">
              Exibindo <span className="text-white font-bold">{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, payrollData.length)}</span> de <span className="text-white font-bold">{payrollData.length}</span> colaboradores
            </p>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="h-8 px-3 text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
                ← Anterior
              </Button>
              {Array.from({ length: Math.ceil(payrollData.length / PAGE_SIZE) }, (_, i) => (
                <Button key={i} variant="ghost" size="sm" onClick={() => setCurrentPage(i)}
                  className={cn("h-8 w-8 text-[11px] font-bold rounded-lg", i === currentPage ? "bg-primary/20 text-primary border border-primary/30" : "text-white/50 hover:text-white hover:bg-white/10")}>
                  {i + 1}
                </Button>
              ))}
              <Button variant="ghost" size="sm" disabled={currentPage === Math.ceil(payrollData.length / PAGE_SIZE) - 1} onClick={() => setCurrentPage(p => p + 1)} className="h-8 px-3 text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30">
                Próxima →
              </Button>
            </div>
          </div>
        )}

      <BulkPostModal 
        open={bulkPostOpen}
        onOpenChange={setBulkPostOpen}
        selectedEmployees={dbEmployees.filter(e => (batchResults.some(r => r.employeeId === e.id) || existingPayrolls.some(ep => ep.employee_id === e.id)))}
        batchResults={[...batchResults, ...existingPayrolls.map(ep => ({ employeeId: ep.employee_id, pdfUrl: ep.pdf_url }))]}
        referenceMonth={refMonth}
        referenceYear={refYear}
      />

      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-rose-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500 font-black uppercase tracking-tighter">
              <Trash2 className="w-5 h-5" /> Relatório de Erros do Processamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-widest">
              Identificamos falhas em {batchErrors.length} colaborador(es). Verifique os detalhes abaixo para ajuste manual:
            </p>
            <div className="max-h-[400px] overflow-y-auto rounded-xl border border-white/5 bg-white/5">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[10px] font-black uppercase text-rose-400">
                    <th className="px-4 py-3">Colaborador</th>
                    <th className="px-4 py-3">Motivo da Falha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {batchErrors.map((err, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-[12px] font-bold text-white">{err.employeeName}</td>
                      <td className="px-4 py-3 text-[11px] text-rose-300 font-medium">{err.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setErrorDialogOpen(false)} className="bg-white/10 hover:bg-white/20 text-white font-bold uppercase text-[11px] rounded-xl px-8 h-10">
                Fechar e Ajustar Manualmente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
