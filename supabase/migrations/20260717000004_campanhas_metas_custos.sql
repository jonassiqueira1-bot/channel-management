-- Metas (comparadas ao realizado num relatório de performance) e Custos
-- (mesmo padrão de Ações — descrição/previsto/realizado/aprovação) em Campanhas.
-- `meta` já existia (numeric, nunca usado no form) — reaproveitado como
-- Meta de Valor (R$); meta_oportunidades é novo (qtd. de oportunidades-alvo).
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS meta_oportunidades integer DEFAULT 0;
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS custos jsonb DEFAULT '[]';

NOTIFY pgrst, 'reload schema';
