-- Expand profiles table to include password, permissions, and granular controls
-- This allows synchronization of user management with the database

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '123';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_permissions JSONB DEFAULT '{"ponto": true}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_edit_employees BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_delete_employees BOOLEAN DEFAULT false;

-- Ensure Cristiano has all permissions
-- Note: 'cristiano' is the login/email used in the app, but IDs are UUIDs. 
-- We'll try to find by email if it exists, or the user can run this after creating the user.
UPDATE public.profiles 
SET 
  role = 'superadmin',
  can_edit_employees = true,
  can_delete_employees = true,
  must_change_password = false
WHERE email = 'cristiano';

-- Also ensure 'teste' exists for initial tests if needed
-- INSERT INTO public.profiles (id, email, name, role, tenant_id) 
-- VALUES (gen_random_uuid(), 'teste', 'Usuário Teste', 'tenant', 't1')
-- ON CONFLICT (email) DO NOTHING;
