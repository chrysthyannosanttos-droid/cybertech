import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmployeeFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  storeFilter: string;
  onStoreFilterChange: (value: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
  dbStores: { id: string; name: string }[];
  departments: string[];
}

export function EmployeeFilters({
  search,
  onSearchChange,
  storeFilter,
  onStoreFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  sortOrder,
  onSortChange,
  dbStores,
  departments,
}: EmployeeFiltersProps) {
  return (
    <div className="glass-card border border-white/5 rounded-2xl p-4 shadow-xl flex items-center gap-4 mb-6">
      <div className="relative flex-1 group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por Nome ou CPF..."
          className="pl-9 h-10 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20"
        />
      </div>
      <div className="w-px h-8 bg-white/10 mx-1" />
      <Select value={storeFilter} onValueChange={onStoreFilterChange}>
        <SelectTrigger className="w-[180px] h-10 bg-white/5 border-white/10 rounded-xl">
          <SelectValue placeholder="Lojas" />
        </SelectTrigger>
        <SelectContent className="glass-card border-white/10 text-white">
          <SelectItem value="all">Todas as Lojas</SelectItem>
          {dbStores.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name.replace('SUPER ', '')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={departmentFilter} onValueChange={onDepartmentFilterChange}>
        <SelectTrigger className="w-[160px] h-10 bg-white/5 border-white/10 rounded-xl">
          <SelectValue placeholder="Setores" />
        </SelectTrigger>
        <SelectContent className="glass-card border-white/10 text-white">
          <SelectItem value="all">Todos Setores</SelectItem>
          {departments.map((d, i) => (
            <SelectItem key={i} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-[140px] h-10 bg-white/5 border-white/10 rounded-xl">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="glass-card border-white/10 text-white">
          <SelectItem value="all">Todos Status</SelectItem>
          <SelectItem value="ACTIVE">Ativos</SelectItem>
          <SelectItem value="INACTIVE">Inativos</SelectItem>
        </SelectContent>
      </Select>

      <div className="w-px h-8 bg-white/10 mx-1" />

      <Select
        value={`${sortBy}-${sortOrder}`}
        onValueChange={(v) => {
          const [field, order] = v.split('-');
          onSortChange(field, order as 'asc' | 'desc');
        }}
      >
        <SelectTrigger className="w-[180px] h-10 bg-white/5 border-white/10 rounded-xl">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent className="glass-card border-white/10 text-white">
          <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
          <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
          <SelectItem value="admission_date-asc">Admissão (Antigos)</SelectItem>
          <SelectItem value="admission_date-desc">Admissão (Novos)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
