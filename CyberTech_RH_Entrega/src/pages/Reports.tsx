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
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Central de Relatórios</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Filtros avançados e exportação inteligente de dados</p>
        </div>
        <Button variant="ghost" size="sm" className="h-10 px-6 rounded-xl text-white/60 hover:text-white hover:bg-white/10 font-bold text-[12px] gap-2 transition-all shadow-lg shadow-black/20" onClick={exportReport}>
          <Download className="w-4 h-4" /> Exportar Planilha
        </Button>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou CPF..." className="pl-11 h-11 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 text-[13px] transition-all" />
        </div>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[240px] h-11 bg-white/5 border-white/10 rounded-xl text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-card border-white/10 text-white">
            <SelectItem value="all">Todas as Lojas</SelectItem>
            {MOCK_STORES.map(s => <SelectItem key={s.id} value={s.id}>{s.name.replace('SUPER ', '')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card rounded-2xl border border-white/5 p-6 hover:border-primary/30 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Total Filtrado</p>
          <p className="text-3xl font-black text-white tabular-nums group-hover:text-primary transition-colors">{filtered.length}</p>
        </div>
        <div className="glass-card rounded-2xl border border-white/5 p-6 hover:border-blue-500/30 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-blue-500/10 transition-colors" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Masculino</p>
          <p className="text-3xl font-black text-white tabular-nums group-hover:text-blue-400 transition-colors">{filtered.filter(e => e.gender === 'M').length}</p>
        </div>
        <div className="glass-card rounded-2xl border border-white/5 p-6 hover:border-rose-500/30 transition-all group overflow-hidden relative">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-rose-500/10 transition-colors" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2">Feminino</p>
          <p className="text-3xl font-black text-white tabular-nums group-hover:text-rose-400 transition-colors">{filtered.filter(e => e.gender === 'F').length}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">Documento (CPF)</th>
                <th className="px-6 py-4 text-center">Unidade</th>
                <th className="px-6 py-4">Função / Cargo</th>
                <th className="px-6 py-4 text-right">Atestados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.slice(0, 20).map(e => {
                const certCount = MOCK_CERTIFICATES.filter(c => c.employeeId === e.id).length;
                return (
                  <tr key={e.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{e.name}</span>
                    </td>
                    <td className="px-6 py-4 font-mono-data text-[13px] text-muted-foreground group-hover:text-white transition-colors">{e.cpf}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{e.storeName.replace('SUPER ', '')}</span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-muted-foreground font-medium group-hover:text-white/70 transition-colors">{e.role}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[14px] font-black text-primary drop-shadow-[0_0_8px_rgba(31,180,243,0.3)] tabular-nums">{certCount}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
