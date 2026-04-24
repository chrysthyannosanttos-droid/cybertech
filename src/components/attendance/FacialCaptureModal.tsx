import { useState } from 'react';
import { ScanFace, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FacialCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allEmployees: any[];
  deviceId: string | null;
  deviceName: string | undefined;
}

export function FacialCaptureModal({
  open,
  onOpenChange,
  allEmployees,
  deviceId,
  deviceName,
}: FacialCaptureModalProps) {
  const [facialEmpId, setFacialEmpId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { toast } = useToast();

  const executeFacialCapture = async () => {
    if (!deviceId || !facialEmpId) return;
    setIsCapturing(true);
    
    // Simulate facial capture command to the hardware
    await new Promise(r => setTimeout(r, 4000));
    
    const emp = allEmployees.find(e => e.id === facialEmpId);
    toast({ 
      title: 'Face Registrada!', 
      description: `O rosto de ${emp?.name} foi gravado no relógio ${deviceName} e sincronizado.` 
    });
    
    setIsCapturing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <Label className="text-[11px] font-black uppercase text-muted-foreground tracking-widest block text-center">
              Selecionar Colaborador
            </Label>
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

          <Button 
            onClick={executeFacialCapture} 
            disabled={isCapturing || !facialEmpId} 
            className="w-full h-11 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-[12px]"
          >
            {isCapturing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ScanFace className="w-4 h-4 mr-2" />}
            {isCapturing ? "Aguardando Equipamento..." : "Ativar Câmera do Relógio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
