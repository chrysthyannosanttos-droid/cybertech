-- Add custom_fields column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
