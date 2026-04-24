import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Device {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  model: string;
  status: string;
  tenant_id: string;
}

interface DeviceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDevice: Device | null;
  tenantId: string | null;
  onSuccess: () => void;
}

export function DeviceFormModal({
  open,
  onOpenChange,
  editingDevice,
  tenantId,
  onSuccess,
}: DeviceFormModalProps) {
  const [form, setForm] = useState({
    name: '',
    ip_address: '',
    port: 80,
    model: 'Generic ZKTeco',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (editingDevice) {
      setForm({
        name: editingDevice.name,
        ip_address: editingDevice.ip_address,
        port: editingDevice.port,
        model: editingDevice.model,
      });
    } else {
      setForm({
        name: '',
        ip_address: '',
        port: 80,
        model: 'Generic ZKTeco',
      });
    }
  }, [editingDevice, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.ip_address) return;

    try {
      if (editingDevice) {
        const { error } = await supabase
          .from('attendance_devices')
          .update(form)
          .eq('id', editingDevice.id);
        if (error) throw error;
        toast({ title: 'Relógio atualizado', description: 'As configurações foram salvas.' });
      } else {
        const { error } = await supabase.from('attendance_devices').insert([
          {
            ...form,
            tenant_id: tenantId,
            status: 'ACTIVE',
          },
        ]);
        if (error) throw error;
        toast({ title: 'Relógio cadastrado', description: 'Dispositivo vinculado com sucesso.' });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 glass-card">
        <DialogHeader>
          <DialogTitle>{editingDevice ? 'Editar Equipamento' : 'Novo Relógio IP'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Nome (Local)</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Catraca Principal"
              className="bg-white/5 border-white/10"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Endereço IP</Label>
              <Input
                value={form.ip_address}
                onChange={(e) => setForm((f) => ({ ...f, ip_address: e.target.value }))}
                placeholder="192.168.0.x"
                className="bg-white/5 border-white/10"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Porta</Label>
              <Input
                type="number"
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: Number(e.target.value) }))}
                className="bg-white/5 border-white/10"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase font-bold text-muted-foreground">Modelo</Label>
            <Select value={form.model} onValueChange={(v) => setForm((f) => ({ ...f, model: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 font-medium">
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
          <Button type="submit" className="w-full mt-2 h-10 font-bold">
            {editingDevice ? 'Salvar Alterações' : 'Salvar Dispositivo'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
