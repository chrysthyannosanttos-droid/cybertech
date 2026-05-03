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
  Upload,
  X,
  Image as ImageIcon,
  File as FileIcon,
  Eye,
  Copy,
  Share2,
  ExternalLink
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [viewingEmployee, setViewingEmployee] = useState<{id: string, name: string} | null>(null);
  const [tenantIdState, setTenantIdState] = useState<string | null>(null);
  
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
      if (tenantId) setTenantIdState(tenantId);

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
        if (docsError.message.includes('Could not find the table')) {
           toast({ 
             title: 'Erro de Configuração', 
             description: 'A tabela employee_documents não foi encontrada no Supabase. Execute o script SQL fornecido.', 
             variant: 'destructive',
             duration: 10000 
           });
        } else {
           console.error('Error fetching docs:', docsError);
        }
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
      } else {
        const foundEmps = empData || [];
        setEmployees(foundEmps);
      }
    } catch (err: any) {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (file.size > maxSize) {
      toast({ title: 'Arquivo muito grande', description: 'O limite é 10MB.', variant: 'destructive' });
      return;
    }
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Tipo não permitido', description: 'Envie PDF, PNG, JPG ou WebP.', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const ensureBucket = async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const exists = buckets?.some(b => b.name === 'documents');
      if (!exists) {
        await supabase.storage.createBucket('documents', { public: true, fileSizeLimit: 10485760 });
      }
    } catch (e) {
      console.warn("Could not ensure bucket 'documents'. Continuing anyway...");
    }
  };

  const uploadFileToStorage = async (file: File, employeeId: string, docName: string) => {
    await ensureBucket();
    const ext = file.name.split('.').pop() || 'pdf';
    const filePath = `${employeeId}/${Date.now()}_${docName.replace(/\s+/g, '_')}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
    return { publicUrl: urlData.publicUrl, fileType: file.type };
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId || !form.name) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha o funcionário e o nome do arquivo.', variant: 'destructive' });
      return;
    }
    if (!selectedFile) {
      toast({ title: 'Arquivo obrigatório', description: 'Selecione um PDF ou imagem para enviar.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const selectedEmp = employees.find(e => e.id === form.employeeId);
      const { publicUrl, fileType } = await uploadFileToStorage(selectedFile, form.employeeId, form.name);

      const { error } = await supabase
        .from('employee_documents')
        .insert([{
          employee_id: form.employeeId,
          name: form.name,
          category: form.category,
          file_url: publicUrl,
          file_type: fileType,
          tenant_id: tenantIdState || (currentUser as any)?.tenantId || (currentUser as any)?.tenant_id
        }]);

      if (error) throw error;

      addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'UPLOAD_DOCUMENT',
        details: `[Arquivo Digital] Upload de ${form.name} para ${selectedEmp?.name}`
      });

      toast({ title: '✅ Documento enviado!', description: `${form.name} salvo com sucesso.` });
      setForm({ employeeId: '', category: 'OTHER', name: '' });
      setSelectedFile(null);
      setEmpSearch('');
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
              {/* Funcionário — busca inline */}
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wider">Funcionário</Label>
                {form.employeeId ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[13px] font-bold text-white">
                      {employees.find(e => e.id === form.employeeId)?.name}
                    </p>
                    <Button type="button" variant="ghost" size="sm" className="text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" onClick={() => setForm(f => ({ ...f, employeeId: '' }))}>
                      Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    <div className="flex items-center px-3 border-b border-white/10">
                      <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Buscar funcionário..."
                        value={empSearch}
                        onChange={e => setEmpSearch(e.target.value)}
                        className="w-full h-10 bg-transparent text-[13px] text-white outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                      {employees.filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase())).length === 0 ? (
                        <p className="text-[12px] text-muted-foreground text-center py-4">Nenhum colaborador encontrado</p>
                      ) : (
                        employees.filter(e => e.name.toLowerCase().includes(empSearch.toLowerCase())).map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, employeeId: emp.id })); setEmpSearch(''); }}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-primary/10 transition-colors border-b border-white/5 last:border-0"
                          >
                            <span className="text-[13px] text-white">{emp.name}</span>
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', emp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400')}>
                              {emp.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
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

              {/* Drag & Drop area */}
              <div
                className={cn(
                  'relative p-6 border-2 border-dashed rounded-2xl text-center space-y-2 transition-all cursor-pointer',
                  isDragging ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]' : 'border-white/10 bg-white/5 hover:border-emerald-500/50',
                  selectedFile && 'border-emerald-500/30 bg-emerald-500/5'
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      {selectedFile.type.startsWith('image/') ? (
                        <ImageIcon className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <FileIcon className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[12px] font-bold text-white truncate max-w-[220px]">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB · {selectedFile.type.split('/')[1].toUpperCase()}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-500/10" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto text-emerald-500">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-muted-foreground">Arraste seu PDF ou imagem aqui</p>
                    <p className="text-[10px] text-muted-foreground/60">(PDF, PNG, JPG, WebP — máx. 10MB)</p>
                  </>
                )}
              </div>

              <Button disabled={isUploading} className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-lg shadow-emerald-500/10">
                {isUploading ? 'Enviando...' : 'Salvar no Arquivo Digital'}
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
                        <button
                          onClick={() => setViewingEmployee({ id: doc.employee_id, name: doc.employee_name || 'Funcionário' })}
                          className={cn(
                            "text-[13px] font-bold block hover:underline cursor-pointer transition-colors",
                            doc.employee_status === 'INACTIVE' ? "text-muted-foreground line-through hover:text-rose-400" : "text-white hover:text-emerald-400"
                          )}>
                          {doc.employee_name}
                        </button>
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
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-emerald-500 hover:bg-emerald-500/10" onClick={() => doc.file_url && window.open(doc.file_url, '_blank')}>
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

      {/* Modal de visualização de documentos do funcionário — Galeria */}
      <Dialog open={!!viewingEmployee} onOpenChange={(open) => { if (!open) { setViewingEmployee(null); setSelectedFile(null); setForm(f => ({...f, name: '', category: 'OTHER'})); } }}>
        <DialogContent className="max-w-4xl border-white/10 bg-[#0a0f1e] max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-white font-black flex items-center gap-3 text-lg">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <FolderOpen className="w-5 h-5 text-emerald-400" />
              </div>
              Documentos — {viewingEmployee?.name}
              <span className="ml-auto text-[10px] font-bold text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
                {documents.filter(d => d.employee_id === viewingEmployee?.id).length} arquivo(s)
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 overflow-y-auto max-h-[62vh] custom-scrollbar pr-1">
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">

              {/* Card "+" para adicionar novo arquivo */}
              <div
                className={cn(
                  "aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden",
                  selectedFile 
                    ? "border-emerald-500/40 bg-emerald-500/5" 
                    : "border-white/10 bg-white/[0.02] hover:border-emerald-500/50 hover:bg-emerald-500/5"
                )}
                onClick={() => {
                  if (!selectedFile) document.getElementById('gallery-file-input')?.click();
                }}
              >
                <input
                  id="gallery-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="absolute inset-0 p-3 flex flex-col">
                    <div className="flex-1 flex items-center justify-center">
                      {selectedFile.type.startsWith('image/') ? (
                        <img src={URL.createObjectURL(selectedFile)} alt="preview" className="max-h-full max-w-full object-contain rounded-lg" />
                      ) : (
                        <FileIcon className="w-10 h-10 text-amber-400" />
                      )}
                    </div>
                    <div className="space-y-1.5 mt-2">
                      <input
                        type="text"
                        placeholder="Nome..."
                        value={form.name}
                        onChange={e => setForm(f => ({...f, name: e.target.value}))}
                        onClick={e => e.stopPropagation()}
                        className="w-full h-7 px-2 rounded-lg bg-black/40 border border-white/10 text-[10px] text-white outline-none placeholder:text-muted-foreground"
                      />
                      <div className="flex gap-1">
                        <button
                          disabled={isUploading || !form.name}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!viewingEmployee || !selectedFile || !form.name) return;
                            setIsUploading(true);
                            try {
                              const { publicUrl, fileType } = await uploadFileToStorage(selectedFile, viewingEmployee.id, form.name);
                              const { error } = await supabase.from('employee_documents').insert([{
                                employee_id: viewingEmployee.id,
                                name: form.name,
                                category: form.category,
                                file_url: publicUrl,
                                file_type: fileType,
                                tenant_id: tenantIdState || (currentUser as any)?.tenantId || (currentUser as any)?.tenant_id
                              }]);
                              if (error) throw error;
                              toast({ title: '✅ Enviado!', description: `${form.name} salvo.` });
                              setSelectedFile(null);
                              setForm(f => ({...f, name: '', category: 'OTHER'}));
                              fetchData();
                            } catch (err: any) {
                              toast({ title: 'Erro', description: err.message, variant: 'destructive' });
                            } finally { setIsUploading(false); }
                          }}
                          className="flex-1 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white disabled:opacity-40 transition-colors"
                        >
                          {isUploading ? '...' : '⬆ Enviar'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                          className="h-7 w-7 rounded-lg bg-white/5 hover:bg-rose-500/10 flex items-center justify-center text-rose-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Plus className="w-7 h-7 text-emerald-500" />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground group-hover:text-white transition-colors">Adicionar</p>
                  </>
                )}
              </div>

              {/* Miniaturas dos documentos */}
              {documents.filter(d => d.employee_id === viewingEmployee?.id).map(doc => {
                const isImage = doc.file_url && (doc.file_url.endsWith('.png') || doc.file_url.endsWith('.jpg') || doc.file_url.endsWith('.jpeg') || doc.file_url.endsWith('.webp') || (doc as any).file_type?.startsWith('image/'));
                const isPdf = doc.file_url && (doc.file_url.endsWith('.pdf') || (doc as any).file_type === 'application/pdf');
                const isValidFile = doc.file_url && !doc.file_url.includes('placeholder');
                return (
                  <div
                    key={doc.id}
                    className="aspect-square rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden relative group hover:border-emerald-500/30 transition-all cursor-pointer"
                    onClick={() => isValidFile && window.open(doc.file_url, '_blank')}
                  >
                    {/* Thumbnail */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      {isImage && isValidFile ? (
                        <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" />
                      ) : isPdf ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 rounded-xl bg-rose-500/10 flex items-center justify-center">
                            <FileText className="w-8 h-8 text-rose-400" />
                          </div>
                          <span className="text-[9px] font-bold text-rose-400 uppercase">PDF</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
                            <FileIcon className="w-8 h-8 text-amber-400" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Overlay ao hover com ações */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5">
                      {/* Ações topo */}
                      <div className="flex justify-end gap-1">
                        {isValidFile && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(doc.file_url); toast({ title: 'Link copiado!' }); }} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-emerald-500/20 flex items-center justify-center transition-colors" title="Copiar link">
                              <Copy className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/?text=${encodeURIComponent(`${doc.name}\n${doc.file_url}`)}`, '_blank'); }} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-emerald-500/20 flex items-center justify-center transition-colors" title="WhatsApp">
                              <Share2 className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); window.open(doc.file_url, '_blank'); }} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-blue-500/20 flex items-center justify-center transition-colors" title="Download">
                              <Download className="w-3.5 h-3.5 text-white" />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id, doc.name); }} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-rose-500/20 flex items-center justify-center transition-colors" title="Excluir">
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        )}
                      </div>
                      {/* Info base */}
                      <div>
                        <p className="text-[11px] font-bold text-white truncate">{doc.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-muted-foreground">
                            {CATEGORIES.find(c => c.value === doc.category)?.label || 'Outros'}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badge de tipo */}
                    <div className="absolute top-2 left-2 opacity-80">
                      {isImage ? (
                        <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center backdrop-blur-sm">
                          <ImageIcon className="w-3 h-3 text-blue-400" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center backdrop-blur-sm">
                          <FileIcon className="w-3 h-3 text-amber-400" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
