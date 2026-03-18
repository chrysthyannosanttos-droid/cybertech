import { useState } from 'react';
import { MOCK_CERTIFICATES, MOCK_EMPLOYEES } from '@/data/mockData';
import { Certificate } from '@/types';
import { Plus, FileHeart, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function Certificates() {
  const [certificates, setCertificates] = useState<Certificate[]>(MOCK_CERTIFICATES);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ employeeId: '', date: '', cid: '', days: '' });

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
    setForm({ employeeId: '', date: '', cid: '', days: '' });
    setOpen(false);
    toast({ title: 'Atestado registrado' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Atestados</h1>
          <p className="text-[13px] text-muted-foreground">{certificates.length} registros</p>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="h-8 text-[13px] gap-1.5"><Plus className="w-3.5 h-3.5" /> Lançar Atestado</Button>
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

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CID..." className="pl-9 h-9 text-[13px]" />
      </div>

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              {['Funcionário', 'Data', 'CID', 'Dias', 'Arquivo'].map(h => (
                <th key={h} className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-accent/50 transition-colors duration-150">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <FileHeart className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[13px] font-medium">{c.employeeName}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-[13px]">{new Date(c.date).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-2.5 font-mono-data text-[13px]">{c.cid}</td>
                <td className="px-4 py-2.5 text-[13px] tabular-nums">{c.days} dia{c.days > 1 ? 's' : ''}</td>
                <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{c.fileName || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
