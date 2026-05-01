import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/Logo";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — CYBERBARBERSHOP" },
      { name: "description", content: "Acesse o painel de gestão." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError("Digite seu usuário.");
      return;
    }
    if (!password.trim()) {
      setError("Digite sua senha.");
      return;
    }

    setLoading(true);
    
    try {
      const result = await login(username, password);
      
      if (result) {
        setError(result);
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao fazer login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-8 top-8 hidden text-[10px] font-bold tracking-[0.2em] text-muted-foreground/50 sm:block">
        DESENVOLVIDO POR <span className="text-foreground/60">CYBERTECH</span>
      </div>

      <div className="w-full max-w-[440px] space-y-6 py-6">
        <div className="flex justify-center">
          <Link to="/">
            <Logo layout="stacked" />
          </Link>
        </div>

        <div className="glass-card rounded-[1.5rem] p-6 md:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">Entrar</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Acesse o painel de gestão</p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Seu usuário de acesso"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(null); }}
                className="glass-input h-10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/40"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="glass-input h-10 rounded-lg pr-10 text-sm text-foreground placeholder:text-muted-foreground/40"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-primary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full bg-gradient-cyan text-primary-foreground text-xs font-bold shadow-[0_0_15px_rgba(var(--primary),0.2)] hover:opacity-90 active:scale-[0.98] transition-all rounded-lg disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Acessar Painel"}
            </Button>
          </form>

          <div className="mt-6 text-center text-[10px] text-muted-foreground/60">
            Não tem conta?{" "}
            <Link to="/" className="font-bold text-primary hover:underline">
              Fale com o administrador
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
