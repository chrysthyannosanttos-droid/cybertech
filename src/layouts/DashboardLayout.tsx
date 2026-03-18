import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-transparent relative">
      <div className="fixed top-4 right-8 z-[100] pointer-events-none text-right">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] transition-opacity hover:opacity-100 flex items-center gap-4">
          <span>Desenvolvido Por ChrysthiannoSanttos</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="text-white/10 tracking-[0.2em]">Suporte 82 98870-1192</span>
        </p>
      </div>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
