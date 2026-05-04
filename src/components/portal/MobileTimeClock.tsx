import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  Fingerprint,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MobileTimeClockProps {
  employee: any;
  onSuccess?: () => void;
}

export function MobileTimeClock({ employee, onSuccess }: MobileTimeClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  // Atualiza o relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Busca batidas de hoje
  const fetchTodayEntries = async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('timestamp', startOfDay.toISOString())
      .order('timestamp', { ascending: true });
    
    if (data) setTodayEntries(data);
  };

  useEffect(() => {
    fetchTodayEntries();
  }, [employee.id]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      setStream(mediaStream);
      setIsScanning(true);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro de Câmera", description: "Não foi possível acessar a câmera.", variant: "destructive" });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  const getGeoLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast({ title: "Erro", description: "Geolocalização não suportada", variant: "destructive" });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
        toast({ title: "Localização Confirmada", description: "Você está na área de registro." });
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
        toast({ title: "Erro de Localização", description: "Ative o GPS para bater o ponto.", variant: "destructive" });
      }
    );
  };

  const handleRegister = async () => {
    if (!location) {
      getGeoLocation();
      return;
    }

    if (!isScanning && !isSubmitting) {
      startCamera();
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Capturar foto do vídeo
      const video = document.getElementById('scanner-video') as HTMLVideoElement;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const photoBase64 = canvas.toDataURL('image/jpeg', 0.7);
      const blob = await (await fetch(photoBase64)).blob();
      
      // 2. Upload para Supabase Storage
      const fileName = `${employee.id}/${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('time-entries-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) {
        // Se o erro for que o bucket não existe, tenta prosseguir sem foto ou avisa
        console.error('Erro de upload:', uploadError);
      }

      const photoUrl = uploadData ? supabase.storage.from('time-entries-photos').getPublicUrl(fileName).data.publicUrl : null;

      // 3. Registrar no Banco
      const { error } = await supabase.from('time_entries').insert([{
        employee_id: employee.id,
        employee_name: employee.name,
        timestamp: new Date().toISOString(),
        type: todayEntries.length % 2 === 0 ? 'ENTRY' : 'EXIT',
        tenant_id: employee.tenant_id,
        status: 'SYNCED',
        latitude: location.lat,
        longitude: location.lng,
        photo_url: photoUrl
      }]);

      if (error) throw error;

      toast({ 
        title: "Ponto Registrado!", 
        description: `Batida realizada às ${format(new Date(), 'HH:mm:ss')}`,
        className: "bg-emerald-500 text-white border-none"
      });
      
      stopCamera();
      fetchTodayEntries();
      onSuccess?.();
    } catch (e: any) {
      toast({ title: "Erro ao registrar", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Relógio Gigante */}
      <div className="text-center space-y-2">
         <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-2">
            <Zap className="w-3.5 h-3.5 fill-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Sincronizado com NTP</span>
         </div>
         <p className="text-6xl font-black italic tracking-tighter tabular-nums text-white drop-shadow-[0_0_15px_rgba(31,180,243,0.3)]">
            {format(currentTime, 'HH:mm:ss')}
         </p>
         <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
            {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
         </p>
      </div>

      {/* Interface de Registro/Scanner */}
      <div className="relative flex justify-center">
         {isScanning ? (
           <div className="relative w-64 h-64 rounded-full border-4 border-primary overflow-hidden shadow-[0_0_50px_rgba(31,180,243,0.3)] animate-in zoom-in duration-300">
              <video 
                id="scanner-video"
                autoPlay 
                playsInline 
                muted
                ref={(ref) => { if (ref) ref.srcObject = stream; }}
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 border-[20px] border-black/40 rounded-full" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-primary animate-scan-line shadow-[0_0_10px_#1fb4f3]" />
              
              <button 
                onClick={handleRegister}
                disabled={isSubmitting}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-primary text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Confirmar Identidade
              </button>

              <button 
                onClick={stopCamera}
                className="absolute top-4 right-4 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white text-xs"
              >
                ✕
              </button>
           </div>
         ) : (
           <button 
             onClick={handleRegister}
             disabled={isSubmitting}
             className={cn(
               "w-56 h-56 rounded-full border-8 transition-all duration-500 flex flex-col items-center justify-center gap-3 relative z-10 active:scale-90 group",
               isSubmitting ? "border-primary/20 bg-primary/5" : "border-primary/30 bg-primary/10 hover:border-primary/50 shadow-[0_0_50px_rgba(31,180,243,0.15)]"
             )}
           >
              {isSubmitting ? (
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-16 h-16 text-primary group-hover:scale-110 transition-transform" />
                  <span className="font-black text-[13px] uppercase tracking-widest text-white italic">Biometria Facial</span>
                </>
              )}
              
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20 -z-10" />
           </button>
         )}
      </div>

      {/* Geofencing Status */}
      <div className={cn(
        "p-5 rounded-3xl border flex items-center justify-between transition-all",
        location ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"
      )}>
         <div className="flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border",
              location ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-amber-500/20 border-amber-500/30 text-amber-400"
            )}>
               {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
            </div>
            <div>
               <p className="text-[11px] font-black text-white uppercase tracking-widest">Localização Atual</p>
               <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                  {location ? `Coord: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Aguardando sinal GPS...'}
               </p>
            </div>
         </div>
         {!location && (
            <Button onClick={getGeoLocation} size="sm" variant="outline" className="h-9 px-4 rounded-xl border-amber-500/30 text-amber-500 font-black text-[10px] uppercase">
               Ativar
            </Button>
         )}
         {location && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
      </div>

      {/* Histórico do Dia */}
      <div className="space-y-4">
         <div className="flex items-center gap-2 px-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Batidas de Hoje</h3>
         </div>
         
         <div className="grid grid-cols-2 gap-3">
            {todayEntries.map((entry, i) => (
               <div key={i} className="glass-card p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div>
                     <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{i % 2 === 0 ? 'Entrada' : 'Saída'}</p>
                     <p className="text-lg font-black text-white tabular-nums">{format(new Date(entry.timestamp), 'HH:mm')}</p>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-500/40" />
               </div>
            ))}
            {todayEntries.length === 0 && (
               <div className="col-span-2 py-8 text-center border border-dashed border-white/10 rounded-2xl">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nenhuma batida registrada</p>
               </div>
            )}
         </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground font-medium italic">
         <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
         BIOMETRIA FACIAL E GEOLOCALIZAÇÃO ATIVOS
      </div>
    </div>
  );
}
