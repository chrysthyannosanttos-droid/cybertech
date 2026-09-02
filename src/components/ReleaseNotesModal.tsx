import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export const CURRENT_VERSION = '1.2.0'; // Atualize esta versão para mostrar o modal novamente

const RELEASE_NOTES = [
  {
    version: '1.2.0',
    date: '01/09/2026',
    title: '🎉 Novidades da versão 1.2.0',
    features: [
      'Novo botão "+" no cadastro de funcionário para adicionar cargos personalizados na hora.',
      'Módulo de Férias aprimorado: agora você pode registrar o Período Aquisitivo (início e fim) de cada férias.',
      'Abono Pecuniário flexível: ao vender férias, agora é possível escolher exatamente quantos dias vender (não mais fixo em 10).',
      'Data Limite de Pagamento calculada automaticamente (2 dias antes do início — Art. 145 CLT) e exibida na tela e no recibo de impressão.',
      'Recibo de Férias atualizado com Período Aquisitivo, dias de abono e data limite de pagamento.',
    ],
  }
];

export function ReleaseNotesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Adicionamos um pequeno delay para a animação ficar mais fluida ao carregar a página
    const timer = setTimeout(() => {
      const lastSeenVersion = localStorage.getItem('hrhub_last_seen_version');
      const seenCount = parseInt(localStorage.getItem('hrhub_version_seen_count') || '0', 10);

      if (lastSeenVersion !== CURRENT_VERSION) {
        // Nova versão: ainda não viu
        setOpen(true);
      } else if (seenCount < 3) {
        // Mesma versão, mas viu menos de 3 vezes
        setOpen(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setOpen(false);
    
    const lastSeenVersion = localStorage.getItem('hrhub_last_seen_version');
    const seenCount = parseInt(localStorage.getItem('hrhub_version_seen_count') || '0', 10);

    if (lastSeenVersion !== CURRENT_VERSION) {
      // Primeira vez fechando a nova versão
      localStorage.setItem('hrhub_last_seen_version', CURRENT_VERSION);
      localStorage.setItem('hrhub_version_seen_count', '1');
    } else {
      // Já tinha fechado antes, incrementamos o contador
      localStorage.setItem('hrhub_version_seen_count', (seenCount + 1).toString());
    }
  };

  const currentNotes = RELEASE_NOTES.find(r => r.version === CURRENT_VERSION) || RELEASE_NOTES[0];

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent className="max-w-md bg-[#020408] border-white/10 shadow-2xl rounded-2xl overflow-hidden p-0 animate-in zoom-in-95 duration-300">
        <div className="p-6 bg-gradient-to-br from-primary/20 to-transparent border-b border-white/10">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-white italic tracking-tight uppercase">Novidades do Sistema!</DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                  Versão {currentNotes.version} - {currentNotes.date}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <h3 className="text-sm font-bold text-white mb-2">{currentNotes.title}</h3>
          <ul className="space-y-4">
            {currentNotes.features.map((feature, i) => (
              <li key={i} className="flex gap-3 text-sm text-white/70">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <DialogFooter className="p-4 border-t border-white/5 bg-white/5">
          <Button 
            onClick={handleClose}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl h-12 transition-all hover:scale-[1.02]"
          >
            Entendi, fechar!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
