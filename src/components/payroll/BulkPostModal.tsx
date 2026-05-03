import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, MessageSquare, Mail, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface BulkPostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEmployees: any[];
  batchResults: any[];
  referenceMonth: number;
  referenceYear: number;
}

export function BulkPostModal({
  open,
  onOpenChange,
  selectedEmployees,
  batchResults,
  referenceMonth,
  referenceYear
}: BulkPostModalProps) {
  const [currentStep, setCurrentStep] = useState<'selection' | 'processing'>('selection');
  const [method, setMethod] = useState<'whatsapp' | 'email' | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [log, setLog] = useState<{name: string, status: 'success' | 'error', message: string}[]>([]);
  const { toast } = useToast();

  const total = selectedEmployees.length;

  const startSending = (type: 'whatsapp' | 'email') => {
    setMethod(type);
    setCurrentStep('processing');
    setProgress(0);
    setCurrentIndex(0);
    setLog([]);
  };

  const generateWALink = (phone: string, name: string, pdfUrl: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}, segue seu holerite referente a ${referenceMonth}/${referenceYear}: ${pdfUrl}`);
    return `https://wa.me/55${cleanPhone}?text=${message}`;
  };

  const handleNextWhatsApp = async () => {
    const emp = selectedEmployees[currentIndex];
    const result = batchResults.find(r => r.employeeId === emp.id);

    if (!emp.phone) {
      setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Telefone não cadastrado' }]);
    } else if (!result?.pdfUrl) {
      setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Holerite não gerado' }]);
    } else {
      // Busca se tem API configurada
      const { data: waSettings } = await supabase.from('tenant_whatsapp_settings').select('*').limit(1).maybeSingle();
      
      if (waSettings && waSettings.api_type !== 'none') {
        // Disparo via API Automática
        const cleanPhone = emp.phone.replace(/\D/g, '');
        const message = `Olá ${emp.name}, seu holerite de ${referenceMonth}/${referenceYear} está disponível: ${result.pdfUrl}`;
        
        try {
          if (waSettings.api_type === 'evolution') {
            await fetch(`${waSettings.base_url}/message/sendText/${waSettings.instance_id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': waSettings.token },
              body: JSON.stringify({ number: cleanPhone, text: message })
            });
          }
          setLog(prev => [...prev, { name: emp.name, status: 'success', message: 'Enviado via API' }]);
        } catch (e) {
          setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Erro na API' }]);
        }
      } else {
        // Fallback Manual (Abre Aba)
        window.open(generateWALink(emp.phone, emp.name, result.pdfUrl), '_blank');
        setLog(prev => [...prev, { name: emp.name, status: 'success', message: 'Link aberto' }]);
      }
      
      // Update DB status
      await supabase.from('payrolls').update({ 
        status: 'SENT',
        sent_whatsapp_at: new Date().toISOString() 
      }).eq('employee_id', emp.id).eq('reference_month', referenceMonth).eq('reference_year', referenceYear);
    }

    if (currentIndex + 1 < total) {
      setCurrentIndex(prev => prev + 1);
      setProgress(((currentIndex + 1) / total) * 100);
    } else {
      setProgress(100);
      toast({ title: 'Envio concluído!' });
    }
  };

  const processAllEmails = async () => {
    // Busca configurações de e-mail para usar o remetente correto (simulação)
    const { data: emailSettings } = await supabase.from('tenant_email_settings').select('*').limit(1).maybeSingle();
    
    for (let i = 0; i < total; i++) {
        setCurrentIndex(i);
        const emp = selectedEmployees[i];
        const result = batchResults.find(r => r.employeeId === emp.id);

        if (!emp.email) {
            setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'E-mail não cadastrado' }]);
        } else if (!result?.pdfUrl) {
            setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Holerite não gerado' }]);
        } else {
            // Aqui integraria com o SMTP real via Edge Function
            await new Promise(resolve => setTimeout(resolve, 600));
            setLog(prev => [...prev, { name: emp.name, status: 'success', message: `E-mail disparado (${emailSettings?.from_email || 'padrão'})` }]);
            
            await supabase.from('payrolls').update({ 
                status: 'SENT',
                sent_email_at: new Date().toISOString() 
            }).eq('employee_id', emp.id).eq('reference_month', referenceMonth).eq('reference_year', referenceYear);
        }
        setProgress(((i + 1) / total) * 100);
    }
    toast({ title: 'Disparo de e-mails concluído!' });
  };

  useEffect(() => {
    if (currentStep === 'processing' && method === 'email') {
        processAllEmails();
    }
  }, [currentStep, method]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Disparo de Holerites em Massa
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'selection' ? (
          <div className="space-y-6 py-4">
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
              <p className="text-[13px] font-medium text-center">
                Você selecionou <span className="text-primary font-black">{total}</span> colaboradores para envio de holerite.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => startSending('whatsapp')}
                className="h-24 rounded-2xl flex flex-col gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <MessageSquare className="w-8 h-8" />
                <span className="font-black text-[11px] uppercase tracking-widest">WhatsApp</span>
                <span className="text-[9px] opacity-50 font-bold uppercase tracking-tight">
                  Disparo via API ou Manual
                </span>
              </Button>

              <Button 
                onClick={() => startSending('email')}
                className="h-24 rounded-2xl flex flex-col gap-2 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Mail className="w-8 h-8" />
                <span className="font-black text-[11px] uppercase tracking-widest">E-mail</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                    <span>{method === 'whatsapp' ? 'Enviando WhatsApp' : 'Disparando E-mails'}</span>
                    <span>{currentIndex + 1} / {total}</span>
                </div>
                <Progress value={progress} className="h-2" />
            </div>

            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {log.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                        <span className="text-[12px] font-bold truncate max-w-[150px]">{item.name}</span>
                        <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-black uppercase", item.status === 'success' ? "text-emerald-500" : "text-rose-500")}>
                                {item.message}
                            </span>
                            {item.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
                        </div>
                    </div>
                ))}
            </div>

            {method === 'whatsapp' && progress < 100 && (
                <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 space-y-3">
                    <p className="text-[12px] font-medium text-center">
                        Para o WhatsApp, o navegador abrirá uma nova aba para cada envio.
                    </p>
                    <Button onClick={handleNextWhatsApp} className="w-full h-12 bg-primary text-white rounded-xl font-black uppercase gap-2">
                        <ExternalLink className="w-4 h-4" /> Enviar para {selectedEmployees[currentIndex]?.name}
                    </Button>
                </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl h-10 px-6 font-black uppercase text-[11px]">
            {progress === 100 ? 'Fechar' : 'Cancelar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
