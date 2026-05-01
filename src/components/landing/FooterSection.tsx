import { Logo } from "@/components/ui/Logo";

export function FooterSection() {
  return (
    <footer className="border-t border-border px-4 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
        <Logo size="sm" />
        <p className="max-w-md text-sm text-muted-foreground">
          A plataforma completa para barbearias modernas. Agende, gerencie e cresça.
        </p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} CYBERBARBERSHOP. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
