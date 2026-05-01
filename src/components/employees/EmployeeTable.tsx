import { UserX, Camera, Edit2, Trash2, Trophy, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Employee } from '@/types';
import { cn } from '@/lib/utils';

interface EmployeeTableProps {
  paginatedEmployees: Employee[];
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string, name: string) => void;
  onRegisterPhoto: (id: string) => void;
  isAdmin: boolean;
  currentUser: any;
  calcEmployeeCost: (employee: Employee) => number;
  page: number;
  totalPages: number;
  perPage: number;
  totalFiltered: number;
  onPageChange: (page: number | ((p: number) => number)) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
}
export function EmployeeTable({
  paginatedEmployees,
  selectedIds,
  onToggleSelectAll,
  onToggleSelect,
  onEdit,
  onDelete,
  onRegisterPhoto,
  isAdmin,
  currentUser,
  calcEmployeeCost,
  page,
  totalPages,
  perPage,
  totalFiltered,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
}: EmployeeTableProps) {
  const handleSort = (field: string) => {
    if (!onSortChange) return;
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  return (
    <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-left whitespace-nowrap">
          <thead>
            <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
              <th className="px-2 py-3 w-[40px]">
                <Checkbox
                  checked={
                    paginatedEmployees.length > 0 &&
                    paginatedEmployees.every((e) => selectedIds.includes(e.id))
                  }
                  onCheckedChange={onToggleSelectAll}
                  className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </th>
              <th className="px-2 py-3 cursor-pointer group/h" onClick={() => handleSort('name')}>
                <div className="flex items-center">Colaborador <SortIcon field="name" /></div>
              </th>
              <th className="px-2 py-3 text-center">Status</th>
              <th className="px-2 py-3">Unid/Setor</th>
              <th className="px-2 py-3 text-left">Cargo</th>
              <th className="px-2 py-3 text-right cursor-pointer group/h" onClick={() => handleSort('salary')}>
                <div className="flex items-center justify-end">Base <SortIcon field="salary" /></div>
              </th>
              <th className="px-2 py-3 text-right cursor-pointer group/h" onClick={() => handleSort('totalCost')}>
                <div className="flex items-center justify-end">Total <SortIcon field="totalCost" /></div>
              </th>
              <th className="px-2 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <UserX className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-[14px] font-medium tracking-tight">
                      Nenhum registro encontrado para esta busca.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((emp) => {
                const isInactive = emp.status === 'INACTIVE';
                const totalC = calcEmployeeCost(emp);
                return (
                  <tr
                    key={emp.id}
                    className={cn(
                      'hover:bg-white/[0.02] transition-colors group',
                      isInactive && 'opacity-50 grayscale-[0.5]',
                      selectedIds.includes(emp.id) && 'bg-primary/5'
                    )}
                  >
                    <td className="px-2 py-2">
                      <Checkbox
                        checked={selectedIds.includes(emp.id)}
                        onCheckedChange={() => onToggleSelect(emp.id)}
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div
                        className="flex items-center gap-2 cursor-pointer group/name"
                        onClick={() => onEdit(emp)}
                      >
                        <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-black text-[9px] group-hover/name:scale-110 transition-transform flex-shrink-0">
                          {emp.name.charAt(0)}
                          {emp.name.split(' ')[1]?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-white group-hover/name:text-primary transition-colors truncate max-w-[140px] flex items-center gap-1.5">
                            {emp.name}
                            {emp.flexivelSelo && (
                              <Trophy className="w-3 h-3 text-amber-500 animate-pulse" />
                            )}
                          </p>
                          <p className="text-[8px] text-muted-foreground font-mono-data tracking-tighter">
                            {emp.cpf}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex justify-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all ${
                            emp.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {emp.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px]">
                        {emp.storeName?.replace('SUPER ', '')}
                      </p>
                      <p className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">
                        {emp.department}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <p className="text-[11px] text-white/70 max-w-[120px] truncate" title={emp.role || ''}>
                        {emp.role}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <p className="font-mono-data text-[11px] text-muted-foreground group-hover:text-white">
                        R${' '}
                        {emp.salary?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <p className="font-mono-data text-[12px] font-black text-primary drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]">
                        R${' '}
                        {totalC.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-2 group-hover:opacity-100 opacity-0 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-9 w-9 rounded-xl transition-colors',
                            emp.photo_reference_url
                              ? 'text-emerald-500 hover:bg-emerald-500/10'
                              : 'text-white/20 hover:text-primary hover:bg-primary/10'
                          )}
                          onClick={() => onRegisterPhoto(emp.id)}
                          title="Biometria Facial"
                        >
                          <Camera className="w-4 h-4" />
                        </Button>
                        {(isAdmin || currentUser?.canEditEmployees) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-white/20 hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => onEdit(emp)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {(isAdmin || currentUser?.canDeleteEmployees) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            onClick={() => onDelete(emp.id, emp.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/5">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Mostrando <span className="text-white">{(page - 1) * perPage + 1}</span> até{' '}
            <span className="text-white">{Math.min(page * perPage, totalFiltered)}</span> de{' '}
            <span className="text-white">{totalFiltered}</span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-xl border-white/10 text-white hover:bg-white/10 font-bold text-[11px] uppercase tracking-wider"
              disabled={page === 1}
              onClick={() => onPageChange((p) => p - 1)}
            >
              Anterior
            </Button>
            <div className="flex items-center justify-center h-9 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-[12px]">
              {page}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 rounded-xl border-white/10 text-white hover:bg-white/10 font-bold text-[11px] uppercase tracking-wider"
              disabled={page === totalPages}
              onClick={() => onPageChange((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
