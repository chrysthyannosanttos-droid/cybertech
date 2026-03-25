import { useState, useEffect } from 'react';
import { addAuditLog } from '@/data/mockData';
import { Certificate, Employee } from '@/types';
import { Plus, FileHeart, Search, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [dbEmployees, setDbEmployees] = useState<{id: string, name: string}[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({ employeeId: '', date: '', cid: '', days: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'cristiano';

  useEffect(() => {
    const fetchData = async () => {
      // Fetch real tenant_id
      const { data: tData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
      if (tData?.id) setTenantId(tData.id);

      // Fetch Certificates
      const { data: certData } = await supabase.from('certificates').select('*').order('date', { ascending: false });
      if (certData) setCertificates(certData.map(c => ({
        ...c,
        employeeId: c.employee_id,
        employeeName: c.employee_name,
        date: c.date,
        cid: c.cid,
        days: c.days
      } as unknown as Certificate)));

      // Fetch Active Employees for the dropdown
      const { data: empData } = await supabase.from('employees').select('id, name').eq('status', 'ACTIVE');
      if (empData) setDbEmployees(empData);
    };

    fetchData();

    // Realtime
    const channel = supabase.channel('certs_realtime').on('postgres_changes', { event: '*', table: 'certificates', schema: 'public' }, () => {
      fetchData();
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = certificates.filter(c =>
    (c.employeeName || '').toLowerCase().includes(search.toLowerCase()) || (c.cid || '').toLowerCase().includes(search.toLowerCase())
  );
  const handleAdd = async () => {
    if (!form.employeeId || !form.date || !form.cid || !form.days) return;
    const emp = dbEmployees.find(e => e.id === form.employeeId);
    
    const dbData = {
      employee_id: form.employeeId,
      employee_name: emp?.name || '',
      date: form.date,
      cid: form.cid.toUpperCase(),
      days: Number(form.days),
      tenant_id: tenantId
    };

    const { error } = await supabase.from('certificates').insert([dbData]);

    if (error) {
      toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
      return;
    }

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Sistema',
      action: 'CREATE_CERTIFICATE',
      details: `[Certificates] Lançou atestado para ${emp?.name} (CID: ${dbData.cid})`
    });
    setForm({ employeeId: '', date: '', cid: '', days: '' });
    setOpen(false);
    toast({ title: 'Atestado registrado' });
    setTimeout(() => window.location.reload(), 500);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(c => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    if (!isAdmin) return;
    const count = selectedIds.length;
    
    const { error } = await supabase.from('certificates').delete().in('id', selectedIds);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_CERTIFICATES',
      details: `[Certificates] Excluiu ${count} atestado(s) em massa.`
    });
    setSelectedIds([]);
    toast({ title: `${count} atestado(s) excluído(s)` });
    setTimeout(() => window.location.reload(), 500);
  };

  const handleDeleteOne = async (id: string, name: string) => {
    if (!isAdmin) return;
    
    const { error } = await supabase.from('certificates').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_CERTIFICATE',
      details: `[Certificates] Excluiu atestado de ${name}`
    });
    setSelectedIds(prev => prev.filter(x => x !== id));
    toast({ title: 'Atestado excluído' });
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Gestão de Atestados</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{certificates.length} registros no sistema</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="h-10 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-[12px] gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4" /> Lançar Atestado
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[380px]">
            <SheetHeader>
              <SheetTitle className="text-[15px]">Lançar Atestado</SheetTitle>
            </SheetHeader>
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1">Funcionário</label>
                <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {dbEmployees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1">Data</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1">CID</label>
                <Input value={form.cid} onChange={e => setForm(f => ({ ...f, cid: e.target.value }))} className="h-9 text-[13px]" placeholder="Ex: J06, M54" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1">Dias</label>
                <Input type="number" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} className="h-9 text-[13px]" min={1} />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1">Anexo (PDF/Imagem)</label>
                <Input type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-[13px]" />
              </div>
              <Button onClick={handleAdd} className="w-full h-9 text-[13px]">Registrar Atestado</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="relative group max-w-md flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CID..." className="pl-11 h-11 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 text-[13px] transition-all" />
        </div>
        
        {isAdmin && selectedIds.length > 0 && (
          <Button variant="destructive" size="sm" className="h-10 px-6 rounded-xl font-bold text-[12px] gap-2 animate-in fade-in zoom-in duration-200" onClick={handleDeleteSelected}>
            <Trash2 className="w-4 h-4" /> Excluir Selecionados ({selectedIds.length})
          </Button>
        )}
      </div>

      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
              <th className="px-6 py-4 w-[40px]">
                <Checkbox 
                  checked={filtered.length > 0 && selectedIds.length === filtered.length} 
                  onCheckedChange={toggleSelectAll}
                  className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </th>
              <th className="px-6 py-4">Colaborador</th>
              <th className="px-6 py-4">Data Registro</th>
              <th className="px-6 py-4 text-center">CID</th>
              <th className="px-6 py-4 text-center">Dias</th>
              {isAdmin && <th className="px-6 py-4 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(c => (
              <tr key={c.id} className={cn("hover:bg-white/[0.02] transition-colors group", selectedIds.includes(c.id) && "bg-primary/5")}>
                <td className="px-6 py-4">
                  <Checkbox 
                    checked={selectedIds.includes(c.id)} 
                    onCheckedChange={() => toggleSelect(c.id)}
                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-500 group-hover:scale-110 transition-transform">
                      <FileHeart className="w-4 h-4" />
                    </div>
                    <span className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{c.employeeName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[13px] text-muted-foreground group-hover:text-white transition-colors">{new Date(c.date).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4">
                   <div className="flex justify-center">
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono-data text-[12px] text-primary font-bold">
                      {c.cid}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-black text-white tabular-nums">{c.days} <span className="text-[10px] text-muted-foreground font-bold uppercase">dia{c.days > 1 ? 's' : ''}</span></span>
                </td>
                {isAdmin && (
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => handleDeleteOne(c.id, c.employeeName)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
