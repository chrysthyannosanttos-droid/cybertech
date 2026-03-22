import { useState } from 'react';
import { MOCK_CERTIFICATES, MOCK_EMPLOYEES } from '@/data/mockData';
import { Certificate } from '@/types';
import { Plus, FileHeart, Search, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { addAuditLog } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>(MOCK_CERTIFICATES);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState({ employeeId: '', date: '', cid: '', days: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const isCristiano = currentUser?.email === 'cristiano' || currentUser?.name?.toLowerCase() === 'cristiano';

  const filtered = certificates.filter(c =>
    c.employeeName.toLowerCase().includes(search.toLowerCase()) || c.cid.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = () => {
    if (!form.employeeId || !form.date || !form.cid || !form.days) return;
    const emp = MOCK_EMPLOYEES.find(e => e.id === form.employeeId);
    const newCert: Certificate = {
      id: `c_${Date.now()}`,
      employeeId: form.employeeId,
      employeeName: emp?.name || '',
      date: form.date,
      cid: form.cid.toUpperCase(),
      days: Number(form.days),
    };
    setCertificates(prev => [newCert, ...prev]);
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Sistema',
      action: 'CREATE',
      details: `[Certificates] Lançou atestado para ${emp?.name} (CID: ${newCert.cid})`
    });
    setForm({ employeeId: '', date: '', cid: '', days: '' });
    setOpen(false);
    toast({ title: 'Atestado registrado' });
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

  const handleDeleteSelected = () => {
    if (!isCristiano) return;
    const count = selectedIds.length;
    setCertificates(prev => prev.filter(c => !selectedIds.includes(c.id)));
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE',
      details: `[Certificates] Excluiu ${count} atestado(s) em massa.`
    });
    setSelectedIds([]);
    toast({ title: `${count} atestado(s) excluído(s)` });
  };

  const handleDeleteOne = (id: string, name: string) => {
    if (!isCristiano) return;
    setCertificates(prev => prev.filter(c => c.id !== id));
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE',
      details: `[Certificates] Excluiu atestado de ${name}`
    });
    setSelectedIds(prev => prev.filter(x => x !== id));
    toast({ title: 'Atestado excluído' });
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
                    {MOCK_EMPLOYEES.slice(0, 20).map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
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
        
        {isCristiano && selectedIds.length > 0 && (
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
              {isCristiano && <th className="px-6 py-4 text-right">Ações</th>}
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
                {isCristiano && (
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
