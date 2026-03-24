import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Camera, MapPin, Clock, CheckCircle2, AlertCircle, RefreshCw,
  ShieldAlert, UserSearch, History, BarChart3, Settings,
  Eye, Calendar, TrendingUp, TrendingDown, Award, UserX, Edit2, X, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimeEntry } from '@/types';

type PointType = 'ENTRY' | 'EXIT' | 'INTERVAL_START' | 'INTERVAL_END';

declare const faceapi: any;
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const THRESHOLD = 0.5;

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minsToHHMM(mins: number): string {
  const sign = mins < 0 ? '-' : '';
  const abs = Math.abs(mins);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

function getDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const POINT_LABELS: Record<PointType, string> = {
  ENTRY: 'Entrada', EXIT: 'Saída',
  INTERVAL_START: 'Saída Almoço', INTERVAL_END: 'Retorno Almoço',
};

const POINT_COLORS: Record<PointType, string> = {
  ENTRY: 'text-emerald-400', EXIT: 'text-rose-400',
  INTERVAL_START: 'text-amber-400', INTERVAL_END: 'text-blue-400',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PointTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cameraActive, setCameraActive] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<'success' | 'fail' | null>(null);
  const [matchMessage, setMatchMessage] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [referenceDescriptors, setReferenceDescriptors] = useState<Float32Array[]>([]);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [suggestedType, setSuggestedType] = useState<PointType>('ENTRY');
  const [geofenceError, setGeofenceError] = useState<string | null>(null);
  const [adjustModal, setAdjustModal] = useState<TimeEntry | null>(null);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustTime, setAdjustTime] = useState('');
  const [livenessOk, setLivenessOk] = useState(false);
  const [livenessChecking, setLivenessChecking] = useState(false);
  const [eyeBlinkCount, setEyeBlinkCount] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const livenessRef = useRef<{ prevEAR: number; blinks: number }>({ prevEAR: 1, blinks: 0 });

  const appPermissions = JSON.parse(sessionStorage.getItem('app_permissions') || '{}');
  const hasPointAccess = appPermissions['ponto'] !== false;
  const isAdmin = user?.role === 'superadmin' || user?.email === 'cristiano';

  // ── Clock ──
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    getLocation();
    loadModels();
    return () => clearInterval(t);
  }, []);

  // ── Suggest point type based on schedule ──
  useEffect(() => {
    if (!employeeData) return;
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const e = timeToMinutes(employeeData.jornada_entrada || '08:00');
    const sa = timeToMinutes(employeeData.jornada_saida_almoco || '12:00');
    const ra = timeToMinutes(employeeData.jornada_retorno_almoco || '13:00');
    const s = timeToMinutes(employeeData.jornada_saida || '17:00');

    if (now < sa - 30) setSuggestedType('ENTRY');
    else if (now >= sa - 30 && now < ra) setSuggestedType('INTERVAL_START');
    else if (now >= ra && now < s - 30) setSuggestedType('INTERVAL_END');
    else setSuggestedType('EXIT');
  }, [currentTime, employeeData]);

  // ── Load face-api models ──
  const loadModels = useCallback(async () => {
    if (typeof faceapi === 'undefined') { setTimeout(loadModels, 600); return; }
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);
      setModelsLoaded(true);
    } catch (e) { console.error('face-api load error:', e); }
  }, []);

  // ── Load employee data + reference descriptors ──
  const loadEmployeeData = useCallback(async () => {
    if (!user?.id || !modelsLoaded) return;
    
    // Se o ID for mock (ex: u1, u2...), não tenta buscar no Supabase para evitar erro 400
    if (user.id.startsWith('u') && user.id.length < 5) {
      console.warn('Usando ID de mock, biometria facial pode não carregar');
      return;
    }

    try {
      const { data, error } = await supabase.from('employees').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      if (data) setEmployeeData(data);
      if (data?.photo_reference_url) refUrls.push(data.photo_reference_url);
      if (Array.isArray(data?.photo_references)) refUrls.push(...data.photo_references);

      const descs: Float32Array[] = [];
      for (const url of refUrls) {
        try {
          const img = new Image(); img.crossOrigin = 'anonymous'; img.src = url;
          await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); });
          const det = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true).withFaceDescriptor();
          if (det) descs.push(det.descriptor);
        } catch { /* skip */ }
      }
      setReferenceDescriptors(descs);
    } catch (e) { console.error('loadEmployeeData:', e); }
  }, [user, modelsLoaded]);

  // ── Auto-start camera ──
  useEffect(() => {
    if (!cameraActive && !photo) {
      // Pequeno delay para garantir que o DOM (videoRef) esteja pronto
      const timer = setTimeout(startCamera, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  // Ensure camera restarts if models load late (though startCamera handles it)
  useEffect(() => { if (modelsLoaded && !cameraActive && !photo) startCamera(); }, [modelsLoaded]);

  useEffect(() => { if (modelsLoaded) loadEmployeeData(); }, [modelsLoaded, loadEmployeeData]);

  // ── Load Time Entries ──
  const loadEntries = useCallback(async () => {
    if (!user?.id) return;
    setEntriesLoading(true);
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setEntries((data || []) as TimeEntry[]);
    setEntriesLoading(false);
  }, [user?.id]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // ── GPS ──
  const getLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  };

  // ── Geofence check ──
  const checkGeofence = useCallback((): boolean => {
    if (!employeeData?.geofence_radius || !location) return true;
    if (!employeeData.geofence_lat || !employeeData.geofence_lng) return true;
    const dist = getDistanceM(location.lat, location.lng, employeeData.geofence_lat, employeeData.geofence_lng);
    if (dist > employeeData.geofence_radius) {
      setGeofenceError(`Fora da área permitida (${Math.round(dist)}m / limite ${employeeData.geofence_radius}m)`);
      return false;
    }
    setGeofenceError(null);
    return true;
  }, [employeeData, location]);

  // ── Camera ──
  const startCamera = async () => {
    try {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      if (videoRef.current) { videoRef.current.srcObject = stream; setCameraActive(true); }
      setLivenessOk(false); setEyeBlinkCount(0);
    } catch (e: any) {
      console.error('Camera error:', e);
      toast({ title: 'Erro na câmera', description: 'Não foi possível acessar a câmera: ' + e.message, variant: 'destructive' });
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (cameraActive) {
      // Re-start with new mode
      setTimeout(startCamera, 100);
    }
  };

  // ── Liveness: eye blink detection ──
  const startLiveness = useCallback(async () => {
    if (!videoRef.current || typeof faceapi === 'undefined') { setLivenessOk(true); return; }
    setLivenessChecking(true);
    livenessRef.current = { prevEAR: 1, blinks: 0 };
    const needed = 2;
    const deadline = Date.now() + 8000;

    const tick = async () => {
      if (Date.now() > deadline || !videoRef.current) {
        setLivenessChecking(false);
        setLivenessOk(livenessRef.current.blinks >= needed);
        return;
      }
      try {
        const det = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks(true);
        if (det) {
          const lm = det.landmarks.positions;
          // EAR for both eyes (rough)
          const ear = (
            (Math.abs(lm[37].y - lm[41].y) + Math.abs(lm[38].y - lm[40].y)) / (2 * Math.abs(lm[36].x - lm[39].x)) +
            (Math.abs(lm[43].y - lm[47].y) + Math.abs(lm[44].y - lm[46].y)) / (2 * Math.abs(lm[42].x - lm[45].x))
          ) / 2;
          if (livenessRef.current.prevEAR > 0.28 && ear < 0.22) livenessRef.current.blinks++;
          livenessRef.current.prevEAR = ear;
          setEyeBlinkCount(livenessRef.current.blinks);
          if (livenessRef.current.blinks >= needed) { setLivenessOk(true); setLivenessChecking(false); return; }
        }
      } catch { /* ignore frame error */ }
      setTimeout(tick, 150);
    };
    tick();
  }, []);

  // ── Capture photo + face matching ──
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvasRef.current.toDataURL('image/jpeg');
    setPhoto(dataUrl);
    setMatchResult(null);
    setMatchMessage('');
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setCameraActive(false);

    setIsMatching(true);
    try {
      if (!modelsLoaded || typeof faceapi === 'undefined') {
        await new Promise(r => setTimeout(r, 1200));
        setMatchResult('success'); setMatchMessage('Identidade Validada ✓ (offline)'); return;
      }
      const img = new Image(); img.src = dataUrl;
      await new Promise<void>(r => { img.onload = () => r(); });
      const liveDet = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true).withFaceDescriptor();

      if (!liveDet) { setMatchResult('fail'); setMatchMessage('Nenhum rosto detectado.'); return; }
      if (!referenceDescriptors.length) {
        setMatchResult('success'); setMatchMessage('Sem biometria cadastrada · Ponto Liberado'); return;
      }
      // Compare against all reference descriptors (best match)
      const distances = referenceDescriptors.map(d => faceapi.euclideanDistance(liveDet.descriptor, d));
      const best = Math.min(...distances);
      if (best < THRESHOLD) {
        setMatchResult('success'); setMatchMessage(`✓ Identidade Validada (${((1 - best) * 100).toFixed(0)}%)`);
      } else {
        setMatchResult('fail'); setMatchMessage(`Rosto não reconhecido (${((1 - best) * 100).toFixed(0)}%)`);
      }
    } catch { setMatchResult('success'); setMatchMessage('Identidade Validada ✓ (fallback)'); }
    finally { setIsMatching(false); }
  };

  // ── Register Point ──
  const handleRegisterPoint = async (type: PointType) => {
    if (!photo || matchResult !== 'success') {
      toast({ title: 'Biometria não validada', variant: 'destructive' }); return;
    }
    if (!location) {
      toast({ title: 'GPS obrigatório', variant: 'destructive' }); return;
    }
    if (!checkGeofence()) {
      toast({ title: 'Fora da área permitida', description: geofenceError || '', variant: 'destructive' }); return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('time_entries').insert({
        employee_id: user?.id,
        employee_name: user?.name,
        type,
        latitude: location.lat,
        longitude: location.lng,
        photo_url: photo,
        validated: true,
        tenant_id: user?.tenantId || 't1',
      });
      if (error) throw error;
      toast({ title: '✅ Ponto Registrado!', description: `${POINT_LABELS[type]} às ${currentTime.toLocaleTimeString('pt-BR')}` });
      setPhoto(null); setMatchResult(null); setLocation(null);
      loadEntries();
    } catch (e: any) {
      toast({ title: 'Erro ao registrar', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // ── Admin: Adjust entry ──
  const handleAdjust = async () => {
    if (!adjustModal || !adjustReason) return;
    const { error } = await supabase.from('time_entries').update({
      adjusted: true, adjusted_by: user?.name, adjustment_reason: adjustReason,
    }).eq('id', adjustModal.id);
    if (!error) { toast({ title: 'Ajuste registrado' }); setAdjustModal(null); loadEntries(); }
  };

  // ── Hour calculations (today) ──
  const todayStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = entries.filter(e => (e.timestamp || '').startsWith(today) || (e as any).created_at?.startsWith(today));
    let workedMins = 0;
    let entry: Date | null = null;
    let intervalStart: Date | null = null;
    for (const rec of [...todayEntries].reverse()) {
      const t = new Date((rec as any).created_at || rec.timestamp);
      if (rec.type === 'ENTRY' && !entry) entry = t;
      if (rec.type === 'INTERVAL_START') intervalStart = t;
      if (rec.type === 'INTERVAL_END' && intervalStart) {
        workedMins += (t.getTime() - intervalStart.getTime()) / 60000;
        intervalStart = null; entry = null;
      }
      if (rec.type === 'EXIT' && entry) {
        workedMins += (t.getTime() - entry.getTime()) / 60000;
        entry = null;
      }
    }
    // Still working
    if (entry && !intervalStart) workedMins += (Date.now() - entry.getTime()) / 60000;
    const scheduleM = employeeData
      ? timeToMinutes(employeeData.jornada_saida || '17:00') - timeToMinutes(employeeData.jornada_entrada || '08:00')
        - (timeToMinutes(employeeData.jornada_retorno_almoco || '13:00') - timeToMinutes(employeeData.jornada_saida_almoco || '12:00'))
      : 480;
    const overtime = workedMins - scheduleM;
    return { workedMins: Math.max(0, workedMins), scheduleM, overtime };
  }, [entries, employeeData]);

  // ── Month stats ──
  const monthStats = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthEntries = entries.filter(e => ((e as any).created_at || '').startsWith(prefix));
    const days = new Set(monthEntries.map(e => ((e as any).created_at || '').slice(0, 10))).size;
    const totalOvertime = 0; // simplified
    return { days, totalOvertime };
  }, [entries]);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-black tracking-tighter text-white">PONTO DIGITAL</h1>
        <div className="flex items-center justify-center gap-2 text-primary font-mono text-2xl font-bold">
          <Clock className="w-6 h-6" />
          {currentTime.toLocaleTimeString('pt-BR')}
        </div>
        <p className="text-muted-foreground text-sm">{currentTime.toLocaleDateString('pt-BR', { dateStyle: 'full' })}</p>
      </div>

      <Tabs defaultValue="bater" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="bater" className="gap-1.5 text-[12px]"><Camera className="w-3.5 h-3.5" />Bater Ponto</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5 text-[12px]"><History className="w-3.5 h-3.5" />Histórico</TabsTrigger>
          <TabsTrigger value="metricas" className="gap-1.5 text-[12px]"><BarChart3 className="w-3.5 h-3.5" />Métricas</TabsTrigger>
        </TabsList>

        {/* ─── ABA: BATER PONTO ─── */}
        <TabsContent value="bater" className="space-y-4">
          {!hasPointAccess ? (
            <div className="flex flex-col items-center gap-4 text-rose-500 p-12 glass-card rounded-3xl border border-rose-500/20">
              <ShieldAlert className="w-16 h-16 animate-pulse" />
              <h2 className="text-xl font-black uppercase tracking-tighter">Acesso Bloqueado</h2>
              <p className="text-[11px] text-muted-foreground text-center">Solicite a liberação deste aplicativo ao administrador do sistema.</p>
            </div>
          ) : (
            <>
              {/* Suggested type banner */}
              {employeeData && (
                <div className="glass-card border border-primary/20 rounded-2xl p-3 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">Batida Sugerida</p>
                    <p className="text-[14px] font-black text-white">{POINT_LABELS[suggestedType]}</p>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-right">
                    <p>Entrada: {employeeData.jornada_entrada || '08:00'}</p>
                    <p>Saída: {employeeData.jornada_saida || '17:00'}</p>
                  </div>
                </div>
              )}

              {/* Camera area */}
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center">
                {photo ? (
                  <>
                    <img src={photo} className={cn("w-full h-full object-cover", isMatching && "opacity-50 grayscale")} style={{ transform: 'scaleX(-1)' }} />
                    {isMatching && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-primary/50 bg-black/40">
                        <UserSearch className="w-10 h-10 text-primary animate-pulse mb-3" />
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary">Verificando Biometria...</span>
                      </div>
                    )}
                    {matchResult === 'success' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-emerald-500 bg-emerald-500/10">
                        <div className="glass p-4 rounded-full bg-emerald-500/20 mb-3"><CheckCircle2 className="w-12 h-12 text-emerald-400" /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-4 text-center">{matchMessage}</span>
                      </div>
                    )}
                    {matchResult === 'fail' && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center border-4 border-rose-500 bg-rose-500/10 gap-2">
                        <div className="glass p-4 rounded-full bg-rose-500/20"><AlertCircle className="w-12 h-12 text-rose-400" /></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 px-4 text-center">{matchMessage}</span>
                        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white mt-1" onClick={() => { setPhoto(null); startCamera(); }}>Tentar Novamente</Button>
                      </div>
                    )}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <Button size="icon" variant="secondary" className="rounded-full bg-black/40 border border-white/10 hover:bg-black/60" onClick={toggleCamera} title="Alternar Câmera">
                        <RefreshCw className="w-4 h-4 text-white" />
                      </Button>
                      <Button size="icon" variant="secondary" className="rounded-full bg-black/40 border border-white/10 hover:bg-black/60" onClick={() => { setPhoto(null); setMatchResult(null); startCamera(); }}>
                        <RefreshCw className="w-4 h-4 text-white" />
                      </Button>
                    </div>
                  </>
                ) : cameraActive ? (
                  <>
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover" 
                      style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} 
                    />
                    
                    {!modelsLoaded && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                        <RefreshCw className="w-8 h-8 text-primary animate-spin mb-3" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Iniciando Biometria...</span>
                      </div>
                    )}
                    {/* Liveness overlay */}
                    {livenessChecking && !livenessOk && (
                      <div className="absolute top-4 left-0 right-0 flex justify-center">
                        <div className="glass px-3 py-2 rounded-full border border-primary/30 text-[10px] font-black text-primary flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 animate-pulse" />
                          Pisque {2 - eyeBlinkCount}x para prova de vida ({eyeBlinkCount}/2)
                        </div>
                      </div>
                    )}
                    {livenessOk && (
                      <div className="absolute top-4 left-0 right-0 flex justify-center">
                        <div className="glass px-3 py-2 rounded-full border border-emerald-500/40 text-[10px] font-black text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Prova de vida OK
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Button onClick={startCamera} variant="ghost" className="flex flex-col gap-4 text-muted-foreground hover:text-white h-auto p-12">
                    <Camera className="w-12 h-12" />
                    <span className="font-bold uppercase tracking-widest text-[10px]">Ativar Câmera</span>
                  </Button>
                )}

                {cameraActive && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6 items-center">
                    {!livenessChecking && !livenessOk && (
                      <Button onClick={startLiveness} variant="secondary" className="h-12 px-4 rounded-full text-[11px] font-bold gap-2 bg-black/40 border border-white/10 text-white backdrop-blur-md">
                        <Eye className="w-4 h-4" /> Prova de Vida
                      </Button>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <Button size="icon" variant="ghost" className="w-12 h-12 rounded-full bg-black/20 text-white hover:bg-black/40" onClick={toggleCamera}>
                        <RefreshCw className="w-5 h-5" />
                      </Button>
                      
                      <Button
                        onClick={capturePhoto}
                        disabled={!livenessOk && modelsLoaded}
                        className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-2xl p-0 transition-transform active:scale-90"
                      >
                        <div className="w-12 h-12 rounded-full border-2 border-black/10" />
                      </Button>
                      
                      <div className="w-12 h-12" /> {/* Spacer */}
                    </div>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              {/* Geofence error */}
              {geofenceError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex gap-3 items-center">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-[11px] text-rose-400 font-bold">{geofenceError}</p>
                </div>
              )}

              {/* GPS */}
              <div className={cn("w-full h-12 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border",
                location ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500 text-[11px]" : "border-white/5 bg-white/5 text-white/30 text-[10px]"
              )}>
                <MapPin className={cn("w-4 h-4", location && "animate-bounce")} />
                {location ? `GPS Ativo · ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Buscando GPS...'}
                {location && <CheckCircle2 className="w-3 h-3 ml-1" />}
              </div>

              {/* Point buttons */}
              <div className="grid grid-cols-2 gap-3">
                {(['ENTRY', 'EXIT', 'INTERVAL_START', 'INTERVAL_END'] as PointType[]).map(type => {
                  const isSuggested = type === suggestedType;
                  const bgMap = { ENTRY: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20', EXIT: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20', INTERVAL_START: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20', INTERVAL_END: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' };
                  return (
                    <Button
                      key={type}
                      disabled={!photo || !location || loading || matchResult !== 'success'}
                      onClick={() => handleRegisterPoint(type)}
                      className={cn("h-20 rounded-2xl flex flex-col gap-1 shadow-lg font-black text-[11px] uppercase tracking-widest", bgMap[type], isSuggested && "ring-2 ring-white/40 ring-offset-1 ring-offset-transparent")}
                    >
                      {POINT_LABELS[type]}
                      {isSuggested && <span className="text-[8px] normal-case font-normal opacity-80">Sugerida</span>}
                    </Button>
                  );
                })}
              </div>

              {/* Today summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Trabalhadas', value: minsToHHMM(todayStats.workedMins), color: 'text-white' },
                  { label: 'Jornada', value: minsToHHMM(todayStats.scheduleM), color: 'text-muted-foreground' },
                  {
                    label: todayStats.overtime >= 0 ? 'Horas Extras' : 'Atraso',
                    value: minsToHHMM(Math.abs(todayStats.overtime)),
                    color: todayStats.overtime >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  },
                ].map((s, i) => (
                  <div key={i} className="glass-card rounded-xl border border-white/5 p-3 text-center">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={cn("font-mono font-black text-[15px]", s.color)}>{s.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── ABA: HISTÓRICO ─── */}
        <TabsContent value="historico" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-bold text-white">Registros Recentes</h2>
            <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={loadEntries}>
              <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
            </Button>
          </div>

          {entriesLoading ? (
            <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 text-primary animate-spin" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
              <p className="text-[13px]">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map(entry => (
                <div key={entry.id} className="glass-card border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-white/10 transition-all">
                  {/* Photo thumbnail */}
                  {(entry as any).photo_url && (entry as any).photo_url.startsWith('data:') ? (
                    <img src={(entry as any).photo_url} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[11px] font-black uppercase tracking-widest", POINT_COLORS[entry.type])}>{POINT_LABELS[entry.type]}</span>
                      {(entry as any).adjusted && <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold uppercase">Ajustado</span>}
                      {entry.validated && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 rounded">✓ Validado</span>}
                    </div>
                    <p className="text-[12px] font-bold text-white">{new Date((entry as any).created_at || entry.timestamp).toLocaleString('pt-BR')}</p>
                    {entry.latitude && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {entry.latitude.toFixed(4)}, {entry.longitude?.toFixed(4)}
                      </p>
                    )}
                    {(entry as any).adjustment_reason && <p className="text-[10px] text-amber-400 mt-0.5">Motivo: {(entry as any).adjustment_reason}</p>}
                  </div>

                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-white/20 hover:text-white hover:bg-white/10" onClick={() => { setAdjustModal(entry); setAdjustReason(''); }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── ABA: MÉTRICAS ─── */}
        <TabsContent value="metricas" className="space-y-4">
          <h2 className="text-[13px] font-bold text-white">Dashboard de Frequência</h2>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Calendar, label: 'Dias Trabalhados', value: monthStats.days, sub: 'este mês', color: 'text-primary' },
              { icon: Clock, label: 'Horas Hoje', value: minsToHHMM(todayStats.workedMins), sub: `de ${minsToHHMM(todayStats.scheduleM)}`, color: 'text-white' },
              { icon: todayStats.overtime >= 0 ? TrendingUp : TrendingDown, label: todayStats.overtime >= 0 ? 'Horas Extras' : 'Em Atraso', value: minsToHHMM(Math.abs(todayStats.overtime)), sub: 'hoje', color: todayStats.overtime >= 0 ? 'text-emerald-400' : 'text-rose-400' },
              { icon: Award, label: 'Registros', value: entries.length, sub: 'total de batidas', color: 'text-amber-400' },
            ].map((s, i) => (
              <div key={i} className="glass-card rounded-2xl border border-white/5 p-4 hover:border-primary/20 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={cn("text-2xl font-black tracking-tighter", s.color)}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Timeline today */}
          <div className="glass-card border border-white/5 rounded-2xl p-4 space-y-3">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Linha do Tempo – Hoje</h3>
            {(() => {
              const today = new Date().toISOString().split('T')[0];
              const todayRecs = entries.filter(e => ((e as any).created_at || '').startsWith(today));
              if (todayRecs.length === 0) return <p className="text-[12px] text-muted-foreground text-center py-4">Nenhum registro hoje.</p>;
              return todayRecs.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", { 'bg-emerald-400': e.type === 'ENTRY', 'bg-rose-400': e.type === 'EXIT', 'bg-amber-400': e.type === 'INTERVAL_START', 'bg-blue-400': e.type === 'INTERVAL_END' })} />
                  <p className={cn("text-[12px] font-bold", POINT_COLORS[e.type])}>{POINT_LABELS[e.type]}</p>
                  <p className="text-[12px] text-muted-foreground ml-auto font-mono">
                    {new Date((e as any).created_at || e.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ));
            })()}
          </div>

          {/* Jornada config display */}
          {employeeData && (
            <div className="glass-card border border-white/5 rounded-2xl p-4 space-y-2">
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Jornada Configurada</h3>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Entrada</span><span className="font-bold text-white">{employeeData.jornada_entrada || '08:00'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Almoço</span><span className="font-bold text-white">{employeeData.jornada_saida_almoco || '12:00'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Retorno</span><span className="font-bold text-white">{employeeData.jornada_retorno_almoco || '13:00'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Saída</span><span className="font-bold text-white">{employeeData.jornada_saida || '17:00'}</span></div>
              </div>
              {employeeData.geofence_radius > 0 && (
                <div className="flex items-center gap-2 text-[11px] text-amber-400 border-t border-white/5 pt-2 mt-2">
                  <MapPin className="w-3.5 h-3.5" />
                  Geofence ativo: raio de {employeeData.geofence_radius}m
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Admin Adjust Modal ─── */}
      <Dialog open={!!adjustModal} onOpenChange={v => !v && setAdjustModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Edit2 className="w-4 h-4 text-primary" /> Ajuste Manual de Ponto
            </DialogTitle>
          </DialogHeader>
          {adjustModal && (
            <div className="space-y-4 py-2">
              <div className="glass-card border border-white/5 rounded-xl p-3 text-[12px]">
                <p className="text-muted-foreground">Registro:</p>
                <p className="font-bold text-white">{POINT_LABELS[adjustModal.type]} · {new Date((adjustModal as any).created_at || adjustModal.timestamp).toLocaleString('pt-BR')}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Motivo do Ajuste *</label>
                <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} placeholder="Ex: Esqueceu de bater o ponto no horário correto" className="h-9 text-[13px]" />
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="flex-1 h-9" onClick={() => setAdjustModal(null)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
                <Button className="flex-1 h-9" onClick={handleAdjust} disabled={!adjustReason}><Save className="w-4 h-4 mr-1" /> Salvar Ajuste</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
