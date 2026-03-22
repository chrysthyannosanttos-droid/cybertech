-- Migration: Add work schedule and enhanced ponto digital fields
-- Date: 2026-03-22

-- Add jornada (work schedule) columns to employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS jornada_entrada       TEXT DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS jornada_saida_almoco  TEXT DEFAULT '12:00',
  ADD COLUMN IF NOT EXISTS jornada_retorno_almoco TEXT DEFAULT '13:00',
  ADD COLUMN IF NOT EXISTS jornada_saida         TEXT DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS photo_references      JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS geofence_radius       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS geofence_lat          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geofence_lng          DOUBLE PRECISION;

-- Create or update time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id    TEXT,
  employee_name  TEXT,
  type           TEXT NOT NULL, -- ENTRY, EXIT, INTERVAL_START, INTERVAL_END
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,
  photo_url      TEXT,
  validated      BOOLEAN DEFAULT true,
  tenant_id      TEXT,
  adjusted       BOOLEAN DEFAULT false,
  adjusted_by    TEXT,
  adjustment_reason TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant   ON time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_created  ON time_entries(created_at);

-- RLS
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Allow all authenticated" ON time_entries FOR ALL USING (true);
