import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  User, 
  Camera, 
  Zap, 
  Fingerprint, 
  Loader2,
  AlertCircle,
  MapPin,
  Clock as ClockIcon,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { offlineSync } from '@/services/OfflineSyncService';

import { Camera as CapCamera } from '@capacitor/camera';

export default function TerminalPonto() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [identifiedUser, setIdentifiedUser] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Tenant ID Fixo para este Terminal (Super Atacado)
  const TERMINAL_TENANT_ID = 't1774631821158';

  // Relógio e Monitor de Rede
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const handleOnline = () => {
      setIsOnline(true);
      offlineSync.syncWithServer().then(updatePendingCount);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    const pending = await offlineSync.getPendingEntries();
    setPendingCount(pending.length);
  };

  // Iniciar Câmera, Cache e Loop de Scan
  useEffect(() => {
    startCamera();
    initializeCache();
    updatePendingCount();

    // Loop de Identificação Automática (Tenta a cada 4 segundos)
    scanIntervalRef.current = setInterval(() => {
      if (status === 'idle' && !isRegistering) {
        handleAutoScan();
      }
    }, 4000);

    return () => {
      stopCamera();
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [status, isRegistering]);

  const initializeCache = async () => {
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, name, photo_url, tenant_id, cpf')
        .eq('tenant_id', TERMINAL_TENANT_ID);
        
      if (data) {
        setEmployees(data);
        if (navigator.onLine) await offlineSync.cacheEmployees(data);
      }
    } catch (err) {
      console.error('Falha ao inicializar cache:', err);
    }
  };

  const handleCaptureBasePhoto = async () => {
    if (!selectedEmpId || !videoRef.current || !canvasRef.current) {
      toast({ title: "Selecione um colaborador", variant: "destructive" });
      return;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      if (!blob) return;

      // Upload para o Storage
      const fileName = `${selectedEmpId}_base.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('time-entries-photos')
        .upload(`base-profiles/${fileName}`, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('time-entries-photos')
        .getPublicUrl(`base-profiles/${fileName}`);

      // Atualiza o perfil do funcionário
      const { error: updateError } = await supabase
        .from('employees')
        .update({ photo_url: publicUrl })
        .eq('id', selectedEmpId);

      if (updateError) throw updateError;

      toast({ title: "Biometria cadastrada!", className: "bg-emerald-500 text-white" });
      setIsRegistering(false);
      setIsAdminAuth(false);
      initializeCache(); // Recarrega cache

    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const handleAutoScan = () => {
    handleManualIdentification();
  };

  const startCamera = async () => {
    try {
      // Pedir permissões nativas explicitamente (Capacitor)
      if (window.hasOwnProperty('Capacitor')) {
        // Câmera e Armazenamento
        await CapCamera.requestPermissions();
        
        // Localização (Para o Ponto)
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(() => {}, () => {});
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 1280, height: 720 }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Falha ao acessar câmera.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const handleManualIdentification = async () => {
    if (status === 'scanning' || status === 'success') return;

    setStatus('scanning');
    
    try {
      if (!videoRef.current || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // BUSCA OFFLINE: Usamos o cache local do IndexedDB
      await new Promise(r => setTimeout(r, 1500));
      const cachedEmployees = await offlineSync.getCachedEmployees();
      
      if (cachedEmployees.length === 0) {
        throw new Error("Banco de dados offline vazio. Conecte-se uma vez para sincronizar.");
      }

      // Mock: Pega o primeiro (em produção seria o match da IA)
      const emp = cachedEmployees[0];

      // SALVAR OFFLINE: Primeiro no IndexedDB
      await offlineSync.saveEntry({
        employee_id: emp.id,
        employee_name: emp.name,
        timestamp: new Date().toISOString(),
        type: 'ENTRY',
        tenant_id: emp.tenant_id,
        device_info: 'Fixed Tablet Terminal - 001'
      });

      // Tentar sincronizar imediatamente se estiver online
      if (navigator.onLine) {
        offlineSync.syncWithServer().then(updatePendingCount);
      } else {
        updatePendingCount();
      }

      setIdentifiedUser(emp);
      setStatus('success');
      
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});

      setTimeout(() => {
        setStatus('idle');
        setIdentifiedUser(null);
      }, 5000);

    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white flex flex-col font-sans selection:bg-primary/30 overflow-hidden relative">
      {/* Luzes de Fundo Sutis */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Header Minimalista */}
      <header className="w-full pt-10 pb-6 px-12 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(31,180,243,0.4)]">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Cyber<span className="text-primary">Tech</span></h1>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Smart Terminal v2.4</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-6xl font-black tabular-nums tracking-tighter leading-none italic">
            {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="text-xs font-bold text-primary uppercase tracking-widest mt-1">
            {format(currentTime, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </header>

      {/* Área Principal de Scan */}
      <main className="flex-1 flex flex-col items-center justify-center gap-12 z-10 px-6">
        
        <div className="relative">
          {/* Frame da Câmera - Ultra Clean */}
          <div className={cn(
            "relative w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] rounded-[5rem] border-[12px] transition-all duration-1000 overflow-hidden shadow-2xl",
            status === 'idle' && "border-white/5",
            status === 'scanning' && "border-primary animate-pulse shadow-primary/20 scale-105",
            status === 'success' && "border-emerald-500 shadow-emerald-500/30 scale-105",
            status === 'error' && "border-rose-500 shadow-rose-500/30"
          )}>
            <video 
               ref={videoRef}
               autoPlay 
               playsInline 
               muted
               className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Scanner Line */}
            {status === 'scanning' && (
              <div className="absolute inset-x-0 h-[4px] bg-primary/60 animate-scan-line shadow-[0_0_20px_#1fb4f3] z-20" />
            )}

            {/* Overlay de Sucesso */}
            {status === 'success' && identifiedUser && (
              <div className="absolute inset-0 bg-[#020408]/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-500 px-8 text-center">
                <div className="w-32 h-32 rounded-[3rem] border-4 border-emerald-500 overflow-hidden mb-6 shadow-2xl">
                  {identifiedUser.photo_url ? (
                    <img src={identifiedUser.photo_url} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-emerald-500 flex items-center justify-center text-white font-black text-5xl">
                      {identifiedUser.name[0]}
                    </div>
                  )}
                </div>
                <p className="text-emerald-500 font-black uppercase text-xs tracking-[0.4em] mb-2">Ponto Registrado!</p>
                <h3 className="text-4xl font-black uppercase tracking-tighter italic">{identifiedUser.name.split(' ')[0]}</h3>
                <p className="text-white/40 text-sm font-bold uppercase tracking-widest mt-4">Bom trabalho!</p>
              </div>
            )}
          </div>

          {/* Badge de Status Inferior */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[300px]">
             <div className={cn(
               "py-4 px-6 rounded-3xl border backdrop-blur-xl flex items-center justify-center gap-3 transition-all duration-500 shadow-2xl",
               status === 'idle' && "bg-white/5 border-white/10 text-white/40",
               status === 'scanning' && "bg-primary/20 border-primary/40 text-primary shadow-primary/20",
               status === 'success' && "bg-emerald-500/20 border-emerald-500/40 text-emerald-500",
               status === 'error' && "bg-rose-500/20 border-rose-500/40 text-rose-500"
             )}>
                {status === 'scanning' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                 status === 'success' ? <ShieldCheck className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                  {status === 'idle' ? 'Posicione o Rosto' : 
                   status === 'scanning' ? 'Identificando...' : 
                   status === 'success' ? 'Identificado' : 'Tentar Novamente'}
                </span>
             </div>
          </div>
        </div>

        {/* Mensagem Auxiliar */}
        {status === 'idle' && (
          <div className="text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
             <h2 className="text-2xl font-black uppercase italic tracking-tight text-white/80">Aguardando Aproximação</h2>
             <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.5em]">Sistema de reconhecimento 1:N ativo</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4 animate-in shake duration-500">
             <h2 className="text-2xl font-black uppercase italic text-rose-500">Acesso Não Identificado</h2>
             <p className="text-sm text-white/40 font-bold max-w-xs">{errorMsg}</p>
             <Button onClick={() => setStatus('idle')} variant="outline" className="h-12 px-8 border-rose-500/20 text-rose-500 hover:bg-rose-500/10 rounded-2xl">
                Recomeçar
             </Button>
          </div>
        )}
      </main>

      {/* Footer Minimalista */}
      <footer className="w-full py-8 px-12 flex items-center justify-between z-20 bg-gradient-to-t from-black/50 to-transparent">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500" : "bg-rose-500")} />
            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 text-amber-500">
              <Zap className="w-4 h-4 fill-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">{pendingCount} Sincronizações</span>
            </div>
          )}

          {/* Gestão de Biometria - Botão Discreto */}
          <Dialog open={isRegistering} onOpenChange={setIsRegistering}>
            <DialogTrigger asChild>
              <button className="text-white/10 hover:text-white/40 transition-colors">
                <UserPlus className="w-5 h-5" />
              </button>
            </DialogTrigger>
            <DialogContent className="bg-[#0a0f1d] border-white/10 text-white sm:max-w-[450px] rounded-[2rem]">
               <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase italic text-primary">Painel do Gestor</DialogTitle>
                  <DialogDescription className="text-white/40 font-bold uppercase text-[10px] tracking-widest">Autenticação Necessária</DialogDescription>
               </DialogHeader>
               
               {!isAdminAuth ? (
                 <div className="space-y-6 py-4">
                    <Input 
                       type="password" 
                       value={adminPassword}
                       onChange={(e) => setAdminPassword(e.target.value)}
                       placeholder="Senha do Terminal"
                       className="bg-white/5 border-white/10 h-14 rounded-2xl"
                    />
                    <Button 
                       className="w-full h-14 bg-primary text-white font-black uppercase rounded-2xl"
                       onClick={() => {
                          if (adminPassword === '123') {
                             setIsAdminAuth(true);
                             setAdminPassword('');
                          } else {
                             toast({ title: "Acesso Negado", variant: "destructive" });
                          }
                       }}
                    >
                       Acessar Gestão
                    </Button>
                 </div>
               ) : (
                 <div className="space-y-6 py-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">Colaborador</label>
                       <select 
                          className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white appearance-none"
                          value={selectedEmpId}
                          onChange={(e) => setSelectedEmpId(e.target.value)}
                       >
                          <option value="" className="bg-[#0a0f1d]">Selecionar na lista...</option>
                          {employees.map(emp => (
                            <option key={emp.id} value={emp.id} className="bg-[#0a0f1d]">{emp.name}</option>
                          ))}
                       </select>
                    </div>
                    <Button 
                       className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase rounded-2xl gap-2"
                       onClick={handleCaptureBasePhoto}
                    >
                       <Camera className="w-5 h-5" />
                       Salvar Biometria
                    </Button>
                    <Button variant="ghost" className="w-full text-white/40" onClick={() => setIsAdminAuth(false)}>Sair</Button>
                 </div>
               )}
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-6 opacity-20">
          <MapPin className="w-4 h-4" />
          <Fingerprint className="w-4 h-4" />
          <span className="text-[9px] font-black uppercase tracking-widest leading-none">Super Atacado © 2024</span>
        </div>
      </footer>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
