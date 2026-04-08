import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowRight, 
  Download,
  Check,
  Sparkles,
  Trash2,
  Clock,
  History
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { cn, formatCPF, parseNumeric, parseExcelDate, isValidCPF } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { addAuditLog } from '@/data/mockData';
import { format, parse } from 'date-fns';

interface AttendanceImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  tenantId: string | null;
}

type Step = 'UPLOAD' | 'MAPPING' | 'PREVIEW' | 'IMPORTING' | 'SUMMARY';

interface MappingField {
  key: string;
  label: string;
  required?: boolean;
  type: 'string' | 'number' | 'date' | 'time' | 'datetime';
  synonyms?: string[];
}

const MAPPING_FIELDS: MappingField[] = [
  { 
    key: 'cpf', label: 'CPF', required: true, type: 'string',
    synonyms: ['documento', 'doc', 'id', 'tax id', 'identificação', 'pessoal'] 
  },
  { 
    key: 'name', label: 'Nome do Colaborador', type: 'string',
    synonyms: ['funcionario', 'colaborador', 'nome completo', 'full name', 'emp_name'] 
  },
  { 
    key: 'date', label: 'Data da Batida', required: true, type: 'date',
    synonyms: ['data', 'dia', 'calendário', 'date'] 
  },
  { 
    key: 'time', label: 'Hora da Batida', required: true, type: 'time',
    synonyms: ['hora', 'horário', 'time', 'batida', 'log'] 
  },
  { 
    key: 'type', label: 'Tipo (Opcional)', type: 'string',
    synonyms: ['evento', 'tipo', 'sentido', 'e/s', 'direção'] 
  }
];

export function AttendanceImportModal({ open, onOpenChange, onImportComplete, tenantId }: AttendanceImportModalProps) {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState({ success: 0, error: 0, total: 0 });
  const [employees, setEmployees] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (open) {
      setStep('UPLOAD');
      setFile(null);
      setRawRows([]);
      setHeaders([]);
      setMapping({});
      setImportRows([]);
      setImportProgress(0);
      setImportSummary({ success: 0, error: 0, total: 0 });
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    const { data } = await supabase.from('employees').select('id, name, cpf');
    if (data) setEmployees(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls');
    const isCsv = selectedFile.name.endsWith('.csv');
    const isPdf = selectedFile.name.endsWith('.pdf');

    if (!isExcel && !isCsv && !isPdf) {
      toast({ title: 'Formato inválido', description: 'Por favor, envie um arquivo .xlsx, .csv ou .pdf (Control iD)', variant: 'destructive' });
      return;
    }

    setFile(selectedFile);
    setFileName(selectedFile.name);
    
    if (isPdf) {
      processPdf(selectedFile);
    } else {
      processFile(selectedFile);
    }
  };

  const processPdf = async (file: File) => {
    setStep('IMPORTING');
    setImportProgress(10);
    
    try {
      // 1. Carregar PDF.js dinamicamente se não estiver disponível
      if (!(window as any).pdfjsLib) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        document.head.appendChild(script);
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        // Usar duplo espaço para evitar que números colados se misturem
        fullText += strings.join('  ') + '\n';
        setImportProgress(10 + Math.round((i / pdf.numPages) * 40));
      }

      console.log("Extracted PDF Text:", fullText);

      // 2. Parser para Layout Control iD (conforme imagem)
      // Ajustando regex para ser mais flexível com espaços
      const nameMatch = fullText.match(/NOME DO FUNCIONÁRIO:\s*([^:\n\r]*?)(?=CPF DO FUNCIONÁRIO|PIS DO FUNCIONÁRIO|$)/i);
      const cpfMatch = fullText.match(/CPF DO FUNCIONÁRIO:\s*([\d.-]*)/i);

      const empName = nameMatch ? nameMatch[1].trim() : '';
      const rawCpf = cpfMatch ? cpfMatch[1].replace(/\D/g, '') : '';

      // Tentar encontrar funcionário pela base
      const emp = employees.find(e => 
        (rawCpf && e.cpf?.replace(/\D/g, '') === rawCpf) || 
        (empName && e.name?.toUpperCase() === empName.toUpperCase())
      );

      // 3. Extrair Linhas de Batidas
      // Regex mais robusto para capturar colunas de horários
      // Formato: DD/MM/YYYY - SEMANA ... HORARIOS
      const lines = fullText.split('\n');
      const rows: any[] = [];
      const timeRegex = /\d{2}:\d{2}/;
      
      lines.forEach(line => {
        const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch && dateMatch[1]) {
          const dateStr = dateMatch[1];
          // Encontrar todos os horários na linha
          const times = line.match(/\d{2}:\d{2}/g);
          
          if (times && times.length > 0) {
            let realHits = [...times];
            if (times.length > 4) {
              // Se tiver mais de 4, os 2 primeiros costumam ser a escala (Previsto)
              // Pegamos os últimos 4 ou o que sobrar
              realHits = times.slice(times.length - 4);
            }

            realHits.forEach((time, idx) => {
              rows.push({
                cpf: rawCpf,
                name: empName,
                date: dateStr,
                time: time,
                type: idx % 2 === 0 ? 'ENTRY' : 'EXIT',
                employee_id: emp?.id,
                employee_name: emp?.name || empName,
                _errors: emp ? {} : { cpf: 'Funcionário não cadastrado' }
              });
            });
          }
        }
      });

      if (rows.length === 0) {
        throw new Error('Nenhuma batida encontrada no PDF. Verifique se o arquivo contém batidas e se o layout é da Control iD.');
      }

      setImportRows(rows);
      setStep('PREVIEW');
      toast({ title: 'PDF Control iD Processado', description: `Identificado: ${empName}. Encontradas ${rows.length} batidas.` });

    } catch (err: any) {
      console.error('PDF Parse Error:', err);
      toast({ title: 'Erro ao ler PDF', description: err.message, variant: 'destructive' });
      setStep('UPLOAD');
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const bstr = e.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

      if (data.length < 1) {
        toast({ title: 'Arquivo vazio', variant: 'destructive' });
        return;
      }

      // Smart Header Detection
      let headerRowIndex = 0;
      let maxMatches = 0;

      for (let i = 0; i < Math.min(data.length, 10); i++) {
        const row = data[i].map(h => String(h || '').trim().toLowerCase());
        let matches = 0;
        MAPPING_FIELDS.forEach(field => {
          if (row.includes(field.key) || row.includes(field.label.toLowerCase()) || 
              field.synonyms?.some(syn => row.some(rh => rh.includes(syn.toLowerCase())))) {
            matches++;
          }
        });
        if (matches > maxMatches) { maxMatches = matches; headerRowIndex = i; }
      }

      const fileHeaders = data[headerRowIndex].map(h => String(h || '').trim()).filter(h => h !== '');
      const dataRows = data.slice(headerRowIndex + 1);
      const rows = dataRows.map(row => {
        const obj: any = {};
        fileHeaders.forEach((h, idx) => { obj[h] = row[idx]; });
        return obj;
      });

      setHeaders(fileHeaders);
      setRawRows(rows);

      // AI Mapping
      const initialMapping: Record<string, string> = {};
      MAPPING_FIELDS.forEach(field => {
        const match = fileHeaders.find(h => {
          const lh = h.toLowerCase();
          return lh === field.key || lh === field.label.toLowerCase() || 
                 field.synonyms?.some(syn => lh.includes(syn.toLowerCase()));
        });
        if (match) initialMapping[field.key] = match;
      });

      setMapping(initialMapping);
      setStep('MAPPING');
      
      if (initialMapping.cpf && initialMapping.date && initialMapping.time) {
        toast({ 
          title: 'IA: Mapeamento Automático', 
          description: 'Identificamos as colunas de CPF, Data e Hora.'
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleNextToPreview = () => {
    const missing = MAPPING_FIELDS.filter(f => f.required && !mapping[f.key]);
    if (missing.length > 0) {
      toast({ title: 'Campos obrigatórios faltando', description: `Mapeie: ${missing.map(f => f.label).join(', ')}`, variant: 'destructive' });
      return;
    }

    const processed = rawRows.map((row, index) => {
      const data: any = { _index: index, _errors: {} };
      
      MAPPING_FIELDS.forEach(f => {
        const fileCol = mapping[f.key];
        let val = fileCol ? row[fileCol] : null;
        
        if (f.key === 'cpf' && val) val = String(val).replace(/\D/g, '');
        if (f.key === 'date' && val) val = parseExcelDate(val);
        if (f.key === 'time' && val) {
            // Handle Excel time serial or string
            if (typeof val === 'number') {
                const totalSeconds = Math.floor(val * 24 * 3600);
                const hours = Math.floor(totalSeconds / 3600);
                const mins = Math.floor((totalSeconds % 3600) / 60);
                val = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            } else {
                val = String(val).trim().match(/\d{2}:\d{2}/)?.[0] || val;
            }
        }
        data[f.key] = val;
      });

      // Employee Matching
      const emp = employees.find(e => e.cpf?.replace(/\D/g, '') === data.cpf);
      if (emp) {
        data.employee_id = emp.id;
        data.employee_name = emp.name;
      } else {
        data._errors.cpf = 'Funcionário não encontrado';
      }

      if (!data.date) data._errors.date = 'Data inválida';
      if (!data.time) data._errors.time = 'Hora inválida';

      return data;
    }).filter(r => r.cpf || r.name);

    setImportRows(processed);
    setStep('PREVIEW');
  };

  const handleStartImport = async () => {
    const validRows = importRows.filter(r => Object.keys(r._errors).length === 0);
    if (validRows.length === 0) {
      toast({ title: 'Nenhum registro válido', variant: 'destructive' });
      return;
    }

    setStep('IMPORTING');
    let success = 0;
    let errors = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        // Parse DD/MM/YYYY format safely
        const parsedDate = parse(row.date, 'dd/MM/yyyy', new Date());
        const timeParts = row.time.split(':');
        parsedDate.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
        
        const timestamp = parsedDate.toISOString();

        const { error } = await supabase.from('time_entries').insert([{
          employee_id: row.employee_id,
          employee_name: row.employee_name,
          timestamp: timestamp,
          type: row.type || 'ENTRY',
          tenant_id: tenantId,
          status: 'SYNCED',
          device_id: null
        }]);

        if (error) throw error;
        success++;
      } catch (err) {
        errors++;
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
      setImportSummary({ success, error: errors, total: validRows.length });
    }

    addAuditLog({
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || 'Sistema',
      action: 'IMPORT_ATTENDANCE',
      details: `Importadas ${success} batidas com sucesso. ${errors} falhas.`,
      tenantId: tenantId || undefined
    });

    setStep('SUMMARY');
    onImportComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Importação de Batidas com IA
          </DialogTitle>
          <DialogDescription>Importe relatórios de ponto em CSV ou Excel com mapeamento automático.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-0">
          {step === 'UPLOAD' && (
            <div className="h-full flex flex-col items-center justify-center space-y-4 border-2 border-dashed rounded-xl border-white/10 hover:bg-white/5 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="font-bold">Arraste seu relatório aqui</p>
                <p className="text-xs text-muted-foreground">Suporta .csv, .xlsx, .xls</p>
              </div>
              <Input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
            </div>
          )}

          {step === 'MAPPING' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {MAPPING_FIELDS.map(field => (
                  <div key={field.key} className="space-y-1.5 p-3 rounded-lg bg-white/5 border border-white/10">
                    <Label className="text-xs font-bold flex items-center justify-between">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                      {mapping[field.key] && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400">Identificado</Badge>}
                    </Label>
                    <Select value={mapping[field.key] || 'none'} onValueChange={v => setMapping(prev => ({...prev, [field.key]: v === 'none' ? '' : v}))}>
                      <SelectTrigger className="h-9 bg-background/50">
                        <SelectValue placeholder="Selecione a coluna..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não importar</SelectItem>
                        {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button onClick={handleNextToPreview} className="w-full h-10 font-bold bg-emerald-600 hover:bg-emerald-500">
                Visualizar Dados <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 'PREVIEW' && (
            <div className="flex flex-col h-full space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                    <p className="text-lg font-bold">{importRows.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase text-emerald-500">Válidos</p>
                    <p className="text-lg font-bold text-emerald-400">{importRows.filter(r => Object.keys(r._errors).length === 0).length}</p>
                  </div>
                </div>
                <Button onClick={handleStartImport} className="bg-emerald-600 hover:bg-emerald-500 font-bold gap-2">
                  <Check className="w-4 h-4" /> Confirmar Importação
                </Button>
              </div>

              <div className="flex-1 overflow-auto rounded-xl border border-white/10">
                <Table>
                  <TableHeader className="bg-white/5 sticky top-0">
                    <TableRow>
                      <TableHead className="w-12 text-center text-[10px] uppercase">Status</TableHead>
                      <TableHead className="text-[10px] uppercase">Funcionário</TableHead>
                      <TableHead className="text-[10px] uppercase">Data/Hora</TableHead>
                      <TableHead className="text-[10px] uppercase">Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importRows.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-center">
                          {Object.keys(row._errors).length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger><AlertCircle className="w-4 h-4 text-rose-500 mx-auto" /></TooltipTrigger>
                                <TooltipContent><p className="text-xs">{Object.values(row._errors).join(', ')}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />}
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-bold">{row.employee_name || 'Desconhecido'}</p>
                          <p className="text-[10px] text-muted-foreground">{formatCPF(row.cpf)}</p>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {row.date} {row.time}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] h-5">{row.type || 'ENTRY'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === 'IMPORTING' && (
            <div className="h-full flex flex-col items-center justify-center space-y-6">
              <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
              <div className="text-center space-y-2">
                <h3 className="text-lg font-bold">Importando Batidas...</h3>
                <Progress value={importProgress} className="h-2 w-64 mx-auto" />
                <p className="text-xs text-muted-foreground">{importProgress}% concluído</p>
              </div>
            </div>
          )}

          {step === 'SUMMARY' && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-in zoom-in duration-500" />
              <div>
                <h3 className="text-xl font-bold">Importação Concluída!</h3>
                <p className="text-muted-foreground">{importSummary.success} batidas registradas com sucesso.</p>
                {importSummary.error > 0 && <p className="text-rose-500 text-sm">{importSummary.error} falhas detectadas.</p>}
              </div>
              <Button onClick={() => onOpenChange(false)} className="px-10 h-11 font-bold">Fechar</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
