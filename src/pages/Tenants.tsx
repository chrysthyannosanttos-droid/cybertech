import { useState } from 'react';
import { MOCK_TENANTS } from '@/data/mockData';
import { Tenant } from '@/types';
import { Building2, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

function StatusBadge({ status }: { status: Tenant['subscription']['status'] }) {
  const map = {
    active: 'bg-emerald-50 text-emerald-700',
    past_due: 'bg-amber-50 text-amber-700',
    suspended: 'bg-rose-50 text-rose-700',
  };
  const labels = { active: 'Ativo', past_due: 'Vencido', suspended: 'Suspenso' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function Tenants() {
  const [tenants, setTenants] = useState(MOCK_TENANTS);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({ name: '', cnpj: '', monthlyFee: '', expiryDate: '' });

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) || t.cnpj.includes(search)
  );

  const handleAdd = () => {
    if (!form.name || !form.cnpj) return;
    const newTenant: Tenant = {
      id: `t${Date.now()}`,
      name: form.name,
      cnpj: form.cnpj,
      subscription: {
        status: 'active',
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: form.expiryDate || '2027-01-01',
        monthlyFee: Number(form.monthlyFee) || 0,
        additionalCosts: [],
      },
      employeeCount: 0,
    };
    setTenants(prev => [...prev, newTenant]);
    setForm({ name: '', cnpj: '', monthlyFee: '', expiryDate: '' });
    setOpen(false);
    toast({ title: 'Empresa cadastrada', description: `${form.name} adicionada com sucesso.` });
  };

  const toggleStatus = (id: string) => {
    setTenants(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, subscription: { ...t.subscription, status: t.subscription.status === 'active' ? 'suspended' : 'active' } }
          : t
      )
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Empresas</h1>
          <p className="text-[13px] text-muted-foreground">Gerencie clientes e licenças</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-[13px] gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[15px]">Cadastrar Empresa</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1">Nome</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1">CNPJ/CPF</label>
                <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} className="h-9 text-[13px]" placeholder="00.000.000/0001-00" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1">Mensalidade (R$)</label>
                <Input type="number" value={form.monthlyFee} onChange={e => setForm(f => ({ ...f, monthlyFee: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-medium text-muted-foreground block mb-1">Validade do Contrato</label>
                <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <Button onClick={handleAdd} className="w-full h-9 text-[13px]">Cadastrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa ou CNPJ..." className="pl-9 h-9 text-[13px]" />
      </div>

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Empresa</th>
              <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">CNPJ</th>
              <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Mensalidade</th>
              <th className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Validade</th>
              <th className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Ação</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-border/30 last:border-0 hover:bg-accent/50 transition-colors duration-150">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[13px] font-medium">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground">{t.employeeCount} funcionários</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono-data text-[13px]">{t.cnpj}</td>
                <td className="px-4 py-3"><StatusBadge status={t.subscription.status} /></td>
                <td className="px-4 py-3 text-right font-mono-data text-[13px]">R$ {t.subscription.monthlyFee.toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3 text-right text-[13px] text-muted-foreground">{new Date(t.subscription.expiryDate).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => toggleStatus(t.id)}>
                    {t.subscription.status === 'active' ? 'Suspender' : 'Ativar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
