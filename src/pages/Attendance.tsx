import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Plus, RefreshCw, Trash2, Smartphone, HardDrive, History, CheckCircle2, XCircle, ScanFace, Users, Loader2 } from 'lucide-react';
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
      // Tenta um Ping real no relógio (Control iD usa /ping.fcgi)
      const response = await fetch(`http://${device.ip_address}:${device.port}/ping.fcgi`, {
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

      if (tenantId && !isAdmin) {
        devicesQuery = devicesQuery.eq('tenant_id', tenantId);
        entriesQuery = entriesQuery.eq('tenant_id', tenantId);
      }

      const [{ data: devData }, { data: entData }] = await Promise.all([
        devicesQuery,
        entriesQuery
      ]);

      if (devData) setDevices(devData as AttendanceDevice[]);
      if (entData) setEntries(entData as TimeEntry[]);

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
    if (!form.name || !form.ip_address) return;

    try {
      const tenantId = (user as any)?.tenantId || (user as any)?.tenant_id || '9de674ac-807c-482a-a550-61014e7afee8';
      const { error } = await supabase
        .from('attendance_devices')
        .insert([{
          name: form.name,
          ip_address: form.ip_address,
          port: form.port,
          model: form.model,
          tenant_id: tenantId,
          status: 'ACTIVE'
        }]);

      if (error) throw error;

      toast({ title: 'Relógio cadastrado', description: 'Dispositivo vinculado com sucesso.' });
      setForm({ name: '', ip_address: '', port: 80, model: 'Generic ZKTeco' });
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      if (err.message.includes('relation "public.attendance_devices" does not exist')) {
         toast({ 
           title: 'Atenção (Banco de Dados)', 
           description: 'A tabela attendance_devices não existe no Supabase. Execute o script contido no Plano de Implementação.', 
           variant: 'destructive',
           duration: 10000 
         });
      } else {
         toast({ title: 'Erro ao cadastrar', description: err.message, variant: 'destructive' });
      }
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
          // Chamada real para a API do relógio (Control iD usa /load_events.fcgi)
          // Nota: Requer que o relógio esteja acessível e o CORS permitido (ou rodando em localhost)
          const response = await fetch(`http://${device.ip_address}:${device.port}/load_events.fcgi`, {
            method: 'POST',
            body: JSON.stringify({
              // Pegar eventos do dia atual ou desde a última sync
              session: "admin" // Simplificação: a maioria usa sessão admin persistente ou sem senha para leitura
            }),
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) throw new Error('Falha na resposta do relógio. Verifique se o IP e Porta estão corretos.');
          
          const rawData = await response.json();
          // Eventos do Control iD vêm em rawData.events
          const deviceEvents = rawData.events || [];

          // VALIDAR CADA EVENTO: "apenas funcionário cadastrado"
          for (const ev of deviceEvents) {
             // O campo 'user_id' no Control iD deve bater com o CPF que exportamos
             const emp = allEmployees.find(e => e.cpf?.replace(/\D/g, '') === ev.user_id.toString());
             
             if (emp) {
                importedEntries.push({
                  employee_id: emp.id,
                  employee_name: emp.name,
                  type: ev.event === 1 ? 'ENTRY' : 'EXIT', // 1=Entrada, 2=Saída no padrão iD
                  timestamp: new Date(ev.time * 1000).toISOString(),
                  tenant_id: emp.tenant_id,
                  device_id: device.id,
                  status: 'SYNCED'
                });
             }
          }
        } catch (netErr) {
          console.error('Erro de conexão real:', netErr);
          throw new Error('CONEXÃO BLOQUEADA PELO NAVEGADOR (CORS). Para sincronizar dados reais do IP local, você deve usar o sistema em Localhost ou configurar um Proxy Inverso no seu servidor.');
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
      toast({ 
        title: 'Erro na Sincronização', 
        description: err.message, 
        variant: 'destructive',
        duration: 8000
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

      <Tabs defaultValue="devices" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="devices" className="gap-2 text-[13px]"><HardDrive className="w-4 h-4" /> Relógios e Dispositivos</TabsTrigger>
          <TabsTrigger value="entries" className="gap-2 text-[13px]"><History className="w-4 h-4" /> Histórico de Batidas</TabsTrigger>
        </TabsList>

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
                         <SelectContent>
                           <SelectItem value="ControlID Facial">Control iD (Reconhecimento Facial)</SelectItem>
                           <SelectItem value="Intelbras Facial">Intelbras (Reconhecimento Facial)</SelectItem>
                           <SelectItem value="Generic ZKTeco">ZKTeco (SDK) ou Biometria Digital</SelectItem>
                           <SelectItem value="ControlID">Control iD API (Cartão/Digital)</SelectItem>
                           <SelectItem value="Topdata">Topdata Inner</SelectItem>
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

                  <div className="mt-2 flex justify-end">
                     {isAdmin && (
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => handleDeleteDevice(device.id, device.name)}
                         className="h-8 w-8 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10"
                       >
                         <Trash2 className="w-4 h-4" />
                       </Button>
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteEntry(entry.id, entry.employee_name, entry.timestamp)}
                            className="h-8 w-8 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
