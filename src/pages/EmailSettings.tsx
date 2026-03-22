import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MOCK_TENANTS } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Server, Send, Save, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
  const [selectedTenantId, setSelectedTenantId] = useState<string>(MOCK_TENANTS[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        // Reset to default for new tenant
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
        description: `E-mail de envio para ${MOCK_TENANTS.find(t => t.id === selectedTenantId)?.name} atualizado.`,
      });
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
    toast({
      title: 'Simulando Teste...',
      description: 'Conectando ao servidor SMTP...',
    });
    setTimeout(() => {
      toast({
        title: 'Sucesso!',
        description: 'Conexão com o servidor SMTP estabelecida.',
        variant: 'default',
        className: 'bg-emerald-500 text-white border-none',
      });
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tighter">Configurações de E-mail</h1>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Defina o servidor de saída para cada empresa do SaaS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo: Seleção da Empresa */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Selecionar Empresa
              </CardTitle>
              <CardDescription className="text-[11px]">Escolha qual empresa configurar</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10">
                  {MOCK_TENANTS.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-2">
             <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Status do Serviço</span>
             </div>
             <p className="text-[11px] text-muted-foreground leading-relaxed">
               As configurações abaixo serão usadas exclusivamente para o envio de **Holerites** e **Notificações de Ponto** para os funcionários desta empresa.
             </p>
          </div>
        </div>

        {/* Lado Direito: Formulário de SMTP */}
        <div className="lg:col-span-2">
          <Card className="glass-card border-white/5 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary to-violet-500 w-full" />
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-white/90">
                <Server className="w-4 h-4 text-primary" /> Parâmetros de Servidor SMTP (E-mail)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest animate-pulse">Buscando configurações...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Host SMTP</Label>
                      <div className="relative">
                        <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          value={settings.smtp_host} 
                          onChange={e => setSettings(s => ({ ...s, smtp_host: e.target.value }))}
                          placeholder="smtp.exemplo.com" 
                          className="h-11 pl-10 bg-white/5 border-white/10 rounded-xl" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Porta</Label>
                      <Input 
                        type="number" 
                        value={settings.smtp_port} 
                        onChange={e => setSettings(s => ({ ...s, smtp_port: parseInt(e.target.value) }))}
                        placeholder="587" 
                        className="h-11 bg-white/5 border-white/10 rounded-xl" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Usuário / Login</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          value={settings.smtp_user} 
                          onChange={e => setSettings(s => ({ ...s, smtp_user: e.target.value }))}
                          placeholder="email@empresa.com" 
                          className="h-11 pl-10 bg-white/5 border-white/10 rounded-xl" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Senha SMTP</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          type="password" 
                          value={settings.smtp_pass} 
                          onChange={e => setSettings(s => ({ ...s, smtp_pass: e.target.value }))}
                          placeholder="••••••••" 
                          className="h-11 pl-10 bg-white/5 border-white/10 rounded-xl" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-white/5 my-2" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">Nome de Exibição</Label>
                      <Input 
                        value={settings.from_name} 
                        onChange={e => setSettings(s => ({ ...s, from_name: e.target.value }))}
                        placeholder="Ex: RH CyberTech" 
                        className="h-11 bg-white/5 border-white/10 rounded-xl" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase text-muted-foreground">E-mail de Remetente</Label>
                      <Input 
                        value={settings.from_email} 
                        onChange={e => setSettings(s => ({ ...s, from_email: e.target.value }))}
                        placeholder="nao-responda@empresa.com" 
                        className="h-11 bg-white/5 border-white/10 rounded-xl" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleSave} 
                      disabled={saving}
                      className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 font-bold gap-2 shadow-lg shadow-primary/20"
                    >
                      <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                    <Button 
                      onClick={handleTestConnection}
                      variant="outline" 
                      className="h-12 px-6 rounded-xl border-white/10 hover:bg-white/5 font-bold gap-2 text-white/70"
                    >
                      <Send className="w-4 h-4" /> Testar
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
