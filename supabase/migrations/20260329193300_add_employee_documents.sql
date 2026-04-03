CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT, -- 'RG', 'CPF', 'Contrato', 'Outros'
  file_url TEXT NOT NULL,
  file_type TEXT,
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Allow all for now" ON public.employee_documents FOR ALL USING (true);

-- Ativar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE employee_documents;
