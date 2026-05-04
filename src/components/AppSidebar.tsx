import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth, AppModule } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Store,
  Users,
  FileHeart,
  DollarSign,
  BarChart3,
  LogOut,
  Briefcase,
  History,
  UserMinus,
  Settings,
  UserCog,
  Clock,
  FileText,
  Mail,
  FolderOpen,
  TreePalm,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ALL_LINKS: Array<{ to: string; module: AppModule; icon: React.ComponentType<{ className?: string }>; label: string; superadminOnly?: boolean }> = [
  { to: '/dashboard',         module: 'dashboard',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/attendance',        module: 'attendance',        icon: Clock,           label: 'Ponto Eletrônico' },
  { to: '/terminal',          module: 'attendance',        icon: Smartphone,      label: 'Terminal de Ponto' },
  { to: '/tenants',           module: 'tenants',           icon: Building2,       label: 'Empresas',     superadminOnly: true, cristianoOnly: true },
  { to: '/settings/company',   module: 'dashboard',         icon: Building2,       label: 'Minha Empresa' },
  { to: '/stores',            module: 'stores',            icon: Store,           label: 'Lojas' },
  { to: '/employees',         module: 'employees',         icon: Users,           label: 'Funcionários' },
  { to: '/documents',         module: 'employees',         icon: FolderOpen,      label: 'Arquivo Digital' },
  { to: '/certificates',      module: 'certificates',      icon: FileHeart,       label: 'Atestados' },
  { to: '/payroll',           module: 'payroll',           icon: DollarSign,      label: 'Folha' },
  { to: '/reports',           module: 'reports',           icon: BarChart3,       label: 'Relatórios' },
  { to: '/service-providers', module: 'service-providers', icon: Briefcase,       label: 'Prestadores' },
  { to: '/rescissions',       module: 'rescissions',       icon: UserMinus,       label: 'Rescisões' },
  { to: '/vacations',          module: 'rescissions',       icon: TreePalm,        label: 'Férias' },
  { to: '/logs',              module: 'logs',              icon: History,         label: 'Logs de Auditoria',   superadminOnly: true },
  { to: '/portal',            module: 'dashboard',         icon: UserCog,         label: 'Portal do Colaborador' },
  { to: '/commercial',        module: 'dashboard',         icon: FileText,        label: 'Proposta Comercial', superadminOnly: true, cristianoOnly: true },
  { to: '/users',             module: 'settings',          icon: UserCog,         label: 'Usuários' },
  { to: '/settings/email',    module: 'settings',          icon: Mail,            label: 'Config. Email', superadminOnly: true },
  { to: '/settings',          module: 'settings',          icon: Settings,        label: 'Configurações', superadminOnly: true },
];

export default function AppSidebar({ onNavigate, isMobile }: { onNavigate?: () => void; isMobile?: boolean }) {
  const { user, logout, currentPermissions, isEmployeeView, isImpersonating } = useAuth();
  const [lastDataSync, setLastDataSync] = useState<string | null>(null);

  useEffect(() => {
    const fetchSync = async () => {
      try {
        const { data } = await supabase
          .from('attendance_devices')
          .select('last_sync')
          .not('last_sync', 'is', null)
          .order('last_sync', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data?.last_sync) setLastDataSync(data.last_sync);
      } catch (err) {
        console.error('Erro ao buscar última sync:', err);
      }
    };
    fetchSync();
  }, []);

  const isCristiano = (user?.email?.toLowerCase().includes('cristiano') || user?.name?.toLowerCase().includes('cristiano')) && !isImpersonating;
  const isSuperAdmin = (user?.role === 'superadmin' || isCristiano) && !isImpersonating;

  const links = ALL_LINKS.filter(link => {
    // Se visão de colaborador estiver ativa, mostrar apenas Holerites
    if (user?.email === 'teste' && isEmployeeView) {
      return ['/holerites', '/dashboard'].includes(link.to);
    }

    // Links exclusivos para Cristiano (Dono do Sistema)
    if ((link as any).cristianoOnly && !isCristiano) return false;

    // Links exclusivos de superadmin só aparecem para cristiano/superadmin
    if (link.superadminOnly && !isSuperAdmin) return false;
    // Se cristiano ou superadmin: acesso total a todos os módulos
    if (isCristiano || currentPermissions === undefined) return true;
    // Para outros: verificar permissões
    return Array.isArray(currentPermissions) && currentPermissions.includes(link.module);
  });

  return (
    <aside className={cn(
      "relative flex flex-col w-[240px] min-h-screen glass border-r border-white/5 shadow-2xl z-50",
      isMobile && "h-full border-none shadow-none"
    )}>
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-full h-32 bg-primary/5 blur-[100px] pointer-events-none" />
      {/* Logo */}
      <NavLink 
        to="/dashboard" 
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 h-16 border-b border-white/5 hover:bg-white/5 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(31,180,243,0.2)] bg-black/40 p-1 border border-white/5 flex items-center justify-center">
          {user?.tenantBranding?.logo_url ? (
            <img src={user.tenantBranding.logo_url} alt="Logo" className="w-full h-full object-contain" />
          ) : (user?.role === 'superadmin' && !isImpersonating) ? (
            <img src="/logo-cybertech.png" alt="Logo" className="w-full h-full object-contain" />
          ) : null}
        </div>
        <span className="font-bold text-[16px] tracking-tighter text-white drop-shadow-sm min-h-[1em]">
          {user?.tenantBranding?.system_name || ((user?.role === 'superadmin' && !isImpersonating) ? "CyberTech RH" : "")}
        </span>
      </NavLink>

      {/* Role badge */}
      <div className="px-5 py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {user?.email === 'teste' 
            ? (isEmployeeView ? '👤 Colaborador (Teste)' : '⚡ Ambiente de Teste') 
            : user?.role === 'superadmin' ? 'Super Administrador' : 'Empresa'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-primary/15 text-primary shadow-[inset_0_0_10px_rgba(31,180,243,0.1)] border border-primary/20'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 ${isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User & Status & Logout */}
      <div className="border-t border-border/50 p-4 space-y-4 bg-black/20">
        {/* Sync Status Box */}
        <div className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
             <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80">Sistema Online</span>
             <span className="ml-auto text-[9px] font-mono text-emerald-500">REALTIME</span>
           </div>
           
           <div className="flex items-center gap-2">
             <div className={`w-1.5 h-1.5 rounded-full ${lastDataSync ? 'bg-primary' : 'bg-amber-500'} shadow-[0_0_8px_rgba(31,180,243,0.4)] animate-pulse`} />
             <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">Sinc. Ponto</span>
             <span className="ml-auto text-[9px] font-mono text-muted-foreground whitespace-nowrap">
               {lastDataSync ? new Date(lastDataSync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--/-- --:--'}
             </span>
           </div>
        </div>

        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-white/5 border border-white/5">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[12px] border border-primary/20 shadow-[0_0_10px_rgba(31,180,243,0.1)]">
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-black text-white truncate leading-tight uppercase tracking-tighter">
              {user?.name} {isImpersonating && "(Simulação)"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate font-medium">
              {isImpersonating ? "Acesso Temporário" : (user?.role === 'superadmin' ? 'Super Administrador' : 'Administrador')}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { logout(); onNavigate?.(); }}
          className="w-full justify-start gap-2.5 h-9 text-rose-500 hover:text-rose-600 hover:bg-rose-500/5 text-[13px] font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sair ou Trocar Usuário
        </Button>
      </div>
    </aside>
  );
}
