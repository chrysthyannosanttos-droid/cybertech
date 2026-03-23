import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const { login, mustChangePassword, changePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      // Navigation handled after possible password change
      if (!mustChangePassword) navigate('/dashboard');
    } else {
      toast({ title: 'Credenciais inválidas', description: 'Verifique o usuário e a senha.', variant: 'destructive' });
    }
  };

  const handleChangePassword = () => {
    if (newPw.length < 4) {
      toast({ title: 'Senha muito curta', description: 'A nova senha deve ter no mínimo 4 caracteres.', variant: 'destructive' });
      return;
    }
    if (newPw !== newPw2) {
      toast({ title: 'Senhas diferentes', description: 'As senhas digitadas não coincidem.', variant: 'destructive' });
      return;
    }
    changePassword(newPw);
    toast({ title: 'Senha criada com sucesso!', description: 'Bem-vindo ao sistema.' });
    navigate('/dashboard');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative bg-[#0a0f1d] overflow-hidden"
    >
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-login.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1d]/80 via-[#0a0f1d]/90 to-[#0a0f1d]" />
      
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full z-10" />
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 z-10" />
      
      {/* Top Right Credit */}
      <div className="absolute top-4 right-6 z-20">
        <p className="text-[12px] font-medium text-white/70 tracking-wide">
          DESENVOLVIDO POR CYBERTECH
        </p>
      </div>

      <div className="w-full max-w-[360px] relative z-10">
        <div className="flex flex-col items-center justify-center gap-6 mb-12">
          <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(31,180,243,0.3)] border border-white/10 transform -rotate-3 hover:rotate-0 transition-all duration-500 hover:scale-105 bg-black/40 p-2">
            <img src="/logo-cybertech.png" alt="CyberTech Logo" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic drop-shadow-2xl">
              CyberTech <span className="text-primary">RH</span>
            </h1>
            <p className="text-[10px] text-primary/60 font-black tracking-[0.3em] uppercase mt-2">Inteligência para Recursos Humanos</p>
          </div>
        </div>

        <div className="glass border border-white/10 shadow-2xl rounded-3xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <h2 className="text-[15px] font-semibold mb-1">Entrar</h2>
          <p className="text-[13px] text-muted-foreground mb-5">Acesse o painel de gestão</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Usuário ou Email</label>
              <Input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Seu usuário de acesso"
                className="h-9 text-[13px]"
                required
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Senha</label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-9 text-[13px] pr-10"
                  required
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-[13px] font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              Acessar Painel
            </Button>
          </form>
        </div>
      </div>

      {/* Modal: Troca de senha no primeiro acesso */}
      <Dialog open={mustChangePassword} onOpenChange={() => {}}>       
        <DialogContent className="max-w-sm" onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Crie sua nova senha</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground mb-2">Este é seu primeiro acesso. Por segurança, crie uma senha personalizada antes de continuar.</p>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">Nova Senha</label>
              <div className="relative">
                <Input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Mínimo 4 caracteres" className="h-10 pr-10" />
                <button type="button" onClick={() => setShowNewPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                  {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[12px] text-muted-foreground block mb-1">Confirmar Senha</label>
              <Input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} placeholder="Repita a nova senha" className="h-10" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={handleChangePassword} className="w-full font-bold">Confirmar e Entrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
