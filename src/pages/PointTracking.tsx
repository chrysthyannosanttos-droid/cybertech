import { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Clock, CheckCircle2, AlertCircle, RefreshCw, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type PointType = 'ENTRY' | 'EXIT' | 'INTERVAL_START' | 'INTERVAL_END';

export default function PointTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<'success' | 'fail' | null>(null);
  
  const appPermissions = JSON.parse(sessionStorage.getItem('app_permissions') || '{}');
  const hasPointAccess = appPermissions['ponto'] !== false;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    getLocation(); // Automação: Captura localização no mount
    return () => clearInterval(timer);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      toast({
        title: "Erro na câmera",
        description: "Não foi possível acessar a câmera do dispositivo.",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        setMatchResult(null);
        
        // Simular Reconhecimento Facial
        setIsMatching(true);
        setTimeout(() => {
          setIsMatching(false);
          setMatchResult(Math.random() > 0.1 ? 'success' : 'fail'); // 90% chance de sucesso na simulação
        }, 2000);

        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setCameraActive(false);
      }
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Erro GPS", description: "Geolocalização não suportada.", variant: "destructive" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => toast({ title: "Erro GPS", description: "Não foi possível obter sua localização.", variant: "destructive" })
    );
  };

  const handleRegisterPoint = async (type: PointType) => {
    if (!photo || matchResult !== 'success') {
      toast({ title: "Erro Biométrico", description: "Biometria facial não validada.", variant: "destructive" });
      return;
    }
    if (!location) {
      toast({ title: "Atenção", description: "Localização GPS obrigatória.", variant: "default" });
      return;
    }

    setLoading(true);
    try {
      // 1. Upload photo to storage (Mock implementation logic)
      // For this demo, we'll store the base64 or a dummy URL if storage isn't ready
      const photoName = `point_${user?.id}_${Date.now()}.jpg`;
      
      // 2. Insert into time_entries
      const { error } = await supabase.from('time_entries').insert({
        employee_id: user?.id,
        employee_name: user?.name,
        type,
        latitude: location.lat,
        longitude: location.lng,
        photo_url: 'dummy_url_for_demo', // In production, use storage public URL
        tenant_id: user?.tenantId || 't1'
      });

      if (error) throw error;

      toast({
        title: "Ponto Registrado!",
        description: `Registro de ${type === 'ENTRY' ? 'Entrada' : 'Saída'} realizado com sucesso.`,
      });
      setPhoto(null);
      setLocation(null);
    } catch (err: any) {
      toast({ title: "Erro ao registrar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tighter text-white">PONTO DIGITAL</h1>
        <div className="flex items-center justify-center gap-2 text-primary font-mono text-2xl font-bold">
          <Clock className="w-6 h-6" />
          {currentTime.toLocaleTimeString('pt-BR')}
        </div>
        <p className="text-muted-foreground text-sm">{currentTime.toLocaleDateString('pt-BR', { dateStyle: 'full' })}</p>
      </div>

      {/* Camera/Photo Section */}
      <div className="relative aspect-square rounded-3xl overflow-hidden bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center group">
        {!hasPointAccess ? (
          <div className="flex flex-col items-center gap-4 text-rose-500 p-8 text-center">
            <ShieldAlert className="w-16 h-16 animate-pulse" />
            <h2 className="text-xl font-black uppercase tracking-tighter">Acesso Bloqueado</h2>
            <p className="text-[11px] text-muted-foreground">Solicite a liberação deste aplicativo ao administrador do sistema para realizar batidas de ponto.</p>
          </div>
        ) : photo ? (
          <>
            <img src={photo} className={cn("w-full h-full object-cover mirror", isMatching && "opacity-50 grayscale")} />
            
            {isMatching && (
              <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-primary/50">
                <div className="w-full h-1 bg-primary absolute top-0 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_15px_rgba(14,165,233,0.8)]" />
                <div className="glass p-4 rounded-2xl flex flex-col items-center gap-2 border-primary/30 shadow-2xl backdrop-blur-xl">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary drop-shadow-md">Escaneamento Facial em Curso...</span>
                </div>
              </div>
            )}

            {matchResult === 'success' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-emerald-500 bg-emerald-500/10">
                <div className="glass p-4 rounded-full bg-emerald-500/20">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mt-4">Identidade Validada ✓</span>
              </div>
            )}

            {matchResult === 'fail' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-rose-500 bg-rose-500/10">
                <div className="glass p-4 rounded-full bg-rose-500/20">
                  <AlertCircle className="w-12 h-12 text-rose-400" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 mt-4">Falha no Matching X</span>
                <Button variant="ghost" size="sm" className="mt-2 text-white/60 hover:text-white" onClick={() => { setPhoto(null); startCamera(); }}>Tentar Novamente</Button>
              </div>
            )}

            <Button 
              size="icon" 
              variant="secondary" 
              className="absolute top-4 right-4 rounded-full"
              onClick={() => { setPhoto(null); setMatchResult(null); startCamera(); }}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </>
        ) : cameraActive ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover mirror"
          />
        ) : (
          <Button onClick={startCamera} variant="ghost" className="flex flex-col gap-4 text-muted-foreground hover:text-white h-auto p-12">
            <Camera className="w-12 h-12" />
            <span className="font-bold uppercase tracking-widest text-[10px]">Ativar Câmera</span>
          </Button>
        )}

        {cameraActive && (
          <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6">
            <Button onClick={capturePhoto} className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-2xl p-0">
              <div className="w-12 h-12 rounded-full border-2 border-black/10" />
            </Button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* GPS Status (Automático) */}
      <div 
        className={cn(
          "w-full h-12 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border",
          location ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500 text-[11px]" : "border-white/5 bg-white/5 text-white/30 text-[10px]"
        )}
      >
        <MapPin className={cn("w-4 h-4", location && "animate-bounce")} />
        {location ? `Localização Ativa [${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}]` : "Buscando Localização GPS..."}
        {location && <CheckCircle2 className="w-3 h-3 ml-2" />}
      </div>

      {/* Point Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          disabled={!photo || !location || loading} 
          onClick={() => handleRegisterPoint('ENTRY')}
          className="h-24 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white flex flex-col gap-2 shadow-lg shadow-emerald-500/20"
        >
          <CheckCircle2 className="w-6 h-6" />
          <span className="font-black text-[12px] uppercase">Entrada</span>
        </Button>
        <Button 
          disabled={!photo || !location || loading} 
          onClick={() => handleRegisterPoint('EXIT')}
          className="h-24 rounded-3xl bg-rose-500 hover:bg-rose-600 text-white flex flex-col gap-2 shadow-lg shadow-rose-500/20"
        >
          <LogOut className="w-6 h-6" />
          <span className="font-black text-[12px] uppercase">Saída</span>
        </Button>
        <Button 
          disabled={!photo || !location || loading} 
          onClick={() => handleRegisterPoint('INTERVAL_START')}
          variant="outline"
          className="h-20 rounded-3xl border-white/10 flex flex-col gap-1 hover:bg-white/5"
        >
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-bold text-[10px] uppercase">Início Intervalo</span>
        </Button>
        <Button 
          disabled={!photo || !location || loading} 
          onClick={() => handleRegisterPoint('INTERVAL_END')}
          variant="outline"
          className="h-20 rounded-3xl border-white/10 flex flex-col gap-1 hover:bg-white/5"
        >
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-bold text-[10px] uppercase">Fim Intervalo</span>
        </Button>
      </div>

      {!photo && !cameraActive && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex gap-3 animate-pulse">
          <AlertCircle className="w-5 h-5 text-primary shrink-0" />
          <p className="text-[11px] text-primary/80 leading-relaxed font-medium">
            Para sua segurança, é necessário capturar uma foto e sua localização GPS para validar o ponto.
          </p>
        </div>
      )}
    </div>
  );
}

const LogOut = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);
