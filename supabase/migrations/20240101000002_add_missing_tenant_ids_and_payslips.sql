-- Add missing tenant_id to certificates
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add missing tenant_id to rescissions
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Rename payroll_entries to payslips (as referenced in 20240321_biometrics_and_rls)
ALTER TABLE public.payroll_entries RENAME TO payslips;

-- Add tenant_id to payslips
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE;
