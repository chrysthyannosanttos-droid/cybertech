import { useState } from 'react';
import { HardDrive, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UsbExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: any[];
}

export function UsbExportModal({
  open,
  onOpenChange,
  allEmployees,
}: UsbExportModalProps) {
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExportUsb = async () => {
    if (selectedEmpIds.length === 0) return;
    setIsExporting(true);

    try {
      // Header format for Control iD/ZKTeco generic
      const header = "ID;NOME;PIS;SENHA;CODCARTAO;PERMISSAO\n";
      const rows = selectedEmpIds
        .map((id) => {
          const emp = allEmployees.find((e) => e.id === id);
          if (!emp) return "";
          const cleanCpf = emp.cpf?.replace(/\D/g, '') || "";
          return `${cleanCpf};${emp.name?.toUpperCase()};;;;0`;
        })
        .filter(Boolean)
        .join("\n");

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
        description: `Exportados ${selectedEmpIds.length} funcionários para o Pendrive.`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Erro ao gerar USB', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            Selecione os funcionários abaixo para gerar o arquivo{' '}
            <code className="text-emerald-400 font-mono-data">importacao_ponto.csv</code> compatível
            com relógios de ponto.
          </p>

          <div className="text-left space-y-2 mt-4">
            <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest pl-1">
              Funcionários ({selectedEmpIds.length})
            </Label>
            <ScrollArea className="h-48 border border-white/5 bg-white/5 rounded-xl p-3">
              <div className="space-y-3">
                {allEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={`usb-${emp.id}`}
                      checked={selectedEmpIds.includes(emp.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedEmpIds((prev) => [...prev, emp.id]);
                        else setSelectedEmpIds((prev) => prev.filter((id) => id !== emp.id));
                      }}
                    />
                    <label htmlFor={`usb-${emp.id}`} className="text-sm font-medium text-white/80 cursor-pointer">
                      {emp.name}
                    </label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Button
            onClick={handleExportUsb}
            disabled={isExporting || selectedEmpIds.length === 0}
            className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[12px] mt-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <HardDrive className="w-4 h-4 mr-2" />
            )}
            {isExporting ? "Gerando..." : "Baixar Arquivo CSV"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
