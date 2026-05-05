import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Upload, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmployeePhotoCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
  onCaptureSuccess: (photoUrl: string) => void;
}

export function EmployeePhotoCapture({
  open,
  onOpenChange,
  employeeId,
  onCaptureSuccess,
}: EmployeePhotoCaptureProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [capture, setCapture] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Efeito para anexar o stream ao vídeo quando a câmera for ativada
  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraActive, stream]);

  const handleClose = (v: boolean) => {
    if (!v) {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      setStream(null);
      setCameraActive(false);
      setCapture(null);
    }
    onOpenChange(v);
  };

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err: any) {
      console.error('Erro na câmera:', err);
      toast({
        title: 'Aviso da Câmera',
        description: 'Não foi possível acessar a câmera. Verifique as permissões.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    setCapture(canvasRef.current.toDataURL('image/jpeg', 0.9));
    
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(null);
    setCameraActive(false);
  }, [stream]);

  const savePhoto = useCallback(async () => {
    if (!capture || !employeeId) return;
    setUploading(true);
    try {
      const res = await fetch(capture);
      const blob = await res.blob();
      const fileName = `ref_${employeeId}_${Date.now()}.jpg`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });

      let photoUrl: string;

      if (storageError) {
        photoUrl = capture;
      } else {
        const { data: publicData } = supabase.storage.from('employee-photos').getPublicUrl(fileName);
        photoUrl = publicData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('employees')
        .update({ photo_reference_url: photoUrl })
        .eq('id', employeeId);

      if (dbError) throw dbError;

      toast({
        title: '✅ Sucesso!',
        description: 'Biometria facial registrada.',
      });
      onCaptureSuccess(photoUrl);
      handleClose(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [capture, employeeId, toast, onCaptureSuccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCapture(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-[#020408]/95 border-white/5 backdrop-blur-2xl p-0 overflow-hidden rounded-[2.5rem] shadow-[0_0_50px_rgba(31,180,243,0.1)]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-3 text-lg font-black uppercase italic tracking-tighter text-white">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            Cadastro de Biometria Facial
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-8 space-y-6">
          <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-black/40 border-4 border-white/5 shadow-2xl group transition-all duration-500 hover:border-primary/30">
            {capture ? (
              <div className="relative w-full h-full animate-in zoom-in duration-500">
                <img src={capture} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-emerald-500/10 border-8 border-emerald-500/40 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 backdrop-blur-xl flex items-center justify-center border-4 border-emerald-500 animate-in zoom-in duration-700">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>
            ) : cameraActive ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 border-[40px] border-black/40" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] border-2 border-white/20 rounded-[2rem]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-0.5 bg-primary/40 shadow-[0_0_15px_rgba(31,180,243,0.5)] animate-scan" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
                <div className="w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/5">
                  <Camera className="w-12 h-12" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Câmera Desativada</p>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <p className="text-[11px] font-medium text-white/40 text-center leading-relaxed uppercase tracking-wider px-4">
            Posicione o rosto do colaborador no centro para uma captura nítida. Esta foto será a base da biometria.
          </p>

          <div className="flex gap-3 pt-2">
            {!capture ? (
              !cameraActive ? (
                <>
                  <Button 
                    className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-tighter italic text-sm gap-3 shadow-lg shadow-primary/20" 
                    onClick={startCamera}
                  >
                    <Camera className="w-5 h-5" /> Ativar Câmera
                  </Button>
                  <Button
                    variant="outline"
                    className="w-14 h-14 rounded-2xl border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-5 h-5" />
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              ) : (
                <Button
                  className="flex-1 h-14 rounded-2xl bg-white text-black hover:bg-white/90 font-black uppercase tracking-tighter italic text-sm gap-3 animate-in fade-in slide-in-from-bottom-2"
                  onClick={capturePhoto}
                >
                  <div className="w-5 h-5 rounded-full border-4 border-black/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  </div>
                  Capturar Foto
                </Button>
              )
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1 h-14 rounded-2xl border-white/10 bg-white/5 text-white font-black uppercase tracking-tighter italic text-sm"
                  onClick={() => {
                    setCapture(null);
                    startCamera();
                  }}
                >
                  Tentar Novamente
                </Button>
                <Button
                  className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-tighter italic text-sm gap-3 shadow-lg shadow-emerald-500/20"
                  onClick={savePhoto}
                  disabled={uploading}
                >
                  {uploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </div>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> Confirmar
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
