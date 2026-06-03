import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BirthdayPosterGeneratorProps {
  employeeName: string;
  employeeRole: string;
}

export function BirthdayPosterGenerator({ employeeName, employeeRole }: BirthdayPosterGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const firstName = employeeName.split(' ')[0];

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1080;
      canvas.height = 1080;

      // Fundo
      const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(0.5, '#1e3a8a');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1080, 1080);

      // Efeito Bokeh / Luzes
      for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        const x = Math.random() * 1080;
        const y = Math.random() * 1080;
        const radius = Math.random() * 80 + 20;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${Math.random() * 0.15})`;
        ctx.fill();
      }

      // Moldura interna dourada
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 10;
      ctx.strokeRect(60, 60, 960, 960);

      // Textos centrais
      ctx.textAlign = 'center';
      
      ctx.font = 'bold 90px "Inter", sans-serif';
      ctx.fillStyle = '#fcd34d';
      ctx.fillText('FELIZ', 540, 320);
      ctx.fillText('ANIVERSÁRIO!', 540, 430);

      ctx.font = '900 130px "Inter", sans-serif';
      ctx.fillStyle = '#ffffff';
      
      // Efeito de sombra no texto
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.fillText(firstName.toUpperCase(), 540, 620);
      
      // Reset sombra
      ctx.shadowColor = 'transparent';

      ctx.font = '600 45px "Inter", sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(employeeRole.toUpperCase(), 540, 710);

      ctx.font = 'italic 40px "Inter", sans-serif';
      ctx.fillStyle = '#e5e7eb';
      ctx.fillText('Desejamos muito sucesso, paz e alegria!', 540, 860);
      
      ctx.font = 'bold 35px "Inter", sans-serif';
      ctx.fillStyle = '#60a5fa';
      ctx.fillText('Equipe CyberTech RH', 540, 930);
    }
  }, [isOpen, firstName, employeeRole]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Parabens_${firstName}.png`;
    link.href = dataUrl;
    link.click();
    toast({ title: 'Arte baixada!', description: 'O cartaz foi salvo no seu dispositivo.' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" title="Gerar Arte">
          <ImageIcon className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[#0a0f1e] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Cartaz de Aniversário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-[12px] text-muted-foreground text-center">
            A IA gerou este cartaz automaticamente com base no perfil.
          </p>
          <div className="relative w-full aspect-square bg-black/50 rounded-xl overflow-hidden border border-white/10">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>
          <Button onClick={handleDownload} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 text-[13px] uppercase tracking-wider rounded-xl">
            <Download className="w-4 h-4" /> Baixar Cartaz (PNG)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
