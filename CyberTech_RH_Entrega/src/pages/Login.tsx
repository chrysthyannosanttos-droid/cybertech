import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      navigate('/dashboard');
    } else {
      toast({ title: 'Credenciais inválidas', description: 'Verifique email e senha.', variant: 'destructive' });
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative bg-[#0a0f1d] overflow-hidden"
    >
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-modern.jpg')" }}
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
            <p className="text-[10px] text-primary/60 font-black tracking-[0.3em] uppercase mt-2">Intelligence for Human Resources</p>
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
                placeholder="cristiano"
                className="h-9 text-[13px]"
                required
              />
            </div>
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-9 text-[13px]"
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 text-[13px] font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              Acessar Painel
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
