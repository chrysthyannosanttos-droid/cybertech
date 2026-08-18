import React, { useEffect, useState, useRef } from 'react';
import { addAuditLog } from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { ServiceProvider } from '@/types';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Calendar, 
  AlertCircle, 
  FileText, 
  Upload, 
  Edit2, 
  CheckCircle2, 
  Trash2, 
  DollarSign, 
  Eye, 
  ExternalLink,
  Download,
  Loader2,
  Paperclip
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export default function ServiceProviders() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'superadmin' || currentUser?.email === 'cristiano';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [contractUrl, setContractUrl] = useState<string>('');
  const [contractFileName, setContractFileName] = useState<string>('');

  const [form, setForm] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    startDate: '',
    endDate: '',
    isIndefinite: false,
    contractValue: '',
    duties: '',
    observations: '',
    additionalCosts: [] as { desc: string; value: number; date: string }[],
  });

  const [newCost, setNewCost] = useState({ desc: '', value: '', date: '' });

  const fetchData = async () => {
    setIsLoading(true);
    // Get tenant_id
    const { data: tData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
    if (tData?.id) setTenantId(tData.id);

    const { data, error } = await supabase.from('service_providers').select('*').order('name');
    if (error) {
      toast({ title: 'Erro ao buscar prestadores', description: error.message, variant: 'destructive' });
    } else {
      setProviders((data || []).map(p => ({
        id: p.id,
        tenantId: p.tenant_id,
        name: p.name,
        cnpj: p.cnpj || '',
        email: p.email || '',
        phone: p.phone || '',
        startDate: p.start_date || '',
        endDate: p.end_date || '',
        contractValue: Number(p.contract_value) || 0,
        duties: p.duties || '',
        observations: p.observations || '',
        additionalCosts: p.additional_costs || [],
        contractUrl: p.contract_url || '',
        contractFileName: p.contract_file_name || '',
      })));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = providers.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.cnpj.includes(search)
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setSelectedFile(null);
    setContractUrl('');
    setContractFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setForm({ 
      name: '', 
      cnpj: '', 
      email: '', 
      phone: '', 
      startDate: '', 
      endDate: '', 
      isIndefinite: false,
      contractValue: '', 
      duties: '', 
      observations: '', 
      additionalCosts: [] 
    });
    setOpen(true);
  };

  const handleOpenEdit = (p: ServiceProvider) => {
    setEditingId(p.id);
    setSelectedFile(null);
    setContractUrl(p.contractUrl || '');
    setContractFileName(p.contractFileName || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setForm({
      name: p.name,
      cnpj: p.cnpj,
      email: p.email,
      phone: p.phone,
      startDate: p.startDate,
      endDate: p.endDate || '',
      isIndefinite: !p.endDate,
      contractValue: p.contractValue.toString(),
      duties: p.duties || '',
      observations: p.observations || '',
      additionalCosts: p.additionalCosts || [],
    });
    setOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) { // 15MB limit
      toast({ title: 'Arquivo muito grande', description: 'O tamanho máximo do documento é 15MB.', variant: 'destructive' });
      return;
    }

    setSelectedFile(file);
    setContractFileName(file.name);
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setContractUrl('');
    setContractFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const uploadContractFile = async (file: File, providerId: string): Promise<string> => {
    try {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `service_providers/${providerId}_${Date.now()}_${cleanName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { contentType: file.type || 'application/pdf', upsert: true });

      if (uploadError) {
        console.warn('Storage upload error, falling back to base64:', uploadError.message);
        return await fileToBase64(file);
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);
      return urlData?.publicUrl || (await fileToBase64(file));
    } catch (err) {
      console.warn('Storage upload exception, falling back to base64:', err);
      return await fileToBase64(file);
    }
  };

  const handleAddCost = () => {
    if (!newCost.desc || !newCost.value || !newCost.date) return;
    setForm(f => ({
      ...f,
      additionalCosts: [...f.additionalCosts, { desc: newCost.desc, value: Number(newCost.value), date: newCost.date }]
    }));
    setNewCost({ desc: '', value: '', date: '' });
  };

  const handleRemoveCost = (index: number) => {
    setForm(f => ({
      ...f,
      additionalCosts: f.additionalCosts.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.cnpj) {
      toast({ title: 'Campos obrigatórios', description: 'Informe o Nome da Empresa e o CNPJ.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);

    try {
      const targetId = editingId || crypto.randomUUID();
      let finalContractUrl = contractUrl;
      let finalContractFileName = contractFileName;

      if (selectedFile) {
        finalContractUrl = await uploadContractFile(selectedFile, targetId);
        finalContractFileName = selectedFile.name;
      }

      const dbData = {
        name: form.name,
        cnpj: form.cnpj,
        email: form.email,
        phone: form.phone,
        start_date: form.startDate || null,
        end_date: form.isIndefinite ? null : form.endDate || null,
        contract_value: Number(form.contractValue) || 0,
        duties: form.duties,
        observations: form.observations,
        additional_costs: form.additionalCosts,
        tenant_id: tenantId,
        contract_url: finalContractUrl || null,
        contract_file_name: finalContractFileName || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('service_providers')
          .update(dbData)
          .eq('id', editingId);

        if (error) throw error;

        addAuditLog({
          userId: currentUser?.id || 'unknown',
          userName: currentUser?.name || 'Sistema',
          action: 'EDIT_SERVICE_PROVIDER',
          details: `[ServiceProviders] Editou prestador ${form.name} (CNPJ: ${form.cnpj})`,
          tenantId: tenantId || undefined
        });
        toast({ title: 'Prestador atualizado', description: `${form.name} atualizado com sucesso.` });
      } else {
        const { error } = await supabase
          .from('service_providers')
          .insert([{ ...dbData, id: targetId }]);

        if (error) throw error;

        addAuditLog({
          userId: currentUser?.id || 'unknown',
          userName: currentUser?.name || 'Sistema',
          action: 'CREATE_SERVICE_PROVIDER',
          details: `[ServiceProviders] Criou prestador ${form.name} (CNPJ: ${form.cnpj})`,
          tenantId: tenantId || undefined
        });
        toast({ title: 'Prestador cadastrado', description: `${form.name} adicionado com sucesso.` });
      }
      
      await fetchData();
      setOpen(false);
    } catch (err: any) {
      console.error('Error saving provider:', err);
      toast({ title: 'Erro ao salvar', description: err.message || 'Falha na operação.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`Tem certeza que deseja excluir o prestador ${name}?`)) return;
    
    const { error } = await supabase.from('service_providers').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Cristiano',
      action: 'DELETE_SERVICE_PROVIDER',
      details: `[ServiceProviders] Excluiu prestador ${name}`,
      tenantId: tenantId || undefined
    });
    
    await fetchData();
    toast({ title: 'Prestador removido' });
  };

  const getDaysRemaining = (dateStr: string) => {
    const end = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const [viewingDocProvider, setViewingDocProvider] = useState<ServiceProvider | null>(null);

  const downloadFile = async (url: string, filename: string) => {
    if (!url) return;
    try {
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'contrato.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: 'Download iniciado', description: filename });
        return;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'contrato.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast({ title: 'Download iniciado', description: filename });
    } catch (e) {
      // Fallback para abrir link
      window.open(url, '_blank');
    }
  };

  return (
    <div className="animate-fade-in-up stagger-1">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tighter">Prestadores de Serviços</h1>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Gestão de contratos e fluxos externos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-10 px-6 rounded-xl bg-primary text-white hover:bg-primary/90 font-bold text-[12px] gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4" /> Novo Prestador
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[15px]">{editingId ? 'Editar Prestador' : 'Cadastrar Prestador de Serviço'}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2 mt-2">
              <div className="col-span-2 space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Nome da Empresa *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-[13px]" placeholder="Ex: Limpeza Express Ltda" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">CNPJ *</label>
                <Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} className="h-9 text-[13px]" placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Telefone</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-9 text-[13px]" placeholder="(00) 00000-0000" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">E-mail</label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-9 text-[13px]" placeholder="contato@empresa.com.br" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Início do Contrato</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="h-9 text-[13px]" />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-medium text-muted-foreground">Término do Contrato</label>
                  <div className="flex items-center gap-1.5">
                    <Checkbox id="indefinite" checked={form.isIndefinite} onCheckedChange={(c) => setForm(f => ({...f, isIndefinite: !!c, endDate: c ? '' : f.endDate}))} />
                    <label htmlFor="indefinite" className="text-[10px] text-muted-foreground cursor-pointer hover:text-white leading-none mb-0">Indefinido</label>
                  </div>
                </div>
                <Input type="date" disabled={form.isIndefinite} value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="h-9 text-[13px] disabled:opacity-50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Valor do Contrato (Mensal R$)</label>
                <Input type="number" value={form.contractValue} onChange={e => setForm(f => ({ ...f, contractValue: e.target.value }))} className="h-9 text-[13px]" placeholder="0.00" />
              </div>

              {/* Upload de Contrato / Documento PDF */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground flex items-center justify-between">
                  <span>Documento (PDF/Foto)</span>
                  {(contractFileName || contractUrl) && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Anexado
                    </span>
                  )}
                </label>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf, image/*, .doc, .docx" 
                  onChange={handleFileChange} 
                />

                {contractFileName || contractUrl ? (
                  <div className="flex items-center justify-between p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-[12px]">
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <FileText className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-white text-xs truncate max-w-[130px]" title={contractFileName || 'Documento anexado'}>
                        {contractFileName || 'Documento anexado'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {contractUrl && (
                        <>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" 
                            title="Visualizar"
                            onClick={() => {
                              setViewingDocProvider({
                                id: editingId || 'temp',
                                tenantId: tenantId || '',
                                name: form.name || 'Prestador',
                                cnpj: form.cnpj || '',
                                email: form.email,
                                phone: form.phone,
                                startDate: form.startDate,
                                endDate: form.endDate,
                                contractValue: Number(form.contractValue) || 0,
                                additionalCosts: form.additionalCosts,
                                contractUrl: contractUrl,
                                contractFileName: contractFileName || 'contrato.pdf'
                              });
                            }}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10" 
                            title="Baixar arquivo"
                            onClick={() => downloadFile(contractUrl, contractFileName || 'contrato.pdf')}
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" 
                        title="Remover anexo"
                        onClick={handleRemoveFile}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-full text-[12px] border-dashed border-2 gap-2 hover:bg-primary/5 hover:border-primary/50"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" /> Anexar PDF / Contrato
                  </Button>
                )}
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Atribuições</label>
                <Textarea value={form.duties} onChange={e => setForm(f => ({ ...f, duties: e.target.value }))} className="text-[13px] min-h-[80px]" placeholder="Descreva as responsabilidades do prestador..." />
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-[12px] font-medium text-muted-foreground">Observações</label>
                <Textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))} className="text-[13px] min-h-[60px]" placeholder="Notas adicionais..." />
              </div>

              {/* Dynamic Additional Costs */}
              <div className="col-span-2 border-t border-white/10 pt-4 mt-2">
                <h4 className="text-[13px] font-semibold mb-3">Custos Adicionais</h4>
                <div className="flex gap-2 items-end mb-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                    <Input value={newCost.desc} onChange={e => setNewCost(c => ({ ...c, desc: e.target.value }))} className="h-8 text-[12px]" placeholder="Ex: Taxa extra" />
                  </div>
                  <div className="w-24 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Valor</label>
                    <Input type="number" value={newCost.value} onChange={e => setNewCost(c => ({ ...c, value: e.target.value }))} className="h-8 text-[12px]" placeholder="0.00" />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Data</label>
                    <Input type="date" value={newCost.date} onChange={e => setNewCost(c => ({ ...c, date: e.target.value }))} className="h-8 text-[12px]" />
                  </div>
                  <Button type="button" size="sm" onClick={handleAddCost} className="h-8 w-8 p-0">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {form.additionalCosts.length > 0 && (
                  <div className="space-y-2 mb-4 bg-muted/30 p-2 rounded-md">
                    {form.additionalCosts.map((cost, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[12px] p-2 bg-card rounded border border-border/50">
                        <div className="flex flex-col">
                          <span className="font-medium">{cost.desc}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(cost.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-primary">R$ {cost.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => handleRemoveCost(idx)}>
                            <Trash2 className="w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleSave} 
                disabled={isUploading}
                className="col-span-2 h-10 text-[13px] mt-2 font-bold gap-2 bg-primary hover:bg-primary/90 text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando Prestador e Documento...
                  </>
                ) : (
                  editingId ? 'Salvar Alterações' : 'Cadastrar Prestador'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar prestador por nome ou CNPJ..." className="pl-11 h-11 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 text-[13px] transition-all" />
      </div>

      <div className="glass-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[11px] font-bold text-primary uppercase tracking-widest leading-none">
                <th className="px-6 py-4">Prestador</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Vigência</th>
                <th className="px-6 py-4 text-right">Valor Contrato</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(p => {
                const isIndefinite = !p.endDate;
                const daysLeft = isIndefinite ? 9999 : getDaysRemaining(p.endDate);
                const isExpiringSoon = !isIndefinite && daysLeft <= 10 && daysLeft >= 0;
                const isExpired = !isIndefinite && daysLeft < 0;

                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white group-hover:text-primary transition-colors">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono-data tracking-tighter mt-0.5">{p.cnpj}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground group-hover:text-white/70 transition-colors">
                          <Mail className="w-3 h-3" /> {p.email || 'Sem e-mail'}
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground group-hover:text-white/70 transition-colors">
                          <Phone className="w-3 h-3" /> {p.phone || 'Sem telefone'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[12px] text-white/90">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span className="font-bold">{p.endDate ? new Date(p.endDate).toLocaleDateString('pt-BR') : 'Indefinido'}</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest pl-5">Vencimento</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono-data text-[14px] font-black text-white group-hover:text-primary transition-colors">R$ {p.contractValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        {p.additionalCosts && p.additionalCosts.length > 0 && (
                          <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-tighter">
                            + {p.additionalCosts.length} custos extras
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {isExpired ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                            Vencido
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                            Em {daysLeft} dias
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                            Ativo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão de Visualizar PDF / Contrato */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-8 w-8 rounded-lg transition-all",
                            p.contractUrl 
                              ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]" 
                              : "text-white/20 hover:text-white/40 hover:bg-white/5 opacity-40 cursor-not-allowed"
                          )} 
                          title={p.contractUrl ? `Visualizar Contrato: ${p.contractFileName || 'PDF'}` : 'Nenhum contrato anexado'}
                          onClick={() => {
                            if (p.contractUrl) {
                              setViewingDocProvider(p);
                            } else {
                              toast({ title: 'Sem documento', description: 'Este prestador ainda não possui contrato anexado.', variant: 'destructive' });
                            }
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {/* Botão de Baixar PDF / Contrato */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "h-8 w-8 rounded-lg transition-all",
                            p.contractUrl 
                              ? "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20" 
                              : "text-white/20 hover:text-white/40 hover:bg-white/5 opacity-40 cursor-not-allowed"
                          )} 
                          title={p.contractUrl ? `Baixar Contrato: ${p.contractFileName || 'PDF'}` : 'Nenhum contrato anexado'}
                          onClick={() => {
                            if (p.contractUrl) {
                              downloadFile(p.contractUrl, p.contractFileName || `${p.name.replace(/\s+/g, '_')}_contrato.pdf`);
                            } else {
                              toast({ title: 'Sem documento', description: 'Este prestador ainda não possui contrato anexado.', variant: 'destructive' });
                            }
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>

                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10" onClick={() => handleOpenEdit(p)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-rose-500/40 hover:text-rose-400 hover:bg-rose-500/10" onClick={() => handleDeleteProvider(p.id, p.name)}>
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
      </div>

      {/* Modal de Visualização Completa e Download do Contrato */}
      <Dialog open={!!viewingDocProvider} onOpenChange={(isOpen) => { if (!isOpen) setViewingDocProvider(null); }}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-white/10 shadow-2xl">
          <DialogHeader className="p-6 pb-3 border-b border-white/5 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Contrato — {viewingDocProvider?.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono-data mt-0.5">
                CNPJ: {viewingDocProvider?.cnpj} • Arquivo: <span className="text-white font-medium">{viewingDocProvider?.contractFileName || 'Documento'}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 pr-6">
              {viewingDocProvider?.contractUrl && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 px-3 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => downloadFile(viewingDocProvider.contractUrl!, viewingDocProvider.contractFileName || 'contrato.pdf')}
                  >
                    <Download className="w-3.5 h-3.5" /> Baixar Arquivo
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 px-3 text-xs gap-1.5 border-white/10 hover:bg-white/10"
                    onClick={() => window.open(viewingDocProvider.contractUrl, '_blank')}
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Nova Aba
                  </Button>
                </>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 min-h-[500px] p-4 bg-muted/20 flex flex-col items-center justify-center overflow-hidden">
            {viewingDocProvider?.contractUrl ? (
              viewingDocProvider.contractUrl.includes('image') || /\.(png|jpe?g|webp|gif)$/i.test(viewingDocProvider.contractFileName || '') ? (
                <div className="w-full h-full flex items-center justify-center p-2 overflow-auto">
                  <img 
                    src={viewingDocProvider.contractUrl} 
                    alt="Documento do Prestador" 
                    className="max-h-[68vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10" 
                  />
                </div>
              ) : (
                <iframe 
                  src={viewingDocProvider.contractUrl} 
                  title="Documento do Prestador"
                  className="w-full h-[68vh] rounded-xl border border-white/10 bg-white" 
                />
              )
            ) : (
              <div className="text-center space-y-3 p-8">
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <p className="text-sm font-semibold">Nenhum documento disponível para visualização.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
