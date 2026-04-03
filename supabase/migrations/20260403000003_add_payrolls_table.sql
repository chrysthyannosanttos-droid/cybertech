-- Criação da tabela de registros de folha de pagamento (Holerites processados)
CREATE TABLE IF NOT EXISTS public.payrolls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    reference_month INTEGER NOT NULL,
    reference_year INTEGER NOT NULL,
    gross_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
    net_salary NUMERIC(10, 2) NOT NULL DEFAULT 0,
    inss_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
    irrf_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
    fgts_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    pdf_url TEXT,
    status TEXT NOT NULL DEFAULT 'GENERATED', -- GENERATED, EMAIL_SENT
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Restrições para não gerar duas folhas pro mesmo funcionário no mesmo mês/ano
    UNIQUE(employee_id, reference_month, reference_year)
);

-- RLS
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payrolls from their tenant" 
    ON public.payrolls FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid()) 
        OR tenant_id = '9de674ac-807c-482a-a550-61014e7afee8' -- Tenant Master
    );

CREATE POLICY "Users can insert payrolls into their tenant" 
    ON public.payrolls FOR INSERT WITH CHECK (
        tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
        OR tenant_id = '9de674ac-807c-482a-a550-61014e7afee8'
    );

CREATE POLICY "Users can update their payrolls" 
    ON public.payrolls FOR UPDATE USING (
        tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
        OR tenant_id = '9de674ac-807c-482a-a550-61014e7afee8'
    );

CREATE POLICY "Users can delete their payrolls" 
    ON public.payrolls FOR DELETE USING (
        tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
        OR tenant_id = '9de674ac-807c-482a-a550-61014e7afee8'
    );
