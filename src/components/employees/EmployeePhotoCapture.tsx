import { useState, useRef, useCallback } from 'react';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleClose = (v: boolean) => {
    if (!v) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)?.getTracks().forEach((t) => t.stop());
      }
      setCameraActive(false);
      setCapture(null);
    }
    onOpenChange(v);
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch {
      toast({
        title: 'Erro na câmera',
        description: 'Não foi possível acessar a câmera.',
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
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setCameraActive(false);
  }, []);

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
        console.warn('Storage upload failed, using base64 fallback:', storageError.message);
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
        title: '✅ Foto de referência cadastrada!',
        description: 'Biometria facial registrada com sucesso.',
      });
      onCaptureSuccess(photoUrl);
      handleClose(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar foto', description: e.message, variant: 'destructive' });
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Camera className="w-5 h-5 text-primary" />
            Cadastro de Biometria Facial
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border-2 border-white/10 flex items-center justify-center">
            {capture ? (
              <>
                <img src={capture} className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-4 border-emerald-500 flex items-center justify-center bg-emerald-500/10">
                  <div className="glass p-3 rounded-full bg-emerald-500/20">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                </div>
              </>
            ) : cameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Camera className="w-12 h-12 opacity-20" />
                <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">
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
