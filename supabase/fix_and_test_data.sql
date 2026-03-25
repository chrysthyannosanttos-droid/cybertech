-- Script para Corrigir o Banco de Dados e Adicionar Dados de Teste
-- Execute este script no SQL Editor do seu Dashboard do Supabase

-- 1. Corrigir Schema da tabela employees (Adicionar colunas faltantes)
-- O erro "Could not find column conta_itau" indica que estas colunas não foram criadas.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS conta_itau TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS vale_flexivel NUMERIC DEFAULT 0;

-- 2. Inserir Empresa de Teste
INSERT INTO public.tenants (id, name, cnpj)
VALUES ('empresa-teste-01', 'Empresa de Teste LTDA', '12.345.678/0001-99')
ON CONFLICT (id) DO NOTHING;

-- 3. Inserir Lojas de Teste vinculadas à empresa
INSERT INTO public.stores (id, name, cnpj, tenant_id)
VALUES 
    ('loja-centro-01', 'Loja Centro - Filial 1', '12.345.678/0002-01', 'empresa-teste-01'),
    ('loja-shopping-01', 'Loja Shopping - Filial 2', '12.345.678/0003-02', 'empresa-teste-01'),
    ('loja-norte-01', 'Loja Norte - Filial 3', '12.345.678/0004-03', 'empresa-teste-01')
ON CONFLICT (id) DO NOTHING;

-- 4. Criar um funcionário de teste para esta nova empresa (opcional para teste do Ponto Digital)
INSERT INTO public.employees (id, tenant_id, store_id, name, cpf, role, status, salary)
VALUES (
    gen_random_uuid(), 
    'empresa-teste-01', 
    'loja-centro-01', 
    'FUNCIONÁRIO TESTE 01', 
    '111.111.111-11', 
    'VENDEDOR', 
    'ACTIVE', 
    2500
)
ON CONFLICT (cpf) DO NOTHING;
