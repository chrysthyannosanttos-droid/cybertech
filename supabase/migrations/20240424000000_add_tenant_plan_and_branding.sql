-- Migration: Add plan and white-label branding fields to tenants
-- Date: 2024-04-24

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'BASIC';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}';

-- Optional: Update existing tenants to BASIC plan if needed
UPDATE public.tenants SET plan = 'BASIC' WHERE plan IS NULL;
