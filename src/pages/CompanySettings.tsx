import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tenant } from '@/types';
import { Building2, Save, X, ShieldCheck, CreditCard, Calendar, AlertCircle, Palette, Layout } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { addAuditLog } from '@/data/mockData';

export default function CompanySettings() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ 
    name: '', 
    cnpj: '',
    system_name: '',
    primary_color: '',
    logo_url: ''
  });

  const [form, setForm] = useState({ 
    name: '', 
    cnpj: '',
    systemName: '',
    primaryColor: '',
    logoUrl: ''
  });

  useEffect(() => {
    const fetchTenant = async () => {
      if (!currentUser?.tenantId) {
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', currentUser.tenantId)
        .single();

      if (data) {
        setTenant({
          id: data.id,
          name: data.name,
          cnpj: data.cnpj || '',
          subscription: data.subscription || { status: 'active', startDate: '', expiryDate: '', monthlyFee: 0, additionalCosts: [] },
          employeeCount: data.employee_count || 0
        });
        setForm({ 
          name: data.name, 
          cnpj: data.cnpj || '',
          systemName: data.branding?.system_name || '',
          primaryColor: data.branding?.primary_color || '',
          logoUrl: data.branding?.logo_url || ''
        });
      }
      setIsLoading(false);
    };

    fetchTenant();
  }, [currentUser]);

  const handleSave = async () => {
    if (!tenant || !form.name || !form.cnpj) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('tenants')
      .update({
        name: form.name,
        cnpj: form.cnpj,
        branding: {
          system_name: form.systemName,
          primary_color: form.primaryColor,
          logo_url: form.logoUrl
        }
      })
      .eq('id', tenant.id);

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'EDIT_MY_COMPANY',
        details: `[Configuração] Empresa ${tenant.name} atualizou dados para: ${form.name} (CNPJ: ${form.cnpj})`,
        tenantId: tenant.id
      });
      toast({ title: 'Dados atualizados', description: 'As informações da sua empresa foram salvas com sucesso.' });
      setTenant(prev => prev ? { ...prev, name: form.name, cnpj: form.cnpj } : null);
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tenant) {
    const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.email?.toLowerCase().includes('cristiano');

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 mb-6 group hover:scale-110 transition-transform duration-500">
          <Building2 className="w-10 h-10 text-primary" />
        </div>
        
        {isSuperAdmin ? (
          <>
            <h2 className="text-2xl font-black text-white tracking-tighter mb-2">Ambiente Administrativo</h2>
            <p className="text-muted-foreground text-[14px] max-w-md mx-auto leading-relaxed mb-8">
              Como Super Administrador, você não está vinculado a uma única empresa específica. Para gerenciar todos os clientes, utilize o link principal de empresas.
            </p>
            <Button 
              onClick={() => window.location.href = '/tenants'}
              className="px-8 h-12 font-bold gap-2 shadow-[0_0_20px_rgba(31,180,243,0.2)]"
            >
              <Building2 className="w-4 h-4" />
              Ir para Gestão de Empresas
            </Button>
          </>
        ) : (
          <>
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Empresa não encontrada</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              Não foi possível localizar os dados da sua empresa ou seu perfil ainda não está vinculado a um Tenant.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Minha Empresa</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Gerencie as informações cadastrais da sua empresa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="glass border-white/5 shadow-2xl overflow-hidden relative">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-[14px] font-black uppercase tracking-widest text-white">Dados Cadastrais</CardTitle>
                  <CardDescription className="text-[11px] font-medium text-muted-foreground">Informações públicas e de faturamento</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nome da Empresa / Razão Social</Label>
                  <Input 
                    value={form.name} 
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="h-11 bg-white/[0.03] border-white/10"
                    placeholder="Nome da sua empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">CNPJ</Label>
                  <Input 
                    value={form.cnpj} 
                    onChange={e => {
                      let v = e.target.value.replace(/\D/g, '');
                      if(v.length > 14) v = v.slice(0, 14);
                      v = v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
                      setForm(f => ({ ...f, cnpj: v }));
                    }}
                    className="h-11 bg-white/[0.03] border-white/10 font-mono"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="w-full md:w-auto px-8 h-11 font-bold gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/5 shadow-2xl overflow-hidden relative mt-6">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                    <Palette className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <CardTitle className="text-[14px] font-black uppercase tracking-widest text-white">White Label & Branding <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded ml-2">V2.1</span></CardTitle>
                    <CardDescription className="text-[11px] font-medium text-muted-foreground">Personalize a identidade visual do seu sistema</CardDescription>
                  </div>
                </div>
                {!currentUser?.email?.toLowerCase().includes('cristiano') && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-tight">Somente Cristiano</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {!currentUser?.email?.toLowerCase().includes('cristiano') ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <Layout className="w-12 h-12 text-muted-foreground/20" />
                  <p className="text-[13px] text-muted-foreground max-w-[280px]">
                    As configurações de identidade visual (White-Label) são restritas e podem ser gerenciadas apenas pelo administrador <strong>Cristiano</strong>.
                  </p>
                  <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold uppercase tracking-widest" disabled>
                    Solicitar Alteração
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nome do Sistema Personalizado</Label>
                      <Input 
                        value={form.systemName} 
                        onChange={e => setForm(f => ({ ...f, systemName: e.target.value }))}
                        className="h-11 bg-white/[0.03] border-white/10"
                        placeholder="Ex: Minha Empresa RH"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cor Principal (Hexadecimal)</Label>
                      <div className="flex gap-2">
                        <Input 
                        value={form.primaryColor} 
                        onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                        className="h-11 bg-white/[0.03] border-white/10 font-mono"
                        placeholder="#0ea5e9"
                      />
                      <div className="relative">
                        <input 
                          type="color" 
                          value={form.primaryColor || '#0ea5e9'} 
                          onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                          className="w-11 h-11 rounded-lg border-none cursor-pointer p-0 overflow-hidden absolute inset-0 opacity-0"
                        />
                        <div 
                          className="w-11 h-11 rounded-lg border border-white/10 shadow-inner shrink-0" 
                          style={{ backgroundColor: form.primaryColor || '#0ea5e9' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Logotipo do Sistema</Label>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 w-full space-y-2">
                      <Input 
                        value={form.logoUrl} 
                        onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                        className="h-11 bg-white/[0.03] border-white/10"
                        placeholder="Cole a URL ou faça o upload ao lado"
                      />
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          className="h-9 text-[10px] font-bold border-white/10 hover:bg-white/5 relative"
                          onClick={() => document.getElementById('logo-upload-settings')?.click()}
                        >
                          <Palette className="w-3.5 h-3.5 mr-2" /> Upload de Arquivo
                          <input 
                            id="logo-upload-settings"
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !tenant) return;
                              
                              try {
                                const fileExt = file.name.split('.').pop();
                                const fileName = `${tenant.id}_${Date.now()}.${fileExt}`;
                                const filePath = `logos/${fileName}`;
                                
                                const { error: uploadError } = await supabase.storage
                                  .from('system-assets')
                                  .upload(filePath, file);
                                  
                                if (uploadError) throw uploadError;
                                
                                const { data: { publicUrl } } = supabase.storage
                                  .from('system-assets')
                                  .getPublicUrl(filePath);
                                  
                                setForm(f => ({ ...f, logoUrl: publicUrl }));
                                toast({ title: 'Upload concluído!' });
                              } catch (err: any) {
                                toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
                              }
                            }}
                          />
                        </Button>
                        <span className="text-[10px] text-muted-foreground italic">PNG Transparente Recomendado</span>
                      </div>
                    </div>
                    
                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center p-2 overflow-hidden shrink-0">
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <Building2 className="w-8 h-8 text-white/10" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <Label className="text-[11px] font-black text-primary uppercase tracking-widest mb-4 block">Prévia da Interface</Label>
                  <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 flex gap-6 items-center">
                    <div className="w-12 h-24 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center py-3 gap-3">
                      <div className="w-6 h-6 rounded-lg shadow-lg" style={{ backgroundColor: form.primaryColor || '#0ea5e9' }} />
                      <div className="w-6 h-0.5 bg-white/10" />
                      <div className="w-6 h-0.5 bg-white/10" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded bg-white p-0.5">
                            {form.logoUrl ? <img src={form.logoUrl} className="w-full h-full object-contain" /> : <Building2 className="w-full h-full text-zinc-400" />}
                         </div>
                         <span className="text-[12px] font-bold text-white">{form.systemName || 'CyberTech RH'}</span>
                      </div>
                      <div className="h-8 w-full rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-lg" style={{ backgroundColor: form.primaryColor || '#0ea5e9' }}>
                        BOTÃO EXEMPLO
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex gap-3">
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    variant="outline"
                    className="flex-1 md:flex-initial px-8 h-11 font-bold gap-2 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Identidade Visual
                  </Button>
                  <Button 
                    onClick={async () => {
                      if (!window.confirm('Deseja resetar a identidade visual para o padrão CyberTech?')) return;
                      setForm(f => ({ ...f, systemName: '', primaryColor: '', logoUrl: '' }));
                      setIsSaving(true);
                      const { error } = await supabase.from('tenants').update({ branding: null }).eq('id', tenant.id);
                      if (error) toast({ title: 'Erro ao resetar', variant: 'destructive' });
                      else toast({ title: 'Resetado com sucesso' });
                      setIsSaving(false);
                      window.location.reload();
                    }}
                    disabled={isSaving}
                    variant="ghost"
                    className="h-11 text-muted-foreground hover:text-white"
                  >
                    Resetar Padrão
                  </Button>
                </div>
              </>
            )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass border-white/5 bg-primary/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-[12px] font-black uppercase text-primary">Plano e Assinatura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-[12px] text-white/80">Status:</span>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  tenant.subscription.status === 'active' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {tenant.subscription.status === 'active' ? 'ATIVO' : 'SUSPENSO'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary/60" />
                  <span className="text-[12px] text-white/80">Vencimento:</span>
                </div>
                <span className="text-[12px] font-mono text-white">
                  {new Date(tenant.subscription.expiryDate).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400/60" />
                  <span className="text-[12px] text-white/80">Mensalidade:</span>
                </div>
                <span className="text-[13px] font-bold text-white">
                  R$ {tenant.subscription.monthlyFee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/5 bg-amber-500/5 shadow-inner">
            <CardHeader>
              <CardTitle className="text-[12px] font-black uppercase text-amber-500 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" /> Atenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[11px] text-amber-100/60 leading-relaxed">
                Alterações no CNPJ podem impactar a geração de documentos legais e integração com o eSocial. Verifique antes de salvar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
