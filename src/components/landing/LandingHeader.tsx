import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";

export function LandingHeader() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Funcionalidades</a>
          <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Planos</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Entrar
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="sm" className="bg-gradient-cyan text-primary-foreground hover:opacity-90">
              Começar grátis
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
