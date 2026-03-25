-- MIGRATION: Ponto Digital 2.0 (Avançado)
-- Autor: Antigravity
-- Data: 2026-03-24

-- 1. Tabela: biometria_funcionario
-- Armazena os embeddings faciais para comparação rápida sem re-processar fotos
CREATE TABLE IF NOT EXISTS public.biometria_funcionario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    face_embedding JSONB NOT NULL, -- Array de floats do face-api.js
    biometria_ativa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela: jornadas
-- Define o horário padrão de trabalho de cada funcionário
CREATE TABLE IF NOT EXISTS public.jornadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    hora_entrada TIME NOT NULL DEFAULT '08:00',
    hora_saida TIME NOT NULL DEFAULT '17:00',
    intervalo_inicio TIME NOT NULL DEFAULT '12:00',
    intervalo_fim TIME NOT NULL DEFAULT '13:00',
    carga_horaria INTERVAL NOT NULL DEFAULT '8 hours',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela: pontos
-- Registro de cada ocorrência de bater ponto
CREATE TABLE IF NOT EXISTS public.pontos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    funcionario_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('ENTRY', 'EXIT', 'INTERVAL_START', 'INTERVAL_END', 'ADJUSTMENT')),
    data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    foto_url TEXT,
    confianca_facial NUMERIC(5, 2), -- Score retornado pelo face-api (0-100)
    dispositivo TEXT, -- ex: "iPhone 13 - Chrome"
    offline_sync BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS (Row Level Security)
ALTER TABLE public.biometria_funcionario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontos ENABLE ROW LEVEL SECURITY;

-- Políticas simplificadas para permitir acesso total (ajustar conforme necessário)
CREATE POLICY "Allow all biometria" ON public.biometria_funcionario FOR ALL USING (true);
CREATE POLICY "Allow all jornadas" ON public.jornadas FOR ALL USING (true);
CREATE POLICY "Allow all pontos" ON public.pontos FOR ALL USING (true);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_pontos_funcionario ON public.pontos(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_pontos_data ON public.pontos(data_hora);
CREATE INDEX IF NOT EXISTS idx_jornadas_funcionario ON public.jornadas(funcionario_id);
