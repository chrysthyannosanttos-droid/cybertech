import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShieldCheck, CalendarClock, RefreshCw, Settings2, Trash2, CheckCircle2, XCircle, Camera, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

declare const faceapi: any;
const MODELS_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

export default function PointEmployees() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [jornada, setJornada] = useState({
    hora_entrada: '08:00',
    hora_saida: '17:00',
    intervalo_inicio: '12:00',
    intervalo_fim: '13:00'
  });

  // Biometric Enrollment State
  const [bioModalOpen, setBioModalOpen] = useState(false);
  const [selectedBioEmp, setSelectedBioEmp] = useState<any>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [captureDescriptor, setCaptureDescriptor] = useState<Float32Array | null>(null);
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Buscar funcionários e suas biometrias
      const { data: emps } = await supabase.from('employees').select('id, name, role, photo_reference_url');
      const { data: bios } = await supabase.from('biometria_funcionario').select('funcionario_id, biometria_ativa');
      const { data: jors } = await supabase.from('jornadas').select('*');

      const enriched = emps?.map(e => ({
        ...e,
        hasBio: bios?.some(b => b.funcionario_id === e.id && b.biometria_ativa),
        jornada: jors?.find(j => j.funcionario_id === e.id)
      }));

      setEmployees(enriched || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ── Biometric Logic ──
  const loadModels = async () => {
    if (typeof faceapi === 'undefined') {
      setTimeout(loadModels, 500);
      return;
    }
    if (modelsLoaded) return;
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);
      setModelsLoaded(true);
    } catch (e) {
      console.error('Face-api load error:', e);
      toast({ title: 'Erro ao carregar biometria', description: 'Não foi possível carregar os modelos de reconhecimento facial.', variant: 'destructive' });
    }
  };

  const startCamera = async () => {
    setCapturedPhoto(null);
    setCaptureDescriptor(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ 
        title: 'Ambiente Não Seguro', 
        description: 'A câmera requer HTTPS ou localhost para funcionar. Verifique sua URL.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let msg = 'Não foi possível acessar a câmera.';
      if (err.name === 'NotAllowedError') msg = 'Permissão da câmera negada pelo navegador.';
      if (err.name === 'NotFoundError') msg = 'Nenhuma câmera encontrada no dispositivo.';
      
      toast({ title: 'Erro na Câmera', description: msg, variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureBio = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded) return;
    setIsCapturing(true);

    try {
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!detection) {
        toast({ title: 'Rosto não detectado', description: 'Posicione seu rosto claramente em frente à câmera.', variant: 'destructive' });
        setIsCapturing(false);
        return;
      }

      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx?.drawImage(videoRef.current, 0, 0);
      
      const photoDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
      setCapturedPhoto(photoDataUrl);
      setCaptureDescriptor(detection.descriptor);
      stopCamera();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro na captura', description: 'Ocorreu um problema ao processar a imagem.', variant: 'destructive' });
    } finally {
      setIsCapturing(false);
    }
  };

  const saveBiometry = async () => {
    if (!capturedPhoto || !captureDescriptor || !selectedBioEmp) return;
    setUploading(true);

    try {
      const res = await fetch(capturedPhoto);
      const blob = await res.blob();
      const fileName = `${selectedBioEmp.id}_ref.jpg`;

      // Upload photo to storage
      const { error: storageError } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, blob, { upsert: true });

      if (storageError) throw storageError;

      const { data: publicData } = supabase.storage.from('employee-photos').getPublicUrl(fileName);
      const photoUrl = publicData.publicUrl;

      // Save descriptor to biometria_funcionario
      const { error: bioError } = await supabase.from('biometria_funcionario').upsert({
        funcionario_id: selectedBioEmp.id,
        face_embedding: Array.from(captureDescriptor),
        biometria_ativa: true
      }, { onConflict: 'funcionario_id' });

      if (bioError) throw bioError;

      // Update employee photo reference
      const { error: empError } = await supabase.from('employees')
        .update({ photo_reference_url: photoUrl })
        .eq('id', selectedBioEmp.id);

      if (empError) throw empError;

      toast({ title: '✅ Biometria Cadastrada!', description: `Referência facial de ${selectedBioEmp.name} salva com sucesso.` });
      setBioModalOpen(false);
      loadData();
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const resetBiometry = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente excluir a biometria de ${name}?`)) return;
    const { error } = await supabase.from('biometria_funcionario').delete().eq('funcionario_id', id);
    if (!error) {
      toast({ title: 'Biometria Resetada', description: 'O funcionário deverá cadastrar o rosto novamente.' });
      loadData();
    }
  };

  const saveJornada = async () => {
    if (!selectedEmp) return;
    const { error } = await supabase.from('jornadas').upsert({
      funcionario_id: selectedEmp.id,
      ...jornada,
      carga_horaria: 8 // default
    }, { onConflict: 'funcionario_id' });

    if (!error) {
      toast({ title: 'Jornada Atualizada' });
      setSelectedEmp(null);
      loadData();
    }
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Gestão de Ponto</h1>
          <p className="text-muted-foreground">Gerencie biometria facial e jornadas de trabalho.</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Funcionários e Configurações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-white">{emp.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={cn(
                          "flex items-center gap-1 text-[10px] font-bold uppercase",
                          emp.hasBio ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {emp.hasBio ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          Biometria {emp.hasBio ? 'Ativa' : 'Pendente'}
                        </span>
                        {emp.jornada && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" /> {emp.jornada.hora_entrada} - {emp.jornada.hora_saida}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="gap-2 text-white/60 hover:text-white" onClick={() => {
                      setSelectedEmp(emp);
                      if (emp.jornada) setJornada(emp.jornada);
                    }}>
                      <Settings2 className="w-4 h-4" /> Escala
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={cn(
                        "gap-2",
                        emp.hasBio ? "text-emerald-400/60 hover:text-emerald-400" : "text-primary/60 hover:text-primary"
                      )}
                      onClick={() => {
                        setSelectedBioEmp(emp);
                        setBioModalOpen(true);
                        loadModels();
                      }}
                    >
                      <Camera className="w-4 h-4" /> Biometria
                    </Button>

                    {emp.hasBio && (
                      <Button variant="ghost" size="sm" className="text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10" onClick={() => resetBiometry(emp.id, emp.name)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Cadastro Biométrico */}
      <Dialog open={bioModalOpen} onOpenChange={v => {
        if (!v) { stopCamera(); setBioModalOpen(false); }
      }}>
        <DialogContent className="glass-card border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastro Facial: {selectedBioEmp?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            {!cameraActive && !capturedPhoto ? (
              <div className="w-full aspect-video bg-white/5 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-white/10">
                <ShieldCheck className="w-12 h-12 text-white/20 mb-2" />
                <p className="text-sm text-white/40 mb-4">A câmera será usada para capturar sua face de referência.</p>
                <Button onClick={startCamera} className="gap-2">
                  <Camera className="w-4 h-4" /> Ativar Câmera
                </Button>
              </div>
            ) : (
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                {cameraActive && (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
                    <div className="absolute inset-0 border-2 border-primary/30 rounded-2xl pointer-events-none animate-pulse">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-dashed border-primary/50 rounded-[60px]" />
                    </div>
                  </>
                )}
                {capturedPhoto && (
                  <img src={capturedPhoto} className="w-full h-full object-cover" alt="Captured" />
                )}
                
                {isCapturing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider">Processando Biometria...</p>
                  </div>
                )}
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />

            {cameraActive && (
              <Button onClick={captureBio} disabled={isCapturing} className="w-full h-12 text-base font-bold">
                {isCapturing ? 'Analisando...' : 'Capturar Foto de Referência'}
              </Button>
            )}

            {capturedPhoto && (
              <div className="grid grid-cols-2 gap-3 w-full">
                <Button variant="outline" onClick={startCamera} disabled={uploading}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Refazer
                </Button>
                <Button onClick={saveBiometry} disabled={uploading} className="bg-emerald-500 hover:bg-emerald-600">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Confirmar e Salvar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Escala */}
      <Dialog open={!!selectedEmp} onOpenChange={v => !v && setSelectedEmp(null)}>
        <DialogContent className="glass-card border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Configurar Jornada: {selectedEmp?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Entrada</label>
              <Input type="time" value={jornada.hora_entrada} onChange={e => setJornada({...jornada, hora_entrada: e.target.value})} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Saída</label>
              <Input type="time" value={jornada.hora_saida} onChange={e => setJornada({...jornada, hora_saida: e.target.value})} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Início Almoço</label>
              <Input type="time" value={jornada.intervalo_inicio} onChange={e => setJornada({...jornada, intervalo_inicio: e.target.value})} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Fim Almoço</label>
              <Input type="time" value={jornada.intervalo_fim} onChange={e => setJornada({...jornada, intervalo_fim: e.target.value})} className="bg-white/5 border-white/10" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSelectedEmp(null)}>Cancelar</Button>
            <Button onClick={saveJornada}>Salvar Alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
