import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-background text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-full border-r border-white/5">
        <AppSidebar />
      </div>

      {/* Mobile Header & Sidebar */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <div className="fixed top-0 left-0 right-0 h-16 glass border-b border-white/5 z-40 flex items-center px-4 justify-between">
            <div className="flex items-center gap-2">
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <span className="font-black tracking-tighter text-[15px] uppercase">{user?.tenantBranding?.system_name || "CyberTech"}</span>
            </div>
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
              <img src={user?.tenantBranding?.logo_url || "/logo-cybertech.png"} alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
          </div>
          <SheetContent side="left" className="p-0 w-[240px] bg-transparent border-none">
            <AppSidebar onNavigate={() => setOpen(false)} isMobile />
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 overflow-y-auto h-full pt-16 md:pt-0 custom-scrollbar">
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
