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
import { CheckCircle2, MessageSquare, Mail, Loader2, AlertCircle, ExternalLink, ShieldCheck, Zap, Send } from 'lucide-react';
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
    const message = encodeURIComponent(`Olá ${name}, seu holerite digital de ${referenceMonth}/${referenceYear} está disponível: ${pdfUrl}`);
    return `https://wa.me/55${cleanPhone}?text=${message}`;
  };

  const handleNextWhatsApp = async () => {
    const emp = selectedEmployees[currentIndex];
    const result = batchResults.find(r => r.employeeId === emp.id);

    if (!emp.phone) {
      setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Falta Telefone' }]);
    } else if (!result?.pdfUrl) {
      setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Sem PDF' }]);
    } else {
      const { data: waSettings } = await supabase.from('tenant_whatsapp_settings').select('*').limit(1).maybeSingle();
      
      if (waSettings && waSettings.api_type !== 'none') {
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
          setLog(prev => [...prev, { name: emp.name, status: 'success', message: 'API Success' }]);
        } catch (e) {
          setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Erro API' }]);
        }
      } else {
        window.open(generateWALink(emp.phone, emp.name, result.pdfUrl), '_blank');
        setLog(prev => [...prev, { name: emp.name, status: 'success', message: 'Link OK' }]);
      }
      
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
      toast({ title: 'Disparo concluído!' });
    }
  };

  const processAllEmails = async () => {
    for (let i = 0; i < total; i++) {
        setCurrentIndex(i);
        const emp = selectedEmployees[i];
        const result = batchResults.find(r => r.employeeId === emp.id);

        if (!emp.email) {
            setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Falta E-mail' }]);
        } else if (!result?.pdfUrl) {
            setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Sem PDF' }]);
        } else {
            try {
              let tenantId = (emp as any).tenant_id || (emp as any).tenantId;
              const { data: fData, error: fError } = await supabase.functions.invoke('send-payroll-email', {
                  body: {
                    tenant_id: tenantId,
                    employee_email: emp.email,
                    employee_name: emp.name,
                    pdf_url: result.pdfUrl,
                    month: referenceMonth.toString().padStart(2, '0'),
                    year: referenceYear.toString()
                  }
              });

              if (!fError && fData?.success) {
                  setLog(prev => [...prev, { name: emp.name, status: 'success', message: 'E-mail OK' }]);
                  await supabase.from('payrolls').update({ 
                      status: 'SENT',
                      sent_email_at: new Date().toISOString() 
                  }).eq('employee_id', emp.id).eq('reference_month', referenceMonth).eq('reference_year', referenceYear);
              } else {
                  setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Falha Cloud' }]);
              }
            } catch (err: any) {
              setLog(prev => [...prev, { name: emp.name, status: 'error', message: 'Erro Sistema' }]);
            }
        }
        setProgress(((i + 1) / total) * 100);
    }
  };

  useEffect(() => {
    if (currentStep === 'processing' && method === 'email') {
        processAllEmails();
    }
  }, [currentStep, method]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-[#0a0f1e] border-white/5 shadow-2xl rounded-[2.5rem]">
        <div className="p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Send className="w-6 h-6 text-primary" />
               </div>
               <div>
                  <DialogTitle className="text-xl font-black text-white uppercase italic tracking-tight">Disparo de Holerites</DialogTitle>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                     <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Protocolo Digital Seguro
                  </p>
               </div>
            </div>
          </DialogHeader>

          {currentStep === 'selection' ? (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Carga Selecionada</p>
                   <p className="text-2xl font-black text-white italic tracking-tighter">{total} Colaboradores</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                   <Zap className="w-6 h-6 text-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Button 
                  onClick={() => startSending('whatsapp')}
                  className="h-32 rounded-[2rem] flex flex-col gap-3 bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/10 active:scale-[0.98] transition-all border-b-4 border-emerald-700"
                >
                  <MessageSquare className="w-10 h-10" />
                  <div className="text-center">
                     <span className="font-black text-[12px] uppercase tracking-widest block">WhatsApp</span>
                     <span className="text-[9px] opacity-60 font-bold uppercase tracking-tight">API / Manual</span>
                  </div>
                </Button>

                <Button 
                  onClick={() => startSending('email')}
                  className="h-32 rounded-[2rem] flex flex-col gap-3 bg-blue-500 hover:bg-blue-600 text-white shadow-xl shadow-blue-500/10 active:scale-[0.98] transition-all border-b-4 border-blue-700"
                >
                  <Mail className="w-10 h-10" />
                  <div className="text-center">
                     <span className="font-black text-[12px] uppercase tracking-widest block">E-mail</span>
                     <span className="text-[9px] opacity-60 font-bold uppercase tracking-tight">Servidor Cloud</span>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="space-y-3">
                  <div className="flex justify-between items-end">
                      <div>
                         <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">{method === 'whatsapp' ? 'Canal WhatsApp' : 'Canal E-mail'}</p>
                         <p className="text-xl font-black text-white italic tracking-tighter">Processando Lote...</p>
                      </div>
                      <span className="text-2xl font-black text-primary tabular-nums">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                     <div className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_15px_rgba(var(--primary),0.5)]" style={{ width: `${progress}%` }} />
                  </div>
              </div>

              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-3 custom-scrollbar border-y border-white/5 py-4">
                  {log.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                          <div>
                             <p className="text-[12px] font-black text-white">{item.name}</p>
                             <p className="text-[9px] font-bold text-muted-foreground uppercase">{referenceMonth}/{referenceYear}</p>
                          </div>
                          <div className="flex items-center gap-3">
                              <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md", item.status === 'success' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20")}>
                                  {item.message}
                              </span>
                              {item.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-rose-500" />}
                          </div>
                      </div>
                  ))}
                  {log.length === 0 && <div className="py-12 text-center text-[11px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">Iniciando Handshake...</div>}
              </div>

              {method === 'whatsapp' && progress < 100 && (
                  <div className="p-6 rounded-[2rem] bg-primary/5 border border-primary/20 space-y-4 shadow-2xl">
                      <p className="text-[11px] font-black text-center text-primary uppercase tracking-widest">Ação Manual Requerida</p>
                      <Button onClick={handleNextWhatsApp} className="w-full h-16 bg-primary text-white rounded-2xl font-black uppercase text-[12px] tracking-widest gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                          <ExternalLink className="w-5 h-5" /> Autorizar envio para {selectedEmployees[currentIndex]?.name}
                      </Button>
                  </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-8 bg-white/[0.01] border-t border-white/5">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-2xl h-14 px-10 font-black uppercase text-[11px] tracking-widest text-muted-foreground hover:text-white transition-colors">
            {progress === 100 ? 'Finalizar Processo' : 'Interromper'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
