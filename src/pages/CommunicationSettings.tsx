import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Tenant } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Server, Send, Save, CheckCircle2, MessageSquare, Globe, Key } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';

interface EmailSettings {
  id?: string;
  tenant_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_name: string;
  from_email: string;
  auto_send_payroll?: boolean;
}

interface WhatsAppSettings {
  id?: string;
  tenant_id: string;
  api_type: 'none' | 'evolution' | 'zapi' | 'twilio';
  base_url: string;
  instance_id: string;
  token: string;
  auto_send_payroll?: boolean;
}

export default function CommunicationSettings() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    tenant_id: '',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    from_name: 'RH Digital',
    from_email: '',
    auto_send_payroll: true
  });

  const [waSettings, setWaSettings] = useState<WhatsAppSettings>({
    tenant_id: '',
    api_type: 'none',
    base_url: '',
    instance_id: '',
    token: '',
    auto_send_payroll: true
  });

  useEffect(() => {
    async function fetchTenants() {
      const { data } = await supabase.from('tenants').select('*').order('name');
      if (data) {
        setTenants(data as Tenant[]);
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
      // Fetch Email
      const { data: eData } = await supabase
        .from('tenant_email_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (eData) setEmailSettings(eData);
      else setEmailSettings({ tenant_id: tenantId, smtp_host: 'smtp.gmail.com', smtp_port: 587, smtp_user: '', smtp_pass: '', from_name: 'RH Digital', from_email: '', auto_send_payroll: true });

      // Fetch WhatsApp
      const { data: wData } = await supabase
        .from('tenant_whatsapp_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (wData) setWaSettings(wData);
      else setWaSettings({ tenant_id: tenantId, api_type: 'none', base_url: '', instance_id: '', token: '', auto_send_payroll: true });

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveEmail() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_email_settings')
        .upsert({ ...emailSettings, tenant_id: selectedTenantId }, { onConflict: 'tenant_id' });

      if (error) throw error;
      toast({ title: 'Configurações de E-mail Salvas!' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWhatsApp() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_whatsapp_settings')
        .upsert({ ...waSettings, tenant_id: selectedTenantId }, { onConflict: 'tenant_id' });

      if (error) throw error;
      toast({ title: 'Configurações de WhatsApp Salvas!' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Central de Comunicação</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Disparos Automáticos de Holerites e Alertas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-black uppercase tracking-tighter flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Unidade / Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  {tenants.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="p-5 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 space-y-3">
             <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Automatização Ativa</span>
             </div>
             <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
               O sistema usará as credenciais configuradas para enviar holerites **automaticamente** assim que forem gerados pela equipe de RH.
             </p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="bg-white/5 border border-white/5 p-1 rounded-2xl mb-6">
              <TabsTrigger value="email" className="rounded-xl px-8 font-black uppercase text-[11px] data-[state=active]:bg-primary">
                <Mail className="w-4 h-4 mr-2" /> E-mail (SMTP)
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="rounded-xl px-8 font-black uppercase text-[11px] data-[state=active]:bg-emerald-500">
                <MessageSquare className="w-4 h-4 mr-2" /> WhatsApp API
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <Card className="glass-card border-white/5 overflow-hidden">
                <div className="h-1.5 bg-primary w-full" />
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-white/90">
                    <Server className="w-4 h-4 text-primary" /> Parâmetros de Servidor SMTP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Host SMTP</Label>
                      <Input value={emailSettings.smtp_host} onChange={e => setEmailSettings({...emailSettings, smtp_host: e.target.value})} className="h-11 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Porta</Label>
                      <Input type="number" value={emailSettings.smtp_port} onChange={e => setEmailSettings({...emailSettings, smtp_port: parseInt(e.target.value)})} className="h-11 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Usuário</Label>
                      <Input value={emailSettings.smtp_user} onChange={e => setEmailSettings({...emailSettings, smtp_user: e.target.value})} className="h-11 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Senha</Label>
                      <Input type="password" value={emailSettings.smtp_pass} onChange={e => setEmailSettings({...emailSettings, smtp_pass: e.target.value})} className="h-11 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <Label className="text-sm font-bold text-white">Envio Automático</Label>
                      <p className="text-[11px] text-muted-foreground">Disparar e-mail imediatamente após a geração do holerite</p>
                    </div>
                    <Switch checked={emailSettings.auto_send_payroll} onCheckedChange={v => setEmailSettings({...emailSettings, auto_send_payroll: v})} />
                  </div>

                  <Button onClick={handleSaveEmail} disabled={saving} className="w-full h-12 bg-primary hover:bg-primary/90 font-black uppercase text-[11px] rounded-xl gap-2">
                    <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Configurações de E-mail'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whatsapp">
              <Card className="glass-card border-white/5 overflow-hidden">
                <div className="h-1.5 bg-emerald-500 w-full" />
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-white/90">
                    <MessageSquare className="w-4 h-4 text-emerald-500" /> API de WhatsApp (Integração)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Tipo de API</Label>
                      <Select value={waSettings.api_type} onValueChange={v => setWaSettings({...waSettings, api_type: v as any})}>
                        <SelectTrigger className="h-11 bg-white/5 border-white/10 rounded-xl">
                          <SelectValue placeholder="Selecione a API" />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-white/10">
                          <SelectItem value="none">NENHUMA (DESATIVADO)</SelectItem>
                          <SelectItem value="evolution">EVOLUTION API (RECOMENDADO)</SelectItem>
                          <SelectItem value="zapi">Z-API</SelectItem>
                          <SelectItem value="twilio">TWILIO BUSINESS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Base URL (Endpoint)</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={waSettings.base_url} onChange={e => setWaSettings({...waSettings, base_url: e.target.value})} placeholder="https://sua-api.com" className="h-11 pl-10 bg-white/5 border-white/10 rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">ID da Instância / SID</Label>
                      <Input value={waSettings.instance_id} onChange={e => setWaSettings({...waSettings, instance_id: e.target.value})} className="h-11 bg-white/5 border-white/10 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">API Token / Secret</Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="password" value={waSettings.token} onChange={e => setWaSettings({...waSettings, token: e.target.value})} className="h-11 pl-10 bg-white/5 border-white/10 rounded-xl" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <Label className="text-sm font-bold text-white">Disparo Automático</Label>
                      <p className="text-[11px] text-muted-foreground">Enviar holerite via WhatsApp assim que gerado</p>
                    </div>
                    <Switch checked={waSettings.auto_send_payroll} onCheckedChange={v => setWaSettings({...waSettings, auto_send_payroll: v})} />
                  </div>

                  <Button onClick={handleSaveWhatsApp} disabled={saving} className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[11px] rounded-xl gap-2">
                    <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Configurações de WhatsApp'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
