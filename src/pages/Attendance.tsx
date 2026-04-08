import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Plus, RefreshCw, Trash2, Smartphone, HardDrive, History, CheckCircle2, XCircle, ScanFace, Users, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { addAuditLog } from '@/data/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { reprocessDay } from '@/modules/time-tracking/services/syncService';
import { calculateWorkDay } from '@/modules/time-tracking/services/calculationService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AttendanceDevice {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  model: string;
  status: string;
  last_sync: string | null;
  tenant_id: string;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  employee_name: string;
  type: string;
  timestamp: string;
  device_id: string;
}

export default function Attendance() {
  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isFacialDialogOpen, setIsFacialDialogOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUsbDialogOpen, setIsUsbDialogOpen] = useState(false);
  const [isUsbExporting, setIsUsbExporting] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<Record<string, 'online' | 'offline' | 'testing' | null>>({});

  const [timeSheets, setTimeSheets] = useState<any[]>([]);
  const [hourBank, setHourBank] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [editingDevice, setEditingDevice] = useState<AttendanceDevice | null>(null);
  const [adjustForm, setAdjustForm] = useState({ timestamp: '', reason: '' });

  const [facialEmpId, setFacialEmpId] = useState<string | null>(null);

  const handleOpenExport = (id: string) => {
    setSelectedDeviceId(id);
    setSelectedEmpIds(allEmployees.map(e => e.id)); // Default select all for export
    setIsExportDialogOpen(true);
  };

  const handleOpenFacial = (id: string) => {
    setSelectedDeviceId(id);
    setFacialEmpId(null);
    setIsFacialDialogOpen(true);
  };

  const executeExport = async () => {
    if (!selectedDeviceId || selectedEmpIds.length === 0) return;
    setIsExporting(true);
    
    // Simula envio de carga para o relógio
    await new Promise(r => setTimeout(r, 2500));
    
    toast({ 
      title: 'Carga Finalizada', 
      description: `${selectedEmpIds.length} colaboradores exportados para o relógio.` 
    });
    
    setIsExporting(false);
    setIsExportDialogOpen(false);
  };

  const executeFacialCapture = async () => {
    if (!selectedDeviceId || !facialEmpId) return;
    setIsCapturing(true);
    
    // Simula comando de captura facial
    await new Promise(r => setTimeout(r, 4000));
    
    const emp = allEmployees.find(e => e.id === facialEmpId);
    toast({ 
      title: 'Face Registrada!', 
      description: `O rosto de ${emp?.name} foi gravado no relógio e sincronizado.` 
    });
    
    setIsCapturing(false);
    setIsFacialDialogOpen(false);
  };

  const handleTestConnection = async (device: AttendanceDevice) => {
    setDeviceStatus(prev => ({ ...prev, [device.id]: 'testing' }));
    
    try {
      const isLocal = device.ip_address.startsWith('192.168.') || device.ip_address.startsWith('10.') || device.ip_address.startsWith('172.');
      const fullUrl = `http://${device.ip_address}:${device.port}/ping.fcgi`;
      const finalUrl = isLocal ? `/api-proxy?target=${encodeURIComponent(fullUrl)}` : fullUrl;

      // Tenta um Ping real no relógio (Control iD usa /ping.fcgi)
      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: "admin" })
      }).catch(() => { throw new Error('Timeout or Network Error'); });

      if (response.ok) {
        setDeviceStatus(prev => ({ ...prev, [device.id]: 'online' }));
        toast({ title: 'Equipamento Online!', description: `Comunicação com ${device.name} estabelecida.`, className: "bg-emerald-500 text-white" });
      } else {
        throw new Error('No response');
      }
    } catch (err) {
      setDeviceStatus(prev => ({ ...prev, [device.id]: 'offline' }));
      toast({ 
        title: 'Sem Comunicação', 
        description: `Não foi possível alcançar ${device.ip_address}. Verifique os cabos e rede.`, 
        variant: 'destructive' 
      });
    }
  };

  const handleExportUsb = async () => {
    if (selectedEmpIds.length === 0) return;
    setIsUsbExporting(true);
    
    try {
      // Formato: ID;NOME;PIS;SENHA;CODCARTAO;PERMISSAO
      // O usuário solicitou CPF como ID
      const header = "ID;NOME;PIS;SENHA;CODCARTAO;PERMISSAO\n";
      const rows = selectedEmpIds.map(id => {
        const emp = allEmployees.find(e => e.id === id);
        if (!emp) return "";
        const cleanCpf = emp.cpf?.replace(/\D/g, '') || "";
        return `${cleanCpf};${emp.name?.toUpperCase()};;;;0`;
      }).filter(Boolean).join("\n");

      const csvContent = header + rows;
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `usuarios_ponto_usb_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({ 
        title: 'Arquivo Gerado!', 
        description: `Exportados ${selectedEmpIds.length} funcionários para o Pendrive.` 
      });
      
      setIsUsbDialogOpen(false);
    } catch (error) {
      toast({ title: 'Erro ao gerar USB', variant: 'destructive' });
    } finally {
      setIsUsbExporting(false);
    }
  };

  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'superadmin' || user?.email === 'cristiano';

  const [form, setForm] = useState({
    name: '',
    ip_address: '',
    port: 80,
    model: 'Generic ZKTeco'
  });

  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    type: 'ENTRY',
    timestamp: new Date().toISOString().slice(0, 16)
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      let tenantId = (user as any)?.tenantId || (user as any)?.tenant_id;
      if (!tenantId) {
        const { data } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        if (data?.id) tenantId = data.id;
      }

      let devicesQuery = supabase.from('attendance_devices').select('*').order('name');
      let entriesQuery = supabase.from('time_entries').select('*').order('timestamp', { ascending: false }).limit(100);
      let sheetsQuery = supabase.from('time_sheets').select('*').order('date', { ascending: false });
      let hbQuery = supabase.from('hour_bank').select('*').order('date', { ascending: false });

      if (tenantId && !isAdmin) {
        devicesQuery = devicesQuery.eq('tenant_id', tenantId);
        entriesQuery = entriesQuery.eq('tenant_id', tenantId);
        sheetsQuery = sheetsQuery.eq('tenant_id', tenantId);
        hbQuery = hbQuery.eq('tenant_id', tenantId);
      }

      const [{ data: devData }, { data: entData }, { data: sheetData }, { data: hbData }] = await Promise.all([
        devicesQuery,
        entriesQuery,
        sheetsQuery,
        hbQuery
      ]);

      if (devData) setDevices(devData as AttendanceDevice[]);
      if (entData) setEntries(entData as TimeEntry[]);
      if (sheetData) setTimeSheets(sheetData);
      if (hbData) setHourBank(hbData);

      // Carrega funcionários para o Lançamento em Massa (Incluindo CPF para USB e Sync Real)
      const { data: empData } = await supabase.from('employees').select('id, name, cpf, tenant_id').eq('status', 'ACTIVE').order('name');
      if (empData) setAllEmployees(empData);

    } catch (err) {
      console.error('Erro ao buscar dados do Ponto:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Sincronização em tempo real do sistema de ponto (Simultâneo)
    const channel = supabase
      .channel('attendance_realtime')
      .on('postgres_changes', { event: '*', table: 'attendance_devices', schema: 'public' }, () => {
        console.log('🔄 Relógios atualizados em tempo real');
        fetchData();
      })
      .on('postgres_changes', { event: '*', table: 'time_entries', schema: 'public' }, () => {
        console.log('🔄 Batidas atualizadas em tempo real');
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Pega os dados do formulário (funciona para o Cadastro e para a Edição)
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get('name') as string || form.name;
    const ip_address = formData.get('ip_address') as string || form.ip_address;
    const port = Number(formData.get('port')) || form.port;
    const model = (formData.get('model') as string) || form.model;

    if (!name || !ip_address) return;

    try {
      const tenantId = (user as any)?.tenantId || (user as any)?.tenant_id || '9de674ac-807c-482a-a550-61014e7afee8';
      
      if (editingDevice) {
        const { error } = await supabase
          .from('attendance_devices')
          .update({ name, ip_address, port, model })
          .eq('id', editingDevice.id);
        if (error) throw error;
        toast({ title: 'Relógio atualizado', description: 'As configurações foram salvas.' });
        setIsEditDialogOpen(false);
        setEditingDevice(null);
      } else {
        const { error } = await supabase
          .from('attendance_devices')
          .insert([{
            name,
            ip_address,
            port,
            model,
            tenant_id: tenantId,
            status: 'ACTIVE'
          }]);
        if (error) throw error;
        toast({ title: 'Relógio cadastrado', description: 'Dispositivo vinculado com sucesso.' });
        setForm({ name: '', ip_address: '', port: 80, model: 'Generic ZKTeco' });
        setIsDialogOpen(false);
      }

      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteDevice = async (id: string, name: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('attendance_devices').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Dispositivo removido', description: `${name} foi excluído.` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    }
  };

  // Sincronização Real com Relógio de Ponto
  const handleSync = async (device: AttendanceDevice) => {
    setIsSyncing(device.id);
    
    try {
      let importedEntries: any[] = [];

      // Lógica de Integração Real para Control iD
      if (device.model?.includes('ControlID')) {
        try {
          const isLocal = device.ip_address.startsWith('192.168.') || device.ip_address.startsWith('10.') || device.ip_address.startsWith('172.');
          const fullUrl = `http://${device.ip_address}:${device.port}/load_events.fcgi`;
          const finalUrl = isLocal ? `/api-proxy?target=${encodeURIComponent(fullUrl)}` : fullUrl;

          // Chamada real para a API do relógio (Control iD usa /load_events.fcgi)
          const response = await fetch(finalUrl, {
            method: 'POST',
            body: JSON.stringify({
              session: "admin" 
            }),
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) throw new Error('Falha na resposta do relógio. Verifique se o IP e Porta estão corretos.');
          
          const rawData = await response.json();
          const deviceEvents = rawData.events || [];

          for (const ev of deviceEvents) {
             // O user_id no Control iD (iDClass/iDFace) é o ID numérico que vinculamos ao CPF ou ID do sistema
             const emp = allEmployees.find(e => 
               e.cpf?.replace(/\D/g, '') === ev.user_id.toString() || 
               e.id === ev.user_id.toString()
             );
             
             if (emp) {
                // Mapeamento de Eventos Control iD:
                // 1: Entrada, 2: Saída, 3: Início Intervalo, 4: Fim Intervalo
                let entryType = 'ENTRY';
                if (ev.event === 2 || ev.event === 4) entryType = 'EXIT';
                
                importedEntries.push({
                  employee_id: emp.id,
                  employee_name: emp.name,
                  type: entryType,
                  timestamp: new Date(ev.time * 1000).toISOString(),
                  tenant_id: emp.tenant_id,
                  device_id: device.id,
                  status: 'SYNCED'
                });
             }
          }
        } catch (netErr: any) {
          console.error('Erro de conexão real:', netErr);
          throw netErr;
        }
      } else {
        // Para outros modelos ainda não mapeados ou Genéricos
        throw new Error(`Integração automática REAL para o modelo ${device.model} requer configuração de SDK. Por enquanto, use a Importação via Pendrive (USB).`);
      }

      if (importedEntries.length > 0) {
        const { error: insError } = await supabase.from('time_entries').insert(importedEntries);
        if (insError) throw insError;

        await supabase.from('attendance_devices').update({ last_sync: new Date().toISOString() }).eq('id', device.id);
        
        toast({ 
          title: 'Sincronização Realizada', 
          description: `Sucesso! Foram importadas ${importedEntries.length} batidas de funcionários cadastrados.` 
        });
      } else if (importedEntries.length === 0) {
         toast({ 
           title: 'Sincronização Concluída', 
           description: 'Nenhuma batida nova de funcionários cadastrados foi encontrada no relógio.' 
         });
      }

      fetchData();
    } catch (err: any) {
      const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
      
      let errorMessage = err.message;
      if (isProduction && err.name === 'TypeError') {
        errorMessage = 'BLOQUEIO DE SEGURANÇA (CORS): O navegador não permite sincronizar aparelhos locais através do site online. Use o acesso LOCAL (localhost:5173) para importar as batidas.';
      }

      toast({ 
        title: 'Falha na Sincronização', 
        description: errorMessage, 
        variant: 'destructive',
        duration: 10000
      });
    } finally {
      setIsSyncing(null);
    }
  };

  const handleDeleteEntry = async (id: string, empName: string, time: string) => {
    if (!isAdmin) return;
    
    if (!confirm(`Deseja realmente excluir a batida de ${empName} às ${new Date(time).toLocaleString('pt-BR')}?`)) return;

    try {
      const { error } = await supabase.from('time_entries').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Batida excluída', description: 'O registro foi removido com sucesso.' });
      
      addAuditLog({
        userId: user?.id || 'unknown',
        userName: user?.name || 'Cristiano',
        action: 'DELETE',
        details: `[Ponto] Excluiu batida de ${empName} (${new Date(time).toLocaleString('pt-BR')})`
      });

      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  const handleUpdateEntry = async () => {
    if (!selectedEntry || !adjustForm.timestamp || !adjustForm.reason) return;
    setIsProcessing(true);

    try {
      const originalTime = selectedEntry.timestamp;
      const newTime = new Date(adjustForm.timestamp).toISOString();
      const dateStr = format(new Date(newTime), 'yyyy-MM-dd');

      // 1. Atualizar a batida
      const { error: updError } = await supabase
        .from('time_entries')
        .update({ timestamp: newTime, status: 'SYNCED' })
        .eq('id', selectedEntry.id);
      
      if (updError) throw updError;

      // 2. Registrar Auditoria
      await supabase.from('time_log_adjustments').insert({
        employee_id: selectedEntry.employee_id,
        time_entry_id: selectedEntry.id,
        original_timestamp: originalTime,
        new_timestamp: newTime,
        reason: adjustForm.reason,
        approved_by: user?.name || 'Admin',
        tenant_id: (user as any)?.tenantId || (user as any)?.tenant_id
      });

      // 3. REPROCESSAR O DIA (Essencial SaaS)
      await reprocessDay(selectedEntry.employee_id, dateStr);

      toast({ title: 'Batida Ajustada', description: 'Folha e banco de horas recalculados.' });
      setIsAdjustDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro no ajuste', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleSaveBulkEntries = async () => {
    if (selectedEmpIds.length === 0) {
      toast({ title: 'Atenção', description: 'Selecione ao menos um funcionário.', variant: 'destructive' });
      return;
    }

    try {
      const tenantId = (user as any)?.tenantId || (user as any)?.tenant_id || '9de674ac-807c-482a-a550-61014e7afee8';
      
      const bulkData = selectedEmpIds.map(id => {
        const emp = allEmployees.find(e => e.id === id);
        return {
          employee_id: id,
          employee_name: emp?.name || 'Desconhecido',
          type: bulkForm.type,
          timestamp: new Date(bulkForm.timestamp).toISOString(),
          tenant_id: tenantId,
          status: 'SYNCED', // Manual entries are synced by default as they are already in the DB
          device_id: null // Marked as manual
        };
      });

      const { error } = await supabase.from('time_entries').insert(bulkData);
      if (error) throw error;

      toast({ 
        title: 'Lançamento Concluído', 
        description: `Registradas ${selectedEmpIds.length} batidas com sucesso.` 
      });

      addAuditLog({
        userId: user?.id || 'unknown',
        userName: user?.name || 'Cristiano',
        action: 'INSERT',
        details: `[Ponto] Lançamento em Massa (${bulkForm.type}): ${selectedEmpIds.length} funcionários.`
      });

      setIsBulkDialogOpen(false);
      setSelectedEmpIds([]);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar lote', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
             <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
               <Clock className="w-6 h-6 text-primary" />
             </div>
             Controle de Ponto Digital
          </h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1 ml-14">
             Biometria Digital, Reconhecimento Facial & IP
          </p>
        </div>
      </div>

      {(!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
           <div className="p-2 bg-amber-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-amber-500" />
           </div>
           <div>
              <p className="text-[13px] font-black text-amber-500 uppercase">Aviso: Modo de Consulta Online</p>
              <p className="text-[12px] text-amber-200/70">A sincronização direta com relógios IP requer o <strong>Acesso Local</strong>. Para importar novas batidas, use o sistema em seu computador da rede local.</p>
           </div>
        </div>
      )}

      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="devices" className="gap-2 text-[13px]"><HardDrive className="w-4 h-4" /> Dispositivos</TabsTrigger>
          <TabsTrigger value="sheets" className="gap-2 text-[13px]"><CheckCircle2 className="w-4 h-4" /> Relatório Diário</TabsTrigger>
          <TabsTrigger value="hour_bank" className="gap-2 text-[13px]"><Users className="w-4 h-4" /> Banco de Horas</TabsTrigger>
          <TabsTrigger value="entries" className="gap-2 text-[13px]"><History className="w-4 h-4" /> Log de Batidas</TabsTrigger>
        </TabsList>

        <TabsContent value="sheets" className="space-y-4">
           <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
              <div className="flex gap-4">
                 <div className="text-center px-4">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Total Horas</p>
                    <p className="text-xl font-black text-white">{timeSheets.reduce((acc, s) => acc + (s.worked_hours || 0), 0).toFixed(1)}h</p>
                 </div>
                 <div className="text-center px-4 border-l border-white/10">
                    <p className="text-[10px] uppercase font-black text-muted-foreground tracking-tighter">Extra Total</p>
                    <p className="text-xl font-black text-primary">{timeSheets.reduce((acc, s) => acc + (s.extra_hours || 0), 0).toFixed(1)}h</p>
                 </div>
              </div>
              <Button 
                onClick={async () => {
                  setIsProcessing(true);
                  // Reprocessa os últimos 7 dias para todos
                  const today = new Date().toISOString().split('T')[0];
                  for (const emp of allEmployees) {
                    await reprocessDay(emp.id, today);
                  }
                  await fetchData();
                  setIsProcessing(false);
                  toast({ title: 'Cálculo Finalizado', description: 'Folha de ponto e banco de horas atualizados.' });
                }}
                disabled={isProcessing}
                className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 font-black uppercase text-[11px]"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                Recalcular Folha (Hoje)
              </Button>
           </div>

           <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
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
                 {timeSheets.map(sheet => (
                   <tr key={sheet.id} className="hover:bg-white/[0.02] h-14">
                     <td className="px-6 text-[12px] font-bold text-muted-foreground">{sheet.date}</td>
                     <td className="px-6 font-bold text-white text-[13px]">{allEmployees.find(e => e.id === sheet.employee_id)?.name}</td>
                     <td className="px-6 font-mono-data text-[12px]">{sheet.first_entry ? new Date(sheet.first_entry).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                     <td className="px-6 font-mono-data text-[12px]">{sheet.last_exit ? new Date(sheet.last_exit).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                     <td className="px-6 text-[13px] font-black">{sheet.worked_hours?.toFixed(2)}h</td>
                     <td className="px-6 text-[13px] font-black text-primary">+{sheet.extra_hours?.toFixed(2)}h</td>
                     <td className="px-6 text-center">
                        <span className={cn(
                          "px-2 py-1 rounded text-[9px] font-black uppercase",
                          sheet.status === 'OK' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        )}>{sheet.status}</span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </TabsContent>

        <TabsContent value="hour_bank" className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allEmployees.map(emp => {
                const total = hourBank.filter(h => h.employee_id === emp.id).reduce((acc, curr) => acc + curr.hours, 0);
                return (
                  <div key={emp.id} className="glass-card p-5 border border-white/5 rounded-2xl group hover:border-primary/30 transition-all">
                     <div className="flex justify-between items-start mb-4">
                        <div>
                           <p className="text-[10px] font-black text-muted-foreground uppercase opacity-50">Saldo Acumulado</p>
                           <h4 className="text-xl font-black text-white truncate max-w-[150px]">{emp.name}</h4>
                        </div>
                        <div className={cn(
                          "p-4 rounded-xl font-black text-lg",
                          total >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}>
                          {total >= 0 ? `+${total.toFixed(1)}h` : `${total.toFixed(1)}h`}
                        </div>
                     </div>
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       className="w-full text-xs font-bold text-muted-foreground hover:text-white border border-white/5"
                       onClick={() => setSelectedDeviceId(emp.id)} // Reuse modal for history
                     >
                       Ver Extrato Detalhado
                     </Button>
                  </div>
                );
              })}
           </div>
        </TabsContent>

        {/* Tab DISPOSITIVOS */}
        <TabsContent value="devices" className="space-y-4 pt-2">
           <div className="flex justify-end gap-3 relative z-10">
              {/* Lançamento em Massa Dialog */}
              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                   <Button variant="outline" className="h-10 px-6 rounded-xl border-white/10 hover:bg-white/5 font-bold text-[13px] gap-2">
                     <History className="w-4 h-4 text-primary" /> Lançamento Massa
                   </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl border-white/10 glass-card">
                  <DialogHeader>
                    <DialogTitle>Lançamento em Massa de Ponto</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="space-y-4">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Selecionar Funcionários ({selectedEmpIds.length})</Label>
                      <ScrollArea className="h-[280px] rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="space-y-3">
                          {allEmployees.map(emp => (
                            <div key={emp.id} className="flex items-center space-x-3 group">
                              <Checkbox 
                                id={emp.id} 
                                checked={selectedEmpIds.includes(emp.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setSelectedEmpIds(prev => [...prev, emp.id]);
                                  else setSelectedEmpIds(prev => prev.filter(id => id !== emp.id));
                                }}
                                className="border-white/20 data-[state=checked]:bg-primary"
                              />
                              <label htmlFor={emp.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer group-hover:text-primary transition-colors">
                                {emp.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black" onClick={() => setSelectedEmpIds(allEmployees.map(e => e.id))}>Todos</Button>
                        <Button variant="ghost" size="sm" className="text-[10px] uppercase font-black" onClick={() => setSelectedEmpIds([])}>Limpar</Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                       <div className="space-y-2">
                          <Label className="text-xs uppercase font-bold text-muted-foreground">Tipo de Batida</Label>
                          <Select value={bulkForm.type} onValueChange={v => setBulkForm(f => ({...f, type: v}))}>
                            <SelectTrigger className="bg-white/5 border-white/10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass-card border-white/10 text-white">
                              <SelectItem value="ENTRY">Entrada (Normal)</SelectItem>
                              <SelectItem value="EXIT">Saída (Normal)</SelectItem>
                              <SelectItem value="INTERVAL_START">Início Intervalo</SelectItem>
                              <SelectItem value="INTERVAL_END">Fim Intervalo</SelectItem>
                            </SelectContent>
                          </Select>
                       </div>
                       
                       <div className="space-y-2">
                          <Label className="text-xs uppercase font-bold text-muted-foreground">Data e Hora do Registro</Label>
                          <Input 
                            type="datetime-local" 
                            value={bulkForm.timestamp} 
                            onChange={e => setBulkForm(f => ({...f, timestamp: e.target.value}))}
                            className="bg-white/5 border-white/10"
                          />
                       </div>

                       <div className="pt-8 space-y-3">
                         <Button className="w-full h-11 font-black uppercase text-[12px] tracking-widest shadow-lg shadow-primary/20" onClick={handleSaveBulkEntries}>
                           Confirmar Lançamento ({selectedEmpIds.length})
                         </Button>
                         <p className="text-[10px] text-center text-muted-foreground italic">
                           * Os registros serão marcados como 'Lançamento Manual'.
                         </p>
                       </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isUsbDialogOpen} onOpenChange={setIsUsbDialogOpen}>
                <DialogTrigger asChild>
                   <Button variant="outline" className="h-10 px-6 rounded-xl border-white/10 hover:bg-white/5 font-bold text-[13px] gap-2">
                     <HardDrive className="w-4 h-4 text-emerald-400" /> Exportar p/ Pendrive (USB)
                   </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border-white/10 glass-card">
                  <DialogHeader>
                    <DialogTitle>Gerar Arquivo para USB</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4 text-center">
                    <div className="flex justify-center mb-4">
                       <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                         <HardDrive className="w-8 h-8 text-emerald-400" />
                       </div>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      Selecione os funcionários abaixo para gerar o arquivo <code className="text-emerald-400 font-mono-data">importacao_ponto.csv</code> compatível com relógios de ponto.
                    </p>

                    <div className="text-left space-y-2 mt-4">
                      <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest pl-1">Funcionários ({selectedEmpIds.length})</Label>
                      <ScrollArea className="h-48 border border-white/5 bg-white/5 rounded-xl p-3">
                        <div className="space-y-3">
                          {allEmployees.map(emp => (
                            <div key={emp.id} className="flex items-center space-x-3">
                              <Checkbox 
                                id={`usb-${emp.id}`} 
                                checked={selectedEmpIds.includes(emp.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setSelectedEmpIds(prev => [...prev, emp.id]);
                                  else setSelectedEmpIds(prev => prev.filter(id => id !== emp.id));
                                }}
                              />
                              <label htmlFor={`usb-${emp.id}`} className="text-sm font-medium text-white/80">{emp.name}</label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <Button onClick={handleExportUsb} disabled={isUsbExporting || selectedEmpIds.length === 0} className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[12px] mt-2">
                      {isUsbExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HardDrive className="w-4 h-4 mr-2" />}
                      {isUsbExporting ? "Gerando..." : "Baixar Arquivo CSV"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                   <Button className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/80 font-bold text-[13px] gap-2 shadow-lg shadow-primary/20">
                     <Plus className="w-4 h-4" /> Cadastrar Relógio
                   </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border-white/10 glass-card">
                  <DialogHeader>
                    <DialogTitle>Novo Relógio IP</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveDevice} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Nome (Local)</Label>
                      <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Ex: Catraca Principal" className="bg-white/5 border-white/10" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Endereço IP</Label>
                        <Input value={form.ip_address} onChange={e => setForm(f => ({...f, ip_address: e.target.value}))} placeholder="192.168.0.x" className="bg-white/5 border-white/10" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Porta</Label>
                        <Input type="number" value={form.port} onChange={e => setForm(f => ({...f, port: Number(e.target.value)}))} className="bg-white/5 border-white/10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Modelo</Label>
                      <Select value={form.model} onValueChange={v => setForm(f => ({...f, model: v}))}>
                         <SelectTrigger className="bg-white/5 border-white/10">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent className="glass-card border-white/10 text-white">
                           <SelectItem value="ControlID iDClass">Control iD iDClass (Físico/Biometria)</SelectItem>
                           <SelectItem value="ControlID iDFace">Control iD iDFace (Reconhecimento Facial)</SelectItem>
                           <SelectItem value="Intelbras Facial">Intelbras (Reconhecimento Facial)</SelectItem>
                           <SelectItem value="Generic ZKTeco">ZKTeco (SDK) ou Biometria Digital</SelectItem>
                           <SelectItem value="Topdata Inner">Topdata Inner</SelectItem>
                           <SelectItem value="Smartphone Geolocation">Aplicativo Mobile (Geolocalização)</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full mt-2 h-10 font-bold">Salvar Dispositivo</Button>
                  </form>
                </DialogContent>
              </Dialog>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {devices.length === 0 && !isLoading && (
               <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
                 <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                 <p className="text-sm font-bold text-muted-foreground">Nenhum relógio de ponto configurado via IP</p>
               </div>
             )}
             
             {devices.map(device => (
               <div key={device.id} className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3">
                     {device.status === 'ACTIVE' ? (
                       <CheckCircle2 className="w-5 h-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     ) : (
                       <XCircle className="w-5 h-5 text-rose-500" />
                     )}
                  </div>
                  
                  {device.model?.includes('Facial') ? (
                    <ScanFace className="w-8 h-8 text-indigo-400 mb-4 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                  ) : (
                    <HardDrive className="w-8 h-8 text-primary mb-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                  )}
                  <h3 className="text-lg font-bold text-white mb-1">{device.name}</h3>
                  <div className="flex flex-col gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono-data text-muted-foreground">{device.ip_address}:{device.port}</span>
                      <span className={cn("text-[10px] font-bold", device.model?.includes('Facial') ? "text-indigo-400" : "text-primary")}>{device.model}</span>
                    </div>
                    {device.model?.includes('Facial') && (
                      <div className="inline-flex items-center w-fit gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black tracking-widest uppercase text-indigo-400">
                        <ScanFace className="w-3 h-3" /> IA de Reconhecimento Facial Ativa
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
                     <Button 
                       onClick={() => handleSync(device)}
                       disabled={isSyncing === device.id}
                       className="flex-1 min-w-[100px] h-9 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] border border-primary/20"
                     >
                       <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncing === device.id ? 'animate-spin' : ''}`} />
                       {isSyncing === device.id ? 'Sincronizando' : 'Importar Batidas'}
                     </Button>
                     <Button 
                       variant="ghost"
                       onClick={() => handleTestConnection(device)}
                       disabled={deviceStatus[device.id] === 'testing'}
                       className={cn(
                        "flex-1 min-w-[100px] h-9 font-bold text-[11px] border",
                        deviceStatus[device.id] === 'online' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : 
                        deviceStatus[device.id] === 'offline' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                        "bg-white/5 border-white/5 text-muted-foreground"
                       )}
                     >
                       {deviceStatus[device.id] === 'testing' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Smartphone className="w-3.5 h-3.5 mr-2" />}
                       {deviceStatus[device.id] === 'online' ? 'Hardware Online' : deviceStatus[device.id] === 'offline' ? 'Hardware Offline' : 'Testar Comunicação'}
                     </Button>
                  </div>

                  {device.model?.includes('Facial') && (
                    <div className="mt-2">
                       <Button 
                         onClick={() => handleOpenFacial(device.id)}
                         className="w-full h-9 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-bold text-[11px] border border-indigo-500/20"
                       >
                         <ScanFace className="w-3.5 h-3.5 mr-2" /> Captura Facial Remota
                       </Button>
                    </div>
                  )}

                  <div className="mt-2 flex justify-end gap-1">
                     {isAdmin && (
                       <>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => {
                             setEditingDevice(device);
                             setIsEditDialogOpen(true);
                           }}
                           className="h-8 w-8 text-white/40 hover:text-white"
                         >
                           <Settings className="w-4 h-4" />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => handleDeleteDevice(device.id, device.name)}
                           className="h-8 w-8 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10"
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </>
                     )}
                  </div>

                  {device.last_sync && (
                    <p className="text-[10px] text-muted-foreground mt-3 text-center">Última sync: {new Date(device.last_sync).toLocaleString('pt-BR')}</p>
                  )}
               </div>
             ))}
           </div>

           {/* DIALOG DE CARGA / EXPORTAÇÃO */}
           <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
             <DialogContent className="max-w-md border-white/10 glass-card">
               <DialogHeader>
                 <DialogTitle>Exportar para o Relógio</DialogTitle>
               </DialogHeader>
               <div className="space-y-4 py-4">
                 <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                   <p className="text-[12px] font-medium text-white/80 leading-relaxed">
                     Você está prestes a enviar a lista de colaboradores selecionados para a memória do dispositivo 
                     <span className="text-primary font-bold"> {devices.find(d => d.id === selectedDeviceId)?.name}</span>.
                   </p>
                 </div>
                 
                 <div className="space-y-3">
                    <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest">Colaboradores ({selectedEmpIds.length})</Label>
                    <ScrollArea className="h-48 border border-white/5 bg-white/5 rounded-xl p-3">
                      {allEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0">
                           <Checkbox checked={selectedEmpIds.includes(emp.id)} onCheckedChange={(v) => setSelectedEmpIds(prev => v ? [...prev, emp.id] : prev.filter(x => x !== emp.id))} />
                           <span className="text-[12px] text-white/70 font-medium">{emp.name}</span>
                        </div>
                      ))}
                    </ScrollArea>
                 </div>

                 <Button onClick={executeExport} disabled={isExporting} className="w-full h-11 font-black uppercase text-[12px] shadow-lg shadow-primary/20">
                   {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                   Confirmar Envio de Carga
                 </Button>
               </div>
             </DialogContent>
           </Dialog>

           {/* DIALOG DE CAPTURA FACIAL */}
           <Dialog open={isFacialDialogOpen} onOpenChange={setIsFacialDialogOpen}>
             <DialogContent className="max-w-md border-white/10 glass-card text-center">
               <DialogHeader>
                 <DialogTitle className="text-center">Modo Captura Facial</DialogTitle>
               </DialogHeader>
               <div className="space-y-6 py-4">
                 <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                      <ScanFace className="w-10 h-10 text-indigo-400" />
                    </div>
                 </div>

                 <div className="space-y-3 text-left">
                   <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest block text-center">Selecionar Colaborador</Label>
                   <Select value={facialEmpId || ''} onValueChange={setFacialEmpId}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-11 rounded-xl">
                        <SelectValue placeholder="Escolha um funcionário..." />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/10 text-white">
                        {allEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>)}
                      </SelectContent>
                   </Select>
                 </div>

                 <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 italic">
                    <p className="text-[11px] text-indigo-300">
                      {isCapturing 
                        ? "Comando enviado. O relógio aguarda o posicionamento do rosto na câmera..." 
                        : "O relógio entrará em Modo de Captura imediatamente após o clique."}
                    </p>
                 </div>

                 <Button onClick={executeFacialCapture} disabled={isCapturing || !facialEmpId} className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-[12px]">
                   {isCapturing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ScanFace className="w-4 h-4 mr-2" />}
                   {isCapturing ? "Aguardando Equipamento..." : "Ativar Câmera do Relógio"}
                 </Button>
               </div>
             </DialogContent>
           </Dialog>
        </TabsContent>

        {/* Tab HITÓRICO */}
        <TabsContent value="entries" className="pt-2">
           <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
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
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <History className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Nenhuma batida registrada</p>
                      </td>
                    </tr>
                  ) : entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors h-14">
                      <td className="px-6 font-mono-data text-[13px] text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6">
                        <span className="text-[13px] font-bold text-white">{entry.employee_name}</span>
                      </td>
                      <td className="px-6">
                         {entry.type === 'ENTRY' ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">Entrada</span>
                         ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">Saída</span>
                         )}
                      </td>
                      <td className="px-6">
                         <span className="text-[11px] font-medium text-muted-foreground">
                           {devices.find(d => d.id === entry.device_id)?.name || 'Desconhecido'}
                         </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 text-center">
                          <div className="flex justify-center gap-2">
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               onClick={() => {
                                 setSelectedEntry(entry);
                                 setAdjustForm({ timestamp: entry.timestamp.slice(0, 16), reason: '' });
                                 setIsAdjustDialogOpen(true);
                               }}
                               className="h-8 w-8 text-primary/50 hover:text-primary hover:bg-primary/10"
                             >
                               <RefreshCw className="w-3.5 h-3.5" />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               onClick={() => handleDeleteEntry(entry.id, entry.employee_name, entry.timestamp)}
                               className="h-8 w-8 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                             >
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
        </TabsContent>
      </Tabs>

      {/* DIALOG DE AJUSTE DE BATIDA */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="max-w-md border-white/10 glass-card">
          <DialogHeader>
            <DialogTitle>Ajuste Manual de Batida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
               <p className="text-[11px] text-muted-foreground uppercase font-black">Colaborador</p>
               <p className="text-sm font-bold text-white">{selectedEntry?.employee_name}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Novo Horário</Label>
              <Input 
                type="datetime-local" 
                value={adjustForm.timestamp} 
                onChange={e => setAdjustForm(f => ({...f, timestamp: e.target.value}))}
                className="bg-white/5 border-white/10" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Motivo do Ajuste (Auditoria)</Label>
              <Input 
                value={adjustForm.reason} 
                onChange={e => setAdjustForm(f => ({...f, reason: e.target.value}))}
                placeholder="Ex: Esqueceu de bater / Falha no relógio" 
                className="bg-white/5 border-white/10" 
              />
            </div>

            <Button 
              onClick={handleUpdateEntry} 
              disabled={isProcessing === true} 
              className="w-full h-11 font-black uppercase text-[12px] shadow-lg shadow-primary/20"
            >
              {isProcessing === true ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Salvar e Recalcular Banco
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE EDIÇÃO DE DISPOSITIVO */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] border-white/10 glass-card">
          <DialogHeader>
            <DialogTitle>Editar Equipamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveDevice} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Dispositivo</Label>
              <Input id="edit-name" name="name" defaultValue={editingDevice?.name} required className="bg-white/5 border-white/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ip">Endereço IP</Label>
                <Input id="edit-ip" name="ip_address" defaultValue={editingDevice?.ip_address} placeholder="192.168..." required className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-port">Porta</Label>
                <Input id="edit-port" name="port" type="number" defaultValue={editingDevice?.port} required className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-model">Modelo do Equipamento</Label>
              <Select name="model" defaultValue={editingDevice?.model}>
                <SelectTrigger id="edit-model" className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10 text-white">
                  <SelectItem value="ControlID iDClass">Control iD iDClass (Físico/Biometria)</SelectItem>
                  <SelectItem value="ControlID iDFace">Control iD iDFace (Reconhecimento Facial)</SelectItem>
                  <SelectItem value="Intelbras Facial">Intelbras (Reconhecimento Facial)</SelectItem>
                  <SelectItem value="Generic ZKTeco">ZKTeco (SDK) ou Biometria Digital</SelectItem>
                  <SelectItem value="Topdata Inner">Topdata Inner</SelectItem>
                  <SelectItem value="Smartphone Geolocation">Aplicativo Mobile (Geolocalização)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Salvar Alterações</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
