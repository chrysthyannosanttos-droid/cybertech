import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      
      {/* Searchable Stores */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-[200px] h-10 justify-between bg-white/5 border-white/10 rounded-xl text-white hover:bg-white/10"
          >
            {storeFilter === "all" 
              ? "Todas as Lojas" 
              : dbStores.find((s) => s.id === storeFilter)?.name.replace('SUPER ', '') || "Selecionar Loja..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 glass-card border-white/10">
          <Command className="bg-transparent">
            <CommandInput placeholder="Buscar loja..." className="h-9" />
            <CommandList>
              <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => onStoreFilterChange("all")}
                  className="text-white hover:bg-primary/20"
                >
                  <Check className={cn("mr-2 h-4 w-4", storeFilter === "all" ? "opacity-100" : "opacity-0")} />
                  Todas as Lojas
                </CommandItem>
                {dbStores.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.name}
                    onSelect={() => onStoreFilterChange(s.id)}
                    className="text-white hover:bg-primary/20"
                  >
                    <Check className={cn("mr-2 h-4 w-4", storeFilter === s.id ? "opacity-100" : "opacity-0")} />
                    {s.name.replace('SUPER ', '')}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Searchable Departments */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-[180px] h-10 justify-between bg-white/5 border-white/10 rounded-xl text-white hover:bg-white/10"
          >
            {departmentFilter === "all" ? "Todos Setores" : departmentFilter}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-0 glass-card border-white/10">
          <Command className="bg-transparent">
            <CommandInput placeholder="Buscar setor..." className="h-9" />
            <CommandList>
              <CommandEmpty>Nenhum setor encontrado.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="all"
                  onSelect={() => onDepartmentFilterChange("all")}
                  className="text-white hover:bg-primary/20"
                >
                  <Check className={cn("mr-2 h-4 w-4", departmentFilter === "all" ? "opacity-100" : "opacity-0")} />
                  Todos Setores
                </CommandItem>
                {departments.map((d, i) => (
                  <CommandItem
                    key={i}
                    value={d}
                    onSelect={() => onDepartmentFilterChange(d)}
                    className="text-white hover:bg-primary/20"
                  >
                    <Check className={cn("mr-2 h-4 w-4", departmentFilter === d ? "opacity-100" : "opacity-0")} />
                    {d}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
