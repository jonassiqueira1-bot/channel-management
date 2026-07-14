-- questionnaire_submissions não tinha coluna nenhuma pra guardar opportunity_id/
-- contact_id/respondente_nome/enviado_em/company_nome — o hook (useQuestionnaires.js)
-- sempre tentou gravar esses campos (mais um `contact_id` que nunca existiu como
-- coluna própria), fazendo TODO insert/update falhar silenciosamente (erro do
-- Postgres void, só logado no console, nunca refletido na UI). Resultado: o
-- questionário parecia salvar (modal fechava, checkboxes ficavam marcados
-- durante a sessão) mas nunca persistia — sumia a cada reload e nunca aparecia
-- na aba Questionários da Oportunidade.
ALTER TABLE public.questionnaire_submissions ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}';

NOTIFY pgrst, 'reload schema';
