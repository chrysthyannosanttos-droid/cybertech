-- Fix RLS policies to allow delete operations
-- The app uses anon key without Supabase Auth, so we need permissive policies

-- Drop all restrictive policies that reference auth.jwt() or auth.uid()
-- These fail silently because the app doesn't use Supabase Auth

-- Employees
DROP POLICY IF EXISTS "SuperAdmin full access" ON public.employees;
DROP POLICY IF EXISTS "Tenant isolation" ON public.employees;
DROP POLICY IF EXISTS "Allow all authenticated employees" ON public.employees;
DROP POLICY IF EXISTS "Allow all for now" ON public.employees;
CREATE POLICY "Allow all operations" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- Certificates
DROP POLICY IF EXISTS "SuperAdmin access" ON public.certificates;
DROP POLICY IF EXISTS "Tenant isolation" ON public.certificates;
DROP POLICY IF EXISTS "Allow all authenticated certs" ON public.certificates;
DROP POLICY IF EXISTS "Allow all for now" ON public.certificates;
CREATE POLICY "Allow all operations" ON public.certificates FOR ALL USING (true) WITH CHECK (true);

-- Rescissions
DROP POLICY IF EXISTS "SuperAdmin access" ON public.rescissions;
DROP POLICY IF EXISTS "Tenant isolation" ON public.rescissions;
DROP POLICY IF EXISTS "Allow all authenticated rescissions" ON public.rescissions;
DROP POLICY IF EXISTS "Allow all for now" ON public.rescissions;
CREATE POLICY "Allow all operations" ON public.rescissions FOR ALL USING (true) WITH CHECK (true);

-- Time Entries
DROP POLICY IF EXISTS "SuperAdmin access" ON public.time_entries;
DROP POLICY IF EXISTS "Tenant isolation" ON public.time_entries;
DROP POLICY IF EXISTS "Allow all for now" ON public.time_entries;
CREATE POLICY "Allow all operations" ON public.time_entries FOR ALL USING (true) WITH CHECK (true);

-- Payslips
DROP POLICY IF EXISTS "SuperAdmin access" ON public.payslips;
DROP POLICY IF EXISTS "Tenant isolation" ON public.payslips;
DROP POLICY IF EXISTS "Allow all for now" ON public.payslips;
DROP POLICY IF EXISTS "Allow all authenticated payroll" ON public.payslips;
CREATE POLICY "Allow all operations" ON public.payslips FOR ALL USING (true) WITH CHECK (true);
