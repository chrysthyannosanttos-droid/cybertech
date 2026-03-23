-- Initial Schema for HR Hub Plus
-- Migration Date: 20240101000000

-- Create enum types if needed (optional)
CREATE TYPE user_role AS ENUM ('superadmin', 'tenant');

-- 1. Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT,
    subscription JSONB,
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles Ext
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- links to auth.users if needed
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'tenant',
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Stores
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT,
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Employees
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    gender TEXT,
    birth_date DATE,
    admission_date DATE,
    department TEXT,
    role TEXT,
    status TEXT DEFAULT 'ACTIVE',
    salary NUMERIC DEFAULT 0,
    cbo TEXT,
    conta_itau TEXT,
    insalubridade NUMERIC DEFAULT 0,
    periculosidade NUMERIC DEFAULT 0,
    gratificacao NUMERIC DEFAULT 0,
    vale_transporte NUMERIC DEFAULT 0,
    vale_refeicao NUMERIC DEFAULT 0,
    flexivel NUMERIC DEFAULT 0,
    mobilidade NUMERIC DEFAULT 0,
    vale_flexivel NUMERIC DEFAULT 0,
    photo_reference_url TEXT,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Service Providers
CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    phone TEXT,
    start_date DATE,
    end_date DATE,
    contract_value NUMERIC DEFAULT 0,
    duties TEXT,
    observations TEXT,
    additional_costs JSONB DEFAULT '[]',
    contract_url TEXT,
    contract_file_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Benefits
CREATE TABLE IF NOT EXISTS public.benefits (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    default_value NUMERIC,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Employee Benefits
CREATE TABLE IF NOT EXISTS public.employee_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    benefit_id TEXT REFERENCES public.benefits(id) ON DELETE CASCADE,
    override_value NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Certificates
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT,
    date DATE,
    cid TEXT,
    days INTEGER DEFAULT 0,
    file_url TEXT,
    file_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Rescissions
CREATE TABLE IF NOT EXISTS public.rescissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT,
    termination_date DATE,
    fgts_value NUMERIC DEFAULT 0,
    rescission_value NUMERIC DEFAULT 0,
    type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name TEXT,
    action TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT now(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE
);

-- 11. Payroll Entries
CREATE TABLE IF NOT EXISTS public.payroll_entries (
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    employee_name TEXT,
    store_name TEXT,
    salary NUMERIC,
    absences NUMERIC,
    certificate_days INTEGER,
    deductions NUMERIC,
    net_salary NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated tenants" ON public.tenants FOR ALL USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated profiles" ON public.profiles FOR ALL USING (true);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated stores" ON public.stores FOR ALL USING (true);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated employees" ON public.employees FOR ALL USING (true);

ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated sp" ON public.service_providers FOR ALL USING (true);

ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated benefits" ON public.benefits FOR ALL USING (true);

ALTER TABLE public.employee_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated ep" ON public.employee_benefits FOR ALL USING (true);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated certs" ON public.certificates FOR ALL USING (true);

ALTER TABLE public.rescissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated rescissions" ON public.rescissions FOR ALL USING (true);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated logs" ON public.audit_logs FOR ALL USING (true);

ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated payroll" ON public.payroll_entries FOR ALL USING (true);

-- Also create the storage buckest
INSERT INTO storage.buckets (id, name, public) VALUES ('employee-photos', 'employee-photos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('provider-contracts', 'provider-contracts', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Give public access to photos" ON storage.objects FOR ALL USING (bucket_id = 'employee-photos');
CREATE POLICY "Give public access to certs" ON storage.objects FOR ALL USING (bucket_id = 'certificates');
CREATE POLICY "Give public access to contracts" ON storage.objects FOR ALL USING (bucket_id = 'provider-contracts');
