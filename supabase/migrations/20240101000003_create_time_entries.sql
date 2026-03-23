-- Create time_entries table early so RLS policies in 20240321 can apply to it
CREATE TABLE IF NOT EXISTS public.time_entries (
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
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant   ON public.time_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_created  ON public.time_entries(created_at);

-- RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all authenticated" ON public.time_entries FOR ALL USING (true);
