-- Adiciona coluna de e-mail na tabela de funcionários
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS email text;

-- Comentário para documentação
COMMENT ON COLUMN public.employees.email IS 'E-mail para contato e notificações do funcionário';
