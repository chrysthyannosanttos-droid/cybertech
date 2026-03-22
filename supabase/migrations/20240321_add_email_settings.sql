-- Create tenant_email_settings table
CREATE TABLE IF NOT EXISTS public.tenant_email_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_user TEXT NOT NULL,
    smtp_pass TEXT NOT NULL,
    from_name TEXT NOT NULL,
    from_email TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.tenant_email_settings ENABLE ROW LEVEL SECURITY;

-- Simple policies (for MVP, admin only or scoped by tenant)
CREATE POLICY "Allow superadmins to manage all email settings" 
ON public.tenant_email_settings FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tenant_email_settings_updated_at ON public.tenant_email_settings;
CREATE TRIGGER update_tenant_email_settings_updated_at
    BEFORE UPDATE ON public.tenant_email_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
