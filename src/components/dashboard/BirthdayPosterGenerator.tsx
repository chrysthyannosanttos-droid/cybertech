import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BirthdayPosterGeneratorProps {
  employeeName: string;
  employeeRole: string;
  employeePhoto?: string;
}

export function BirthdayPosterGenerator({ employeeName, employeeRole, employeePhoto }: BirthdayPosterGeneratorProps) {
function InnerCanvas({ firstName, employeeRole, employeePhoto, onCanvasReady }: { firstName: string, employeeRole: string, employeePhoto?: string, onCanvasReady: (c: HTMLCanvasElement) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isActive = true;

    if (canvasRef.current) {
      const canvas = canvasRef.current;
      onCanvasReady(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = 1080;
      canvas.height = 1080;

      // Draw loading state
      ctx.fillStyle = '#0a0f1e';
      ctx.fillRect(0, 0, 1080, 1080);
      ctx.fillStyle = '#ffffff';
      ctx.font = '40px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Gerando arte...', 540, 540);

      const drawContent = () => {
        // Textos centrais
        ctx.textAlign = 'center';
        
        ctx.font = 'bold 80px "Inter", sans-serif';
        ctx.fillStyle = '#fcd34d';
        ctx.fillText('FELIZ', 540, 150);
        ctx.fillText('ANIVERSÁRIO!', 540, 250);

        ctx.font = '900 110px "Inter", sans-serif';
        ctx.fillStyle = '#ffffff';
        
        // Efeito de sombra no texto
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.fillText(firstName.toUpperCase(), 540, 720);
        
        // Reset sombra
        ctx.shadowColor = 'transparent';

        const safeRole = (employeeRole || 'Colaborador').toUpperCase();
        ctx.font = '600 40px "Inter", sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.fillText(safeRole, 540, 790);

        ctx.font = 'italic 35px "Inter", sans-serif';
        ctx.fillStyle = '#e5e7eb';
        ctx.fillText('Desejamos muito sucesso, paz e alegria!', 540, 910);
        
        ctx.font = 'bold 30px "Inter", sans-serif';
        ctx.fillStyle = '#60a5fa';
        ctx.fillText('Equipe CyberTech RH', 540, 970);
      };

      const loadImages = async () => {
        const loadImg = (src: string, isCors: boolean) => new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          if (isCors) img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load ${src}`));
          img.src = src;
        });

        try {
          const bgImg = await loadImg('/bg-birthday.png.png', false);
          if (!isActive) return;
          ctx.drawImage(bgImg, 0, 0, 1080, 1080);
        } catch (e) {
          console.error("Failed to load background", e);
          if (!isActive) return;
          const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
          gradient.addColorStop(0, '#0f172a');
          gradient.addColorStop(0.5, '#1e3a8a');
          gradient.addColorStop(1, '#0f172a');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1080, 1080);
        }

        if (employeePhoto) {
          try {
            const photoImg = await loadImg(employeePhoto, true);
            if (!isActive) return;
            ctx.save();
            ctx.beginPath();
            ctx.arc(540, 470, 150, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            
            // object-fit cover logic for drawing photo in circle
            const size = Math.min(photoImg.width, photoImg.height);
            const x = (photoImg.width - size) / 2;
            const y = (photoImg.height - size) / 2;
            ctx.drawImage(photoImg, x, y, size, size, 540 - 150, 470 - 150, 300, 300);
            
            ctx.restore();
            
            // Draw a border around the photo
            ctx.beginPath();
            ctx.arc(540, 470, 150, 0, Math.PI * 2, true);
            ctx.lineWidth = 10;
            ctx.strokeStyle = '#fcd34d';
            ctx.stroke();
          } catch (e) {
            console.error("Failed to load employee photo", e);
          }
        }

        if (!isActive) return;
        drawContent();
      };

      loadImages();
    }

    return () => {
      isActive = false;
    };
  }, [firstName, employeeRole, employeePhoto, onCanvasReady]);

  return <canvas ref={canvasRef} className="w-full h-full object-contain" />;
}

export function BirthdayPosterGenerator({ employeeName, employeeRole, employeePhoto }: BirthdayPosterGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [readyCanvas, setReadyCanvas] = useState<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

  const firstName = (employeeName || 'Colaborador').split(' ')[0];

  const handleDownload = () => {
    if (!readyCanvas) return;
    const dataUrl = readyCanvas.toDataURL('image/png');
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
            {isOpen && (
              <InnerCanvas 
                firstName={firstName} 
                employeeRole={employeeRole} 
                employeePhoto={employeePhoto} 
                onCanvasReady={setReadyCanvas}
              />
            )}
          </div>
          <Button onClick={handleDownload} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white font-bold gap-2 text-[13px] uppercase tracking-wider rounded-xl">
            <Download className="w-4 h-4" /> Baixar Cartaz (PNG)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
