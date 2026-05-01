import { Link, useLocation } from "@tanstack/react-router";
import {
  Calendar,
  Users,
  DollarSign,
  LayoutDashboard,
  Package,
  MessageSquare,
  UserCog,
  Settings,
  LogOut,
  ShieldCheck,
  Zap,
  Scissors,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Zap, label: "PDV (Vendas)", to: "/dashboard/pdv" },
  { icon: Calendar, label: "Agenda", to: "/dashboard/agenda" },
  { icon: Users, label: "Clientes", to: "/dashboard/clientes" },
  { icon: Scissors, label: "Serviços", to: "/dashboard/servicos" },
  { icon: DollarSign, label: "Financeiro", to: "/dashboard/financeiro" },
  { icon: Package, label: "Estoque", to: "/dashboard/estoque" },
  { icon: UserCog, label: "Equipe", to: "/dashboard/equipe" },
  { icon: MessageSquare, label: "Marketing", to: "/dashboard/marketing" },
  { icon: Settings, label: "Configurações", to: "/dashboard/config" },
];

const mobileBottomItems = [
  { icon: LayoutDashboard, label: "Início", to: "/dashboard" },
  { icon: Calendar, label: "Agenda", to: "/dashboard/agenda" },
  { icon: Zap, label: "PDV", to: "/dashboard/pdv" },
  { icon: Users, label: "Clientes", to: "/dashboard/clientes" },
  { icon: Package, label: "Mais", to: "__more__" },
];

export function DashboardSidebar() {
  const location = useLocation();
  const { user, isSuperAdmin, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved === "true") setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  return (
    <>
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className={`fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex ${
          isCollapsed ? "w-[68px]" : "w-60"
        }`}
      >
        {/* Header */}
        <div className={`flex h-20 items-center border-b border-sidebar-border px-4 ${isCollapsed ? "justify-center" : "justify-between px-6"}`}>
          {!isCollapsed && (
            <Link to="/">
              <Logo size="md" />
            </Link>
          )}
          {isCollapsed && (
            <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Scissors size={18} className="text-primary" />
            </Link>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            title={isCollapsed ? "Expandir menu" : "Minimizar menu"}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto scrollbar-none">
          {isSuperAdmin && (
            <Link
              to="/admin"
              title="Painel SaaS Admin"
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all mb-2 ${
                location.pathname === "/admin"
                  ? "bg-primary/10 text-primary"
                  : "text-primary hover:bg-primary/10"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <ShieldCheck size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Painel SaaS</span>}
            </Link>
          )}
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                } ${isCollapsed ? "justify-center" : ""}`}
              >
                <item.icon size={18} className="flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2">
          {!isCollapsed && user && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {user.role === "SUPER_ADMIN" ? "Administrador" : user.role === "VIEW_ONLY" ? "Demonstração" : user.empresa || "Usuário"}
              </p>
            </div>
          )}
          <button
            onClick={() => { logout(); window.location.href = "/"; }}
            title="Sair"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-red-400 ${isCollapsed ? "justify-center" : ""}`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!isCollapsed && "Sair"}
          </button>
        </div>
      </aside>

      {/* ===== MOBILE TOP BAR ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar/95 backdrop-blur-xl px-4 lg:hidden">
        <Link to="/dashboard">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          {user && (
            <div className="text-right mr-1">
              <p className="text-[11px] font-bold text-foreground leading-none">{user.name}</p>
              <p className="text-[9px] text-muted-foreground">
                {user.role === "SUPER_ADMIN" ? "Admin" : user.role === "VIEW_ONLY" ? "Demo" : "Usuário"}
              </p>
            </div>
          )}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-sidebar-border text-sidebar-foreground"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* ===== MOBILE FULLSCREEN MENU ===== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-72 flex flex-col bg-sidebar border-r border-sidebar-border shadow-2xl animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="flex h-14 items-center justify-between px-5 border-b border-sidebar-border">
              <Logo size="sm" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-sidebar-border text-muted-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Info Card */}
            {user && (
              <div className="mx-4 mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-black text-primary">{user.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {user.role === "SUPER_ADMIN" ? "Administrador" : user.role === "VIEW_ONLY" ? "Modo Demonstração" : user.empresa || "Usuário"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Link */}
            {isSuperAdmin && (
              <div className="px-4 mt-3">
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-primary bg-primary/10"
                >
                  <ShieldCheck size={18} /> Painel SaaS Admin
                </Link>
              </div>
            )}

            {/* Nav Items */}
            <nav className="flex-1 px-4 py-3 overflow-y-auto space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 pb-2">Navegação</p>
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.to ||
                  (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                    }`}
                  >
                    <item.icon size={18} className="flex-shrink-0" />
                    {item.label}
                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-sidebar-border">
              <button
                onClick={() => { logout(); window.location.href = "/"; }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20"
              >
                <LogOut size={18} /> Sair do Sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 h-16 border-t border-sidebar-border bg-sidebar/95 backdrop-blur-xl lg:hidden safe-area-pb">
        {[
          { icon: LayoutDashboard, label: "Início", to: "/dashboard" },
          { icon: Calendar, label: "Agenda", to: "/dashboard/agenda" },
          { icon: Zap, label: "PDV", to: "/dashboard/pdv" },
          { icon: Users, label: "Clientes", to: "/dashboard/clientes" },
          { icon: DollarSign, label: "Finanças", to: "/dashboard/financeiro" },
        ].map((item) => {
          const isActive =
            location.pathname === item.to ||
            (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 transition-all ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-primary/10" : ""}`}>
                <item.icon size={19} />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wide ${isActive ? "text-primary" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
