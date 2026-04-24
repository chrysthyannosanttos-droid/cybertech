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
                  Câmera desativada
                </p>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
            Posicione o rosto do funcionário no centro da câmera ou faça o upload de uma foto nítida para o reconhecimento facial.
          </p>

          <div className="flex gap-2">
            {!capture ? (
              !cameraActive ? (
                <>
                  <Button className="flex-1 h-10 gap-2" onClick={startCamera}>
                    <Camera className="w-4 h-4" /> Ativar Câmera
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-10 gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" /> Enviar Arquivo
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
                  className="flex-1 h-10 gap-2 bg-white text-black hover:bg-white/90"
                  onClick={capturePhoto}
                >
                  <div className="w-4 h-4 rounded-full border-2 border-black" />
                  Tirar Foto
                </Button>
              )
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex-1 h-10"
                  onClick={() => {
                    setCapture(null);
                    startCamera();
                  }}
                >
                  Repetir
                </Button>
                <Button
                  className="flex-1 h-10 gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={savePhoto}
                  disabled={uploading}
                >
                  {uploading ? (
                    'Salvando...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Salvar
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
