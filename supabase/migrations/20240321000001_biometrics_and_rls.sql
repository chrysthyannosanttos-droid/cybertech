-- 1. Add photo_reference_url to employees for Biometrics
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS photo_reference_url TEXT;

-- 2. Secure RLS Policies for Multi-tenancy
-- Note: Using a helper function to identify if user is Cristiano or SuperAdmin
-- In a real scenario, we'd use JWT claims, but here we'll use a simple check

-- Employees
DROP POLICY IF EXISTS "Allow all for now" ON public.employees;
CREATE POLICY "SuperAdmin full access" ON public.employees FOR ALL USING (
  auth.jwt() ->> 'email' IN ('cristiano', 'teste') OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);
CREATE POLICY "Tenant isolation" ON public.employees FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Certificates
DROP POLICY IF EXISTS "Allow all for now" ON public.certificates;
CREATE POLICY "SuperAdmin access" ON public.certificates FOR ALL USING (
  auth.jwt() ->> 'email' IN ('cristiano', 'teste') OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);
CREATE POLICY "Tenant isolation" ON public.certificates FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Time Entries
DROP POLICY IF EXISTS "Allow all for now" ON public.time_entries;
CREATE POLICY "SuperAdmin access" ON public.time_entries FOR ALL USING (
  auth.jwt() ->> 'email' IN ('cristiano', 'teste') OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);
CREATE POLICY "Tenant isolation" ON public.time_entries FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Payslips
DROP POLICY IF EXISTS "Allow all for now" ON public.payslips;
CREATE POLICY "SuperAdmin access" ON public.payslips FOR ALL USING (
  auth.jwt() ->> 'email' IN ('cristiano', 'teste') OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);
CREATE POLICY "Tenant isolation" ON public.payslips FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);

-- Rescissions
DROP POLICY IF EXISTS "Allow all for now" ON public.rescissions;
CREATE POLICY "SuperAdmin access" ON public.rescissions FOR ALL USING (
  auth.jwt() ->> 'email' IN ('cristiano', 'teste') OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
);
CREATE POLICY "Tenant isolation" ON public.rescissions FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
);
