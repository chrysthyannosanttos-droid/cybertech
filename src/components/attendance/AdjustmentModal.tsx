import { useState, useEffect } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { reprocessDay } from '@/modules/time-tracking/services/syncService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEntry: any;
  user: any;
  onSuccess: () => void;
}

export function AdjustmentModal({
  open,
  onOpenChange,
  selectedEntry,
  user,
  onSuccess,
}: AdjustmentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ timestamp: '', reason: '' });
  const { toast } = useToast();

  useEffect(() => {
    if (selectedEntry) {
      setAdjustForm({
        timestamp: selectedEntry.timestamp.slice(0, 16),
        reason: '',
      });
    }
  }, [selectedEntry, open]);

  const handleUpdateEntry = async () => {
    if (!selectedEntry || !adjustForm.timestamp || !adjustForm.reason) return;
    setIsProcessing(true);

    try {
      const originalTime = selectedEntry.timestamp;
      const newTime = new Date(adjustForm.timestamp).toISOString();
      const dateStr = format(new Date(newTime), 'yyyy-MM-dd');

      // 1. Update the entry
      const { error: updError } = await supabase
        .from('time_entries')
        .update({ timestamp: newTime, status: 'SYNCED' })
        .eq('id', selectedEntry.id);
      
      if (updError) throw updError;

      // 2. Register Audit Log
      await supabase.from('time_log_adjustments').insert({
        employee_id: selectedEntry.employee_id,
        time_entry_id: selectedEntry.id,
        original_timestamp: originalTime,
        new_timestamp: newTime,
        reason: adjustForm.reason,
        approved_by: user?.name || 'Admin',
        tenant_id: (user as any)?.tenantId || (user as any)?.tenant_id
      });

      // 3. REPROCESS THE DAY
      await reprocessDay(selectedEntry.employee_id, dateStr);

      toast({ title: 'Batida Ajustada', description: 'Folha e banco de horas recalculados.' });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro no ajuste', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            disabled={isProcessing} 
            className="w-full h-11 font-black uppercase text-[12px] shadow-lg shadow-primary/20"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Salvar e Recalcular Banco
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
