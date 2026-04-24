import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { addAuditLog } from '@/data/mockData';
import { Employee } from '@/types';
import { Plus, Download, Users, UserX, DollarSign, Wallet, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { EmployeeImportModal } from '@/components/employees/EmployeeImportModal';
import { EmployeeFormModal } from '@/components/employees/EmployeeFormModal';
import { EmployeePhotoCapture } from '@/components/employees/EmployeePhotoCapture';
import { EmployeeFilters } from '@/components/employees/EmployeeFilters';
import { EmployeeTable } from '@/components/employees/EmployeeTable';
import { calcEmployeeCost } from '@/lib/employee-utils';
import { useEmployees } from '@/hooks/useEmployees';

export default function Employees() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'cristiano';
  const tenantId = currentUser?.tenantId || null;
  const { toast } = useToast();

  const {
    employees,
    isLoading: loading,
    refetch: fetchData,
    deleteEmployee,
  } = useEmployees(tenantId);

  const [dbStores, setDbStores] = useState<{ id: string; name: string; tenantId: string }[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoTargetEmpId, setPhotoTargetEmpId] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const perPage = 50;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchStores = async () => {
      const { data } = await supabase.from('stores').select('*').order('name');
      if (data) setDbStores(data.map((s) => ({ ...s, tenantId: s.tenant_id })));
    };
    fetchStores();
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [search, storeFilter, statusFilter, departmentFilter]);

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department).filter(Boolean))), [employees]);

  const filtered = useMemo(() => {
    let result = employees.filter((e) => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.cpf.includes(search);
      const matchStore = storeFilter === 'all' || e.storeId === storeFilter;
      const matchStatus = statusFilter === 'all' || (e.status || 'INACTIVE') === statusFilter;
      const matchDept = departmentFilter === 'all' || e.department === departmentFilter;
      return matchSearch && matchStore && matchStatus && matchDept;
    });

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortBy === 'admission_date') {
        const dateA = new Date(a.admissionDate || 0).getTime();
        const dateB = new Date(b.admissionDate || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      return 0;
    });

    return result;
  }, [employees, search, storeFilter, statusFilter, departmentFilter, sortBy, sortOrder]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const activeEmployees = filtered.filter((e) => e.status === 'ACTIVE');
  const inactiveEmployees = filtered.filter((e) => e.status === 'INACTIVE');
  const totalCost = activeEmployees.reduce((acc, e) => acc + calcEmployeeCost(e), 0);
  const totalBaseSalary = activeEmployees.reduce((acc, e) => acc + (e.salary || 0), 0);

  const exportExcel = () => {
    const data = filtered.map((e) => ({
      Nome: e.name,
      'Descrição cargo': e.role || '',
      CBO: e.cbo || '',
      Setor: e.department || '',
      CPF: e.cpf,
      'E-mail': e.email || '',
      Salário: e.salary || 0,
      Insalubridade: e.insalubridade || 0,
      Periculosidade: e.periculosidade || 0,
      VR: e.valeRefeicao || 0,
      Sexo: e.gender,
      Admissão: e.admissionDate || '',
      VT: e.valeTransporte || 0,
      Flexível: e.flexivel || e.valeFlexivel || 0,
      Mobilidade: e.mobilidade || 0,
      Status: e.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
      'Conta Itaú': e.contaItau || '',
      WhatsApp: e.phone || '',
      Gratificação: e.gratificacao || 0,
      Loja: e.storeName,
      'Custo Total Estimado': calcEmployeeCost(e),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Funcionarios');
    XLSX.writeFile(wb, 'funcionarios.xlsx');
  };

  const handleOpenEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setFormOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  const handleRegisterPhoto = (empId: string) => {
    setPhotoTargetEmpId(empId);
    setPhotoModalOpen(true);
  };

  const handleDeleteOne = async (id: string, name: string) => {
    const canDelete = isAdmin || currentUser?.canDeleteEmployees;
    if (!canDelete) return;
    if (!window.confirm(`Deseja excluir o colaborador ${name}?`)) return;

    try {
      await deleteEmployee(id);

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'DELETE_EMPLOYEE',
        details: `[Employees] Excluiu funcionário ${name}`,
      });
    } catch (err) {
      // Toast já é disparado pelo hook
    }
  };

  const toggleSelectAll = () => {
    if (paginated.length > 0 && paginated.every((e) => selectedIds.includes(e.id))) {
      setSelectedIds((prev) => prev.filter((id) => !paginated.some((e) => e.id === id)));
    } else {
      const newIds = [...selectedIds];
      paginated.forEach((e) => {
        if (!newIds.includes(e.id)) newIds.push(e.id);
      });
      setSelectedIds(newIds);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleStatusUpdateSelected = async (newStatus: 'ACTIVE' | 'INACTIVE') => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase.from('employees').update({ status: newStatus }).in('id', selectedIds);
      if (error) throw error;

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'BULK_STATUS_UPDATE',
        details: `[Employees] Alterou status de ${selectedIds.length} funcionários para ${newStatus}.`,
      });

      setSelectedIds([]);
      toast({ title: 'Status atualizado com sucesso!' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteSelected = async () => {
    const canDelete = isAdmin || (currentUser as any)?.canDeleteEmployees;
    if (!canDelete) return;
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} funcionário(s)?`)) return;

    try {
      const { error } = await supabase.from('employees').delete().in('id', selectedIds);
      if (error) throw error;

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'DELETE_EMPLOYEES',
        details: `[Employees] Excluiu ${selectedIds.length} funcionários em massa.`,
      });

      setSelectedIds([]);
      toast({ title: 'Exclusão concluída com sucesso!' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    }
  };

  const handleActivateAll = async () => {
    if (!window.confirm('Deseja ativar TODOS os colaboradores do sistema? Isso removerá o status de inativo ou vazio de todos.')) return;
    
    try {
      const { error } = await supabase
        .from('employees')
        .update({ status: 'ACTIVE' })
        .or('status.eq.INACTIVE,status.is.null');

      if (error) throw error;

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'BULK_ACTIVATE_ALL',
        details: `[Employees] Ativou todos os colaboradores de forma global.`,
      });

      toast({ title: 'Sucesso!', description: 'Todos os funcionários agora estão ativos.' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Erro ao ativar todos', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gestão de Funcionários</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Cadastro e controle de colaboradores, benefícios e custos.</p>
        </div>
        <div className="flex gap-2.5">
          {(isAdmin || (currentUser as any)?.canDeleteEmployees) && selectedIds.length > 0 && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleStatusUpdateSelected('ACTIVE')}>Ativar</Button>
              <Button variant="outline" size="sm" className="h-9 gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10" onClick={() => handleStatusUpdateSelected('INACTIVE')}>Inativar</Button>
              <Button variant="destructive" size="sm" className="h-9 gap-1.5" onClick={handleDeleteSelected}>Excluir ({selectedIds.length})</Button>
            </div>
          )}
          <Button variant="outline" size="sm" className="h-9 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={handleActivateAll}>
            Ativar Todos
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Sincronizar
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportExcel}>
            <Download className="w-4 h-4" /> Exportar Planilha
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => setImportOpen(true)}>Importar</Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={handleOpenAdd}><Plus className="w-4 h-4" /> Novo Funcionário</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Colaboradores', value: activeEmployees.length, sub: `${employees.length} no total`, icon: Users, color: 'text-primary' },
          { label: 'Custo Mensal Estimado', value: `R$ ${(totalCost / 1000).toFixed(1)}k`, sub: 'Base + Benefícios', icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Salário Médio', value: `R$ ${(totalBaseSalary / (activeEmployees.length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, sub: 'Apenas base', icon: Wallet, color: 'text-blue-400' },
          { label: 'Inativos/Afastados', value: inactiveEmployees.length, sub: 'Fora de operação', icon: UserX, color: 'text-rose-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-2xl border border-white/5 p-5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
            <div className="flex items-start justify-between relative">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className={`text-2xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{stat.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <EmployeeFilters
        search={search}
        onSearchChange={setSearch}
        storeFilter={storeFilter}
        onStoreFilterChange={setStoreFilter}
        departmentFilter={departmentFilter}
        onDepartmentFilterChange={setDepartmentFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={(field, order) => { setSortBy(field); setSortOrder(order); }}
        dbStores={dbStores}
        departments={departments}
      />

      <EmployeeTable
        paginatedEmployees={paginated}
        selectedIds={selectedIds}
        onToggleSelectAll={toggleSelectAll}
        onToggleSelect={toggleSelect}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteOne}
        onRegisterPhoto={handleRegisterPhoto}
        isAdmin={isAdmin}
        currentUser={currentUser}
        calcEmployeeCost={calcEmployeeCost}
        page={page}
        totalPages={totalPages}
        perPage={perPage}
        totalFiltered={filtered.length}
        onPageChange={setPage}
      />

      <EmployeeFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        editingId={editingId}
        initialData={employees.find((e) => e.id === editingId)}
        tenantId={tenantId}
        dbStores={dbStores}
        onSaveSuccess={fetchData}
      />

      <EmployeePhotoCapture
        open={photoModalOpen}
        onOpenChange={setPhotoModalOpen}
        employeeId={photoTargetEmpId}
        onCaptureSuccess={fetchData}
      />

      <EmployeeImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={fetchData}
        tenantId={tenantId}
        stores={dbStores}
      />
    </div>
  );
}
