import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Sync Trigger: 2026-05-01 17:10 - Final Production Refinement
import { HashRouter, Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useLicenseGuard } from "@/hooks/useLicenseGuard";
import { LicenseBlockScreen } from "@/components/LicenseBlockScreen";
import { BrandingStyles } from "@/components/BrandingStyles";
import DashboardLayout from "@/layouts/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Tenants from "@/pages/Tenants";
import CompanySettings from "@/pages/CompanySettings";
import Stores from "@/pages/Stores";
import Employees from "@/pages/Employees";
import EmployeeDocuments from "@/pages/EmployeeDocuments";
import Certificates from "@/pages/Certificates";
import Payroll from "@/pages/Payroll";
import Reports from "@/pages/Reports";
import ServiceProviders from "@/pages/ServiceProviders";
import Rescissions from "@/pages/Rescissions";
import Settings from "@/pages/Settings";
import AuditLogs from "@/pages/AuditLogs";
import UserManagement from "@/pages/UserManagement";
import Holerites from "@/pages/Holerites";
import CommunicationSettings from "@/pages/CommunicationSettings";
import NotFound from "@/pages/NotFound";
import Attendance from "@/pages/Attendance";
import Vacations from "@/pages/Vacations";
import Commercial from "@/pages/Commercial";
import EmployeePortal from "@/pages/EmployeePortal";
import EmployeeLogin from "@/pages/EmployeeLogin";
import TerminalPonto from "@/pages/TerminalPonto";


const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isAuthenticated, isEmployeeView } = useAuth();
  const isSuperadmin = user?.role === 'superadmin' || user?.email === 'cristiano';
  
  // ── CAMADA 2: Monitoramento de Licença em Tempo Real ──
  const license = useLicenseGuard(user?.tenantId, isSuperadmin);

  // Se a licença estiver bloqueada (suspensa ou offline expirado), mostramos a tela de bloqueio
  const isBlocked = license.status === 'suspended' || license.status === 'offline_blocked';

  if (isAuthenticated && isBlocked) {
    return <LicenseBlockScreen licenseInfo={license} />;
  }

  // Define a landing page baseada no cargo
  const landingPage = (isEmployeeView || user?.role === 'employee') ? "/portal" : "/dashboard";

  const isNativeApp = !!(window as any).Capacitor;
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isNativeApp && location.pathname === '/') {
      navigate('/terminal', { replace: true });
    }
  }, [isNativeApp, location.pathname]);

  return (
    <Routes>
      <Route path="/" element={isNativeApp ? <Navigate to="/terminal" replace /> : (isAuthenticated ? <Navigate to={landingPage} replace /> : <Navigate to="/login" replace />)} />
      <Route path="/colaborador" element={<EmployeeLogin />} />
      <Route path="/terminal" element={isNativeApp ? <TerminalPonto /> : <Navigate to="/login" replace />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={landingPage} replace /> : <Login />} />
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/documents" element={<EmployeeDocuments />} />
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/service-providers" element={<ServiceProviders />} />
        <Route path="/rescissions" element={<Rescissions />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/company" element={<CompanySettings />} />
        <Route path="/settings/email" element={<CommunicationSettings />} />
        <Route path="/logs" element={<AuditLogs />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/holerites" element={<Holerites />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/vacations" element={<Vacations />} />
        <Route path="/commercial" element={<Commercial />} />
      </Route>
      <Route path="/portal" element={<ProtectedRoute><EmployeePortal /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <BrandingStyles />
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
