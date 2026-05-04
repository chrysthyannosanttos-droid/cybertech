import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tablet, Globe, Clock, ShieldCheck, RefreshCw, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DeviceMonitor() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from('attendance_devices')
      .select('*')
      .order('last_sync', { ascending: false });

    if (!error && data) {
      setDevices(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white uppercase italic">Monitor de Terminais</h1>
          <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-xs mt-1">Status dos tablets em tempo real</p>
        </div>
        <button 
           onClick={fetchDevices}
           className="flex items-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-2xl transition-all font-black uppercase text-xs tracking-widest"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Agora
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => {
          const isOnline = new Date().getTime() - new Date(device.last_sync).getTime() < 600000; // Online se sincronizou nos últimos 10 min

          return (
            <Card key={device.id} className="bg-[#0a0f1d] border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden">
              {/* Indicador de Status */}
              <div className={`absolute top-0 left-0 w-full h-1 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                    {device.model.includes('Tablet') ? <Tablet className="w-6 h-6 text-primary" /> : <Smartphone className="w-6 h-6 text-blue-400" />}
                  </div>
                  <Badge className={isOnline ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-black text-white uppercase tracking-tight">{device.name}</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-50">{device.tenant_id}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/40">
                      <Globe className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Endereço IP</span>
                    </div>
                    <span className="text-[12px] font-bold tabular-nums text-white">{device.ip_address}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/40">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Modelo</span>
                    </div>
                    <span className="text-[12px] font-bold text-white">{device.model}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/40">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Último Sinal</span>
                    </div>
                    <span className="text-[12px] font-bold text-white">
                      {format(new Date(device.last_sync), "HH:mm 'em' dd/MM", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {devices.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10 border-dashed">
            <Tablet className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-xl font-black text-white uppercase italic">Nenhum terminal encontrado</h2>
          <p className="text-sm text-white/40 max-w-xs uppercase font-bold tracking-widest">Os tablets aparecerão aqui automaticamente assim que o App for aberto.</p>
        </div>
      )}
    </div>
  );
}
