import { RefreshCw, Smartphone, CheckCircle2, XCircle, ScanFace, HardDrive, Settings, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Device {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  model: string;
  status: string;
  last_sync: string | null;
}

interface AttendanceDevicesTabProps {
  devices: Device[];
  isLoading: boolean;
  isSyncing: string | null;
  deviceStatus: Record<string, 'online' | 'offline' | 'testing' | null>;
  isAdmin: boolean;
  onSync: (device: Device) => void;
  onTestConnection: (device: Device) => void;
  onOpenFacial: (id: string, name: string) => void;
  onEdit: (device: Device) => void;
  onDelete: (id: string, name: string) => void;
}

export function AttendanceDevicesTab({
  devices,
  isLoading,
  isSyncing,
  deviceStatus,
  isAdmin,
  onSync,
  onTestConnection,
  onOpenFacial,
  onEdit,
  onDelete,
}: AttendanceDevicesTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {devices.length === 0 && !isLoading && (
        <div className="col-span-full py-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
          <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-sm font-bold text-muted-foreground">Nenhum relógio de ponto configurado via IP</p>
        </div>
      )}

      {devices.map((device) => (
        <div
          key={device.id}
          className="glass-card rounded-2xl p-5 border border-white/5 relative overflow-hidden group"
        >
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
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono-data text-muted-foreground">
                {device.ip_address}:{device.port}
              </span>
              <span
                className={cn(
                  'text-[10px] font-bold',
                  device.model?.includes('Facial') ? 'text-indigo-400' : 'text-primary'
                )}
              >
                {device.model}
              </span>
            </div>
            {device.model?.includes('Facial') && (
              <div className="inline-flex items-center w-fit gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black tracking-widest uppercase text-indigo-400">
                <ScanFace className="w-3 h-3" /> IA de Reconhecimento Facial Ativa
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5 flex flex-wrap gap-2">
            <Button
              onClick={() => onSync(device)}
              disabled={isSyncing === device.id}
              className="flex-1 min-w-[100px] h-9 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[11px] border border-primary/20"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-2 ${isSyncing === device.id ? 'animate-spin' : ''}`}
              />
              {isSyncing === device.id ? 'Sincronizando' : 'Importar Batidas'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onTestConnection(device)}
              disabled={deviceStatus[device.id] === 'testing'}
              className={cn(
                'flex-1 min-w-[100px] h-9 font-bold text-[11px] border',
                deviceStatus[device.id] === 'online'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                  : deviceStatus[device.id] === 'offline'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                  : 'bg-white/5 border-white/5 text-muted-foreground'
              )}
            >
              {deviceStatus[device.id] === 'testing' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 mr-2" />
              )}
              {deviceStatus[device.id] === 'online'
                ? 'Hardware Online'
                : deviceStatus[device.id] === 'offline'
                ? 'Hardware Offline'
                : 'Testar Comunicação'}
            </Button>
          </div>

          {device.model?.includes('Facial') && (
            <div className="mt-2">
              <Button
                onClick={() => onOpenFacial(device.id, device.name)}
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
                  onClick={() => onEdit(device)}
                  className="h-8 w-8 text-white/40 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(device.id, device.name)}
                  className="h-8 w-8 text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {device.last_sync && (
            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              Última sync: {new Date(device.last_sync).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
