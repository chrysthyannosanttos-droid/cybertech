import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  ArrowRight, 
  Download,
  Search,
  Check,
  AlertTriangle,
  Info,
  Sparkles,
  Zap,
  Trash2
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn, isValidCPF, formatCPF, parseNumeric, parseExcelDate } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { addAuditLog } from '@/data/mockData';

interface EmployeeImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  tenantId: string | null;
  stores: { id: string; name: string }[];
}

type Step = 'UPLOAD' | 'MAPPING' | 'PREVIEW' | 'IMPORTING' | 'SUMMARY';

interface MappingField {
  key: string;
  label: string;
  required?: boolean;
  type: 'string' | 'number' | 'date' | 'enum';
  options?: string[];
  description?: string;
  synonyms?: string[];
}

const MAPPING_FIELDS: MappingField[] = [
  { 
    key: 'name', label: 'Nome', required: true, type: 'string',
    synonyms: ['funcionario', 'colaborador', 'nome completo', 'full name', 'emp_name', 'pessoal'] 
  },
  { 
    key: 'role', label: 'Descrição cargo', type: 'string',
    synonyms: ['cargo', 'função', 'ocupação', 'desig', 'position', 'job'] 
  },
  { 
    key: 'cbo', label: 'CBO', type: 'string',
    synonyms: ['cod ocupação', 'classificação brasileira de ocupações'] 
  },
  { 
    key: 'department', label: 'Setor', type: 'string',
    synonyms: ['departamento', 'área', 'unidade', 'dept', 'area'] 
  },
  { 
    key: 'cpf', label: 'CPF', required: true, type: 'string',
    synonyms: ['doc', 'documento', 'id', 'identidade', 'tax id'] 
  },
  { 
    key: 'email', label: 'E-mail', type: 'string',
    synonyms: ['e-mail', 'mail', 'endereço eletrônico'] 
  },
  { 
    key: 'salary', label: 'Salário', type: 'number',
    synonyms: ['salario', 'base', 'remuneração', 'wage', 'salary'] 
  },
  { 
    key: 'insalubridade', label: 'Insalubridade', type: 'number',
    synonyms: ['adicional insalubridade', 'insalub'] 
  },
  { 
    key: 'periculosidade', label: 'Periculosidade', type: 'number',
    synonyms: ['adicional periculosidade', 'pericul'] 
  },
  { 
    key: 'vale_refeicao', label: 'VR', type: 'number',
    synonyms: ['vale refeição', 'alimentação', 'ticket', 'vr'] 
  },
  { 
    key: 'gender', label: 'Sexo', type: 'enum', options: ['M', 'F', 'OTHER'],
    synonyms: ['genero', 'gênero', 'sex'] 
  },
  { 
    key: 'admission_date', label: 'Admissão', required: true, type: 'date',
    synonyms: ['data admissão', 'admitido', 'contratação', 'hired date'] 
  },
  { 
    key: 'vale_transporte', label: 'VT', type: 'number',
    synonyms: ['vale transporte', 'transporte', 'vt'] 
  },
  { 
    key: 'flexivel', label: 'Flexível', type: 'number',
    synonyms: ['ajuda de custo', 'vale flexivel', 'beneficio flexivel'] 
  },
  { 
    key: 'mobilidade', label: 'Mobilidade', type: 'number',
    synonyms: ['ajuda mobilidade', 'transporte extra'] 
  },
  { key: 'birth_date', label: 'Data de Nascimento', type: 'date', synonyms: ['nascimento', 'aniversario'] },
  { key: 'status', label: 'Status', type: 'enum', options: ['ACTIVE', 'INACTIVE'] },
  { key: 'conta_itau', label: 'Conta Itaú', type: 'string', synonyms: ['itau', 'conta bancaria'] },
  { key: 'gratificacao', label: 'Gratificação', type: 'number' },
];

export function EmployeeImportModal({ open, onOpenChange, onImportComplete, tenantId, stores }: EmployeeImportModalProps) {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState({ success: 0, error: 0, total: 0 });
  const [errorFileRows, setErrorFileRows] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || '');
  const [conflictResolution, setConflictResolution] = useState<'update' | 'skip'>('update');
  const [bypassValidation, setBypassValidation] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  // Reset state when closing/opening
  useEffect(() => {
    if (open) {
      setStep('UPLOAD');
      setFile(null);
      setFileName('');
      setRawRows([]);
      setHeaders([]);
      setMapping({});
      setImportRows([]);
      setImportProgress(0);
      setImportSummary({ success: 0, error: 0, total: 0 });
      setErrorFileRows([]);
    }
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
    const isCsv = selectedFile.name.endsWith('.csv');

    if (!isExcel && !isCsv) {
      toast({ title: 'Formato inválido', description: 'Por favor, envie um arquivo .xlsx ou .csv', variant: 'destructive' });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast({ title: 'Arquivo muito grande', description: 'O limite máximo é 10MB', variant: 'destructive' });
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    processFile(selectedFile);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const bstr = e.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

      if (data.length < 1) {
        toast({ title: 'Planilha vazia', description: 'O arquivo não contém dados.', variant: 'destructive' });
        return;
      }

      setStep('IMPORTING'); 
      setImportProgress(0);

      // Smart Header Detection Logic
      let headerRowIndex = 0;
      let maxMatches = 0;

      // Scan up to 10 rows to find the best header row
      for (let i = 0; i < Math.min(data.length, 10); i++) {
        const potentialHeaders = data[i].map(h => String(h || '').trim().toLowerCase()).filter(h => h !== '');
        let matches = 0;
        
        MAPPING_FIELDS.forEach(field => {
          if (potentialHeaders.includes(field.key.toLowerCase()) || 
              potentialHeaders.includes(field.label.toLowerCase()) ||
              field.synonyms?.some(syn => potentialHeaders.some(ph => ph.includes(syn.toLowerCase()) || syn.toLowerCase().includes(ph)))) {
            matches++;
          }
        });

        if (matches > maxMatches) {
          maxMatches = matches;
          headerRowIndex = i;
        }
      }

      const fileHeaders = data[headerRowIndex].map(h => String(h || '').trim()).filter(h => h !== '');
      
      // Get rows starting from AFTER the detected header row
      const dataRows = data.slice(headerRowIndex + 1);
      // Convert aoa (array of arrays) back to objects using the detected headers
      const rows = dataRows.map(row => {
        const obj: any = {};
        fileHeaders.forEach((h, idx) => { obj[h] = row[idx]; });
        return obj;
      });

      setHeaders(fileHeaders);
      setRawRows(rows);
      
      // Smart AI Mapping Logic (Refined)
      const initialMapping: Record<string, string> = {};
      MAPPING_FIELDS.forEach(field => {
        let bestMatch = '';
        const directMatch = fileHeaders.find(h => {
          const lh = h.toLowerCase();
          return lh === field.key.toLowerCase() || lh === field.label.toLowerCase();
        });

        if (directMatch) {
          bestMatch = directMatch;
        } else {
          const synonymMatch = fileHeaders.find(h => {
            const lh = h.toLowerCase();
            return field.synonyms?.some(syn => lh.includes(syn.toLowerCase()) || syn.toLowerCase().includes(lh));
          });

          if (synonymMatch) {
            bestMatch = synonymMatch;
          } else {
            const typeMatch = fileHeaders.find(h => {
              const sample = rows.slice(0, 5).map(r => String(r[h] || '').trim()).filter(v => v !== '');
              if (sample.length === 0) return false;
              if (field.key === 'cpf') return sample.every(v => v.replace(/\D/g, '').length >= 11);
              if (field.key === 'email') return sample.every(v => v.includes('@') && v.includes('.'));
              if (field.type === 'date') return sample.every(v => !isNaN(new Date(v).getTime()) || /^\d{2}\/\d{2}\/\d{4}$/.test(v));
              return false;
            });
            if (typeMatch) bestMatch = typeMatch;
          }
        }
        if (bestMatch) initialMapping[field.key] = bestMatch;
      });
      
      setMapping(initialMapping);

      // Brief artificial delay for "AI feeling"
      await new Promise(resolve => setTimeout(resolve, 800));

      const missingRequired = MAPPING_FIELDS.filter(f => f.required && !initialMapping[f.key]);
      
      if (missingRequired.length === 0) {
        // AI found everything! Move to preview.
        toast({ 
          title: 'Mapeamento Automático Concluído', 
          description: 'A IA identificou todos os campos necessários.',
          icon: <Sparkles className="w-4 h-4 text-emerald-400" />
        });
        // We simulate handleNextToPreview with the new initialMapping
        const processed = rows.map((row, index) => {
          const rowData: any = { _originalIndex: index + 1, _errors: {} };
          const custom_fields: any = {};
          MAPPING_FIELDS.forEach(f => {
            const fileCol = initialMapping[f.key];
            let val = fileCol ? row[fileCol] : null;
            if (f.type === 'number') val = parseNumeric(val);
            if (f.type === 'date') val = parseExcelDate(val);
            if (f.type === 'string' && val) val = String(val).trim().toUpperCase();
            if (f.key === 'email' && val) val = String(val).trim().toLowerCase();
            if (f.key === 'cpf' && val) val = String(val).replace(/\D/g, '');
            rowData[f.key] = val;
          });
          fileHeaders.forEach(h => { if (!Object.values(initialMapping).includes(h)) custom_fields[h] = row[h]; });
          rowData.custom_fields = custom_fields;
          if (!rowData.name || rowData.name.length < 2) rowData._errors.name = 'Nome inválido';
          if (!rowData.cpf || !isValidCPF(rowData.cpf)) rowData._errors.cpf = 'CPF inválido';
          if (!rowData.admission_date) rowData._errors.admission_date = 'Data de admissão obrigatória';
          return rowData;
        });
        setImportRows(processed);
        setStep('PREVIEW');
      } else {
        // Some columns missing, ask user
        setStep('MAPPING');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleNextToPreview = () => {
    // Validate required mappings
    const missing = MAPPING_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      toast({ title: 'Campos obrigatórios faltando', description: `Mapeie: ${missing.map(f => f.label).join(', ')}`, variant: 'destructive' });
      return;
    }

    // Process and validate rows
    const processed = rawRows.map((row, index) => {
      const data: any = { _originalIndex: index + 1, _errors: {} };
      const custom_fields: any = {};

      // Map mapped fields
      MAPPING_FIELDS.forEach(f => {
        const fileCol = mapping[f.key];
        let val = fileCol ? row[fileCol] : null;

        if (f.type === 'number') val = parseNumeric(val);
        if (f.type === 'date') val = parseExcelDate(val);
        if (f.type === 'string' && val) val = String(val).trim().toUpperCase();
        if (f.key === 'email' && val) val = String(val).trim().toLowerCase();
        if (f.key === 'cpf' && val) val = String(val).replace(/\D/g, '');

        data[f.key] = val;
      });

      // Map unmapped fields to custom_fields
      headers.forEach(h => {
        const isMapped = Object.values(mapping).includes(h);
        if (!isMapped) {
          custom_fields[h] = row[h];
        }
      });
      data.custom_fields = custom_fields;

      // Validation
      if (!data.name || data.name.length < 2) data._errors.name = 'Nome inválido';
      if (!data.cpf || !isValidCPF(data.cpf)) data._errors.cpf = 'CPF inválido';
      if (!data.admission_date) data._errors.admission_date = 'Data de admissão obrigatória';
      
      return data;
    });

    setImportRows(processed);
    setStep('PREVIEW');
  };

  const handleStartImport = async () => {
    const validRows = bypassValidation ? importRows : importRows.filter(r => Object.keys(r._errors).length === 0);
    const errorRows = importRows.filter(r => Object.keys(r._errors).length > 0);
    
    if (validRows.length === 0) {
      toast({ 
        title: 'Nenhum registro válido', 
        description: 'Corrija os erros na planilha ou ative "Ignorar Validação" para prosseguir.', 
        variant: 'destructive' 
      });
      return;
    }

    setStep('IMPORTING');
    setImportProgress(0);
    setImportSummary({ success: 0, error: 0, total: validRows.length });
    setErrorFileRows(bypassValidation ? [] : errorRows);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const { _originalIndex, _errors, ...dbRow } = row;
        
        // Prepare DB object
        const finalRow = {
            ...dbRow,
            tenant_id: tenantId,
            store_id: selectedStoreId,
            cpf: formatCPF(dbRow.cpf), // Store formatted? Check schema. Schema says unique. Usually stored clean or formatted consistently.
            // Formatted in current Employees.tsx as $1.$2.$3-$4
        };

        try {
            const { error } = await supabase
                .from('employees')
                .upsert(finalRow, { 
                    onConflict: 'cpf', 
                    ignoreDuplicates: conflictResolution === 'skip' 
                });

            if (error) throw error;
            successCount++;
        } catch (err: any) {
            console.error('Import error at row', row._originalIndex, err);
            failCount++;
            setErrorFileRows(prev => [...prev, { ...row, _importError: err.message }]);
        }
        
        setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
        setImportSummary(prev => ({ ...prev, success: successCount, error: failCount }));
    }

    addAuditLog({
        userId: currentUser?.id || 'unknown',
        userName: currentUser?.name || 'Sistema',
        action: 'IMPORT_EMPLOYEES',
        details: `Importação premium: ${successCount} sucesso, ${failCount + errorRows.length} erros.`,
        tenantId: tenantId || undefined
    });

    setStep('SUMMARY');
    onImportComplete();
  };

  const downloadErrorReport = () => {
    const data = errorFileRows.map(r => {
        const report: any = { 'Linha Original': r._originalIndex };
        MAPPING_FIELDS.forEach(f => { report[f.label] = r[f.key]; });
        report['MOTIVO DO ERRO'] = r._importError || Object.values(r._errors).join('; ');
        return report;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Erros');
    XLSX.writeFile(wb, `erros_importacao_${Date.now()}.xlsx`);
  };

  const downloadTemplate = () => {
    const data = [MAPPING_FIELDS.map(f => f.label)];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, 'modelo_importacao_rh.xlsx');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden",
        "bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl"
      )}>
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                Importação Inteligente de Funcionários
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Siga os passos para importar sua base de colaboradores com segurança.
              </DialogDescription>
            </div>
          </div>
          
          {/* Steps Indicator */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'UPLOAD', label: 'Upload' },
              { id: 'MAPPING', label: 'Mapeamento' },
              { id: 'PREVIEW', label: 'Pré-visualização' },
              { id: 'SUMMARY', label: 'Conclusão' }
            ].map((s, i) => (
              <React.Fragment key={s.id}>
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 whitespace-nowrap",
                    step === s.id ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-muted/50 border-transparent text-muted-foreground"
                )}>
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border",
                    step === s.id ? "bg-emerald-500 border-emerald-400/50 text-white" : "bg-background border-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold">{s.label}</span>
                </div>
                {i < 3 && <ChevronRight className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
        </DialogHeader>
        
        {/* Main Content Area - Needs fixed height/flex-1 to enable inner scroll */}
        <div className="flex-1 min-h-0 p-6 pt-2">
          {step === 'UPLOAD' && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 py-10">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-full max-w-lg aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300",
                  "hover:bg-emerald-500/5 hover:border-emerald-500/50 border-white/10 bg-muted/20"
                )}
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg">Arraste ou clique para enviar</p>
                  <p className="text-sm text-muted-foreground">Formatos suportados: .xlsx, .xls, .csv</p>
                </div>
                <Input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".xlsx, .xls, .csv" 
                  onChange={handleFileUpload} 
                />
              </div>

              <div className="flex items-center gap-6">
                 <div className="flex flex-col items-center gap-1">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                        <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Planilha Base</span>
                 </div>
                 <div className="h-4 w-px bg-white/10" />
                 <Button variant="link" className="text-emerald-400 h-auto p-0 flex items-center gap-2" onClick={downloadTemplate}>
                    <Download className="w-4 h-4" /> Baixar modelo padrão
                 </Button>
              </div>
            </div>
          )}

          {step === 'MAPPING' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                    Mapear colunas do arquivo
                </h3>
                <Badge variant="outline" className="bg-emerald-500/5 text-emerald-400 border-emerald-500/20">
                    {headers.length} colunas encontradas
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 mb-4 border rounded-xl p-4 bg-muted/10 min-h-[300px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-2 pr-2">
                  {MAPPING_FIELDS.map((field) => {
                    const mappedHeader = mapping[field.key];
                    const isMapped = !!mappedHeader;
                    
                    return (
                      <div key={field.key} className={cn(
                        "flex flex-col gap-2 p-3 rounded-lg border transition-all duration-300",
                        isMapped ? "bg-emerald-500/[0.03] border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]" : "bg-muted/30 border-white/5"
                      )}>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold flex items-center gap-1.5 lowercase">
                              <span className="capitalize">{field.label}</span>
                              {field.required && <span className="text-rose-500">*</span>}
                          </Label>
                          {isMapped && (
                            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
                                <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">IA Ativa</span>
                                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                            </div>
                          )}
                        </div>
                        <Select 
                          value={mapping[field.key] || 'none'} 
                          onValueChange={(v) => setMapping(prev => ({...prev, [field.key]: v === 'none' ? '' : v}))}
                        >
                          <SelectTrigger className={cn(
                            "h-9 text-xs transition-shadow hover:shadow-lg bg-background/50",
                            isMapped && "border-emerald-500/30 text-emerald-100"
                          )}>
                            <SelectValue placeholder="Não mapeado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-rose-400">Não importar</SelectItem>
                            {headers.map(h => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                <p className="text-[11px] text-blue-200/70 leading-relaxed">
                    As colunas que não forem mapeadas serão salvas automaticamente em "Campos Personalizados" no cadastro do funcionário.
                </p>
              </div>
            </div>
          )}

          {step === 'PREVIEW' && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total</span>
                        <span className="text-xl font-bold">{importRows.length}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-emerald-500/70 uppercase font-bold tracking-wider">Válidos</span>
                        <span className="text-xl font-bold text-emerald-400">
                            {importRows.filter(r => Object.keys(r._errors).length === 0).length}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-rose-500/70 uppercase font-bold tracking-wider">Com Erro</span>
                        <span className="text-xl font-bold text-rose-500">
                            {importRows.filter(r => Object.keys(r._errors).length > 0).length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/5 border border-rose-500/20 rounded-lg h-8">
                        <Label htmlFor="bypass" className="text-[9px] uppercase font-black text-rose-400 cursor-pointer">Ignorar Validação</Label>
                        <Switch id="bypass" checked={bypassValidation} onCheckedChange={setBypassValidation} className="scale-75 data-[state=checked]:bg-rose-500" />
                    </div>
                    <div className="h-6 w-px bg-white/10" />
                    <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" onClick={() => setStep('MAPPING')}>
                        <Sparkles className="w-3 h-3" /> Ajustar Mapeamento
                    </Button>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Unidade</Label>
                        <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                            <SelectTrigger className="h-8 w-28 text-[11px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase text-muted-foreground">Conflito</Label>
                        <Select value={conflictResolution} onValueChange={(v: any) => setConflictResolution(v)}>
                            <SelectTrigger className="h-8 w-24 text-[11px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="update">Update</SelectItem>
                                <SelectItem value="skip">Skip</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
              </div>

              <div className="flex-1 min-h-[300px] border rounded-xl overflow-hidden bg-muted/20 flex flex-col">
                <div className="flex-1 overflow-y-auto">
                    <Table>
                        <TableHeader className="bg-muted/95 sticky top-0 z-20 backdrop-blur-md">
                            <TableRow className="border-white/5 hover:bg-transparent shadow-sm">
                                <TableHead className="w-12 text-center text-[10px] uppercase font-bold">Status</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold">Nome</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold">CPF</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold">E-mail</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold">Cargo</TableHead>
                                <TableHead className="text-[10px] uppercase font-bold text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {importRows.map((row, idx) => {
                                const hasErrors = Object.keys(row._errors).length > 0;
                                return (
                                    <TableRow key={idx} className={cn(
                                        "border-white/5 transition-colors",
                                        hasErrors && !bypassValidation ? "bg-rose-500/[0.04]" : "hover:bg-white/[0.02]"
                                    )}>
                                        <TableCell className="text-center">
                                            {hasErrors ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse cursor-help mx-auto" />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="bg-rose-600 text-white border-0 shadow-lg">
                                                            <ul className="text-[11px] list-disc pl-3 py-1 space-y-0.5">
                                                                {Object.values(row._errors).map((err: any, i) => <li key={i}>{err}</li>)}
                                                            </ul>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto" />
                                            )}
                                        </TableCell>
                                        <TableCell className={cn("text-xs font-semibold", row._errors.name && !bypassValidation && "text-rose-400 capitalize underline decoration-dotted")}>
                                            {row.name || '---'}
                                        </TableCell>
                                        <TableCell className={cn("text-xs font-mono", row._errors.cpf && !bypassValidation && "text-rose-400 underline decoration-dotted")}>
                                            {row.cpf ? formatCPF(row.cpf) : '---'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {row.email || '---'}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {row.role || '---'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10" onClick={() => {
                                                setImportRows(prev => prev.filter((_, i) => i !== idx));
                                            }}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
              </div>
            </div>
          )}

          {step === 'IMPORTING' && importRows.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold">IA Processando Planilha...</h3>
                <p className="text-sm text-muted-foreground italic">Identificando colunas e corrigindo formatos automaticamente</p>
              </div>
            </div>
          )}

          {step === 'IMPORTING' && importRows.length > 0 && (
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold">Importando Dados...</h3>
                <p className="text-sm text-muted-foreground">{importProgress}% concluído</p>
              </div>
              <div className="w-full max-w-md">
                <Progress value={importProgress} className="h-2" />
                <div className="flex justify-between mt-2 text-[10px] uppercase font-bold text-muted-foreground">
                    <span>{importSummary.success} Processados</span>
                    <span>{importSummary.error} Erros</span>
                </div>
              </div>
            </div>
          )}

          {step === 'SUMMARY' && (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/20">
                    <Check className="w-12 h-12 text-emerald-500" />
                </div>
                {importSummary.error > 0 && (
                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold border-4 border-background shadow-lg">
                        {importSummary.error}
                    </div>
                )}
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Importação Concluída!</h3>
                <p className="text-muted-foreground">
                    Foram processados {importSummary.total} registros com sucesso.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-500">Sucesso</span>
                    <span className="text-2xl font-bold">{importSummary.success}</span>
                </div>
                <div className={cn(
                    "p-4 rounded-2xl border flex flex-col items-center gap-1",
                    importSummary.error > 0 ? "bg-rose-500/5 border-rose-500/20" : "bg-muted/30 border-transparent opacity-50"
                )}>
                    <span className={cn("text-[10px] uppercase font-bold", importSummary.error > 0 ? "text-rose-500" : "text-muted-foreground")}>Falhas</span>
                    <span className="text-2xl font-bold">{importSummary.error + errorFileRows.length}</span>
                </div>
              </div>

              {errorFileRows.length > 0 && (
                <Button variant="outline" className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 gap-2" onClick={downloadErrorReport}>
                  <AlertTriangle className="w-4 h-4" /> Baixar Relatório de Erros
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 border-t border-white/5 bg-muted/10">
          <div className="flex w-full justify-between items-center">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-2">
                {step === 'UPLOAD' && <span>Selecione o arquivo para começar</span>}
                {step === 'MAPPING' && <span>Relacione as colunas da planilha</span>}
                {step === 'PREVIEW' && <span>Verifique os dados antes de confirmar</span>}
                {step === 'SUMMARY' && <span>Processo finalizado</span>}
            </div>
            
            <div className="flex gap-3">
              {step === 'UPLOAD' && (
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-9 px-4 text-xs">
                  Cancelar
                </Button>
              )}
              {step === 'MAPPING' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setStep('UPLOAD')} className="h-9 px-4 text-xs gap-1.5">
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </Button>
                  <Button size="sm" onClick={handleNextToPreview} className="h-9 px-4 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5">
                    Pré-visualizar <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
              {step === 'PREVIEW' && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setStep('MAPPING')} className="h-9 px-4 text-xs gap-1.5">
                    <ChevronLeft className="w-4 h-4" /> Ajustar Mapeamento
                  </Button>
                  <Button size="sm" onClick={handleStartImport} className="h-9 px-4 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5">
                    Confirmar Importação <Check className="w-4 h-4" />
                  </Button>
                </>
              )}
              {step === 'SUMMARY' && (
                <Button size="sm" onClick={() => onOpenChange(false)} className="h-9 px-6 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                  Fechar
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
