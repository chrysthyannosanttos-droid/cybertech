import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Store,
  Users,
  FileHeart,
  DollarSign,
  BarChart3,
  LogOut,
  Shield,
} from 'lucide-react';

const superAdminLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tenants', icon: Building2, label: 'Empresas' },
];

const tenantLinks = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/stores', icon: Store, label: 'Lojas' },
  { to: '/employees', icon: Users, label: 'Funcionários' },
  { to: '/certificates', icon: FileHeart, label: 'Atestados' },
  { to: '/payroll', icon: DollarSign, label: 'Folha' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
];

export default function AppSidebar() {
  const { user, logout } = useAuth();
  const links = user?.role === 'superadmin' ? [...superAdminLinks, ...tenantLinks.slice(1)] : tenantLinks;

  return (
    <aside className="flex flex-col w-[240px] min-h-screen bg-card shadow-card border-r border-border/50">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 h-14 border-b border-border/50">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-[15px] tracking-tight text-foreground">Nexus HR</span>
      </div>

      {/* Role badge */}
      <div className="px-5 py-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {user?.role === 'superadmin' ? 'Super Admin' : 'Empresa'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border/50 p-3">
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {user?.name?.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate text-foreground">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="p-1 rounded hover:bg-accent transition-colors" title="Sair">
            <LogOut className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </aside>
  );
}
