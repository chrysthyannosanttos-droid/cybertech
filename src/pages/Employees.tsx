import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MOCK_BENEFITS, MOCK_EMPLOYEE_BENEFITS, ROLES, addAuditLog } from '@/data/mockData';
import { Employee, Benefit, EmployeeBenefit } from '@/types';
import { Search, Plus, Download, Upload, Users, UserCheck, UserX, DollarSign, Wallet, Edit2, CheckCircle2, Trash2, FileSpreadsheet, AlertCircle, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn, isValidCPF, formatCPF } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { EmployeeImportModal } from '@/components/employees/EmployeeImportModal';


export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [dbStores, setDbStores] = useState<{id: string; name: string; tenantId: string}[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  
  // Photo capture modal refs
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'cristiano';
  
  // States for Filters
  const [search, setSearch] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch initial data and setup realtime subscription
  useEffect(() => {
    const fetchData = async () => {
      // Fetch real tenant_id first
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id')
        .limit(1)
        .maybeSingle();
      if (tenantData?.id) setTenantId(tenantData.id);

      // Fetch real stores
      const { data: storesData } = await supabase.from('stores').select('*').order('name');
      if (storesData && storesData.length > 0) setDbStores(storesData.map(s => ({ ...s, tenantId: s.tenant_id })));

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
      } else {
        // Map snake_case from DB to camelCase in TS
        const mappedData = (data || []).map(emp => ({
          ...emp,
          storeName: dbStores.find(s => s.id === emp.store_id)?.name || 'Unidade Desconhecida',
          admissionDate: emp.admission_date,
          birthDate: emp.birth_date,
          tenantId: emp.tenant_id,
          storeId: emp.store_id,
          contaItau: emp.conta_itau,
          valeFlexivel: emp.vale_flexivel,
          valeTransporte: emp.vale_transporte,
          valeRefeicao: emp.vale_refeicao,
          insalubridade: emp.insalubridade,
          periculosidade: emp.periculosidade,
          gratificacao: emp.gratificacao,
          flexivel: emp.flexivel,
          mobilidade: emp.mobilidade,
          email: emp.email,
        })) as Employee[];
        setEmployees(mappedData);
      }
      setLoading(false);
    };

    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('employees_realtime')
      .on('postgres_changes', { event: '*', table: 'employees', schema: 'public' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newEmp = {
            ...payload.new,
            storeName: dbStores.find(s => s.id === payload.new.store_id)?.name || 'Unidade Desconhecida',
            admissionDate: payload.new.admission_date,
            birthDate: payload.new.birth_date,
            storeId: payload.new.store_id,
            contaItau: payload.new.conta_itau,
            valeFlexivel: payload.new.vale_flexivel,
            valeTransporte: payload.new.vale_transporte,
            valeRefeicao: payload.new.vale_refeicao,
            email: payload.new.email,
          } as Employee;
          setEmployees(prev => [newEmp, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setEmployees(prev => prev.map(emp => emp.id === payload.new.id ? {
            ...emp,
            ...payload.new,
            storeName: dbStores.find(s => s.id === payload.new.store_id)?.name || 'Unidade Desconhecida',
            admissionDate: payload.new.admission_date,
            birthDate: payload.new.birth_date,
            storeId: payload.new.store_id,
            contaItau: payload.new.conta_itau,
            valeFlexivel: payload.new.vale_flexivel,
          } : emp));
        } else if (payload.eventType === 'DELETE') {
          setEmployees(prev => prev.filter(emp => emp.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dbStores]);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Photo Capture Modal
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoTargetEmpId, setPhotoTargetEmpId] = useState<string | null>(null);
  const [photoCameraActive, setPhotoCameraActive] = useState(false);
  const [photoCapture, setPhotoCapture] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Add/Edit Employee Modal
  const [addOpen, setAddOpen] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Employee>>({ status: 'ACTIVE', gender: 'M', role: '', department: '', salary: 0, email: '', customFields: {} });
  const [selectedBenefits, setSelectedBenefits] = useState<Record<string, boolean>>({});
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { toast } = useToast();

  // Distinct values for filters
  const departments = useMemo(() => Array.from(new Set(employees.map(e => e.department).filter(Boolean))), [employees]);

  // Derived / Calculations
  const calcEmployeeCost = (emp: Employee) => {
    let cost = emp.salary || 0;
    const empBenefits = MOCK_EMPLOYEE_BENEFITS.filter(eb => eb.employeeId === emp.id);
    empBenefits.forEach(eb => {
      const b = MOCK_BENEFITS.find(b => b.id === eb.benefitId);
      if (!b) return;
      const val = eb.overrideValue || b.defaultValue;
      if (b.type === 'FIXED_VALUE') {
        cost += val;
      } else if (b.type === 'PERCENTAGE') {
        cost += emp.salary * val;
      }
    });
    return cost;
  };

  const filtered = useMemo(() => {
    let result = employees.filter(e => {
      const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.cpf.includes(search);
      const matchStore = storeFilter === 'all' || e.storeId === storeFilter;
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const matchDept = departmentFilter === 'all' || e.department === departmentFilter;
      return matchSearch && matchStore && matchStatus && matchDept;
    });

    // Apply Sorting
    result.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
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

  // Dashboard Stats
  const activeEmployees = employees.filter(e => e.status === 'ACTIVE');
  const inactiveEmployees = employees.filter(e => e.status === 'INACTIVE');
  const totalCost = activeEmployees.reduce((acc, e) => acc + calcEmployeeCost(e), 0);
  const totalBaseSalary = activeEmployees.reduce((acc, e) => acc + (e.salary || 0), 0);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const exportExcel = () => {
    const data = filtered.map(e => ({
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
      // Manter informações adicionais para referência
      Status: e.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
      'Conta Itaú': e.contaItau || '',
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
    setForm({ ...emp });
    
    // Pre-fill benefits
    const currentBenefits: Record<string, boolean> = {};
    MOCK_EMPLOYEE_BENEFITS.filter(eb => eb.employeeId === emp.id).forEach(eb => {
      currentBenefits[eb.benefitId] = true;
    });
    setSelectedBenefits(currentBenefits);
    
    setAddStep(1);
    setAddOpen(true);
  };

  const handleRegisterPhoto = (empId: string) => {
    setPhotoTargetEmpId(empId);
    setPhotoCapture(null);
    setPhotoCameraActive(false);
    setPhotoModalOpen(true);
  };

  const startPhotoCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      if (photoVideoRef.current) {
        photoVideoRef.current.srcObject = stream;
        setPhotoCameraActive(true);
      }
    } catch {
      toast({ title: 'Erro na câmera', description: 'Não foi possível acessar a câmera.', variant: 'destructive' });
    }
  }, [toast]);

  const capturePhotoRef = useCallback(() => {
    if (!photoVideoRef.current || !photoCanvasRef.current) return;
    const ctx = photoCanvasRef.current.getContext('2d');
    if (!ctx) return;
    photoCanvasRef.current.width = photoVideoRef.current.videoWidth;
    photoCanvasRef.current.height = photoVideoRef.current.videoHeight;
    ctx.drawImage(photoVideoRef.current, 0, 0);
    setPhotoCapture(photoCanvasRef.current.toDataURL('image/jpeg', 0.9));
    const stream = photoVideoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setPhotoCameraActive(false);
  }, []);

  const saveReferencePhoto = useCallback(async () => {
    if (!photoCapture || !photoTargetEmpId) return;
    setPhotoUploading(true);
    try {
      // Convert base64 to blob
      const res = await fetch(photoCapture);
      const blob = await res.blob();
      const fileName = `ref_${photoTargetEmpId}_${Date.now()}.jpg`;

      // Try to upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('employee-photos')
        .upload(fileName, blob, { upsert: true, contentType: 'image/jpeg' });

      let photoUrl: string;

      if (storageError) {
        // If bucket doesn't exist yet, use base64 as fallback (stored in DB)
        console.warn('Storage upload failed, using base64 fallback:', storageError.message);
        photoUrl = photoCapture; // store base64 directly
      } else {
        const { data: publicData } = supabase.storage.from('employee-photos').getPublicUrl(fileName);
        photoUrl = publicData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('employees')
        .update({ photo_reference_url: photoUrl })
        .eq('id', photoTargetEmpId);

      if (dbError) throw dbError;

      setEmployees(prev => prev.map(e => e.id === photoTargetEmpId ? { ...e, photo_reference_url: photoUrl } : e));
      toast({ title: '✅ Foto de referência cadastrada!', description: 'Biometria facial registrada com sucesso.' });
      setPhotoModalOpen(false);
    } catch (e: any) {
      toast({ title: 'Erro ao salvar foto', description: e.message, variant: 'destructive' });
    } finally {
      setPhotoUploading(false);
    }
  }, [photoCapture, photoTargetEmpId, toast]);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotoCapture(evt.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleNextStep = () => {
    if (addStep === 1) {
      if (!form.name || !form.cpf || !form.storeId) {
        toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
        return;
      }
      if (!isValidCPF(form.cpf)) {
        toast({ title: 'CPF Inválido', description: 'Por favor, insira um CPF válido.', variant: 'destructive' });
        return;
      }
      setAddStep(2);
    } else {
      handleSave();
    }
  };

  const handleSave = async () => {
    const allStores = dbStores.length > 0 ? dbStores : [];
    const store = allStores.find(s => s.id === form.storeId) || null;
    
    const dbData = {
      name: form.name,
      cpf: form.cpf,
      gender: form.gender,
      birth_date: form.birthDate,
      admission_date: form.admissionDate,
      department: form.department,
      role: form.role,
      status: form.status,
      salary: Number(form.salary || 0),
      tenant_id: tenantId,
      store_id: store?.id || null,
      cbo: form.cbo,
      conta_itau: form.contaItau,
      insalubridade: Number(form.insalubridade || 0),
      periculosidade: Number(form.periculosidade || 0),
      gratificacao: Number(form.gratificacao || 0),
      vale_transporte: Number(form.valeTransporte || 0),
      vale_refeicao: Number(form.valeRefeicao || 0),
      flexivel: Number(form.flexivel || 0),
      mobilidade: Number(form.mobilidade || 0),
      vale_flexivel: Number(form.valeFlexivel || 0),
      jornada_entrada: form.jornadaEntrada || '08:00',
      jornada_saida_almoco: form.jornadaSaidaAlmoco || '12:00',
      jornada_retorno_almoco: form.jornadaRetornoAlmoco || '13:00',
      jornada_saida: form.jornadaSaida || '17:00',
      geofence_radius: Number(form.geofenceRadius || 0),
      email: form.email,
    };

    if (editingId) {
      const { error } = await supabase
        .from('employees')
        .update(dbData)
        .eq('id', editingId);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        return;
      }

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'EDIT_EMPLOYEE',
        details: `[Employees] Editou funcionário ${form.name} (CPF: ${form.cpf}) na loja ${store.name}`,
        tenantId: store.tenantId
      });

      toast({ title: 'Funcionário atualizado com sucesso!' });
      setTimeout(() => window.location.reload(), 500);
    } else {
      const { data, error } = await supabase
        .from('employees')
        .insert([dbData])
        .select();

      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
        return;
      }
      
      const newEmp = data[0];
      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'CREATE_EMPLOYEE',
        details: `[Employees] Criou funcionário ${form.name} (CPF: ${form.cpf}) na loja ${store.name}`,
        tenantId: store.tenantId
      });

      toast({ title: 'Funcionário cadastrado com sucesso!' });
      setTimeout(() => window.location.reload(), 500);
    }
    
    setAddOpen(false);
  };

  const toggleSelectAll = () => {
    if (paginated.length > 0 && paginated.every(e => selectedIds.includes(e.id))) {
      setSelectedIds(prev => prev.filter(id => !paginated.some(e => e.id === id)));
    } else {
      const newIds = [...selectedIds];
      paginated.forEach(e => {
        if (!newIds.includes(e.id)) newIds.push(e.id);
      });
      setSelectedIds(newIds);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDeleteSelected = async () => {
    const canDelete = isAdmin || currentUser?.canDeleteEmployees;
    if (!canDelete) return;
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} funcionário(s)?`)) return;
    
    const { error } = await supabase
      .from('employees')
      .delete()
      .in('id', selectedIds);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_EMPLOYEES',
      details: `[Employees] Excluiu ${selectedIds.length} funcionários em massa.`,
    });

    setSelectedIds([]);
    toast({ title: 'Exclusão concluída', description: `${selectedIds.length} funcionário(s) removido(s) com sucesso.` });
    setTimeout(() => window.location.reload(), 500);
  };

  const handleStatusUpdateSelected = async (newStatus: 'ACTIVE' | 'INACTIVE') => {
    if (selectedIds.length === 0) return;
    
    const { error } = await supabase
      .from('employees')
      .update({ status: newStatus })
      .in('id', selectedIds);

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
      return;
    }
    
    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Sistema',
      action: 'BULK_STATUS_UPDATE',
      details: `[Employees] Alterou status de ${selectedIds.length} funcionários para ${newStatus === 'ACTIVE' ? 'ATIVO' : 'INATIVO'}.`,
    });

    setSelectedIds([]);
    toast({ 
      title: 'Status atualizado', 
      description: `${selectedIds.length} funcionário(s) agora estão ${newStatus === 'ACTIVE' ? 'ativos' : 'inativos'}.`,
      icon: newStatus === 'ACTIVE' ? <UserCheck className="w-4 h-4 text-emerald-500" /> : <UserX className="w-4 h-4 text-rose-500" />
    });
    setTimeout(() => window.location.reload(), 500);
  };

  const handleDeleteOne = async (id: string, name: string) => {
    const canDelete = isAdmin || currentUser?.canDeleteEmployees;
    if (!canDelete) return;
    if (!window.confirm(`Deseja excluir o colaborador ${name}?`)) return;
    
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_EMPLOYEE',
      details: `[Employees] Excluiu funcionário ${name}`
    });
    
    setSelectedIds(prev => prev.filter(x => x !== id));
    toast({ title: 'Funcionário excluído' });
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Gestão de Funcionários</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Cadastro e controle de colaboradores, benefícios e custos.</p>
        </div>
        <div className="flex gap-2.5">
          {(isAdmin || currentUser?.canDeleteEmployees) && selectedIds.length > 0 && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-right-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => handleStatusUpdateSelected('ACTIVE')}
              >
                <UserCheck className="w-4 h-4" /> Ativar
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-1.5 border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                onClick={() => handleStatusUpdateSelected('INACTIVE')}
              >
                <UserX className="w-4 h-4" /> Inativar
              </Button>
              <Button variant="destructive" size="sm" className="h-9 gap-1.5" onClick={handleDeleteSelected}>
                <Trash2 className="w-4 h-4" /> Excluir ({selectedIds.length})
              </Button>
            </div>
          )}
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportExcel}>
            <Download className="w-4 h-4" /> Exportar Planilha
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4" /> Importar
            </Button>
            <EmployeeImportModal 
              open={importOpen} 
              onOpenChange={setImportOpen} 
              onImportComplete={() => {
                setTimeout(() => window.location.reload(), 1000);
              }}
              tenantId={tenantId}
              stores={dbStores}
            />
            <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if(!v) { setAddStep(1); setEditingId(null); setForm({status: 'ACTIVE', gender: 'M', salary: 0, email: ''}); setSelectedBenefits({}) } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 gap-1.5"><Plus className="w-4 h-4" /> Novo Funcionário</Button>
              </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-base">{editingId ? 'Editar Funcionário' : 'Cadastrar Funcionário'}</DialogTitle>
              </DialogHeader>
              
              {addStep === 1 ? (
                <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50 mb-2">
                    <div className="space-y-0.5">
                      <Label className="text-[13px] font-medium">Status do Funcionário</Label>
                      <p className="text-[11px] text-muted-foreground">{form.status === 'ACTIVE' ? 'Colaborador Ativo na folha' : 'Colaborador Inativo'}</p>
                    </div>
                    <Switch 
                      checked={form.status === 'ACTIVE'} 
                      onCheckedChange={(c) => setForm(f => ({...f, status: c ? 'ACTIVE' : 'INACTIVE'}))} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Nome Completo *</Label>
                      <Input value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value.toUpperCase()}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">CPF *</Label>
                      <Input value={form.cpf || ''} onChange={e => {
                        let v = e.target.value.replace(/\D/g, '');
                        if(v.length > 11) v = v.slice(0, 11);
                        v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                        setForm(f => ({...f, cpf: v}));
                      }} placeholder="000.000.000-00" className="h-9" />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-[12px] text-muted-foreground">E-mail para Contato (Opcional)</Label>
                    <Input type="email" value={form.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value.toLowerCase()}))} placeholder="exemplo@email.com" className="h-9" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Sexo</Label>
                      <Select value={form.gender} onValueChange={v => setForm(f => ({...f, gender: v as 'M' | 'F' | 'OTHER'}))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem><SelectItem value="OTHER">Outro</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Nascimento</Label>
                      <Input type="date" value={form.birthDate || ''} onChange={e => setForm(f => ({...f, birthDate: e.target.value}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Admissão</Label>
                      <Input type="date" value={form.admissionDate || ''} onChange={e => setForm(f => ({...f, admissionDate: e.target.value}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Loja de Alocação *</Label>
                      <Select value={form.storeId} onValueChange={v => setForm(f => ({...f, storeId: v}))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{dbStores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Setor / Departamento</Label>
                      <Input value={form.department || ''} onChange={e => setForm(f => ({...f, department: e.target.value.toUpperCase()}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Cargo Oficial</Label>
                      <Select value={form.role} onValueChange={v => setForm(f => ({...f, role: v}))}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o cargo..." /></SelectTrigger>
                        <SelectContent className="max-h-[250px]">
                          {ROLES.map((r, i) => <SelectItem key={i} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">CBO</Label>
                      <Input value={form.cbo || ''} onChange={e => setForm(f => ({...f, cbo: e.target.value.toUpperCase()}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Conta Itaú</Label>
                      <Input value={form.contaItau || ''} onChange={e => setForm(f => ({...f, contaItau: e.target.value.toUpperCase()}))} placeholder="Ag/Conta" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Salário Base (R$)</Label>
                      <Input type="number" value={form.salary || ''} onChange={e => setForm(f => ({...f, salary: Number(e.target.value)}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Insalubridade (R$)</Label>
                      <Input type="number" value={form.insalubridade || ''} onChange={e => setForm(f => ({...f, insalubridade: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Periculosidade (R$)</Label>
                      <Input type="number" value={form.periculosidade || ''} onChange={e => setForm(f => ({...f, periculosidade: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Gratificação (R$)</Label>
                      <Input type="number" value={form.gratificacao || ''} onChange={e => setForm(f => ({...f, gratificacao: Number(e.target.value)}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Vale Transporte (R$)</Label>
                      <Input type="number" value={form.valeTransporte || ''} onChange={e => setForm(f => ({...f, valeTransporte: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Vale Refeição (R$)</Label>
                      <Input type="number" value={form.valeRefeicao || ''} onChange={e => setForm(f => ({...f, valeRefeicao: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">FLEXIVEL (Selo)</Label>
                      <Input type="number" value={form.valeFlexivel || ''} onChange={e => setForm(f => ({...f, valeFlexivel: Number(e.target.value)}))} className="h-9" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Flexível (R$)</Label>
                      <Input type="number" value={form.flexivel || ''} onChange={e => setForm(f => ({...f, flexivel: Number(e.target.value)}))} className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px] text-muted-foreground">Mobilidade (R$)</Label>
                      <Input type="number" value={form.mobilidade || ''} onChange={e => setForm(f => ({...f, mobilidade: Number(e.target.value)}))} className="h-9" />
                    </div>
                  </div>

                  {/* Jornada de Trabalho */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <Label className="text-[11px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">⏱ Jornada de Trabalho</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Entrada</Label>
                        <Input type="time" value={form.jornadaEntrada || '08:00'} onChange={e => setForm(f => ({...f, jornadaEntrada: e.target.value}))} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Saída p/ Almoço</Label>
                        <Input type="time" value={form.jornadaSaidaAlmoco || '12:00'} onChange={e => setForm(f => ({...f, jornadaSaidaAlmoco: e.target.value}))} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Retorno Almoço</Label>
                        <Input type="time" value={form.jornadaRetornoAlmoco || '13:00'} onChange={e => setForm(f => ({...f, jornadaRetornoAlmoco: e.target.value}))} className="h-9" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Saída Final</Label>
                        <Input type="time" value={form.jornadaSaida || '17:00'} onChange={e => setForm(f => ({...f, jornadaSaida: e.target.value}))} className="h-9" />
                      </div>
                    </div>
                    <div className="space-y-1 pt-1">
                      <Label className="text-[11px] text-muted-foreground">Raio Geofence (metros, 0 = desativado)</Label>
                      <Input type="number" value={form.geofenceRadius || 0} onChange={e => setForm(f => ({...f, geofenceRadius: Number(e.target.value)}))} className="h-9" placeholder="Ex: 200" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="rounded-md border border-border bg-card overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2.5 border-b border-border">
                      <h3 className="text-[13px] font-medium">Benefícios Atribuídos</h3>
                    </div>
                    <div className="divide-y divide-border">
                      {MOCK_BENEFITS.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-4 bg-background">
                          <div>
                            <p className="text-[13px] font-medium">{b.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {b.type === 'FIXED_VALUE' ? `Valor: R$ ${b.defaultValue.toLocaleString('pt-BR', {minimumFractionDigits:2})}` : `Porcentagem: ${(b.defaultValue * 100).toFixed(0)}% do Salário Base`}
                            </p>
                          </div>
                          <Switch 
                            checked={!!selectedBenefits[b.id]} 
                            onCheckedChange={(c) => setSelectedBenefits(prev => ({...prev, [b.id]: c}))} 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[12px] text-primary font-medium mb-0.5">Custo Estimado no Mês</p>
                      <p className="text-[11px] text-muted-foreground">Soma do salário base + benefícios ativos.</p>
                    </div>
                    <p className="text-lg font-bold font-mono-data text-primary">
                      R$ {(() => {
                        let est = form.salary || 0;
                        MOCK_BENEFITS.forEach(b => {
                          if (selectedBenefits[b.id]) {
                            if(b.type === 'FIXED_VALUE') est += b.defaultValue;
                            if(b.type === 'PERCENTAGE') est += (form.salary || 0) * b.defaultValue;
                          }
                        });
                        return est.toLocaleString('pt-BR', {minimumFractionDigits:2});
                      })()}
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter className="border-t border-border pt-4">
                {addStep === 2 && (
                  <Button variant="ghost" className="h-9" onClick={() => setAddStep(1)}>Voltar</Button>
                )}
                <Button className="h-9 min-w-[100px]" onClick={handleNextStep}>
                  {addStep === 1 ? 'Próximo' : 'Finalizar Cadastro'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>

      {/* Dashboard KPI's */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Colaboradores', value: activeEmployees.length, sub: `${employees.length} no total`, icon: Users, color: 'text-primary' },
          { label: 'Custo Mensal Estimado', value: `R$ ${(totalCost/1000).toFixed(1)}k`, sub: 'Base + Benefícios', icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Salário Médio', value: `R$ ${(totalBaseSalary / (activeEmployees.length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, sub: 'Apenas base', icon: Wallet, color: 'text-blue-400' },
          { label: 'Inativos/Afastados', value: inactiveEmployees.length, sub: 'Fora de operação', icon: UserX, color: 'text-rose-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-2xl border border-white/5 p-5 relative overflow-hidden group hover:border-primary/30 transition-all duration-300">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors`} />
            <div className="flex items-start justify-between relative">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                <p className={`text-2xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{stat.sub}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="glass-card border border-white/5 rounded-2xl p-4 shadow-xl flex items-center gap-4 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por Nome ou CPF..." className="pl-9 h-10 bg-white/5 border-white/10 rounded-xl focus:ring-primary/20" />
        </div>
        <div className="w-px h-8 bg-white/10 mx-1" />
        <Select value={storeFilter} onValueChange={v => { setStoreFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-10 bg-white/5 border-white/10 rounded-xl"><SelectValue placeholder="Lojas" /></SelectTrigger>
          <SelectContent className="glass-card border-white/10 text-white">
            <SelectItem value="all">Todas as Lojas</SelectItem>
            {dbStores.map(s => <SelectItem key={s.id} value={s.id}>{s.name.replace('SUPER ', '')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={v => { setDepartmentFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] h-10 bg-white/5 border-white/10 rounded-xl"><SelectValue placeholder="Setores" /></SelectTrigger>
          <SelectContent className="glass-card border-white/10 text-white">
            <SelectItem value="all">Todos Setores</SelectItem>
            {departments.map((d, i) => <SelectItem key={i} value={d as string}>{d as string}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-10 bg-white/5 border-white/10 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="glass-card border-white/10 text-white">
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="ACTIVE">Ativos</SelectItem>
            <SelectItem value="INACTIVE">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-8 bg-white/10 mx-1" />

        <Select value={`${sortBy}-${sortOrder}`} onValueChange={v => {
          const [field, order] = v.split('-');
          setSortBy(field);
          setSortOrder(order as 'asc' | 'desc');
        }}>
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

      {/* Modern Data Table */}
      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
                <th className="px-6 py-4 w-[40px]">
                  <Checkbox 
                    checked={paginated.length > 0 && paginated.every(e => selectedIds.includes(e.id))} 
                    onCheckedChange={toggleSelectAll} 
                    className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                </th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Unidade / Setor</th>
                <th className="px-6 py-4">Cargo Profissional</th>
                <th className="px-6 py-4 text-right">Custo Base</th>
                <th className="px-6 py-4 text-right">Custo Consolidado</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <UserX className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-[14px] font-medium tracking-tight">Nenhum registro encontrado para esta busca.</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map(emp => {
                const isInactive = emp.status === 'INACTIVE';
                const totalC = calcEmployeeCost(emp);
                return (
                  <tr key={emp.id} className={cn("hover:bg-white/[0.02] transition-colors group", isInactive && "opacity-50 grayscale-[0.5]", selectedIds.includes(emp.id) && "bg-primary/5")}>
                    <td className="px-6 py-4">
                      <Checkbox 
                        checked={selectedIds.includes(emp.id)} 
                        onCheckedChange={() => toggleSelect(emp.id)} 
                        className="border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div 
                        className="flex items-center gap-4 cursor-pointer group/name"
                        onClick={() => handleOpenEdit(emp)}
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary font-black text-[11px] group-hover/name:scale-110 transition-transform">
                          {emp.name.charAt(0)}{emp.name.split(' ')[1]?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white group-hover/name:text-primary transition-colors">{emp.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono-data tracking-tighter mt-0.5">{emp.cpf}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                          emp.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {emp.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] font-bold text-white">{emp.storeName.replace('SUPER ', '')}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{emp.department}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[13px] text-white/80">{emp.role}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-mono-data text-[13px] text-muted-foreground group-hover:text-white transition-colors">R$ {emp.salary.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-mono-data text-[14px] font-black text-primary drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]">R$ {totalC.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 group-hover:opacity-100 opacity-0 transition-opacity">
                        <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl transition-colors", emp.photo_reference_url ? "text-emerald-500 hover:bg-emerald-500/10" : "text-white/20 hover:text-primary hover:bg-primary/10")} onClick={() => handleRegisterPhoto(emp.id)} title="Biometria Facial">
                          <Camera className="w-4 h-4" />
                        </Button>
                        {(isAdmin || currentUser?.canEditEmployees) && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white/20 hover:text-primary hover:bg-primary/10 transition-colors" onClick={() => handleOpenEdit(emp)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {(isAdmin || currentUser?.canDeleteEmployees) && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white/20 hover:text-rose-500 hover:bg-rose-500/10 transition-colors" onClick={() => handleDeleteOne(emp.id, emp.name)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-white/5">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Mostrando <span className="text-white">{(page-1)*perPage+1}</span> até <span className="text-white">{Math.min(page*perPage, filtered.length)}</span> de <span className="text-white">{filtered.length}</span>
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-white/10 text-white hover:bg-white/10 font-bold text-[11px] uppercase tracking-wider" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <div className="flex items-center justify-center h-9 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary font-black text-[12px]">{page}</div>
              <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-white/10 text-white hover:bg-white/10 font-bold text-[11px] uppercase tracking-wider" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      {/* ===== MODAL DE BIOMETRIA FACIAL ===== */}
      <Dialog open={photoModalOpen} onOpenChange={(v) => {
        if (!v) {
          // Stop camera on close
          if (photoVideoRef.current?.srcObject) {
            (photoVideoRef.current.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
          }
          setPhotoCameraActive(false);
          setPhotoCapture(null);
        }
        setPhotoModalOpen(v);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Camera className="w-5 h-5 text-primary" />
              Cadastro de Biometria Facial
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Camera / Preview Area */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border-2 border-white/10 flex items-center justify-center">
              {photoCapture ? (
                <>
                  <img src={photoCapture} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-4 border-emerald-500 flex items-center justify-center bg-emerald-500/10">
                    <div className="glass p-3 rounded-full bg-emerald-500/20">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                  </div>
                </>
              ) : photoCameraActive ? (
                <video ref={photoVideoRef} autoPlay playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Camera className="w-12 h-12 opacity-20" />
                  <p className="text-[11px] font-bold uppercase tracking-widest opacity-50">Câmera desativada</p>
                </div>
              )}
            </div>

            <canvas ref={photoCanvasRef} className="hidden" />

            <p className="text-[12px] text-muted-foreground text-center leading-relaxed">
              Posicione o rosto do funcionário no centro da câmera ou faça o upload de uma foto nítida para o reconhecimento facial.
            </p>

            <div className="flex gap-2">
              {!photoCapture ? (
                !photoCameraActive ? (
                  <>
                    <Button className="flex-1 h-10 gap-2" onClick={startPhotoCamera}>
                      <Camera className="w-4 h-4" /> Ativar Câmera
                    </Button>
                    <Button variant="outline" className="flex-1 h-10 gap-2" onClick={() => photoInputRef.current?.click()}>
                      <Upload className="w-4 h-4" /> Enviar Arquivo
                    </Button>
                    <input type="file" accept="image/*" ref={photoInputRef} className="hidden" onChange={handlePhotoFileChange} />
                  </>
                ) : (
                  <Button className="flex-1 h-10 gap-2 bg-white text-black hover:bg-white/90" onClick={capturePhotoRef}>
                    <div className="w-4 h-4 rounded-full border-2 border-black" />
                    Tirar Foto
                  </Button>
                )
              ) : (
                <>
                  <Button variant="outline" className="flex-1 h-10" onClick={() => { setPhotoCapture(null); startPhotoCamera(); }}>
                    Repetir
                  </Button>
                  <Button className="flex-1 h-10 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={saveReferencePhoto} disabled={photoUploading}>
                    {photoUploading ? 'Salvando...' : <><CheckCircle2 className="w-4 h-4" /> Salvar</>}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== MODAL DE IMPORTAÇÃO ===== */}
      <EmployeeImportModal 
        open={importOpen} 
        onOpenChange={setImportOpen} 
        onImportComplete={() => {
          setTimeout(() => window.location.reload(), 1000);
        }}
        tenantId={tenantId}
        stores={dbStores}
      />
    </div>
  );
}
