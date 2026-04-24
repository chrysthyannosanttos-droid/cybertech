-- Adiciona o campo de telefone aos funcionários
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adiciona campos de rastreamento de envio aos holerites
ALTER TABLE public.payrolls
ADD COLUMN IF NOT EXISTS sent_whatsapp_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_email_at TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN public.employees.phone IS 'Telefone/WhatsApp do colaborador para envio de holerite';
COMMENT ON COLUMN public.payrolls.sent_whatsapp_at IS 'Data/hora do último envio via WhatsApp';
COMMENT ON COLUMN public.payrolls.sent_email_at IS 'Data/hora do último envio via E-mail';
