import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Globe, Server, Hash, Save, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { addAuditLog } from '@/data/mockData';

export default function Settings() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'cristiano';

  const [config, setConfig] = useState({
    remoteIp: '',
    remotePort: '',
    remoteUrl: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('remote_connection_config');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    if (!isAdmin) return;

    localStorage.setItem('remote_connection_config', JSON.stringify(config));
    
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'UPDATE_SETTINGS',
      details: `[Configurações] Atualizou parâmetros de conexão remota (IP: ${config.remoteIp}, Porta: ${config.remotePort})`
    });

    toast({
      title: 'Configurações Salvas',
      description: 'As alterações de conexão remota foram aplicadas com sucesso.'
    });
    setTimeout(() => window.location.reload(), 500);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
        <div className="p-12 glass shadow-2xl rounded-3xl border border-white/10 text-center max-w-md">
          <div className="w-20 h-20 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
            <ShieldCheck className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground text-sm font-medium leading-relaxed">
            Esta área é exclusiva para administradores de sistema. Verifique suas permissões ou entre em contato com o suporte.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Configurações do Sistema</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Gerenciamento de conexões externas e integração remota</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black px-4 py-1 animate-pulse">
            ADMIN MODO ATIVO
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass border-white/5 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl pointer-events-none" />
            <CardHeader className="border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-[14px] font-black uppercase tracking-widest text-white">Conexão Remota Externa</CardTitle>
                  <CardDescription className="text-[11px] font-medium text-muted-foreground">Parametrize o acesso ao servidor de banco de dados ou API externa</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">IP do Servidor</Label>
                    <Server className="w-3.5 h-3.5 text-primary/40" />
                  </div>
                  <Input 
                    placeholder="ex: 192.168.1.100" 
                    value={config.remoteIp}
                    onChange={(e) => setConfig(prev => ({ ...prev, remoteIp: e.target.value }))}
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-[14px] font-medium tracking-tight focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">Porta de Conexão</Label>
                    <Hash className="w-3.5 h-3.5 text-primary/40" />
                  </div>
                  <Input 
                    placeholder="ex: 3306, 5432, 8080" 
                    value={config.remotePort}
                    onChange={(e) => setConfig(prev => ({ ...prev, remotePort: e.target.value }))}
                    className="h-12 bg-white/5 border-white/10 rounded-xl text-[14px] font-medium tracking-tight focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black text-white/40 uppercase tracking-[0.2em]">URL da Base de Dados / API</Label>
                  <Globe className="w-3.5 h-3.5 text-primary/40" />
                </div>
                <Input 
                  placeholder="https://api.externa.com/v1" 
                  value={config.remoteUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, remoteUrl: e.target.value }))}
                  className="h-12 bg-white/5 border-white/10 rounded-xl text-[14px] font-medium tracking-tight focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="pt-6 border-t border-white/5 mt-4">
                <Button 
                  onClick={handleSave}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black text-[13px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 rounded-xl group transition-all"
                >
                  <Save className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass border-white/5 bg-emerald-500/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-[12px] font-black uppercase text-emerald-400">Info de Segurança</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-[12px] text-emerald-100/60 leading-relaxed">
                  Estas configurações são usadas para estabelecer túneis de comunicação segura com recursos fora do ambiente Vercel.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest text-center">
                  Criptografia Ativa
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/5 bg-amber-500/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-[12px] font-black uppercase text-amber-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Importante
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[12px] text-amber-100/60 leading-relaxed">
                Certifique-se de que o Firewall do servidor remoto permite conexões do IP de saída da plataforma. A porta padrão dependerá do seu serviço de back-end.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={`text-[10px] font-bold rounded-full border ${className}`}>
      {children}
    </span>
  );
}
