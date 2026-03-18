import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[360px]">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Nexus HR</h1>
        </div>

        <div className="bg-card rounded-lg shadow-card p-6">
          <h2 className="text-[15px] font-semibold mb-1">Entrar</h2>
          <p className="text-[13px] text-muted-foreground mb-5">Acesse o painel de gestão</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[12px] font-medium text-muted-foreground mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@nexushr.com"
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
            <Button type="submit" className="w-full h-9 text-[13px]">
              Entrar
            </Button>
          </form>
        </div>

        <div className="mt-4 bg-card rounded-lg shadow-card p-4">
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Credenciais de teste:</p>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Super Admin:</span>
              <span className="font-mono-data text-foreground">admin@nexushr.com / admin123</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Empresa:</span>
              <span className="font-mono-data text-foreground">tenant@superatacado.com / tenant123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
