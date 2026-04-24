import { useState } from 'react';
import { History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { addAuditLog } from '@/data/mockData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BulkEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: any[];
  tenantId: string | null;
  onSuccess: () => void;
}

export function BulkEntryModal({
  open,
  onOpenChange,
  allEmployees,
  tenantId,
  onSuccess,
}: BulkEntryModalProps) {
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [bulkForm, setBulkForm] = useState({
    type: 'ENTRY',
    timestamp: new Date().toISOString().slice(0, 16),
  });
  const { toast } = useToast();

  const handleSave = async () => {
    if (selectedEmpIds.length === 0) {
      toast({ title: 'Atenção', description: 'Selecione ao menos um funcionário.', variant: 'destructive' });
      return;
    }

    try {
      const bulkData = selectedEmpIds.map((id) => {
        const emp = allEmployees.find((e) => e.id === id);
        return {
          employee_id: id,
          employee_name: emp?.name || 'Desconhecido',
          type: bulkForm.type,
          timestamp: new Date(bulkForm.timestamp).toISOString(),
          tenant_id: tenantId,
          status: 'SYNCED',
          device_id: null,
        };
      });

      const { error } = await supabase.from('time_entries').insert(bulkData);
      if (error) throw error;

      toast({
        title: 'Lançamento Concluído',
        description: `Registradas ${selectedEmpIds.length} batidas com sucesso.`,
      });

      addAuditLog({
        userId: 'admin', // Idealmente viria do authHook
        userName: 'Admin',
        action: 'INSERT',
        details: `[Ponto] Lançamento em Massa (${bulkForm.type}): ${selectedEmpIds.length} funcionários.`,
      });

      setSelectedEmpIds([]);
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro ao salvar lote', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/10 glass-card">
        <DialogHeader>
          <DialogTitle>Lançamento em Massa de Ponto</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <Label className="text-xs uppercase font-bold text-muted-foreground">
              Selecionar Funcionários ({selectedEmpIds.length})
            </Label>
            <ScrollArea className="h-[280px] rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="space-y-3">
                {allEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center space-x-3 group">
                    <Checkbox
                      id={`bulk-${emp.id}`}
                      checked={selectedEmpIds.includes(emp.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedEmpIds((prev) => [...prev, emp.id]);
                        else setSelectedEmpIds((prev) => prev.filter((id) => id !== emp.id));
                      }}
                      className="border-white/20 data-[state=checked]:bg-primary"
                    />
                    <label
                      htmlFor={`bulk-${emp.id}`}
                      className="text-sm font-medium leading-none cursor-pointer group-hover:text-primary transition-colors"
                    >
                      {emp.name}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] uppercase font-black"
                onClick={() => setSelectedEmpIds(allEmployees.map((e) => e.id))}
              >
                Todos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] uppercase font-black"
                onClick={() => setSelectedEmpIds([])}
              >
                Limpar
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase font-bold text-muted-foreground">Tipo de Batida</Label>
              <Select
                value={bulkForm.type}
                onValueChange={(v) => setBulkForm((f) => ({ ...f, type: v }))}
              >
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
              <Label className="text-xs uppercase font-bold text-muted-foreground">
                Data e Hora do Registro
              </Label>
              <Input
                type="datetime-local"
                value={bulkForm.timestamp}
                onChange={(e) => setBulkForm((f) => ({ ...f, timestamp: e.target.value }))}
                className="bg-white/5 border-white/10"
              />
            </div>

            <div className="pt-8 space-y-3">
              <Button
                className="w-full h-11 font-black uppercase text-[12px] tracking-widest shadow-lg shadow-primary/20"
                onClick={handleSave}
              >
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
  );
}
