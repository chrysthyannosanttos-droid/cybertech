-- ============================================================
-- Módulo de Aniversariantes — CyberTech RH
-- ============================================================

-- Tabela de configurações por empresa
CREATE TABLE IF NOT EXISTS public.tenant_birthday_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  send_time TIME NOT NULL DEFAULT '09:00:00',
  channels JSONB NOT NULL DEFAULT '{"email": true, "whatsapp": true}'::jsonb,
  template_email_subject TEXT NOT NULL DEFAULT 'Feliz Aniversário, {{nome}}! 🎂',
  template_email_body TEXT NOT NULL DEFAULT '<p>Olá <strong>{{nome}}</strong>,</p><p>Toda a equipe da <strong>{{company}}</strong> deseja a você um feliz aniversário! 🎉 Que este dia seja especial e repleto de alegria.</p><p>Com carinho,<br>Equipe de RH</p>',
  template_whatsapp TEXT NOT NULL DEFAULT 'Feliz Aniversário, {{nome}}! 🎂🎉 Toda a equipe da {{company}} deseja a você um dia incrível e cheio de alegria! 🥳',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Tabela de log de envios
CREATE TABLE IF NOT EXISTS public.birthday_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL,
  employee_name TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_details TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  birthday_date DATE NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_birthday_logs_tenant_date ON public.birthday_send_logs(tenant_id, birthday_date);
CREATE INDEX IF NOT EXISTS idx_birthday_logs_employee ON public.birthday_send_logs(employee_id, birthday_date);

-- Habilitar RLS
ALTER TABLE public.tenant_birthday_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthday_send_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tenant_birthday_settings
DROP POLICY IF EXISTS "Allow all for tenant_birthday_settings" ON public.tenant_birthday_settings;
CREATE POLICY "Allow all for tenant_birthday_settings" ON public.tenant_birthday_settings FOR ALL USING (true) WITH CHECK (true);

-- Políticas RLS para birthday_send_logs
DROP POLICY IF EXISTS "Allow all for birthday_send_logs" ON public.birthday_send_logs;
CREATE POLICY "Allow all for birthday_send_logs" ON public.birthday_send_logs FOR ALL USING (true) WITH CHECK (true);

-- Adicionar a tabela à replicação em tempo real
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'birthday_send_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.birthday_send_logs;
  END IF;
END $$;
