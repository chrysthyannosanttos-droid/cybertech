import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Cake, Gift, Send, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface BirthdayEmployee {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  birth_date: string;
  daysUntil: number; // 0 = today, 1 = tomorrow, etc.
}

function getAge(birthDateStr: string): number {
  const today = new Date();
  const birth = new Date(birthDateStr);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age + 1; // Age they're turning
}

export function BirthdaysWidget() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [birthdays, setBirthdays] = useState<BirthdayEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const fetchBirthdays = useCallback(async () => {
    if (!user?.tenantId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, role, phone, email, birth_date')
        .eq('tenant_id', user.tenantId)
        .eq('status', 'ACTIVE')
        .not('birth_date', 'is', null);

      if (!employees) { setLoading(false); return; }

      const today = new Date();
      const results: BirthdayEmployee[] = [];

      for (let daysAhead = 0; daysAhead <= 3; daysAhead++) {
        const checkDate = addDays(today, daysAhead);
        const targetMonth = checkDate.getMonth() + 1;
        const targetDay = checkDate.getDate();

        employees.forEach(emp => {
          if (!emp.birth_date) return;
          const bd = new Date(emp.birth_date + 'T00:00:00');
          if (bd.getMonth() + 1 === targetMonth && bd.getDate() === targetDay) {
            results.push({ ...emp, daysUntil: daysAhead });
          }
        });
      }

      setBirthdays(results.sort((a, b) => a.daysUntil - b.daysUntil));
    } catch (e) {
      console.error('Error fetching birthdays:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    fetchBirthdays();
  }, [fetchBirthdays]);

  const handleSendWhatsApp = async (emp: BirthdayEmployee) => {
    if (!emp.phone) {
      toast({ title: 'Sem número', description: `${emp.name} não tem WhatsApp cadastrado.`, variant: 'destructive' });
      return;
    }
    setSendingId(emp.id);
    try {
      // Busca configurações do WhatsApp do tenant
      const { data: waSettings } = await supabase
        .from('tenant_whatsapp_settings')
        .select('*')
        .eq('tenant_id', user!.tenantId!)
        .maybeSingle();

      // Busca template do birthday settings
      const { data: bdSettings } = await supabase
        .from('tenant_birthday_settings')
        .select('template_whatsapp')
        .eq('tenant_id', user!.tenantId!)
        .maybeSingle();

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', user!.tenantId!)
        .maybeSingle();

      const template = bdSettings?.template_whatsapp ||
        'Feliz Aniversário, {{nome}}! 🎂🎉 Toda a equipe da {{company}} deseja a você um dia incrível!';

      const message = template
        .replace(/{{nome}}/g, emp.name.split(' ')[0])
        .replace(/{{company}}/g, tenantData?.name || 'nossa empresa');

      // Se tiver Evolution API configurada, usa ela
      if (waSettings?.api_type === 'evolution' && waSettings.base_url && waSettings.instance_id && waSettings.token) {
        const cleanPhone = emp.phone.replace(/\D/g, '');
        const response = await fetch(`${waSettings.base_url}/message/sendText/${waSettings.instance_id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': waSettings.token },
          body: JSON.stringify({ number: `55${cleanPhone}`, text: message })
        });
        if (response.ok) {
          // Log the send
          await supabase.from('birthday_send_logs').insert({
            tenant_id: user!.tenantId,
            employee_id: emp.id,
            employee_name: emp.name,
            channel: 'whatsapp',
            status: 'sent',
            birthday_date: emp.birth_date
          });
          toast({ title: '🎂 Mensagem enviada!', description: `Parabéns enviado para ${emp.name.split(' ')[0]}` });
        } else {
          throw new Error('API retornou erro');
        }
      } else {
        // Fallback: abre WhatsApp Web
        const cleanPhone = emp.phone.replace(/\D/g, '');
        const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        toast({ title: '💬 WhatsApp aberto!', description: `Mensagem preparada para ${emp.name.split(' ')[0]}` });
      }
    } catch (e: any) {
      await supabase.from('birthday_send_logs').insert({
        tenant_id: user!.tenantId,
        employee_id: emp.id,
        employee_name: emp.name,
        channel: 'whatsapp',
        status: 'failed',
        error_details: e.message,
        birthday_date: emp.birth_date
      });
      toast({ title: 'Erro no envio', description: e.message, variant: 'destructive' });
    } finally {
      setSendingId(null);
    }
  };

  const todayBirthdays = birthdays.filter(b => b.daysUntil === 0);
  const upcomingBirthdays = birthdays.filter(b => b.daysUntil > 0);

  if (loading) {
    return (
      <div className="glass-card rounded-[2rem] border border-white/5 p-8 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (birthdays.length === 0) return null;

  return (
    <div className="glass-card rounded-[2rem] border border-white/5 p-8 animate-fade-in-up relative overflow-hidden">
      {/* Decoração */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-3xl -mr-24 -mt-24 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 blur-3xl -ml-16 -mb-16 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Cake className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Aniversariantes</h3>
            {todayBirthdays.length > 0 && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                  {todayBirthdays.length} hoje!
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aniversariantes de HOJE */}
      {todayBirthdays.length > 0 && (
        <div className="mb-6 relative z-10">
          <p className="text-[10px] font-black text-amber-400/70 uppercase tracking-[0.2em] mb-3">🎂 Hoje</p>
          <div className="space-y-3">
            {todayBirthdays.map(emp => (
              <div
                key={emp.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 text-lg">
                    🎂
                  </div>
                  <div>
                    <p className="text-[13px] font-black text-white group-hover:text-amber-300 transition-colors">
                      {emp.name}
                    </p>
                    <p className="text-[10px] font-bold text-amber-400/70 uppercase tracking-widest">
                      {emp.role} • {getAge(emp.birth_date)} anos
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSendWhatsApp(emp)}
                  disabled={sendingId === emp.id}
                  className="h-9 gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-xl font-black text-[10px] uppercase tracking-widest"
                >
                  {sendingId === emp.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Parabenizar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximos aniversariantes */}
      {upcomingBirthdays.length > 0 && (
        <div className="relative z-10">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3">📅 Próximos 3 dias</p>
          <div className="space-y-2">
            {upcomingBirthdays.map(emp => {
              const bdDate = addDays(new Date(), emp.daysUntil);
              const dayLabel = emp.daysUntil === 1 ? 'Amanhã' :
                format(bdDate, "EEEE, d MMM", { locale: ptBR });
              return (
                <div
                  key={emp.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all group hover:bg-white/[0.04]",
                    emp.daysUntil === 1
                      ? "bg-primary/5 border-primary/15"
                      : "bg-white/[0.02] border-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center text-base",
                      emp.daysUntil === 1 ? "bg-primary/10 border border-primary/20" : "bg-white/5 border border-white/5"
                    )}>
                      🎁
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-white/90">{emp.name}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {dayLabel} • {getAge(emp.birth_date)} anos
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendWhatsApp(emp)}
                      disabled={sendingId === emp.id}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-primary/20 flex items-center justify-center text-muted-foreground hover:text-primary transition-all"
                      title="Enviar WhatsApp"
                    >
                      {sendingId === emp.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Send className="w-3.5 h-3.5" />
                      }
                    </button>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
