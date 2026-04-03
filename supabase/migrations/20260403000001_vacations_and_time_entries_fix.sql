-- ============================================================
-- Migration: Férias + Fix time_entries + attendance_devices
-- CyberTech RH | 2026-04-03
-- ============================================================

-- 1. Cria tabela attendance_devices (se não existir)
CREATE TABLE IF NOT EXISTS public.attendance_devices (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  ip_address  TEXT,
  port        INTEGER DEFAULT 80,
  model       TEXT DEFAULT 'Generic ZKTeco',
  status      TEXT DEFAULT 'ACTIVE',
  last_sync   TIMESTAMPTZ,
  tenant_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_att_devices_tenant ON public.attendance_devices(tenant_id);

-- RLS
ALTER TABLE public.attendance_devices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attendance_devices' AND policyname = 'Allow all attendance_devices'
  ) THEN
    CREATE POLICY "Allow all attendance_devices" ON public.attendance_devices FOR ALL USING (true);
  END IF;
END $$;

-- 2. Adiciona colunas faltantes na time_entries (se não existirem)
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SYNCED';
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS device_id UUID;
ALTER TABLE public.time_entries ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();

-- 3. Cria tabela de férias
CREATE TABLE IF NOT EXISTS public.vacations (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id               UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  employee_name             TEXT,
  tenant_id                 TEXT,
  -- Período
  acquisition_start         DATE,
  acquisition_end           DATE,
  vacation_start            DATE,
  vacation_end              DATE,
  -- Parâmetros
  vacation_days             INTEGER DEFAULT 30,
  sell_bonus                BOOLEAN DEFAULT false,
  -- Resultados CLT
  vacation_pay              NUMERIC,
  one_third                 NUMERIC,
  bonus_pay                 NUMERIC,
  gross_total               NUMERIC,
  inss_deduction            NUMERIC,
  irrf_deduction            NUMERIC,
  net_total                 NUMERIC,
  -- Status
  status                    TEXT DEFAULT 'PENDENTE', -- PENDENTE, PAGO, CANCELADO
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vacations_employee ON public.vacations(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacations_tenant ON public.vacations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON public.vacations(status);

-- RLS
ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vacations' AND policyname = 'Allow all vacations'
  ) THEN
    CREATE POLICY "Allow all vacations" ON public.vacations FOR ALL USING (true);
  END IF;
END $$;

-- 4. Adiciona campo fgts_balance e aviso_previo_dias em rescissions
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS fgts_balance NUMERIC DEFAULT 0;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS notice_days INTEGER DEFAULT 30;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS notice_worked BOOLEAN DEFAULT false;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS has_vested_vacation BOOLEAN DEFAULT false;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS gross_value NUMERIC DEFAULT 0;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS inss_deduction NUMERIC DEFAULT 0;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS irrf_deduction NUMERIC DEFAULT 0;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS last_salary NUMERIC DEFAULT 0;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS hazard_pay NUMERIC DEFAULT 0;
ALTER TABLE public.rescissions ADD COLUMN IF NOT EXISTS unhealthy_pay NUMERIC DEFAULT 0;

-- 5. Habilita Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vacations;
