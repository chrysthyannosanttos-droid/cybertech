import { useState, useCallback } from 'react';
import { MOCK_EMPLOYEES, MOCK_STORES } from '@/data/mockData';
import { Employee } from '@/types';
import { Search, Upload, Plus, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importStoreId, setImportStoreId] = useState('');
  const { toast } = useToast();
  const perPage = 15;

  const [form, setForm] = useState({ name: '', cpf: '', gender: 'M', birthDate: '', role: '', salary: '', storeId: '' });

  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.cpf.includes(search);
    const matchStore = storeFilter === 'all' || e.storeId === storeFilter;
    return matchSearch && matchStore;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws);

        const store = MOCK_STORES.find(s => s.id === importStoreId) || MOCK_STORES[0];
        const imported: Employee[] = json.map((row: any, i: number) => ({
          id: `imp_${Date.now()}_${i}`,
          tenantId: 't1',
          storeId: store.id,
          storeName: store.name,
          name: row['Nome'] || row['name'] || `Funcionário ${i + 1}`,
          cpf: String(row['CPF'] || row['cpf'] || ''),
          gender: (row['Sexo'] || row['gender'] || 'M').charAt(0).toUpperCase() === 'F' ? 'F' as const : 'M' as const,
          birthDate: row['Data Nascimento'] || row['birthDate'] || '',
          role: row['Cargo'] || row['role'] || '',
          salary: Number(row['Salário'] || row['salary'] || 0),
          customFields: Object.fromEntries(
            Object.entries(row).filter(([k]) => !['Nome', 'name', 'CPF', 'cpf', 'Sexo', 'gender', 'Data Nascimento', 'birthDate', 'Cargo', 'role', 'Salário', 'salary'].includes(k))
          ),
        }));

        setEmployees(prev => [...prev, ...imported]);
        setImportOpen(false);
        toast({ title: 'Importação concluída', description: `${imported.length} funcionários importados.` });
      } catch {
        toast({ title: 'Erro na importação', description: 'Verifique o formato do arquivo.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  }, [toast, importStoreId]);

  const handleAdd = () => {
    if (!form.name || !form.cpf) return;
    const store = MOCK_STORES.find(s => s.id === form.storeId) || MOCK_STORES[0];
    const newEmp: Employee = {
      id: `e_${Date.now()}`,
      tenantId: 't1',
      storeId: store.id,
      storeName: store.name,
      name: form.name,
      cpf: form.cpf,
      gender: form.gender as 'M' | 'F',
      birthDate: form.birthDate,
      role: form.role,
      salary: Number(form.salary) || 0,
      customFields: {},
    };
    setEmployees(prev => [...prev, newEmp]);
    setForm({ name: '', cpf: '', gender: 'M', birthDate: '', role: '', salary: '', storeId: '' });
    setAddOpen(false);
    toast({ title: 'Funcionário cadastrado' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Funcionários</h1>
          <p className="text-[13px] text-muted-foreground">{filtered.length} registros</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Importar Excel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle className="text-[15px]">Importar Funcionários</DialogTitle></DialogHeader>
              <p className="text-[13px] text-muted-foreground mb-3">Selecione um arquivo .xlsx com as colunas: Nome, CPF, Sexo, Cargo, Salário</p>
              <Input type="file" accept=".xlsx,.xls" onChange={handleImport} className="text-[13px]" />
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-[13px] gap-1.5"><Plus className="w-3.5 h-3.5" /> Novo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="text-[15px]">Cadastrar Funcionário</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-muted-foreground block mb-1">Nome</label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-[13px]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-muted-foreground block mb-1">CPF</label>
                    <Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} className="h-9 text-[13px]" placeholder="000.000.000-00" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-muted-foreground block mb-1">Sexo</label>
                    <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                      <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Homem</SelectItem>
                        <SelectItem value="F">Mulher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-muted-foreground block mb-1">Nascimento</label>
                    <Input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} className="h-9 text-[13px]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-medium text-muted-foreground block mb-1">Cargo</label>
                    <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="h-9 text-[13px]" />
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-muted-foreground block mb-1">Salário</label>
                    <Input type="number" value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} className="h-9 text-[13px]" />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-muted-foreground block mb-1">Loja</label>
                  <Select value={form.storeId} onValueChange={v => setForm(f => ({ ...f, storeId: v }))}>
                    <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {MOCK_STORES.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAdd} className="w-full h-9 text-[13px]">Cadastrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome ou CPF..." className="pl-9 h-9 text-[13px]" />
        </div>
        <Select value={storeFilter} onValueChange={v => { setStoreFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px] h-9 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Lojas</SelectItem>
            {MOCK_STORES.map(s => <SelectItem key={s.id} value={s.id}>{s.name.replace('SUPER ', '')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              {['Nome', 'CPF', 'Sexo', 'Cargo', 'Loja', 'Salário'].map(h => (
                <th key={h} className={`text-${h === 'Salário' ? 'right' : 'left'} text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(emp => (
              <tr key={emp.id} className="border-b border-border/30 last:border-0 hover:bg-accent/50 transition-colors duration-150">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-[10px] font-medium text-muted-foreground">{emp.name.charAt(0)}</span>
                    </div>
                    <span className="text-[13px] font-medium">{emp.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono-data text-[13px]">{emp.cpf}</td>
                <td className="px-4 py-2.5 text-[13px]">{emp.gender === 'M' ? 'Homem' : 'Mulher'}</td>
                <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{emp.role}</td>
                <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{emp.storeName.replace('SUPER ', '')}</td>
                <td className="px-4 py-2.5 text-right font-mono-data text-[13px]">R$ {emp.salary.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-[12px] text-muted-foreground">Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-[12px]" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button variant="ghost" size="sm" className="h-7 text-[12px]" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
