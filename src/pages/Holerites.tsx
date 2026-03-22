import { useState, useRef, useEffect } from 'react';
import { FileText, Download, CheckCircle2, ShieldCheck, PenTool, Layout, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { calculatePayroll } from '@/lib/payrollEngine';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Holerites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payslips, setPayslips] = useState<any[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
  const [isSigning, setIsSigning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    // Carregar holerites do usuário (Simulado por enquanto)
    const mockPayslips = [
      { id: '1', month: 2, year: 2024, status: 'SIGNED', signed_at: '2024-03-05T10:00:00Z', net_salary: 2850.50 },
      { id: '2', month: 3, year: 2024, status: 'PENDING', net_salary: 2850.50 },
    ];
    setPayslips(mockPayslips);
  }, []);

  const handleStartSignature = (payslip: any) => {
    setSelectedPayslip(payslip);
    setIsSigning(true);
  };

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.beginPath();
    }
  };

  const draw = (e: any) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left || e.touches?.[0].clientX - rect.left;
    const y = e.clientY - rect.top || e.touches?.[0].clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const saveSignature = async () => {
    if (!canvasRef.current) return;
    const signatureData = canvasRef.current.toDataURL();
    
    // Simular salvamento
    toast({
      title: "Holerite Assinado!",
      description: "O documento foi assinado digitalmente com sucesso.",
    });
    
    setPayslips(prev => prev.map(p => p.id === selectedPayslip.id ? { ...p, status: 'SIGNED', signed_at: new Date().toISOString() } : p));
    setIsSigning(false);
    setSelectedPayslip(null);
  };

  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Meus Holerites</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Consulta e Assinatura Digital</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {payslips.map((p) => (
          <div key={p.id} className="glass-card rounded-3xl border border-white/5 p-6 space-y-4 hover:border-primary/30 transition-all group relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <FileText className="w-6 h-6" />
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                p.status === 'SIGNED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse"
              )}>
                {p.status === 'SIGNED' ? 'Assinado' : 'Pendente'}
              </div>
            </div>

            <div>
              <h3 className="text-white font-black text-xl tracking-tighter uppercase">
                {format(new Date(p.year, p.month - 1), 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <p className="text-[12px] text-muted-foreground font-bold font-mono">Líquido: R$ {p.net_salary.toLocaleString('pt-BR')}</p>
            </div>

            <div className="pt-4 flex gap-2">
              {p.status === 'SIGNED' ? (
                <Button variant="outline" className="flex-1 rounded-xl h-11 text-[11px] font-black uppercase gap-2">
                  <Download className="w-4 h-4" /> Download
                </Button>
              ) : (
                <Button onClick={() => handleStartSignature(p)} className="flex-1 rounded-xl h-11 text-[11px] font-black uppercase gap-2 bg-primary text-white hover:bg-primary/90">
                  <PenTool className="w-4 h-4" /> Assinar Digitalmente
                </Button>
              )}
            </div>

            {p.status === 'SIGNED' && (
              <div className="absolute -bottom-2 -right-2 opacity-5 scale-150 rotate-12">
                <ShieldCheck className="w-24 h-24" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Signature Modal */}
      {isSigning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg rounded-[2rem] border border-white/10 p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Assinatura Digital</h2>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Desenhe sua assinatura no campo abaixo</p>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden touch-none cursor-crosshair h-64 relative border-4 border-primary/20">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className="w-full h-full"
                width={400}
                height={250}
              />
              <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest opacity-50">Área de Assinatura</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="ghost" onClick={() => setIsSigning(false)} className="h-12 rounded-2xl font-black uppercase text-[11px]">Cancelar</Button>
              <Button onClick={saveSignature} className="h-12 rounded-2xl font-black uppercase text-[11px] bg-emerald-500 text-white hover:bg-emerald-600">Confirmar Assinatura</Button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              REGISTRANDO IP E TIMESTAMP DE SEGURANÇA
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
