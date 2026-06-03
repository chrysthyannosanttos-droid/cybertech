import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Cake, Gift, Send, Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BirthdayPosterGenerator } from '@/components/dashboard/BirthdayPosterGenerator';

interface BirthdayEmployee {
  id: string;
  name: string;
  role: string;
  phone?: string;
  birth_date: string;
  department?: string;
}

function getAge(birthDateStr: string): number {
  const today = new Date();
  const birth = new Date(birthDateStr);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age + 1; // Age they are turning
}

export default function Birthdays() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<BirthdayEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBirthdays = useCallback(async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, role, phone, birth_date, department')
        .eq('tenant_id', user.tenantId)
        .eq('status', 'ACTIVE')
        .not('birth_date', 'is', null);

      if (error) throw error;

      // Filtrar apenas do mês selecionado
      const targetMonth = currentMonth.getMonth() + 1;
      
      const filtered = (data || []).filter(emp => {
        if (!emp.birth_date) return false;
        const bd = new Date(emp.birth_date + 'T00:00:00');
        return bd.getMonth() + 1 === targetMonth;
      });

      // Ordenar por dia
      filtered.sort((a, b) => {
        const bdA = new Date(a.birth_date + 'T00:00:00').getDate();
        const bdB = new Date(b.birth_date + 'T00:00:00').getDate();
        return bdA - bdB;
      });

      setEmployees(filtered);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, currentMonth, toast]);

  useEffect(() => {
    fetchBirthdays();
  }, [fetchBirthdays]);

  const handleSendWhatsApp = async (emp: BirthdayEmployee) => {
    if (!emp.phone) {
      toast({ title: 'Sem número', description: `${emp.name} não tem WhatsApp.`, variant: 'destructive' });
      return;
    }
    setSendingId(emp.id);
    try {
      const { data: waSettings } = await supabase
        .from('tenant_whatsapp_settings')
        .select('*')
        .eq('tenant_id', user!.tenantId!)
        .maybeSingle();

      const { data: bdSettings } = await supabase
        .from('tenant_birthday_settings')
        .select('template_whatsapp')
        .eq('tenant_id', user!.tenantId!)
        .maybeSingle();

      const template = bdSettings?.template_whatsapp ||
        'Feliz Aniversário, {{nome}}! 🎂🎉 Toda a equipe deseja a você um dia incrível!';

      const message = template.replace(/{{nome}}/g, emp.name.split(' ')[0]);

      if (waSettings?.api_type === 'evolution' && waSettings.base_url) {
        const cleanPhone = emp.phone.replace(/\D/g, '');
        const response = await fetch(`${waSettings.base_url}/message/sendText/${waSettings.instance_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': waSettings.token },
          body: JSON.stringify({ number: `55${cleanPhone}`, text: message })
        });
        if (response.ok) {
          toast({ title: '🎂 Mensagem enviada!', description: `WhatsApp enviado para ${emp.name.split(' ')[0]}` });
        } else {
          throw new Error('API retornou erro');
        }
      } else {
        const cleanPhone = emp.phone.replace(/\D/g, '');
        const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        toast({ title: '💬 WhatsApp aberto!' });
      }
    } catch (e: any) {
      toast({ title: 'Erro no envio', description: e.message, variant: 'destructive' });
    } finally {
      setSendingId(null);
    }
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Cake className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tighter">Aniversariantes</h1>
            <p className="text-sm text-muted-foreground font-medium">
              Acompanhe e parabenize os colaboradores
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={prevMonth} className="h-10 w-10 p-0 rounded-xl bg-white/5 border-white/10 hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="w-48 text-center bg-white/5 border border-white/10 rounded-xl h-10 flex items-center justify-center font-bold text-white capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </div>
          <Button variant="outline" onClick={nextMonth} className="h-10 w-10 p-0 rounded-xl bg-white/5 border-white/10 hover:bg-white/10">
            <ChevronRight className="w-5 h-5" />
          </Button>
          
          {!isSameMonth(currentMonth, new Date()) && (
            <Button variant="ghost" onClick={goToToday} className="h-10 px-4 rounded-xl font-bold text-primary hover:bg-primary/10">
              Mês Atual
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar colaborador..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-11 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-muted-foreground/50 focus:border-amber-500/50 focus:ring-amber-500/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="glass-card rounded-[2rem] border border-white/5 p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="glass-card rounded-[2rem] border border-white/5 p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-4xl mb-4 border border-white/5">
            📅
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Nenhum aniversariante</h3>
          <p className="text-sm text-muted-foreground">
            Não há registros de aniversários para o mês selecionado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map(emp => {
            const bdDate = new Date(emp.birth_date + 'T00:00:00');
            const dayLabel = format(bdDate, "d 'de' MMMM", { locale: ptBR });
            const today = new Date();
            const isTodayBirthday = bdDate.getDate() === today.getDate() && bdDate.getMonth() === today.getMonth();

            return (
              <div 
                key={emp.id}
                className={cn(
                  "glass-card rounded-[1.5rem] border p-5 flex flex-col gap-4 transition-all group",
                  isTodayBirthday 
                    ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15" 
                    : "border-white/5 hover:bg-white/5 hover:border-white/10"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-lg",
                      isTodayBirthday ? "bg-amber-500 border border-amber-400" : "bg-white/10 border border-white/10"
                    )}>
                      {isTodayBirthday ? '🎂' : '🎁'}
                    </div>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors leading-tight">
                        {emp.name.split(' ').slice(0, 2).join(' ')}
                      </h4>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
                        {emp.role}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 rounded-xl p-3 flex items-center justify-between border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Data</span>
                    <span className="text-[13px] font-black text-white">{dayLabel}</span>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Completando</span>
                    <span className="text-[13px] font-black text-amber-400">{getAge(emp.birth_date)} anos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-auto pt-2">
                  <div className="flex-1">
                    <BirthdayPosterGenerator employeeName={emp.name} employeeRole={emp.role} />
                  </div>
                  <Button
                    onClick={() => handleSendWhatsApp(emp)}
                    disabled={sendingId === emp.id}
                    className="flex-1 h-10 gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl font-bold text-[11px] uppercase tracking-widest"
                  >
                    {sendingId === emp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    WhatsApp
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
