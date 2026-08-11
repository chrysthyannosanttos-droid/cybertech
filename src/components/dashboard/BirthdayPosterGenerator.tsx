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

        // Standard high-resolution poster dimensions (1080 x 1440)
        const width = 1080;
        const height = 1440;
        canvas.width = width;
        canvas.height = height;

        const centerX = width / 2;

        if (loadedBgImg) {
          ctx.drawImage(loadedBgImg, 0, 0, width, height);
        } else {
          // Festive fallback gradient background
          const gradient = ctx.createLinearGradient(0, 0, width, height);
          gradient.addColorStop(0, '#f8fafc');
          gradient.addColorStop(0.5, '#eff6ff');
          gradient.addColorStop(1, '#dbeafe');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }

        ctx.textAlign = 'center';

        // --- 1. HEADER LOGO & TITLE ---
        // Super Atacado Brand Header
        ctx.font = 'bold 36px "Inter", sans-serif';
        ctx.fillStyle = '#002b80';
        ctx.fillText('SUPER ATACADO', centerX, height * 0.08);

        // "FELIZ" Subheader
        ctx.font = 'bold 56px "Inter", italic, sans-serif';
        ctx.fillStyle = '#002b80';
        ctx.fillText('Feliz', centerX, height * 0.14);

        // "ANIVERSÁRIO!" Big 3D Red Title
        ctx.save();
        const titleY = height * 0.21;
        ctx.font = '900 88px "Inter", sans-serif';

        // Shadow behind title
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 6;

        // White outline for title crispness
        ctx.lineWidth = 12;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText('ANIVERSÁRIO!', centerX, titleY);

        // Red Fill
        ctx.fillStyle = '#c8102e';
        ctx.fillText('ANIVERSÁRIO!', centerX, titleY);
        ctx.restore();

        // Decorative underline
        ctx.beginPath();
        ctx.moveTo(centerX - 180, height * 0.23);
        ctx.lineTo(centerX + 180, height * 0.23);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#002b80';
        ctx.lineCap = 'round';
        ctx.stroke();

        // --- 2. EMPLOYEE PHOTO ---
        const photoY = height * 0.40;
        const photoRadius = 120; // 240px diameter

        if (employeePhoto) {
          try {
            const photoImg = await loadImg(employeePhoto, true);
            if (!isActive) return;

            // Soft shadow behind photo
            ctx.save();
            ctx.shadowColor = 'rgba(0, 43, 128, 0.3)';
            ctx.shadowBlur = 30;
            ctx.shadowOffsetY = 8;

            // White base circle
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

            // Double border: Outer Gold, Inner Navy
            ctx.beginPath();
            ctx.arc(centerX, photoY, photoRadius + 4, 0, Math.PI * 2, true);
            ctx.lineWidth = 8;
            ctx.strokeStyle = '#fcd34d'; // Gold accent
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(centerX, photoY, photoRadius, 0, Math.PI * 2, true);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#002b80'; // Navy border
            ctx.stroke();
          } catch (e) {
            console.error("Failed to load employee photo", e);
          }
        }

        // --- 3. EMPLOYEE NAME & ROLE ---
        const nameY = employeePhoto ? photoY + photoRadius + 85 : height * 0.48;

        // Employee Name with high-contrast white halo outline
        ctx.save();
        ctx.font = '900 82px "Inter", sans-serif';

        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 12;

        ctx.lineWidth = 10;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeText(firstName.toUpperCase(), centerX, nameY);

        ctx.fillStyle = '#002b80';
        ctx.fillText(firstName.toUpperCase(), centerX, nameY);
        ctx.restore();

        // Employee Role Pill Tag
        const safeRole = (employeeRole || 'Colaborador').toUpperCase();
        const roleY = nameY + 25;
        const pillWidth = Math.max(280, safeRole.length * 22 + 60);
        const pillHeight = 46;
        const pillX = centerX - pillWidth / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(200, 16, 46, 0.3)';
        ctx.shadowBlur = 15;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.roundRect(pillX, roleY, pillWidth, pillHeight, 23);
        ctx.fillStyle = '#c8102e'; // Red Pill Background
        ctx.fill();
        ctx.restore();

        // Role Text inside Pill Tag
        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(safeRole, centerX, roleY + 31);

        // --- 4. CONGRATULATORY MESSAGE ---
        const msgY = roleY + 110;
        ctx.font = '600 28px "Inter", sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Que este dia seja especial e cheio de alegrias!', centerX, msgY);

        ctx.font = '500 24px "Inter", sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Desejamos saúde, paz, felicidade e muito sucesso.', centerX, msgY + 40);

        ctx.font = 'bold 36px "Inter", italic, sans-serif';
        ctx.fillStyle = '#c8102e';
        ctx.fillText('Parabéns! ❤', centerX, msgY + 95);

        // --- 5. CORPORATE TEAM BANNER ---
        const bannerY = height * 0.84;
        const bannerW = 820;
        const bannerH = 64;
        const bannerX = centerX - bannerW / 2;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 43, 128, 0.25)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 6;

        ctx.beginPath();
        ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 16);
        ctx.fillStyle = '#002b80';
        ctx.fill();
        ctx.restore();

        ctx.font = 'bold 24px "Inter", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Você faz parte do nosso time e é muito importante para nós!', centerX, bannerY + 40);

        // --- 6. FOOTER SIGNATURE ---
        ctx.font = 'bold 22px "Inter", sans-serif';
        ctx.fillStyle = '#002b80';
        ctx.fillText('SUPER ATACADO • Conte sempre com a gente! ❤', centerX, height * 0.94);
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


