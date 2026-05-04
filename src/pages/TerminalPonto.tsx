import React, { useState, useEffect, useRef } from 'react';
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
  UserPlus,
  Search,
  Building2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { offlineSync } from '@/services/OfflineSyncService';

import { Camera as CapCamera } from '@capacitor/camera';

// Tenant ID padrão do Terminal (fora do componente para uso em useState)
const TERMINAL_TENANT_ID = 't1774631821158';

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
  const [selectedEmpName, setSelectedEmpName] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Busca de Empresa e Funcionário
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState(TERMINAL_TENANT_ID);
  const [selectedTenantName, setSelectedTenantName] = useState('');
  const [tenantSearch, setTenantSearch] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const tenantInputRef = useRef<HTMLInputElement>(null);
  const empInputRef = useRef<HTMLInputElement>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();


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

  // Registro e Monitoramento do Dispositivo
  const registerDevice = async () => {
    if (!navigator.onLine) return; // Não tenta se offline
    try {
      // Obter IP Público (opcional, para auditoria)
      let ip = 'Offline';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
        const ipData = await ipRes.json();
        ip = ipData.ip;
      } catch (e) {
        console.warn('IP público indisponível');
      }

      const deviceName = `Terminal ${TERMINAL_TENANT_ID === 't1774631821158' ? 'Super Atacado' : 'Global'}`;
      const deviceData = {
        name: deviceName,
        ip_address: ip,
        model: navigator.userAgent.includes('Android') ? 'Tablet Android' : 'Desktop/Browser',
        status: 'ACTIVE',
        last_sync: new Date().toISOString(),
        tenant_id: TERMINAL_TENANT_ID
      };

      // Tenta upsert — ignora silenciosamente se a tabela não existir
      const { error } = await supabase
        .from('attendance_devices')
        .upsert([deviceData], { onConflict: 'name' });

      if (error) console.warn('Registro de dispositivo ignorado:', error.message);

    } catch (err) {
      console.warn('Erro ao registrar dispositivo (ignorado):', err);
    }
  };

  // Iniciar Câmera, Cache e Monitoramento
  useEffect(() => {
    startCamera();
    initializeCache();
    updatePendingCount();
    registerDevice();

    // Heartbeat a cada 5 minutos
    const heartBeat = setInterval(registerDevice, 300000);

    /* 
       LOOP DE IDENTIFICAÇÃO DESATIVADO TEMPORARIAMENTE
       Para evitar registros automáticos indesejados (Mock).
       Em produção, aqui entraria a lógica de detecção facial real.
    scanIntervalRef.current = setInterval(() => {
      if (status === 'idle' && !isRegistering) {
        handleAutoScan();
      }
    }, 4000);
    */

    return () => {
      stopCamera();
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    };
  }, [status, isRegistering]);

  const initializeCache = async (tenantId?: string) => {
    const tid = tenantId || selectedTenantId;
    console.log('Iniciando busca de colaboradores para tenant:', tid);
    try {
      setIsLoadingEmployees(true);
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, photo_reference_url, tenant_id, cpf')
        .eq('tenant_id', tid)
        .order('name');
        
      if (error) throw error;
      
      if (data) {
        console.log(`Sucesso: ${data.length} colaboradores encontrados.`);
        setEmployees(data);
        if (navigator.onLine) await offlineSync.cacheEmployees(data);
        
        if (tenantId) {
          toast({ 
            title: "Lista Carregada", 
            description: `${data.length} colaboradores encontrados.`,
            className: "bg-emerald-500 text-white"
          });
        }
      }
    } catch (err: any) {
      console.error('Falha ao inicializar cache:', err);
      toast({ title: "Erro ao carregar", description: err.message, variant: "destructive" });
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const fetchTenants = async () => {
    try {
      setIsLoadingTenants(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name')
        .order('name');
      if (error) throw error;
      if (data) setTenants(data);
    } catch (err) {
      console.warn('Não foi possível carregar empresas:', err);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const handleCaptureBasePhoto = async () => {
    if (!selectedEmpId || !videoRef.current || !canvasRef.current) {
      toast({ title: "Selecione um colaborador", variant: "destructive" });
      return;
    }

    // Inicia Contagem Regressiva
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'); // Bip curto
      audio.play().catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCountdown(null);
    const flashAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Som de obturador
    flashAudio.play().catch(() => {});

    try {
      setIsUploadingPhoto(true);
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
        .from('employee-photos')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(fileName);

      // Atualiza o perfil do funcionário
      const { error: updateError } = await supabase
        .from('employees')
        .update({ photo_reference_url: publicUrl })
        .eq('id', selectedEmpId);

      if (updateError) throw updateError;

      toast({ title: "Biometria cadastrada!", className: "bg-emerald-500 text-white" });
      setIsRegistering(false);
      setIsAdminAuth(false);
      initializeCache(); // Recarrega cache

    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm("Isso apagará TODAS as fotos de biometria e histórico de batidas. Confirma?")) return;
    
    try {
      toast({ title: "Limpando dados..." });
      
      // Limpa fotos dos funcionários
      await supabase.from('employees').update({ photo_reference_url: null }).neq('id', '0');
      
      // Limpa batidas
      await supabase.from('time_entries').delete().neq('id', '0');
      
      await initializeCache();
      toast({ title: "Sistema resetado", description: "Fotos e batidas removidas.", className: "bg-emerald-500 text-white" });
    } catch (err: any) {
      toast({ title: "Erro ao limpar", description: err.message, variant: "destructive" });
    }
  };
  
  const handleRefreshEmployees = async () => {
    toast({ title: "Atualizando lista...", description: "Buscando colaboradores no servidor." });
    await initializeCache(selectedTenantId);
    toast({ title: "Lista atualizada", className: "bg-emerald-500 text-white" });
  };

  const handleManualSync = async () => {
    toast({ title: "Iniciando sincronização...", description: "Enviando batidas pendentes." });
    await offlineSync.syncWithServer();
    await updatePendingCount();
    toast({ title: "Sincronização concluída", className: "bg-emerald-500 text-white" });
  };

  const handleAutoScan = () => {
    handleManualIdentification();
  };

  const startCamera = async () => {
    try {
      // Pedir permissões nativas APENAS no Capacitor (Android/iOS)
      const isNative = !!(window as any).Capacitor?.isNativePlatform?.();
      if (isNative) {
        try {
          await CapCamera.requestPermissions();
        } catch (permErr) {
          console.warn('Permissão de câmera negada ou não disponível:', permErr);
        }

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
      console.error('Câmera:', err);
      // Não bloqueia o terminal — apenas avisa
      setErrorMsg(err.name === 'NotAllowedError' ? 'Permissão de câmera negada.' : err.message || 'Falha ao acessar câmera.');
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

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] flex items-center justify-center z-50">
                <div className="text-[180px] font-black italic text-white animate-in zoom-in duration-300 drop-shadow-[0_0_30px_rgba(31,180,243,0.8)]">
                  {countdown}
                </div>
              </div>
            )}

            {/* Overlay de Sucesso */}
            {status === 'success' && identifiedUser && (
              <div className="absolute inset-0 bg-[#020408]/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500 px-8 text-center z-[100]">
                {/* Glow de Fundo */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full animate-pulse" />
                
                <div className="relative">
                  <div className="w-40 h-40 rounded-[3.5rem] border-4 border-emerald-500 overflow-hidden mb-8 shadow-[0_0_50px_rgba(16,185,129,0.4)] animate-in slide-in-from-bottom-8 duration-700">
                    {identifiedUser.photo_reference_url ? (
                      <img src={identifiedUser.photo_reference_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-6xl">
                        {identifiedUser.name[0]}
                      </div>
                    )}
                  </div>
                  {/* Ícone de Check Flutuante */}
                  <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl border-4 border-[#020408] animate-in zoom-in duration-500 delay-300">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="space-y-1 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                  <p className="text-emerald-500 font-black uppercase text-xs tracking-[0.5em] mb-3">Ponto Registrado!</p>
                  <h3 className="text-5xl font-black uppercase tracking-tighter italic text-white drop-shadow-md">
                    {identifiedUser.name.split(' ')[0]}
                  </h3>
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-[0.3em] mt-6">Bom trabalho e ótima jornada!</p>
                </div>
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
                       onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                           if (adminPassword === '123') {
                             setIsAdminAuth(true);
                             setAdminPassword('');
                             fetchTenants();
                             initializeCache();
                           } else {
                             toast({ title: "Acesso Negado", variant: "destructive" });
                           }
                         }
                       }}
                       placeholder="Senha do Terminal"
                       className="bg-white/5 border-white/10 h-14 rounded-2xl"
                    />
                    <Button 
                       className="w-full h-14 bg-primary text-white font-black uppercase rounded-2xl"
                       onClick={() => {
                          if (adminPassword === '123') {
                             setIsAdminAuth(true);
                             setAdminPassword('');
                             fetchTenants();
                             initializeCache();
                          } else {
                             toast({ title: "Acesso Negado", variant: "destructive" });
                          }
                       }}
                    >
                       Acessar Gestão
                    </Button>
                 </div>
               ) : (
                 <div className="space-y-5 py-2">

                   {/* ── BUSCA DE EMPRESA ── */}
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-1.5">
                       <Building2 className="w-3 h-3" /> Empresa
                     </label>
                     <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                       <input
                         ref={tenantInputRef}
                         type="text"
                         className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-10 text-white text-sm placeholder:text-white/30 outline-none focus:border-primary/50 transition-colors"
                         placeholder="Buscar empresa..."
                         value={tenantSearch}
                         onChange={(e) => {
                           setTenantSearch(e.target.value);
                           setShowTenantDropdown(true);
                         }}
                         onFocus={() => setShowTenantDropdown(true)}
                         onBlur={() => setTimeout(() => setShowTenantDropdown(false), 150)}
                       />
                       {selectedTenantName && (
                         <button
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                           onClick={() => {
                             setSelectedTenantId(TERMINAL_TENANT_ID);
                             setSelectedTenantName('');
                             setTenantSearch('');
                             setEmployees([]);
                             setSelectedEmpId('');
                             setSelectedEmpName('');
                             setEmpSearch('');
                           }}
                         ><X className="w-4 h-4" /></button>
                       )}
                        {showTenantDropdown && (
                          <div className="absolute top-full mt-1 w-full bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                            {isLoadingTenants ? (
                              <div className="flex items-center justify-center gap-2 px-4 py-4 text-white/40">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Buscando empresas...</span>
                              </div>
                            ) : (
                              <>
                                {tenants
                                  .filter(t => t.name.toLowerCase().includes(tenantSearch.toLowerCase()))
                                  .map(t => (
                                    <button
                                      key={t.id}
                                      className="w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                                      onMouseDown={() => {
                                        setSelectedTenantId(t.id);
                                        setSelectedTenantName(t.name);
                                        setTenantSearch(t.name);
                                        setShowTenantDropdown(false);
                                        setSelectedEmpId('');
                                        setSelectedEmpName('');
                                        setEmpSearch('');
                                        initializeCache(t.id);
                                      }}
                                    >
                                      <span className="font-bold">{t.name}</span>
                                      <span className="text-white/30 text-[10px] ml-2 font-mono">{t.id}</span>
                                    </button>
                                  ))}
                                {tenants.filter(t => t.name.toLowerCase().includes(tenantSearch.toLowerCase())).length === 0 && (
                                  <div className="px-4 py-3 text-sm text-white/30 italic">Nenhuma empresa encontrada</div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                     </div>
                   </div>

                   {/* ── BUSCA DE FUNCIONÁRIO ── */}
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-1.5">
                       <User className="w-3 h-3" /> Colaborador
                     </label>
                     <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                       <input
                         ref={empInputRef}
                         type="text"
                         className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-10 text-white text-sm placeholder:text-white/30 outline-none focus:border-primary/50 transition-colors"
                         placeholder="Buscar por nome ou CPF..."
                         value={empSearch}
                         onChange={(e) => {
                           setEmpSearch(e.target.value);
                           setShowEmpDropdown(true);
                           if (!e.target.value) { setSelectedEmpId(''); setSelectedEmpName(''); }
                         }}
                         onFocus={() => setShowEmpDropdown(true)}
                         onBlur={() => setTimeout(() => setShowEmpDropdown(false), 150)}
                       />
                       {selectedEmpName && (
                         <button
                           className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70"
                           onClick={() => { setSelectedEmpId(''); setSelectedEmpName(''); setEmpSearch(''); }}
                         ><X className="w-4 h-4" /></button>
                       )}
                          {showEmpDropdown && (
                          <div className="absolute top-full mt-1 w-full bg-[#0d1526] border border-white/10 rounded-2xl shadow-2xl z-50 max-h-52 overflow-y-auto">
                            {isLoadingEmployees ? (
                              <div className="flex items-center justify-center gap-2 px-4 py-4 text-white/40">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">Buscando colaboradores...</span>
                              </div>
                            ) : (
                              <>
                                {employees
                                  .filter(e => 
                                    e.name.toLowerCase().includes(empSearch.toLowerCase()) || 
                                    (e.cpf && e.cpf.replace(/\D/g, '').includes(empSearch.replace(/\D/g, '')))
                                  )
                                  .map(emp => (
                                    <button
                                      key={emp.id}
                                      className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors first:rounded-t-2xl last:rounded-b-2xl flex items-center gap-3"
                                      onMouseDown={() => {
                                        setSelectedEmpId(emp.id);
                                        setSelectedEmpName(emp.name);
                                        setEmpSearch(emp.name);
                                        setShowEmpDropdown(false);
                                      }}
                                    >
                                      {emp.photo_reference_url ? (
                                        <img src={emp.photo_reference_url} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                          <span className="text-primary font-black text-sm">{emp.name[0]}</span>
                                        </div>
                                      )}
                                      <div className="flex flex-col">
                                        <span className="font-bold text-white/80">{emp.name}</span>
                                        {emp.cpf && <span className="text-[10px] text-white/30 uppercase tracking-tighter">CPF: {emp.cpf}</span>}
                                      </div>
                                    </button>
                                  ))}
                                {employees.filter(e => 
                                  e.name.toLowerCase().includes(empSearch.toLowerCase()) || 
                                  (e.cpf && e.cpf.replace(/\D/g, '').includes(empSearch.replace(/\D/g, '')))
                                ).length === 0 && (
                                  <div className="px-4 py-3 text-sm text-white/30 italic">
                                    {employees.length === 0 ? (
                                      <div className="flex flex-col gap-1">
                                        <span>🏢 Nenhum colaborador encontrado para esta empresa.</span>
                                        <span className="text-[9px] opacity-50 font-mono">ID: {selectedTenantId}</span>
                                      </div>
                                    ) : (
                                      'Nenhum colaborador encontrado com este nome/CPF'
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                     </div>
                     {selectedEmpName && (
                       <p className="text-[10px] text-emerald-500 font-bold ml-1 uppercase tracking-wider">✓ {selectedEmpName} selecionado</p>
                     )}
                   </div>
                      <Button 
                         className={cn(
                           "w-full h-14 font-black uppercase rounded-2xl gap-2 transition-all duration-300",
                           countdown !== null ? "bg-amber-500 scale-[0.98]" : "bg-emerald-500 hover:bg-emerald-600",
                           "text-white disabled:opacity-50"
                         )}
                         onClick={handleCaptureBasePhoto}
                         disabled={isUploadingPhoto || !selectedEmpId || countdown !== null}
                      >
                         {isUploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                          countdown !== null ? <ClockIcon className="w-5 h-5 animate-bounce" /> : <Camera className="w-5 h-5" />}
                         {isUploadingPhoto ? 'Salvando...' : 
                          countdown !== null ? `Preparar (${countdown}s)` : 'Salvar Biometria'}
                      </Button>

                      <div className="grid grid-cols-3 gap-3">
                         <Button 
                            variant="outline" 
                            className="border-white/10 text-white/60 hover:text-white text-[10px] px-1"
                            onClick={handleRefreshEmployees}
                         >
                            Atualizar
                         </Button>
                         <Button 
                            variant="outline" 
                            className="border-white/10 text-white/60 hover:text-white text-[10px] px-1"
                            onClick={handleManualSync}
                         >
                            Sincronizar
                         </Button>
                         <Button 
                            variant="outline" 
                            className="border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 text-[10px] px-1"
                            onClick={() => {
                              if (!selectedEmpId) return toast({ title: "Selecione um funcionário", variant: "destructive" });
                              const emp = employees.find(e => e.id === selectedEmpId);
                              if (emp) {
                                setIdentifiedUser(emp);
                                setStatus('success');
                                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                                audio.play().catch(() => {});
                                setTimeout(() => { setStatus('idle'); setIdentifiedUser(null); setIsAdminAuth(false); setIsRegistering(false); }, 4000);
                              }
                            }}
                         >
                            Testar Batida
                         </Button>
                      </div>

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
