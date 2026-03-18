import { useState } from 'react';
import { MOCK_EMPLOYEES, MOCK_STORES, MOCK_CERTIFICATES } from '@/data/mockData';
import { Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');

  const filtered = MOCK_EMPLOYEES.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.cpf.includes(search);
    const matchStore = storeFilter === 'all' || e.storeId === storeFilter;
    return matchSearch && matchStore;
  });

  const exportReport = () => {
    const data = filtered.map(e => {
      const certs = MOCK_CERTIFICATES.filter(c => c.employeeId === e.id);
      return {
        Nome: e.name,
        CPF: e.cpf,
        Sexo: e.gender === 'M' ? 'Homem' : 'Mulher',
        Cargo: e.role,
        Loja: e.storeName,
        Salário: e.salary,
        'Total Atestados': certs.length,
        'Dias Afastado': certs.reduce((s, c) => s + c.days, 0),
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, 'relatorio_funcionarios.xlsx');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold">Relatórios</h1>
          <p className="text-[13px] text-muted-foreground">Filtros e exportação de dados</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[13px] gap-1.5" onClick={exportReport}>
          <Download className="w-3.5 h-3.5" /> Exportar Excel
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CPF..." className="pl-9 h-9 text-[13px]" />
        </div>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[200px] h-9 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Lojas</SelectItem>
            {MOCK_STORES.map(s => <SelectItem key={s.id} value={s.id}>{s.name.replace('SUPER ', '')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg shadow-card p-4">
          <p className="text-[12px] text-muted-foreground mb-1">Total Filtrado</p>
          <p className="text-xl font-semibold tabular-nums">{filtered.length}</p>
        </div>
        <div className="bg-card rounded-lg shadow-card p-4">
          <p className="text-[12px] text-muted-foreground mb-1">Homens</p>
          <p className="text-xl font-semibold tabular-nums">{filtered.filter(e => e.gender === 'M').length}</p>
        </div>
        <div className="bg-card rounded-lg shadow-card p-4">
          <p className="text-[12px] text-muted-foreground mb-1">Mulheres</p>
          <p className="text-xl font-semibold tabular-nums">{filtered.filter(e => e.gender === 'F').length}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/50">
              {['Nome', 'CPF', 'Loja', 'Cargo', 'Atestados'].map(h => (
                <th key={h} className={`text-${h === 'Atestados' ? 'right' : 'left'} text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 20).map(e => {
              const certCount = MOCK_CERTIFICATES.filter(c => c.employeeId === e.id).length;
              return (
                <tr key={e.id} className="border-b border-border/30 last:border-0 hover:bg-accent/50 transition-colors duration-150">
                  <td className="px-4 py-2.5 text-[13px] font-medium">{e.name}</td>
                  <td className="px-4 py-2.5 font-mono-data text-[13px]">{e.cpf}</td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{e.storeName.replace('SUPER ', '')}</td>
                  <td className="px-4 py-2.5 text-[13px] text-muted-foreground">{e.role}</td>
                  <td className="px-4 py-2.5 text-right text-[13px] tabular-nums">{certCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
