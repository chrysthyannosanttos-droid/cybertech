-- SCRIPT DE CONFIGURAÇÃO PARA BANCO DE TESTES (SUPABASE)
-- Copie e cole este script no SQL Editor do seu novo projeto Supabase.

-- 1. TIPOS E ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('superadmin', 'tenant');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABELAS PRINCIPAIS
CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT,
    subscription JSONB,
    employee_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'tenant',
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    password TEXT,
    app_permissions JSONB DEFAULT '{"ponto": true}',
    permissions JSONB,
    must_change_password BOOLEAN DEFAULT false,
    can_edit_employees BOOLEAN DEFAULT true,
    can_delete_employees BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cnpj TEXT,
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id TEXT REFERENCES public.stores(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    cpf TEXT UNIQUE NOT NULL,
    email TEXT,
    gender TEXT,
    birth_date DATE,
    admission_date DATE,
    department TEXT,
    role TEXT,
    status TEXT DEFAULT 'ACTIVE',
    salary NUMERIC DEFAULT 0,
    cbo TEXT,
    photo_reference_url TEXT,
    photo_references TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

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

-- 3. POLÍTICAS DE SEGURANÇA (RLS)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON public.tenants FOR ALL USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON public.profiles FOR ALL USING (true);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON public.employees FOR ALL USING (true);

-- 4. DADOS INICIAIS (TENANT DE TESTE E ADMIN)
INSERT INTO public.tenants (id, name) VALUES ('t1', 'Empresa de Teste') ON CONFLICT DO NOTHING;

INSERT INTO public.profiles (email, password, name, role, tenant_id) 
VALUES ('admin@teste.com', '123', 'Administrador de Teste', 'superadmin', 't1')
ON CONFLICT (email) DO NOTHING;

-- 5. BUCKETS DE STORAGE
-- Nota: Buckets devem ser criados via interface do Supabase ou via API.
-- Buckets recomendados: 'employee-photos', 'certificates', 'provider-contracts'.
