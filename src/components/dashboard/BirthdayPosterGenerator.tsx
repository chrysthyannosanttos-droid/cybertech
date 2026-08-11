import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Sparkles, Image as ImageIcon, Upload, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BirthdayPosterGeneratorProps {
  employeeName: string;
  employeeRole: string;
  employeePhoto?: string;
}

interface InnerCanvasProps {
  firstName: string;
  employeeRole: string;
  employeePhoto?: string;
  customBg?: string | null;
  onCanvasReady: (c: HTMLCanvasElement) => void;
}

function InnerCanvas({ firstName, employeeRole, employeePhoto, customBg, onCanvasReady }: InnerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isActive = true;

    if (canvasRef.current) {
      const canvas = canvasRef.current;
      onCanvasReady(canvas);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const loadImg = (src: string, isCors: boolean) => new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        if (isCors) img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${src}`));
        img.src = src;
      });

      const renderPoster = async () => {
        let loadedBgImg: HTMLImageElement | null = null;

        // 1. Try custom uploaded background if available
        if (customBg) {
          try {
            loadedBgImg = await loadImg(customBg, false);
          } catch (e) {
            console.warn("Failed to load custom background", e);
          }
        }

        // 2. Fallback to default path options
        if (!loadedBgImg) {
          const bgSources = ['/bg-birthday.png', '/bg-birthday.png.png'];
          for (const src of bgSources) {
            try {
              loadedBgImg = await loadImg(src, false);
              break;
            } catch (e) {
              // continue to next source
            }
          }
        }

        if (!isActive) return;

        // Set canvas resolution matching image or high res 1080x1440
        const width = loadedBgImg?.naturalWidth || 1080;
        const height = loadedBgImg?.naturalHeight || 1440;
        canvas.width = width;
        canvas.height = height;

        const centerX = width / 2;

        if (loadedBgImg) {
          ctx.drawImage(loadedBgImg, 0, 0, width, height);
        } else {
          // Fallback gradient background
          const gradient = ctx.createLinearGradient(0, 0, width, height);
          gradient.addColorStop(0, '#0f172a');
          gradient.addColorStop(0.5, '#1e3a8a');
          gradient.addColorStop(1, '#0f172a');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);

          // Draw fallback title if no background image loaded
          ctx.textAlign = 'center';
          ctx.font = `bold ${Math.round(width * 0.07)}px "Inter", sans-serif`;
          ctx.fillStyle = '#fcd34d';
          ctx.fillText('FELIZ ANIVERSÁRIO!', centerX, height * 0.15);
        }

        // --- DRAW EMPLOYEE PHOTO & NAME ---
        // Calculate dynamic dimensions relative to canvas size
        const photoRadius = Math.round(width * 0.12); // ~130px on 1080 width
        const photoY = Math.round(height * 0.44);     // Center area of poster

        if (employeePhoto) {
          try {
            const photoImg = await loadImg(employeePhoto, true);
            if (!isActive) return;

            // Draw outer glow / shadow for photo
            ctx.save();
            ctx.shadowColor = 'rgba(0, 51, 153, 0.35)';
            ctx.shadowBlur = 25;

            // Draw white background circle behind photo
            ctx.beginPath();
            ctx.arc(centerX, photoY, photoRadius + 6, 0, Math.PI * 2, true);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.restore();

            // Clip circular photo
            ctx.save();
            ctx.beginPath();
            ctx.arc(centerX, photoY, photoRadius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();

            // Object-fit cover math
            const size = Math.min(photoImg.width, photoImg.height);
            const sx = (photoImg.width - size) / 2;
            const sy = (photoImg.height - size) / 2;
            ctx.drawImage(photoImg, sx, sy, size, size, centerX - photoRadius, photoY - photoRadius, photoRadius * 2, photoRadius * 2);
            ctx.restore();

            // Outer gold/blue ring border
            ctx.beginPath();
            ctx.arc(centerX, photoY, photoRadius + 2, 0, Math.PI * 2, true);
            ctx.lineWidth = Math.round(width * 0.007);
            ctx.strokeStyle = '#003399';
            ctx.stroke();
          } catch (e) {
            console.error("Failed to load employee photo", e);
          }
        }

        // Draw Employee Name & Role in high-impact typography
        ctx.textAlign = 'center';

        const nameY = employeePhoto ? photoY + photoRadius + Math.round(height * 0.05) : Math.round(height * 0.50);

        // Employee Name
        const nameFontSize = Math.round(width * 0.075); // ~80px
        ctx.font = `900 ${nameFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = '#003399'; // Brand Navy/Blue
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText(firstName.toUpperCase(), centerX, nameY);
        ctx.shadowColor = 'transparent';

        // Employee Role
        const roleY = nameY + Math.round(height * 0.035);
        const roleFontSize = Math.round(width * 0.032); // ~35px
        const safeRole = (employeeRole || 'Colaborador').toUpperCase();
        ctx.font = `700 ${roleFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = '#c8102e'; // Brand Red accent
        ctx.fillText(safeRole, centerX, roleY);
      };

      renderPoster();
    }

    return () => {
      isActive = false;
    };
  }, [firstName, employeeRole, employeePhoto, customBg, onCanvasReady]);

  return <canvas ref={canvasRef} className="w-full h-full object-contain" />;
}

export function BirthdayPosterGenerator({ employeeName, employeeRole, employeePhoto }: BirthdayPosterGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [readyCanvas, setReadyCanvas] = useState<HTMLCanvasElement | null>(null);
  const [customBg, setCustomBg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomBg(result);
          toast({ title: 'Imagem de fundo alterada!', description: 'A nova imagem de fundo foi aplicada.' });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetBg = () => {
    setCustomBg(null);
    toast({ title: 'Fundo restaurado', description: 'O modelo padrão foi restaurado.' });
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
          <DialogTitle className="text-white flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Cartaz de Aniversário
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-[12px] text-muted-foreground text-center">
            Cartaz oficial de aniversário Super Atacado
          </p>

          <div className="relative w-full aspect-[3/4] bg-black/50 rounded-xl overflow-hidden border border-white/10">
            {isOpen && (
              <InnerCanvas 
                firstName={firstName} 
                employeeRole={employeeRole} 
                employeePhoto={employeePhoto} 
                customBg={customBg}
                onCanvasReady={setReadyCanvas}
              />
            )}
          </div>

          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleBgUpload}
            />
            
            <Button 
              type="button"
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-10 border-white/10 hover:bg-white/5 text-white gap-2 text-xs"
            >
              <Upload className="w-4 h-4 text-amber-400" /> Trocar Imagem Fundo
            </Button>

            {customBg && (
              <Button 
                type="button"
                variant="ghost" 
                onClick={handleResetBg}
                className="h-10 text-muted-foreground hover:text-white hover:bg-white/5 text-xs px-3"
                title="Restaurar imagem padrão"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
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

