import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  FolderOpen, 
  Plus, 
  Search, 
  Trash2, 
  Download, 
  FileText, 
  UserMinus, 
  UserCheck,
  Filter,
  FileCheck2,
  AlertCircle,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from '@/components/ui/sheet';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { addAuditLog } from '@/data/mockData';

const CATEGORIES = [
  { value: 'CONTRACT', label: 'Contrato de Trabalho' },
  { value: 'RG_CPF', label: 'RG / CPF / CNH' },
  { value: 'ADMISSION', label: 'Docs Admissão' },
  { value: 'RESCISSION', label: 'Docs Rescisão' },
  { value: 'EXAMS', label: 'Exames (ASO)' },
  { value: 'OTHER', label: 'Outros' }
];

interface EmployeeDoc {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_status?: string;
  name: string;
  category: string;
  file_url: string;
  file_type?: string;
  created_at: string;
}

export default function EmployeeDocuments() {
  const [documents, setDocuments] = useState<EmployeeDoc[]>([]);
  const [employees, setEmployees] = useState<{id: string, name: string, status: string}[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [openCombo, setOpenCombo] = useState(false);
  
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'cristiano';

  const [form, setForm] = useState({
    employeeId: '',
    category: 'OTHER',
    name: ''
  });

  const fetchData = async () => {
    try {
      setIsUploading(true); // Re-using isUploading or adding isFetching
      
      let tenantId = (currentUser as any)?.tenantId || (currentUser as any)?.tenant_id;
      
      // Fallback: Fetch real tenant_id if not in user profile
      if (!tenantId) {
        const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        if (tenantData?.id) tenantId = tenantData.id;
      }

      // Fetch documents
      let docsQuery = supabase
        .from('employee_documents')
        .select(`
          id,
          employee_id,
          name,
          category,
          file_url,
          created_at,
          tenant_id,
          employees (
            name,
            status
          )
        `);
      
      if (tenantId) {
        docsQuery = docsQuery.eq('tenant_id', tenantId);
      }

      const { data: docsData, error: docsError } = await docsQuery.order('created_at', { ascending: false });

      if (docsError) {
        console.error('Error fetching docs:', docsError);
      } else if (docsData) {
        setDocuments(docsData.map((d: any) => ({
          ...d,
          employee_name: d.employees?.name,
          employee_status: d.employees?.status
        })));
      }

      // Fetch employees for the selector
      let empQuery = supabase.from('employees').select('id, name, status').order('name');
      
      if (tenantId) {
        empQuery = empQuery.eq('tenant_id', tenantId);
      }

      const { data: empData, error: empError } = await empQuery;
      
      if (empError) {
        console.error('Error fetching employees:', empError);
        toast({ title: 'Erro ao buscar funcionários', description: empError.message, variant: 'destructive' });
      } else {
        const foundEmps = empData || [];
        setEmployees(foundEmps);
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('docs_realtime').on('postgres_changes', { 
      event: '*', table: 'employee_documents', schema: 'public' 
    }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = documents.filter(doc => {
    const matchesSearch = 
      (doc.employee_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (doc.name || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'ALL' || doc.employee_status === filterStatus;
    
    const matchesCategory = 
      filterCategory === 'ALL' || doc.category === filterCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.name) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha o funcionário e o nome do arquivo.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const selectedEmp = employees.find(e => e.id === form.employeeId);
      
      const { error } = await supabase
        .from('employee_documents')
        .insert([{
          employee_id: form.employeeId,
          name: form.name,
          category: form.category,
          file_url: 'https://placeholder-url.com', 
          tenant_id: (currentUser as any)?.tenantId || (currentUser as any)?.tenant_id || '9de674ac-807c-482a-a550-61014e7afee8'
        }]);

      if (error) throw error;

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'UPLOAD_DOCUMENT',
        details: `[Arquivo Digital] Upload de ${form.name} para ${selectedEmp?.name}`
      });

      toast({ title: 'Documento salvo', description: 'O registro foi criado com sucesso.' });
      setForm({ employeeId: '', category: 'OTHER', name: '' });
      setIsSheetOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from('employee_documents').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Documento removido' });
    fetchData();
  };

  return (
    <div className="animate-fade-in-up space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <FolderOpen className="w-5 h-5 text-emerald-500" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Arquivo Digital</h1>
          </div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pl-11">
            Gestão Eletrônica de Documentos (GED)
          </p>
        </div>

        <Sheet open={isSheetOpen} onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (open) fetchData();
        }}>
          <SheetTrigger asChild>
            <Button className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[13px] gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4" /> Novo Documento
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] glass-card border-l border-white/10">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-xl font-black text-white">Upload de Documento</SheetTitle>
              <SheetDescription className="text-muted-foreground">Adicione PDFs ou imagens ao cadastro do funcionário.</SheetDescription>
            </SheetHeader>
            <form onSubmit={handleUpload} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Funcionário</Label>
                <Popover open={openCombo} onOpenChange={setOpenCombo}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombo}
                      className="w-full h-11 justify-between bg-white/5 border-white/10 text-[13px] font-normal hover:bg-white/10"
                    >
                      {form.employeeId
                        ? employees.find((emp) => emp.id === form.employeeId)?.name
                        : "Selecione o colaborador..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0 glass-card border-white/10 shadow-2xl">
                    <Command className="bg-transparent" shouldFilter={true}>
                      <CommandInput placeholder="Pesquisar funcionário..." className="h-10" />
                        <CommandList className="max-h-[300px] custom-scrollbar overflow-y-auto w-full">
                          {isUploading ? (
                            <div className="py-10 text-center text-xs text-muted-foreground animate-pulse">
                              Carregando lista de funcionários...
                            </div>
                          ) : (
                            <>
                              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                {employees.length === 0 
                                  ? "Nenhum funcionário cadastrado no sistema." 
                                  : "Nenhum resultado para esta pesquisa."}
                              </CommandEmpty>
                              
                              {employees.filter(e => e.status === 'ACTIVE').length > 0 && (
                                <CommandGroup heading="Funcionários Ativos">
                                  {employees.filter(e => e.status === 'ACTIVE').map((emp) => (
                                    <CommandItem
                                      key={emp.id}
                                      value={emp.name}
                                      onSelect={() => {
                                        setForm(f => ({ ...f, employeeId: emp.id }));
                                        setOpenCombo(false);
                                      }}
                                      className="text-[13px] py-3 cursor-pointer hover:bg-white/10 flex items-center gap-2 rounded-lg px-3 mx-1 mb-1 transition-colors"
                                    >
                                      <div className="flex items-center flex-1">
                                        <Check className={cn("mr-3 h-4 w-4 text-emerald-500", form.employeeId === emp.id ? "opacity-100" : "opacity-0")} />
                                        <span className="font-medium text-white">{emp.name}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}

                              {employees.filter(e => e.status === 'INACTIVE').length > 0 && (
                                <>
                                  <CommandSeparator className="bg-white/10 my-2" />
                                  <CommandGroup heading="Arquivo Morto (Desativados)">
                                    {employees.filter(e => e.status === 'INACTIVE').map((emp) => (
                                      <CommandItem
                                        key={emp.id}
                                        value={emp.name}
                                        onSelect={() => {
                                          setForm(f => ({ ...f, employeeId: emp.id }));
                                          setOpenCombo(false);
                                        }}
                                        className="text-[13px] py-3 cursor-pointer hover:bg-rose-500/5 flex items-center gap-2 rounded-lg px-3 mx-1 mb-1 transition-colors"
                                      >
                                        <div className="flex items-center flex-1">
                                          <Check className={cn("mr-3 h-4 w-4 text-rose-500", form.employeeId === emp.id ? "opacity-100" : "opacity-0")} />
                                          <span className="font-medium text-muted-foreground line-through decoration-rose-500/50">{emp.name}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </>
                          )}
                        </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Assunto / Nome do Arquivo</Label>
                <Input 
                  placeholder="Ex: Contrato de Trabalho 2024"
                  value={form.name}
                  onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  className="h-11 bg-white/5 border-white/10 text-[13px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Categoria</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({...f, category: v}))}>
                  <SelectTrigger className="h-11 bg-white/5 border-white/10 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-8 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 text-center space-y-2 group hover:border-emerald-500/50 transition-colors cursor-pointer relative overflow-hidden">
                  <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500 group-hover:scale-110 transition-transform">
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-muted-foreground group-hover:text-white transition-colors">Arraste seu PDF aqui</p>
                  <p className="text-[10px] text-muted-foreground/60">(Ou clique para selecionar)</p>
              </div>

              <Button disabled={isUploading} className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-500/10">
                {isUploading ? 'Salvando...' : 'Salvar no Arquivo Digital'}
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 glass-card rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-none">Total Geral</span>
            <p className="text-2xl font-black text-white leading-none mt-1">{documents.length}</p>
          </div>
        </div>
        <div className="p-5 glass-card rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-500/70 tracking-widest leading-none">Colab. Ativos</span>
            <p className="text-2xl font-black text-white leading-none mt-1">
              {new Set(documents.filter(d => d.employee_status === 'ACTIVE').map(d => d.employee_id)).size}
            </p>
          </div>
        </div>
        <div className="p-5 glass-card rounded-2xl border border-rose-500/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
            <UserMinus className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-500/70 tracking-widest leading-none">Arquivo Morto</span>
            <p className="text-2xl font-black text-white leading-none mt-1">
              {new Set(documents.filter(d => d.employee_status === 'INACTIVE').map(d => d.employee_id)).size}
            </p>
          </div>
        </div>
        <div className="p-5 glass-card rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
            <Filter className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-none">Filtrar Categoria</span>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="mt-1 h-7 border-none bg-transparent p-0 text-[13px] font-bold text-white focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Todas Categorias</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main List Area */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative group flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Buscar por funcionário ou arquivo..." 
              className="pl-11 h-12 bg-white/5 border-white/10 rounded-2xl focus:ring-emerald-500/20 border-emerald-500/5 text-[14px] transition-all" 
            />
          </div>

          <div className="flex items-center gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
              <Button 
                variant={filterStatus === 'ALL' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setFilterStatus('ALL')}
                className="h-9 px-4 rounded-xl text-[12px] font-bold"
              >
                Todos
              </Button>
              <Button 
                variant={filterStatus === 'ACTIVE' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setFilterStatus('ACTIVE')}
                className="h-9 px-4 rounded-xl text-[12px] font-bold text-emerald-400"
              >
                Ativos
              </Button>
              <Button 
                variant={filterStatus === 'INACTIVE' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setFilterStatus('INACTIVE')}
                className="h-9 px-4 rounded-xl text-[12px] font-bold text-rose-400"
              >
                <UserMinus className="w-3 h-3 mr-1.5" /> Arquivo Morto
              </Button>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black text-emerald-500 uppercase tracking-widest h-14">
                  <th className="px-6">Status</th>
                  <th className="px-6">Funcionário</th>
                  <th className="px-6">Documento</th>
                  <th className="px-6">Categoria</th>
                  <th className="px-6">Data Upload</th>
                  <th className="px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 opacity-30">
                        <FileCheck2 className="w-12 h-12" />
                        <p className="text-sm font-bold uppercase tracking-widest">Nenhum documento encontrado</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(doc => (
                    <tr key={doc.id} className="group hover:bg-white/[0.02] transition-colors h-16">
                      <td className="px-6">
                        {doc.employee_status === 'ACTIVE' ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                        )}
                      </td>
                      <td className="px-6">
                        <span className={cn(
                          "text-[13px] font-bold block",
                          doc.employee_status === 'INACTIVE' ? "text-muted-foreground line-through" : "text-white"
                        )}>
                          {doc.employee_name}
                        </span>
                      </td>
                      <td className="px-6">
                        <div className="flex items-center gap-3">
                           <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-muted-foreground group-hover:text-emerald-500 transition-colors">
                              <FileText className="w-4 h-4" />
                           </div>
                           <span className="text-[13px] font-medium text-white/90 truncate max-w-[200px]">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-6">
                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                          {CATEGORIES.find(c => c.value === doc.category)?.label || 'Outros'}
                        </span>
                      </td>
                      <td className="px-6 text-[12px] text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6">
                        <div className="flex justify-end gap-2">
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-emerald-500 hover:bg-emerald-500/10">
                              <Download className="w-4 h-4" />
                           </Button>
                           {isAdmin && (
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(doc.id, doc.name)}
                              className="h-8 w-8 text-white/40 hover:text-rose-500 hover:bg-rose-500/10"
                             >
                              <Trash2 className="w-4 h-4" />
                             </Button>
                           )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <p className="text-[11px] text-amber-200/60 font-medium">Apenas administradores podem excluir documentos permanentemente.</p>
        </div>
      )}
    </div>
  );
}
