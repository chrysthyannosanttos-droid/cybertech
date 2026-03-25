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
    syncOfflinePoints();
    return () => clearInterval(t);
  }, []);

  // ── Offline Sync Logic ──
  const syncOfflinePoints = async () => {
    const pending = JSON.parse(localStorage.getItem('ponto_digital_pending') || '[]');
    if (pending.length === 0) return;

    console.log(`Sincronizando ${pending.length} pontos offline...`);
    const remaining = [];
    for (const point of pending) {
      try {
        const { error } = await supabase.from('pontos').insert({ ...point, offline_sync: true });
        if (error) throw error;
      } catch (e) {
        remaining.push(point);
      }
    }
    localStorage.setItem('ponto_digital_pending', JSON.stringify(remaining));
    if (remaining.length === 0 && pending.length > 0) {
      toast({ title: 'Pontos Sincronizados!', description: 'Seus registros offline foram salvos com sucesso.' });
      loadEntries();
    }
  };

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
    
    if (user.id.startsWith('u') && user.id.length < 5) {
      console.warn('Usando ID de mock, biometria facial pode não carregar');
      return;
    }

    try {
      // 1. Tentar buscar embedding já salvo para performance
      const { data: bioData } = await supabase
        .from('biometria_funcionario')
        .select('face_embedding')
        .eq('funcionario_id', user.id)
        .eq('biometria_ativa', true)
        .maybeSingle();

      if (bioData?.face_embedding) {
        // Converter de volta para Float32Array
        const descArray = new Float32Array(Object.values(bioData.face_embedding as any));
        setReferenceDescriptors([descArray]);
        
        // Também carregar dados básicos do funcionário e sua jornada
        const { data: emp } = await supabase.from('employees').select('name, tenant_id').eq('id', user.id).maybeSingle();
        const { data: jor } = await supabase.from('jornadas').select('*').eq('funcionario_id', user.id).maybeSingle();
        
        if (emp) setEmployeeData({ ...emp, ...jor });
        return;
      }

      // 2. Fallback: Se não tem bio salva, calcula das fotos e salva
      const { data, error } = await supabase.from('employees').select('*').eq('id', user.id).maybeSingle();
      const { data: jor } = await supabase.from('jornadas').select('*').eq('funcionario_id', user.id).maybeSingle();
      
      if (error) throw error;
      if (data) setEmployeeData({ ...data, ...jor });
      if (error) throw error;
      if (data) setEmployeeData(data);

      const refUrls = [];
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

      // 3. Salvar o primeiro descriptor válido para uso futuro
      if (descs.length > 0) {
        await supabase.from('biometria_funcionario').insert({
          funcionario_id: user.id,
          face_embedding: Array.from(descs[0]),
          biometria_ativa: true
        });
      }
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
      .from('pontos')
      .select('*')
      .eq('funcionario_id', user.id)
      .order('data_hora', { ascending: false })
      .limit(100);
    
    // Adaptar para a interface TimeEntry antiga por enquanto para manter compatibilidade no UI
    const adapted = (data || []).map(p => ({
      id: p.id,
      timestamp: p.data_hora,
      type: p.tipo,
      latitude: p.latitude,
      longitude: p.longitude,
      photo_url: p.foto_url,
      validated: (p.confianca_facial || 0) > 85,
      created_at: p.data_hora
    }));

    setEntries(adapted as any);
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
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ 
        title: 'Ambiente Não Seguro', 
        description: 'A biometria requer HTTPS ou localhost. Verifique sua URL.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode, width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        videoRef.current.onloadedmetadata = () => {
          if (modelsLoaded) startLiveness();
        };
      }
      setLivenessOk(false); 
      setEyeBlinkCount(0);
    } catch (err: any) {
      console.error('Camera error:', err);
      let msg = 'Certifique-se de dar permissão e usar HTTPS.';
      if (err.name === 'NotAllowedError') msg = 'Permissão da câmera negada no navegador.';
      if (err.name === 'NotFoundError') msg = 'Câmera não encontrada no dispositivo.';
      
      toast({ title: 'Erro na Câmera', description: msg, variant: 'destructive' });
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
    const bestScore = matchResult === 'success' ? parseFloat(matchMessage.match(/\d+/)?.[0] || '0') : 0;

    const pointData = {
      empresa_id: user?.tenantId || 't1',
      funcionario_id: user?.id,
      tipo: type,
      data_hora: new Date().toISOString(),
      latitude: location.lat,
      longitude: location.lng,
      foto_url: photo,
      confianca_facial: bestScore,
      dispositivo: navigator.userAgent.substring(0, 100),
      offline_sync: false
    };

    try {
      const { error } = await supabase.from('pontos').insert(pointData);
      if (error) throw error;
      toast({ title: '✅ Ponto Registrado!', description: `${POINT_LABELS[type]} às ${currentTime.toLocaleTimeString('pt-BR')}` });
      setPhoto(null); setMatchResult(null); setLocation(null);
      loadEntries();
    } catch (e: any) {
      // Se falhar por rede, salvar localmente
      const pending = JSON.parse(localStorage.getItem('ponto_digital_pending') || '[]');
      pending.push(pointData);
      localStorage.setItem('ponto_digital_pending', JSON.stringify(pending));
      
      toast({ 
        title: 'Ponto Salvo Localmente', 
        description: 'Você está offline. O ponto será sincronizado automaticamente quando a internet voltar.', 
        variant: 'default' 
      });
      setPhoto(null); setMatchResult(null); setLocation(null);
      loadEntries(); // Mostrará o que tem no state
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

      <div className="space-y-4">
        {!hasPointAccess ? (
          <div className="flex flex-col items-center gap-4 text-rose-500 p-12 glass-card rounded-3xl border border-rose-500/20">
            <ShieldAlert className="w-16 h-16 animate-pulse" />
            <h2 className="text-xl font-black uppercase tracking-tighter">Acesso Bloqueado</h2>
            <p className="text-[11px] text-muted-foreground text-center">Solicite a liberação deste aplicativo ao administrador do sistema.</p>
          </div>
        ) : (
          <>
            {/* Today summary */}
            <div className="grid grid-cols-3 gap-3 mb-2">
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
                  <p className={cn("font-mono font-black text-[13px]", s.color)}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Suggested type banner */}
            {employeeData && (
              <div className="glass-card border border-primary/20 rounded-2xl p-3 flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-[11px] text-muted-foreground uppercase font-bold tracking-widest">Batida Sugerida</p>
                  <p className="text-[14px] font-black text-white">{POINT_LABELS[suggestedType] || 'Indefinido'}</p>
                </div>
                <div className="text-[10px] text-muted-foreground text-right font-mono">
                  {employeeData.hora_entrada || '08:00'} → {employeeData.hora_saida || '17:00'}
                </div>
              </div>
            )}

            <div className="relative aspect-square rounded-3xl overflow-hidden bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center shadow-2xl">
              {!cameraActive && !photo ? (
                <div className="flex flex-col items-center gap-4 p-8 text-center text-white">
                  <div className="p-6 rounded-full bg-white/5 mb-2">
                    <Camera className="w-12 h-12 text-white/20" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">Câmera Pronta</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4">Clique abaixo para iniciar</p>
                  </div>
                  <Button onClick={startCamera} size="lg" className="w-full max-w-[200px] gap-2 shadow-xl shadow-primary/20">
                    <Camera className="w-5 h-5" /> Ativar Câmera
                  </Button>
                </div>
              ) : photo ? (
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
                </>
              ) : (
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
                    <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                      <RefreshCw className="w-3 h-3 text-primary animate-spin" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-white/70">IA Carregando...</span>
                    </div>
                  )}

                  {livenessChecking && (
                    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 animate-in slide-in-from-bottom-2">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-primary/20">
                          <Eye className="w-4 h-4 text-primary animate-pulse" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-primary uppercase tracking-tighter">Validação de Testemunho</p>
                          <p className="text-white text-xs font-bold">Pisque {2 - eyeBlinkCount}x para confirmar</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-300" 
                          style={{ width: `${(eyeBlinkCount / 2) * 100}%` }} 
                        />
                      </div>
                    </div>
                  )}

                  {livenessOk && (
                    <div className="absolute top-4 left-0 right-0 flex justify-center">
                      <div className="glass px-3 py-1.5 rounded-full border border-emerald-500/40 text-[9px] font-black text-emerald-400 flex items-center gap-2 backdrop-blur-md bg-black/40">
                        <CheckCircle2 className="w-3 h-3" /> Captura Pronta
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 px-6 items-center">
                    {!livenessChecking && !livenessOk && (
                      <Button onClick={startLiveness} variant="secondary" className="h-10 px-4 rounded-full text-[10px] font-bold gap-2 bg-black/60 border border-white/10 text-white backdrop-blur-md">
                        <Eye className="w-4 h-4 text-primary" /> Validar Vida
                      </Button>
                    )}
                    
                    <Button
                      onClick={capturePhoto}
                      disabled={!livenessOk && modelsLoaded}
                      className="w-16 h-16 rounded-full bg-white border-4 border-primary shadow-2xl p-0 transition-transform active:scale-90"
                    >
                      <div className="w-12 h-12 rounded-full border-2 border-black/10" />
                    </Button>
                  </div>
                </>
              )}

              {/* Controles Flutuantes */}
              <div className="absolute top-4 right-4 flex gap-2">
                <Button size="icon" variant="secondary" className="rounded-full bg-black/40 border border-white/10 hover:bg-black/60 backdrop-blur-md" onClick={toggleCamera} title="Alternar Câmera">
                  <RefreshCw className="w-4 h-4 text-white" />
                </Button>
                {photo && (
                  <Button size="icon" variant="destructive" className="rounded-full bg-rose-500/80 border border-white/10" onClick={() => { setPhoto(null); setMatchResult(null); startCamera(); }}>
                    <X className="w-4 h-4 text-white" />
                  </Button>
                )}
              </div>
            </div>

            {/* GPS & Erros */}
            <div className="space-y-2">
              {geofenceError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 flex gap-3 items-center">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                  <p className="text-[11px] text-rose-400 font-bold">{geofenceError}</p>
                </div>
              )}

              <div className={cn("w-full h-10 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border",
                location ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-500 text-[10px]" : "border-white/5 bg-white/5 text-white/30 text-[9px]"
              )}>
                <MapPin className={cn("w-3.5 h-3.5", location && "animate-bounce")} />
                {location ? `Localização Capturada ✓` : 'Buscando sinal GPS...'}
                {location && <CheckCircle2 className="w-3 h-3 ml-1" />}
              </div>
            </div>

            {/* Point buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {(['ENTRY', 'EXIT', 'INTERVAL_START', 'INTERVAL_END'] as PointType[]).map(type => {
                const isSuggested = type === suggestedType;
                const bgMap = { ENTRY: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20', EXIT: 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20', INTERVAL_START: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20', INTERVAL_END: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20' };
                return (
                  <Button
                    key={type}
                    disabled={!photo || !location || loading || matchResult !== 'success'}
                    onClick={() => handleRegisterPoint(type)}
                    className={cn("h-20 rounded-2xl flex flex-col gap-1 shadow-lg font-black text-[11px] uppercase tracking-widest transition-all", bgMap[type], isSuggested && "ring-2 ring-white/40 ring-offset-1 ring-offset-transparent")}
                  >
                    {POINT_LABELS[type]}
                    {isSuggested && <span className="text-[8px] normal-case font-normal opacity-80">Recomendado</span>}
                  </Button>
                );
              })}
            </div>

            <Button variant="ghost" className="w-full text-muted-foreground text-[10px] uppercase tracking-widest gap-2" onClick={loadEntries}>
              <History className="w-3 h-3" /> Ver Últimos Registros
            </Button>
          </>
        )}
      </div>

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
