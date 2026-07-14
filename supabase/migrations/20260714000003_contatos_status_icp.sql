-- Contatos: status (cliente/lead/prospect) + nutrição + atributos usados na
-- Análise de Cliente Ideal (departamento, senioridade, poder de decisão).
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS status text DEFAULT 'lead';
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS em_nutricao boolean DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS departamento text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS senioridade text;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS poder_decisao text;

NOTIFY pgrst, 'reload schema';
