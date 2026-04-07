import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Plus, RefreshCw, Trash2, Smartphone, HardDrive, History, CheckCircle2, XCircle, ScanFace } from 'lucide-react';
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

      // Carrega funcionários para o Lançamento em Massa
      const { data: empData } = await supabase.from('employees').select('id, name').eq('status', 'ACTIVE').order('name');
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

  // Mock de sincronização
  const handleSync = async (device: AttendanceDevice) => {
    setIsSyncing(device.id);
    
    // Simula tempo de latência e busca na rede local
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      // Cria registros MOCKADOS para simular a resposta do relógio
      const { data: emps } = await supabase.from('employees').select('id, name, tenant_id').eq('status', 'ACTIVE').limit(3);
      
      if (!emps || emps.length === 0) throw new Error('Nenhum funcionário ativo para mockar catraca');

      const mockEntries = emps.map(emp => ({
        employee_id: emp.id,
        employee_name: emp.name,
        type: Math.random() > 0.5 ? 'ENTRY' : 'EXIT',
        timestamp: new Date().toISOString(),
        tenant_id: emp.tenant_id,
        device_id: device.id,
        status: 'SYNCED'
      }));

      const { error: insError } = await supabase.from('time_entries').insert(mockEntries);
      if (insError) throw insError;

      // Update sync time
      await supabase.from('attendance_devices').update({ last_sync: new Date().toISOString() }).eq('id', device.id);

      toast({ 
        title: 'Sincronização Concluída', 
        description: `Importados ${mockEntries.length} registros de '${device.name}' (MOCK).` 
      });

      fetchData();
    } catch (err: any) {
      toast({ 
        title: 'Falha na Sincronização', 
        description: `Não foi possível conectar a ${device.ip_address}: ${err.message}`, 
        variant: 'destructive' 
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
                     <History className="w-4 h-4 text-primary" /> Lançamento em Massa
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

                  <div className="pt-4 border-t border-white/5 flex gap-2">
                     <Button 
                       onClick={() => handleSync(device)}
                       disabled={isSyncing === device.id}
                       className="flex-1 h-9 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[12px] border border-primary/20"
                     >
                       <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSyncing === device.id ? 'animate-spin' : ''}`} />
                       {isSyncing === device.id ? 'Conectando...' : 'Sincronizar (Mock)'}
                     </Button>
                     {isAdmin && (
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => handleDeleteDevice(device.id, device.name)}
                         className="h-9 w-9 text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
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
