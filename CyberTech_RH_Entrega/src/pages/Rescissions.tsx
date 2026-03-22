import { useState } from 'react';
import { MOCK_EMPLOYEES, MOCK_RESCISSIONS, addAuditLog } from '@/data/mockData';
import { Rescission } from '@/types';
import { FileX, Plus, Search, Trash2, Calendar, DollarSign, UserMinus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export default function Rescissions() {
  const [rescissions, setRescissions] = useState<Rescission[]>(MOCK_RESCISSIONS);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isCristiano = currentUser?.email === 'cristiano' || currentUser?.name?.toLowerCase() === 'cristiano';

  const [form, setForm] = useState({
    employeeId: '',
    terminationDate: '',
    fgtsValue: '',
    rescissionValue: '',
    type: 'PEDIDO' as Rescission['type']
  });

  const filtered = rescissions.filter(r =>
    r.employeeName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!form.employeeId || !form.terminationDate || !form.fgtsValue || !form.rescissionValue) {
      toast({ title: 'Campos obrigatórios', description: 'Por favor, preencha todos os campos.', variant: 'destructive' });
      return;
    }

    const emp = MOCK_EMPLOYEES.find(e => e.id === form.employeeId);
    if (!emp) return;

    const newRescission: Rescission = {
      id: `r${Date.now()}`,
      employeeId: form.employeeId,
      employeeName: emp.name,
      terminationDate: form.terminationDate,
      fgtsValue: Number(form.fgtsValue),
      rescissionValue: Number(form.rescissionValue),
      type: form.type
    };

    setRescissions(prev => [newRescission, ...prev]);
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Sistema',
      action: 'CREATE_RESCISSION',
      details: `[Rescisões] Lançou rescisão para ${emp.name} (Tipo: ${form.type})`
    });

    setForm({ employeeId: '', terminationDate: '', fgtsValue: '', rescissionValue: '', type: 'PEDIDO' });
    setOpen(false);
    toast({ title: 'Rescisão cadastrada', description: `Lançamento para ${emp.name} concluído.` });
  };

  const handleDelete = (id: string, name: string) => {
    if (!isCristiano) return;
    if (!window.confirm(`Deseja excluir o lançamento de rescisão de ${name}?`)) return;
    
    setRescissions(prev => prev.filter(r => r.id !== id));
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_RESCISSION',
      details: `[Rescisões] Excluiu rescisão de ${name}`
    });
    toast({ title: 'Lançamento excluído' });
  };

  const getTypeName = (type: Rescission['type']) => {
    const names = {
      'PEDIDO': 'Pedido de Demissão',
      'INDENIZADO': 'Aviso Prévio Indenizado',
      'ACORDO': 'Acordo',
      'TRABALHADO': 'Aviso Prévio Trabalhado',
      'JUSTA_CAUSA': 'Justa Causa',
      'TERMINO_CONTRATO': 'Término de Contrato'
    };
    return names[type];
  };

  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Lançamento de Rescisões</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Gestão de desligamentos e cálculos rescisórios</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-10 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-[12px] gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4" /> Nova Rescisão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-[15px] font-bold tracking-tight text-white/90">Cadastrar Novo Desligamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest">Funcionário</Label>
                <Select value={form.employeeId} onValueChange={(val) => setForm(f => ({ ...f, employeeId: val }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-10 text-[13px]">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    {MOCK_EMPLOYEES.filter(e => e.status === 'ACTIVE').map(emp => (
                      <SelectItem key={emp.id} value={emp.id} className="text-[13px] hover:bg-primary/20">{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest">Data de Demissão</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input 
                    type="date" 
                    value={form.terminationDate} 
                    onChange={e => setForm(f => ({ ...f, terminationDate: e.target.value }))}
                    className="pl-10 bg-white/5 border-white/10 h-10 text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest">Valor FGTS (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <Input 
                      type="number" 
                      placeholder="0,00"
                      value={form.fgtsValue} 
                      onChange={e => setForm(f => ({ ...f, fgtsValue: e.target.value }))}
                      className="pl-10 bg-white/5 border-white/10 h-10 text-[13px]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest">Valor Rescisão (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <Input 
                      type="number" 
                      placeholder="0,00"
                      value={form.rescissionValue} 
                      onChange={e => setForm(f => ({ ...f, rescissionValue: e.target.value }))}
                      className="pl-10 bg-white/5 border-white/10 h-10 text-[13px]"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[12px] font-bold text-muted-foreground/80 uppercase tracking-widest border-b border-white/5 pb-1 block">Motivo do Desligamento</Label>
                <RadioGroup value={form.type} onValueChange={(val: any) => setForm(f => ({ ...f, type: val }))} className="grid grid-cols-1 gap-2">
                  <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <RadioGroupItem value="PEDIDO" id="r1" className="border-primary text-primary" />
                    <Label htmlFor="r1" className="text-[12px] cursor-pointer flex-1">Pedido de Demissão</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <RadioGroupItem value="INDENIZADO" id="r2" className="border-primary text-primary" />
                    <Label htmlFor="r2" className="text-[12px] cursor-pointer flex-1">Aviso Prévio Indenizado</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <RadioGroupItem value="ACORDO" id="r3" className="border-primary text-primary" />
                    <Label htmlFor="r3" className="text-[12px] cursor-pointer flex-1">Acordo</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <RadioGroupItem value="TRABALHADO" id="r4" className="border-primary text-primary" />
                    <Label htmlFor="r4" className="text-[12px] cursor-pointer flex-1">Aviso Prévio Trabalhado</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <RadioGroupItem value="JUSTA_CAUSA" id="r5" className="border-primary text-primary" />
                    <Label htmlFor="r5" className="text-[12px] cursor-pointer flex-1 text-rose-400">Justa Causa</Label>
                  </div>
                  <div className="flex items-center space-x-2 bg-white/5 p-2 rounded-lg hover:bg-white/10 transition-colors">
                    <RadioGroupItem value="TERMINO_CONTRATO" id="r6" className="border-primary text-primary" />
                    <Label htmlFor="r6" className="text-[12px] cursor-pointer flex-1">Término de Contrato</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button onClick={handleSave} className="w-full h-10 bg-primary hover:bg-primary/90 text-[13px] font-black uppercase tracking-widest mt-4">Confirmar Lançamento</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Buscar rescisão por funcionário..." 
          className="pl-10 h-11 bg-white/5 border-white/5 rounded-xl text-[13px] focus:ring-primary/20 focus:border-primary/30 shadow-inner"
        />
      </div>

      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl relative">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 bg-white/5 text-[11px] font-bold text-primary uppercase tracking-widest">
              <th className="text-left px-6 py-4">Colaborador</th>
              <th className="text-center px-6 py-4">Data Saída</th>
              <th className="text-left px-6 py-4">Tipo</th>
              <th className="text-right px-6 py-4">FGTS Rec.</th>
              <th className="text-right px-6 py-4">Valor Total</th>
              {isCristiano && <th className="text-center px-6 py-4">Ação</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <UserMinus className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{r.employeeName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-[13px] font-medium text-white/70">{new Date(r.terminationDate).toLocaleDateString('pt-BR')}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                    r.type === 'JUSTA_CAUSA' 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]' 
                      : 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]'
                  }`}>
                    {getTypeName(r.type)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono-data text-[13px] text-emerald-400">R$ {r.fgtsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="px-6 py-4 text-right">
                  <span className="text-[14px] font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">R$ {r.rescissionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </td>
                {isCristiano && (
                  <td className="px-6 py-4 text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                      onClick={() => handleDelete(r.id, r.employeeName)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isCristiano ? 6 : 5} className="px-6 py-20 text-center">
                  <FileX className="w-12 h-12 text-white/5 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium text-[14px]">Nenhum lançamento de rescisão encontrado.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
