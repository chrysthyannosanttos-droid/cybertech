import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Clock, MapPin, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function PointHistory() {
  const { user } = useAuth();
  const [points, setPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPoints = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('pontos')
        .select('*')
        .eq('funcionario_id', user.id)
        .order('data_hora', { ascending: false });
      setPoints(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPoints();
  }, [user?.id]);

  const totalHours = points.length > 0 ? "Em breve" : "0h";

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Meu Histórico</h1>
          <p className="text-muted-foreground">Visualize suas batidas de ponto e jornada mensal.</p>
        </div>
        <button onClick={loadPoints} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <RefreshCw className={cn("w-5 h-5 text-muted-foreground", loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status do Mês</CardTitle>
            <Clock className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalHours}</div>
            <p className="text-xs text-muted-foreground">Cálculo baseado em pontos validados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-white/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Batidas Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12 text-primary">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          ) : points.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Ainda não há registros de ponto para exibir.
            </div>
          ) : (
            <div className="space-y-4">
              {points.map((point) => (
                <div key={point.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center border",
                      point.tipo === 'ENTRY' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                      point.tipo === 'EXIT' ? "bg-rose-500/10 border-rose-500/20 text-rose-500" :
                      "bg-amber-500/10 border-amber-500/20 text-amber-500"
                    )}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-white">
                        {point.tipo === 'ENTRY' ? 'Entrada' : 
                         point.tipo === 'EXIT' ? 'Saída' : 
                         point.tipo === 'INTERVAL_START' ? 'Início Intervalo' : 'Fim Intervalo'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(point.data_hora).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    {point.confianca_facial >= 85 ? (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Validado ({point.confianca_facial}%)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3" /> Confiança Baixa ({point.confianca_facial}%)
                      </div>
                    )}
                    {point.latitude && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
