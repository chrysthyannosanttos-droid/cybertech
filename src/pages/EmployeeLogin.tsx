import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Fingerprint, 
  ArrowRight, 
  Loader2, 
  ChevronLeft,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type LoginMode = 'login' | 'reset' | 'validate';

export default function EmployeeLogin() {
  const [mode, setMode] = useState<LoginMode>('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    cpf: '',
    password: '',
    name: '',
    birthDate: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { login, setUser, setIsEmployeeView } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCpfChange = (v: string) => {
    let val = v.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);
    val = val.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setForm(f => ({ ...f, cpf: val }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const cleanCpf = form.cpf.replace(/\D/g, '');
      // Busca colaborador pelo CPF e Senha (usaremos password como campo na tabela employees)
      const { data: emp, error } = await supabase
        .from('employees')
        .select('*, tenants(branding, plan)')
        .eq('cpf', form.cpf)
        .eq('password', form.password)
        .maybeSingle();

      if (error || !emp) {
        throw new Error("CPF ou Senha incorretos.");
      }

      // Simula a autenticação no context
      const userData = {
        id: emp.id,
        email: emp.email || `${cleanCpf}@cybertech.com`,
        name: emp.name,
        role: 'employee',
        tenantId: emp.tenant_id,
        tenantBranding: emp.tenants?.branding,
        plan: emp.tenants?.plan
      };

      // Mock de persistência no context (ajustado para ser compatível)
      sessionStorage.setItem('nexus_user', JSON.stringify(userData));
      sessionStorage.setItem('is_employee_view', 'true');
      window.location.href = '/portal';
      
    } catch (err: any) {
      toast({ title: "Falha no Acesso", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleValidateIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validação tripla
      const { data: emp, error } = await supabase
        .from('employees')
        .select('id, name, birth_date')
        .eq('cpf', form.cpf)
        .maybeSingle();

      if (error || !emp) throw new Error("Colaborador não encontrado.");

      const inputName = form.name.trim().toUpperCase();
      const dbName = emp.name.trim().toUpperCase();
      const inputDate = form.birthDate;
      const dbDate = emp.birth_date;

      if (inputName !== dbName || inputDate !== dbDate) {
        throw new Error("Dados de validação não conferem. Verifique Nome e Data de Nascimento.");
      }

      setMode('reset');
      toast({ title: "Identidade Confirmada", description: "Agora defina sua nova senha de acesso." });
    } catch (err: any) {
      toast({ title: "Erro de Validação", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast({ title: "Senhas não conferem", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({ password: form.newPassword })
        .eq('cpf', form.cpf);

      if (error) throw error;

      toast({ title: "Senha Definida!", description: "Você já pode acessar o portal com sua nova senha." });
      setMode('login');
    } catch (err: any) {
      toast({ title: "Erro ao salvar senha", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md space-y-8 relative z-10 animate-fade-in-up">
        {/* Logo & Header */}
        <div className="text-center space-y-4">
           <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 shadow-2xl mb-4 group hover:border-primary/50 transition-all duration-500">
              <ShieldCheck className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />
           </div>
           <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Portal do Colaborador</h1>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">Acesso Seguro & Autoatendimento</p>
           </div>
        </div>

        {/* Card de Login */}
        <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
           {mode === 'login' && (
             <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Seu CPF</Label>
                   <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input 
                        value={form.cpf} 
                        onChange={e => handleCpfChange(e.target.value)}
                        placeholder="000.000.000-00" 
                        className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl font-bold tracking-tight" 
                        required
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <div className="flex justify-between items-center px-1">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sua Senha</Label>
                      <button type="button" onClick={() => setMode('validate')} className="text-[9px] font-black text-primary uppercase hover:underline">Esqueci minha senha</button>
                   </div>
                   <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input 
                        type="password" 
                        value={form.password}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder="••••••••" 
                        className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl" 
                        required
                      />
                   </div>
                </div>

                <Button disabled={loading} className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-xl shadow-primary/20 gap-3 group">
                   {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                     <>
                        Entrar no Portal <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                     </>
                   )}
                </Button>

                <div className="text-center">
                   <button type="button" onClick={() => setMode('validate')} className="text-[11px] font-black text-muted-foreground uppercase tracking-widest hover:text-white transition-colors">Primeiro Acesso? <span className="text-primary">Ativar Conta</span></button>
                </div>
             </form>
           )}

           {mode === 'validate' && (
             <form onSubmit={handleValidateIdentity} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <button type="button" onClick={() => setMode('login')} className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase hover:text-white mb-2">
                   <ChevronLeft className="w-4 h-4" /> Voltar ao Login
                </button>
                <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl flex gap-3 mb-4">
                   <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                   <p className="text-[10px] text-amber-200/70 font-medium leading-relaxed uppercase">Para sua segurança, valide os dados abaixo conforme constam no seu contrato de trabalho.</p>
                </div>

                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">CPF para Validação</Label>
                   <Input value={form.cpf} onChange={e => handleCpfChange(e.target.value)} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold" required />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Seu Nome Completo</Label>
                   <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CONFORME DOCUMENTO" className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold" required />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Data de Nascimento</Label>
                   <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                      <Input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} className="h-14 pl-12 bg-white/5 border-white/10 rounded-2xl font-bold" required />
                   </div>
                </div>

                <Button disabled={loading} className="w-full h-14 rounded-2xl bg-white text-black hover:bg-white/90 font-black uppercase text-[12px] tracking-[0.2em] shadow-xl gap-3">
                   {loading ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : 'Verificar Identidade'}
                </Button>
             </form>
           )}

           {mode === 'reset' && (
             <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in zoom-in-95">
                <div className="text-center space-y-2 mb-6">
                   <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                      <Fingerprint className="w-8 h-8 text-emerald-500" />
                   </div>
                   <h3 className="text-lg font-black text-white uppercase italic">Definir Nova Senha</h3>
                   <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Crie uma senha forte para seu acesso</p>
                </div>

                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Nova Senha</Label>
                   <Input type="password" value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold" required />
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest">Confirmar Senha</Label>
                   <Input type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className="h-14 bg-white/5 border-white/10 rounded-2xl font-bold" required />
                </div>

                <Button disabled={loading} className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[12px] tracking-[0.2em] shadow-xl shadow-emerald-500/20">
                   {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Nova Senha'}
                </Button>
             </form>
           )}
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
           <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Criptografia de Ponta-a-Ponta</span>
           </div>
           <p className="text-[10px] font-medium opacity-50">© 2024 CyberTech RH Plus • Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}
