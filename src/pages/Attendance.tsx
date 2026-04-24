import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Plus, History, HardDrive, RefreshCw, XCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { addAuditLog } from '@/data/mockData';
import { reprocessDay } from '@/modules/time-tracking/services/syncService';
import { AttendanceImportModal } from '@/components/attendance/AttendanceImportModal';
import { AttendanceStatementModal } from '@/components/attendance/AttendanceStatementModal';
import { DeviceFormModal } from '@/components/attendance/DeviceFormModal';
import { BulkEntryModal } from '@/components/attendance/BulkEntryModal';
import { UsbExportModal } from '@/components/attendance/UsbExportModal';
import { FacialCaptureModal } from '@/components/attendance/FacialCaptureModal';
import { AdjustmentModal } from '@/components/attendance/AdjustmentModal';
import { AttendanceDevicesTab } from '@/components/attendance/AttendanceDevicesTab';
import { AttendanceReportsTab } from '@/components/attendance/AttendanceReportsTab';
import { AttendanceHourBankTab } from '@/components/attendance/AttendanceHourBankTab';
import { AttendanceLogTab } from '@/components/attendance/AttendanceLogTab';

export default function Attendance() {
  const [devices, setDevices] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<Record<string, 'online' | 'offline' | 'testing' | null>>({});
  const [timeSheets, setTimeSheets] = useState<any[]>([]);
  const [hourBank, setHourBank] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Modals Visibility
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isUsbModalOpen, setIsUsbModalOpen] = useState(false);
  const [isFacialModalOpen, setIsFacialModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);

  // Selected Data for Modals
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [selectedStatementEmp, setSelectedStatementEmp] = useState<{ id: string; name: string } | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'superadmin';
  const tenantId = (user as any)?.tenantId || (user as any)?.tenant_id;

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      let tId = tenantId;
      if (!tId) {
        const { data } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        if (data?.id) tId = data.id;
      }

      let devicesQuery = supabase.from('attendance_devices').select('*').order('name');
      let entriesQuery = supabase.from('time_entries').select('*').order('timestamp', { ascending: false }).limit(100);
      let sheetsQuery = supabase.from('time_sheets').select('*').order('date', { ascending: false });
      let hbQuery = supabase.from('hour_bank').select('*').order('date', { ascending: false });

      if (tId && !isAdmin) {
        devicesQuery = devicesQuery.eq('tenant_id', tId);
        entriesQuery = entriesQuery.eq('tenant_id', tId);
        sheetsQuery = sheetsQuery.eq('tenant_id', tId);
        hbQuery = hbQuery.eq('tenant_id', tId);
      }

      const [{ data: devData }, { data: entData }, { data: sheetData }, { data: hbData }] = await Promise.all([
        devicesQuery,
        entriesQuery,
        sheetsQuery,
        hbQuery,
      ]);

      if (devData) setDevices(devData);
      if (entData) setEntries(entData);
      if (sheetData) setTimeSheets(sheetData);
      if (hbData) setHourBank(hbData);

      const { data: empData } = await supabase.from('employees').select('id, name, cpf, tenant_id').eq('status', 'ACTIVE').order('name');
      if (empData) setAllEmployees(empData);
    } catch (err) {
      console.error('Erro ao buscar dados do Ponto:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, isAdmin]);

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('attendance_realtime')
      .on('postgres_changes', { event: '*', table: 'attendance_devices', schema: 'public' }, () => fetchData())
      .on('postgres_changes', { event: '*', table: 'time_entries', schema: 'public' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handleSync = async (device: any) => {
    setIsSyncing(device.id);
    try {
      if (device.model?.includes('ControlID')) {
        const isLocal = device.ip_address.startsWith('192.168.') || device.ip_address.startsWith('10.') || device.ip_address.startsWith('172.');
        const fullUrl = `http://${device.ip_address}:${device.port}/load_events.fcgi`;
        const finalUrl = isLocal ? `/api-proxy?target=${encodeURIComponent(fullUrl)}` : fullUrl;

        const response = await fetch(finalUrl, {
          method: 'POST',
          body: JSON.stringify({ session: "admin" }),
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Falha na resposta do relógio.');
        
        const rawData = await response.json();
        const importedEntries = (rawData.events || []).map((ev: any) => {
          const emp = allEmployees.find(e => e.cpf?.replace(/\D/g, '') === ev.user_id.toString() || e.id === ev.user_id.toString());
          if (emp) {
            return {
              employee_id: emp.id,
              employee_name: emp.name,
              type: (ev.event === 2 || ev.event === 4) ? 'EXIT' : 'ENTRY',
              timestamp: new Date(ev.time * 1000).toISOString(),
              tenant_id: emp.tenant_id,
              device_id: device.id,
              status: 'SYNCED'
            };
          }
          return null;
        }).filter(Boolean);

        if (importedEntries.length > 0) {
          const { error } = await supabase.from('time_entries').insert(importedEntries);
          if (error) throw error;
          await supabase.from('attendance_devices').update({ last_sync: new Date().toISOString() }).eq('id', device.id);
          toast({ title: 'Sincronização Realizada', description: `Sucesso! ${importedEntries.length} batidas importadas.` });
        } else {
          toast({ title: 'Sincronização Concluída', description: 'Nenhuma batida nova encontrada.' });
        }
      } else {
        throw new Error(`Integração automática REAL para ${device.model} requer configuração de SDK. Use Importação USB.`);
      }
      fetchData();
    } catch (err: any) {
      toast({ title: 'Falha na Sincronização', description: err.message, variant: 'destructive', duration: 10000 });
    } finally {
      setIsSyncing(null);
    }
  };

  const handleTestConnection = async (device: any) => {
    setDeviceStatus(prev => ({ ...prev, [device.id]: 'testing' }));
    try {
      const isLocal = device.ip_address.startsWith('192.168.') || device.ip_address.startsWith('10.') || device.ip_address.startsWith('172.');
      const fullUrl = `http://${device.ip_address}:${device.port}/ping.fcgi`;
      const finalUrl = isLocal ? `/api-proxy?target=${encodeURIComponent(fullUrl)}` : fullUrl;

      const response = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: "admin" })
      }).catch(() => { throw new Error('Timeout'); });

      if (response.ok) {
        setDeviceStatus(prev => ({ ...prev, [device.id]: 'online' }));
        toast({ title: 'Equipamento Online!', className: "bg-emerald-500 text-white" });
      } else {
        throw new Error('No response');
      }
    } catch (err) {
      setDeviceStatus(prev => ({ ...prev, [device.id]: 'offline' }));
      toast({ title: 'Sem Comunicação', variant: 'destructive' });
    }
  };

  const handleDeleteEntry = async (id: string, empName: string, time: string) => {
    if (!isAdmin) return;
    if (!confirm(`Deseja excluir a batida de ${empName}?`)) return;
    try {
      const { error } = await supabase.from('time_entries').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Batida excluída' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
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
          <TabsTrigger value="devices" className="gap-2 text-[13px]"><HardDrive className="w-4 h-4" /> Dispositivos</TabsTrigger>
          <TabsTrigger value="sheets" className="gap-2 text-[13px]"><CheckCircle2 className="w-4 h-4" /> Relatório Diário</TabsTrigger>
          <TabsTrigger value="hour_bank" className="gap-2 text-[13px]"><Users className="w-4 h-4" /> Banco de Horas</TabsTrigger>
          <TabsTrigger value="entries" className="gap-2 text-[13px]"><History className="w-4 h-4" /> Log de Batidas</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-4 pt-2">
           <div className="flex justify-end gap-3 relative z-10">
              <Button variant="outline" className="h-10 px-6 rounded-xl border-white/10 hover:bg-white/5 font-bold text-[13px] gap-2" onClick={() => setIsBulkModalOpen(true)}>
                <History className="w-4 h-4 text-primary" /> Lançamento Massa
              </Button>
              <Button variant="outline" className="h-10 px-6 rounded-xl border-white/10 hover:bg-white/5 font-bold text-[13px] gap-2" onClick={() => setIsUsbModalOpen(true)}>
                <HardDrive className="w-4 h-4 text-emerald-400" /> Exportar p/ Pendrive (USB)
              </Button>
              <Button variant="outline" className="h-10 px-6 rounded-xl border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold text-[13px] gap-2" onClick={() => setIsImportModalOpen(true)}>
                <Sparkles className="w-4 h-4" /> Importar Batidas (IA)
              </Button>
              <Button className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/80 font-bold text-[13px] gap-2 shadow-lg shadow-primary/20" onClick={() => { setEditingDevice(null); setIsDeviceModalOpen(true); }}>
                <Plus className="w-4 h-4" /> Cadastrar Relógio
              </Button>
           </div>

           <AttendanceDevicesTab
             devices={devices}
             isLoading={isLoading}
             isSyncing={isSyncing}
             deviceStatus={deviceStatus}
             isAdmin={isAdmin}
             onSync={handleSync}
             onTestConnection={handleTestConnection}
             onOpenFacial={(id, name) => { setSelectedDeviceId(id); setIsFacialModalOpen(true); }}
             onEdit={(device) => { setEditingDevice(device); setIsDeviceModalOpen(true); }}
             onDelete={async (id, name) => { if(isAdmin && confirm(`Excluir ${name}?`)) { await supabase.from('attendance_devices').delete().eq('id', id); fetchData(); } }}
           />
        </TabsContent>

        <TabsContent value="sheets">
          <AttendanceReportsTab
            timeSheets={timeSheets}
            allEmployees={allEmployees}
            onRecalculate={async () => {
              const today = new Date().toISOString().split('T')[0];
              for (const emp of allEmployees) await reprocessDay(emp.id, today);
              fetchData();
              toast({ title: 'Cálculo Finalizado' });
            }}
            isProcessing={false}
          />
        </TabsContent>

        <TabsContent value="hour_bank">
          <AttendanceHourBankTab
            allEmployees={allEmployees}
            hourBank={hourBank}
            onOpenStatement={(id, name) => { setSelectedStatementEmp({ id, name }); setIsStatementOpen(true); }}
          />
        </TabsContent>

        <TabsContent value="entries">
          <AttendanceLogTab
            entries={entries}
            devices={devices}
            isAdmin={isAdmin}
            onEditEntry={(entry) => { setSelectedEntry(entry); setIsAdjustmentModalOpen(true); }}
            onDeleteEntry={handleDeleteEntry}
          />
        </TabsContent>
      </Tabs>

      <DeviceFormModal
        open={isDeviceModalOpen}
        onOpenChange={setIsDeviceModalOpen}
        editingDevice={editingDevice}
        tenantId={tenantId}
        onSuccess={fetchData}
      />

      <BulkEntryModal
        open={isBulkModalOpen}
        onOpenChange={setIsBulkModalOpen}
        allEmployees={allEmployees}
        tenantId={tenantId}
        onSuccess={fetchData}
      />

      <UsbExportModal
        open={isUsbModalOpen}
        onOpenChange={setIsUsbModalOpen}
        allEmployees={allEmployees}
      />

      <FacialCaptureModal
        open={isFacialModalOpen}
        onOpenChange={setIsFacialModalOpen}
        allEmployees={allEmployees}
        deviceId={selectedDeviceId}
        deviceName={devices.find(d => d.id === selectedDeviceId)?.name}
      />

      <AdjustmentModal
        open={isAdjustmentModalOpen}
        onOpenChange={setIsAdjustmentModalOpen}
        selectedEntry={selectedEntry}
        user={user}
        onSuccess={fetchData}
      />

      <AttendanceImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={fetchData}
        tenantId={tenantId}
      />

      <AttendanceStatementModal
        open={isStatementOpen}
        onOpenChange={setIsStatementOpen}
        employeeId={selectedStatementEmp?.id || null}
        employeeName={selectedStatementEmp?.name || null}
        tenantId={tenantId}
      />
    </div>
  );
}
