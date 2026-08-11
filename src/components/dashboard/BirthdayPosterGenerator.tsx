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

        // Use the natural resolution of the background image
        const width = loadedBgImg?.naturalWidth || 1080;
        const height = loadedBgImg?.naturalHeight || 1350;
        canvas.width = width;
        canvas.height = height;
        const centerX = width / 2;

        // Draw background (the image already contains all design elements)
        if (loadedBgImg) {
          ctx.drawImage(loadedBgImg, 0, 0, width, height);
        } else {
          ctx.fillStyle = '#e8edf5';
          ctx.fillRect(0, 0, width, height);
        }

        // --- ONLY draw employee NAME + ROLE in the white space area ---
        // The white "PARA VOCÊ" box is approximately at 60-68% of image height
        ctx.textAlign = 'center';

        // Employee Name — big, bold, navy blue
        // Centered inside the blank dashed rectangle (below "PARA VOCÊ,")
        const nameY = Math.round(height * 0.73);
        const nameFontSize = Math.round(width * 0.065);
        ctx.font = `900 ${nameFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = '#002b80';
        ctx.fillText(firstName.toUpperCase(), centerX, nameY);

        // Employee Role — smaller, red accent, right below name
        const safeRole = (employeeRole || 'Colaborador').toUpperCase();
        const roleY = nameY + Math.round(height * 0.03);
        const roleFontSize = Math.round(width * 0.028);
        ctx.font = `700 ${roleFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = '#c8102e';
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


