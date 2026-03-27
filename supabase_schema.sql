-- Tabela de Funcionários
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  gender CHAR(1),
  birth_date DATE,
  admission_date DATE,
  department TEXT,
  role TEXT,
  status TEXT DEFAULT 'ACTIVE',
  salary NUMERIC,
  tenant_id TEXT,
  store_id TEXT,
  cbo TEXT,
  conta_itau TEXT,
  insalubridade NUMERIC DEFAULT 0,
  periculosidade NUMERIC DEFAULT 0,
  gratificacao NUMERIC DEFAULT 0,
  vale_transporte NUMERIC DEFAULT 0,
  vale_refeicao NUMERIC DEFAULT 0,
  flexivel NUMERIC DEFAULT 0,
  mobilidade NUMERIC DEFAULT 0,
  vale_flexivel NUMERIC DEFAULT 0,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Logs de Auditoria
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Rescisões
CREATE TABLE rescissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  termination_date DATE NOT NULL,
  fgts_value NUMERIC,
  rescission_value NUMERIC,
  type TEXT NOT NULL,
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Atestados
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  date DATE NOT NULL,
  cid TEXT,
  days INTEGER NOT NULL,
  file_url TEXT,
  file_name TEXT,
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Realtime para estas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE rescissions;
ALTER PUBLICATION supabase_realtime ADD TABLE certificates;

-- Permissões básicas
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rescissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON employees FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON rescissions FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON certificates FOR ALL USING (true);

-- Tabela de Registros de Ponto
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  type TEXT NOT NULL, -- 'ENTRY', 'EXIT', 'INTERVAL_START', 'INTERVAL_END'
  timestamp TIMESTAMPTZ DEFAULT now(),
  latitude NUMERIC,
  longitude NUMERIC,
  photo_url TEXT,
  status TEXT DEFAULT 'PENDING',
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Holerites
CREATE TABLE payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  gross_salary NUMERIC,
  net_salary NUMERIC,
  status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'SENT', 'SIGNED'
  signed_at TIMESTAMPTZ,
  signature_ip TEXT,
  signature_method TEXT, -- 'PIN', 'CANVAS', 'LOGIN'
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Itens do Holerite
CREATE TABLE payslip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID REFERENCES payslips(id) ON DELETE CASCADE,
  code INTEGER,
  description TEXT,
  type TEXT, -- 'EARNING', 'DEDUCTION'
  amount NUMERIC,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Eventos eSocial
CREATE TABLE esocial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT, -- 'S-1000', 'S-1200', etc
  status TEXT DEFAULT 'PENDING',
  xml_content TEXT,
  response_log TEXT,
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE payslips;

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE payslip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE esocial_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON time_entries FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON payslips FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON payslip_items FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON esocial_events FOR ALL USING (true);

-- Tabela de Perfis de Usuário
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'tenant', -- 'superadmin' ou 'tenant'
  tenant_id TEXT,
  permissions JSONB DEFAULT '[]',
  app_permissions JSONB DEFAULT '{"ponto": true}',
  must_change_password BOOLEAN DEFAULT true,
  can_edit_employees BOOLEAN DEFAULT true,
  can_delete_employees BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Documentos de Funcionários
CREATE TABLE employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT, -- 'RG', 'CPF', 'Contrato', 'Outros'
  file_url TEXT NOT NULL,
  file_type TEXT,
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON profiles FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON employee_documents FOR ALL USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE employee_documents;
