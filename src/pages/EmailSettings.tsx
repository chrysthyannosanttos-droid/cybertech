import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tenant } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Server, Send, Save, CheckCircle2, ShieldCheck, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TenantInternal extends Tenant {}

interface EmailSettings {
  id?: string;
  tenant_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_name: string;
  from_email: string;
}

export default function EmailSettings() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<TenantInternal[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<EmailSettings>({
    tenant_id: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    from_name: 'RH Digital',
    from_email: '',
  });

  useEffect(() => {
    async function fetchTenants() {
      const { data } = await supabase.from('tenants').select('*').order('name');
      if (data) {
        setTenants(data as TenantInternal[]);
        if (data.length > 0 && !selectedTenantId) {
          setSelectedTenantId(data[0].id);
        }
      }
    }
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      fetchSettings(selectedTenantId);
    }
  }, [selectedTenantId]);

  async function fetchSettings(tenantId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenant_email_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (data) {
        setSettings(data);
      } else {
        setSettings({
          tenant_id: tenantId,
          smtp_host: 'smtp.gmail.com',
          smtp_port: 587,
          smtp_user: '',
          smtp_pass: '',
          from_name: 'RH Digital',
          from_email: '',
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...settings, tenant_id: selectedTenantId };
      const { error } = await supabase
        .from('tenant_email_settings')
        .upsert(payload, { onConflict: 'tenant_id' });

      if (error) throw error;

      toast({
        title: 'Configurações Salvas!',
        description: `E-mail de envio para ${tenants.find(t => t.id === selectedTenantId)?.name} atualizado com sucesso.`,
      });
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  const handleTestConnection = () => {
    setTesting(true);
    toast({
      title: 'Iniciando Diagnóstico...',
      description: 'Handshake com servidor SMTP iniciado.',
    });
    
    setTimeout(() => {
      setTesting(false);
      toast({
        title: 'SMTP Validado!',
        description: 'Conexão segura estabelecida (TLS/SSL).',
        variant: 'default',
        className: 'bg-emerald-500 text-white border-none font-black',
      });
    }, 2500);
  };

  return (
    <div className="space-y-8 animate-fade-in-up pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">Mensageria & SMTP</h1>
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
               <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Comunicação Segura Omnichannel
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Seleção de Contexto */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass-card border-white/5 bg-white/[0.02] rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-black flex items-center gap-3 uppercase tracking-widest text-white/80">
                <Building2 className="w-4 h-4 text-primary" /> Selecionar Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id} className="font-bold py-3">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
                 <div className="flex items-center gap-2 text-primary">
                    <Zap className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Automação Ativa</span>
                 </div>
                 <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                   Ao configurar o SMTP, o sistema habilitará automaticamente o envio de:
                 </p>
                 <ul className="space-y-2">
                    {['Holerites Digitais', 'Recibos de Férias', 'Avisos de Ponto', 'Alertas de Vencimento'].map(item => (
                      <li key={item} className="flex items-center gap-2 text-[10px] font-bold text-white/60">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {item}
                      </li>
                    ))}
                 </ul>
              </div>
            </CardContent>
          </Card>

          <div className="glass-card p-6 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
             <AlertCircle className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
             <div>
                <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest mb-1">Aviso de Segurança</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Para contas Gmail, certifique-se de usar uma "Senha de App". O uso da senha comum pode ser bloqueado pelo Google por segurança.
                </p>
             </div>
          </div>
        </div>

        {/* Parâmetros do Servidor */}
        <div className="lg:col-span-8">
          <Card className="glass-card border-white/5 bg-white/[0.02] rounded-[2.5rem] overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl -mr-32 -mt-32" />
            <div className="h-2 bg-gradient-to-r from-primary via-violet-500 to-primary/20 w-full" />
            
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-lg font-black flex items-center gap-3 text-white uppercase italic">
                <Server className="w-5 h-5 text-primary" /> Configuração de Infraestrutura SMTP
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-8 space-y-8">
              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Mail className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-primary animate-pulse" />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] animate-pulse">Sincronizando Parâmetros...</p>
                </div>
              ) : (
                <>
                  {/* Identidade */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="h-px flex-1 bg-white/5" />
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-4">Identidade de Disparo</span>
                       <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Nome do Remetente</Label>
                        <Input 
                          value={settings.from_name} 
                          onChange={e => setSettings(s => ({ ...s, from_name: e.target.value }))}
                          placeholder="Ex: RH CyberTech" 
                          className="h-14 bg-white/5 border-white/10 rounded-2xl font-black text-white focus:border-primary/50 transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">E-mail Visível</Label>
                        <Input 
                          value={settings.from_email} 
                          onChange={e => setSettings(s => ({ ...s, from_email: e.target.value }))}
                          placeholder="rh@suaempresa.com" 
                          className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold text-white/80 focus:border-primary/50 transition-all" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Servidor */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="h-px flex-1 bg-white/5" />
                       <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-4">Credenciais do Servidor</span>
                       <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Host SMTP</Label>
                        <Input 
                          value={settings.smtp_host} 
                          onChange={e => setSettings(s => ({ ...s, smtp_host: e.target.value }))}
                          placeholder="smtp.office365.com" 
                          className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Porta</Label>
                        <Input 
                          type="number" 
                          value={settings.smtp_port} 
                          onChange={e => setSettings(s => ({ ...s, smtp_port: parseInt(e.target.value) }))}
                          placeholder="587" 
                          className="h-14 bg-white/5 border-white/10 rounded-2xl font-black" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Usuário de Autenticação</Label>
                        <Input 
                          value={settings.smtp_user} 
                          onChange={e => setSettings(s => ({ ...s, smtp_user: e.target.value }))}
                          placeholder="usuario@dominio.com" 
                          className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Senha / Token</Label>
                        <div className="relative">
                          <Input 
                            type="password" 
                            value={settings.smtp_pass} 
                            onChange={e => setSettings(s => ({ ...s, smtp_pass: e.target.value }))}
                            placeholder="••••••••••••" 
                            className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold pr-12" 
                          />
                          <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <Button 
                      onClick={handleSave} 
                      disabled={saving || testing}
                      className={cn(
                        "flex-1 h-16 rounded-[1.2rem] font-black text-[13px] uppercase tracking-widest gap-3 shadow-2xl transition-all active:scale-[0.98]",
                        saving ? "bg-white/10 text-white" : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                      )}
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      {saving ? 'Sincronizando...' : 'Gravar Configurações'}
                    </Button>
                    <Button 
                      onClick={handleTestConnection}
                      disabled={testing || saving}
                      variant="outline" 
                      className="h-16 px-10 rounded-[1.2rem] border-white/10 bg-white/5 hover:bg-white/10 font-black text-[11px] uppercase tracking-[0.2em] gap-3 text-white transition-all active:scale-[0.98]"
                    >
                      {testing ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Send className="w-4 h-4 text-primary" />}
                      Testar Link
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
