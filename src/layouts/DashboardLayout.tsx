import { Outlet, useNavigate } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, ShieldAlert, Menu, Bell, Calendar, ChevronDown, Search } from 'lucide-react';
import { ReleaseNotesModal } from '@/components/ReleaseNotesModal';

function Topbar() {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const initials = user?.name
    ? user.name.trim().split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <header
      className="hidden md:flex items-center justify-between px-6 h-14 shrink-0 z-30"
      style={{
        background: 'hsl(var(--card))',
        borderBottom: '1px solid hsl(var(--border))',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Search */}
      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar no sistema..."
          className="pl-9 h-9 text-sm bg-muted/50 border-border/60 rounded-full focus-visible:ring-primary/30"
        />
      </div>

      {/* Actions + User */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-card" />
        </Button>

        {/* Calendar */}
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
          <Calendar className="w-4.5 h-4.5" />
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* User */}
        <button
          onClick={() => setShowUserMenu(v => !v)}
          className="flex items-center gap-2.5 px-2 py-1 rounded-xl hover:bg-muted transition-colors relative"
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-[13px] shadow-sm">
            {initials}
          </div>
          <div className="text-left leading-tight">
            <p className="text-[13px] font-semibold text-foreground truncate max-w-[100px]">
              {user?.name?.split(' ')[0] || 'Usuário'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {user?.role === 'superadmin' ? 'Super Admin' : 'Administrador'}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />

          {showUserMenu && (
            <div
              className="absolute top-full right-0 mt-2 w-44 rounded-xl shadow-lg z-50 py-1"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
            >
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-rose-500 hover:bg-rose-50 transition-colors rounded-lg mx-auto"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          )}
        </button>
      </div>
    </header>
  );
}

export default function DashboardLayout() {
  const { user, isImpersonating, stopImpersonating } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <AppSidebar />
      </div>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <div
            className="fixed top-0 left-0 right-0 h-14 z-40 flex items-center px-4 justify-between"
            style={{ background: 'hsl(var(--card))', borderBottom: '1px solid hsl(var(--border))' }}
          >
            <div className="flex items-center gap-2">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-foreground">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <span className="font-bold text-[15px]">{user?.tenantBranding?.system_name || 'CyberTech'}</span>
            </div>
          </div>
          <SheetContent side="left" className="p-0 w-[240px] border-none">
            <AppSidebar onNavigate={() => setOpen(false)} isMobile />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />

        {isImpersonating && (
          <div className="bg-emerald-600 text-white py-2 px-4 flex items-center justify-between shrink-0 z-[60]">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              <p className="text-[12px] font-bold">
                VISUALIZAÇÃO: <span className="uppercase">{user?.tenantBranding?.system_name || 'CLIENTE'}</span>
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={stopImpersonating}
              className="h-7 text-[11px] font-black uppercase bg-white/10 hover:bg-white/20 border border-white/20 gap-1.5">
              <LogOut className="w-3 h-3" /> Sair
            </Button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto pt-14 md:pt-0 custom-scrollbar" style={{ background: 'hsl(var(--background))' }}>
          <div className="p-4 md:p-6 max-w-[1400px] mx-auto min-h-full">
            <Outlet />
          </div>
        </main>
      </div>

      <ReleaseNotesModal />
    </div>
  );
}
