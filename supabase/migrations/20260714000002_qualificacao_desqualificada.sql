-- Questionários passam a poder desqualificar a oportunidade (opção de
-- resposta marcada como "desqualifica" em qualquer template, não só nos do
-- tipo qualificacao_lead — cobre também Pré-Venda Técnica). Guarda o
-- resultado calculado pra exibir badge/filtro sem recalcular toda hora.
ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS qualificacao_desqualificada boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
