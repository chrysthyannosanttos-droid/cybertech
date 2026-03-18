import { useState } from 'react';
import { MOCK_STORES, MOCK_EMPLOYEES, MOCK_TENANTS } from '@/data/mockData';
import { Store, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { addAuditLog } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Store as StoreType } from '@/types';

export default function Stores() {
  const [stores, setStores] = useState<StoreType[]>(MOCK_STORES);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const isCristiano = currentUser?.email === 'cristiano' || currentUser?.name?.toLowerCase() === 'cristiano';

  const [form, setForm] = useState({ name: '', cnpj: '', tenantId: MOCK_TENANTS[0]?.id || '' });

  const filtered = stores.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.cnpj.includes(search)
  );

  const handleAdd = () => {
    if (!form.name || !form.cnpj || !form.tenantId) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
      return;
    }
    const newStore: StoreType = {
      id: `s_${Date.now()}`,
      name: form.name.toUpperCase(),
      cnpj: form.cnpj,
      tenantId: form.tenantId
    };
    setStores(prev => [newStore, ...prev]);
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Sistema',
      action: 'CREATE_STORE',
      details: `[Stores] Cadastrou unidade ${form.name} (CNPJ: ${form.cnpj})`
    });
    setForm({ name: '', cnpj: '', tenantId: MOCK_TENANTS[0]?.id || '' });
    setOpen(false);
    toast({ title: 'Loja cadastrada', description: `${form.name} adicionada com sucesso.` });
  };

  const handleDelete = (id: string, name: string) => {
    if (!isCristiano) return;
    if (!window.confirm(`Deseja excluir a unidade ${name}?`)) return;
    setStores(prev => prev.filter(s => s.id !== id));
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_STORE',
      details: `[Stores] Excluiu unidade ${name}`
    });
    toast({ title: 'Unidade excluída' });
  };

  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Unidades e Lojas</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Gestão de pontos de venda e centros de custo</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-10 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-[12px] gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4" /> Nova Unidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-[15px]">Cadastrar Loja / Filial</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 mt-2">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Nome da Loja *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-[13px]" placeholder="Ex: SUPER ATACADO CENTRO" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">CNPJ *</label>
                <Input value={form.cnpj} onChange={e => {
                  let v = e.target.value.replace(/\D/g, '');
                  if(v.length > 14) v = v.slice(0, 14);
                  v = v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
                  setForm(f => ({ ...f, cnpj: v }));
                }} className="h-9 text-[13px]" placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Empresa / Tenant *</label>
                <Select value={form.tenantId} onValueChange={v => setForm(f => ({ ...f, tenantId: v }))}>
                  <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Selecione a empresa associada..." /></SelectTrigger>
                  <SelectContent>
                    {MOCK_TENANTS.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full h-9 text-[13px] mt-2">Cadastrar Loja</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-8 group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CNPJ..." className="pl-11 h-11 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 text-[13px] transition-all" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((store, i) => {
          const empCount = MOCK_EMPLOYEES.filter(e => e.storeId === store.id).length;
          const tenant = MOCK_TENANTS.find(t => t.id === store.tenantId);
          return (
            <div key={store.id} className={`glass-card rounded-2xl p-6 border border-white/5 animate-fade-in-up stagger-${(i % 10) + 1} group hover:border-primary/30 transition-all duration-300 shadow-xl relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
              <div className="flex items-center gap-4 mb-6 relative">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-[15px] font-black text-white truncate drop-shadow-sm group-hover:text-primary transition-colors" title={store.name}>{store.name}</p>
                  <p className="text-[10px] font-mono-data text-muted-foreground tracking-tighter mt-1">{store.cnpj}</p>
                </div>
                {isCristiano && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute -top-2 -right-2 h-8 w-8 rounded-lg text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors z-10" 
                    onClick={(e) => { e.stopPropagation(); handleDelete(store.id, store.name); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 space-y-3 border border-white/5 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Empresa</span>
                  <span className="text-[11px] font-bold text-white leading-none truncate max-w-[120px]" title={tenant?.name}>{tenant?.name || '---'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Colaboradores</span>
                  <span className="text-[13px] font-black tabular-nums text-primary leading-none">{empCount}</span>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-lg border border-border/50 border-dashed">
             <Store className="w-8 h-8 opacity-20 mx-auto mb-3" />
             <p className="text-[13px]">Nenhuma loja encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
