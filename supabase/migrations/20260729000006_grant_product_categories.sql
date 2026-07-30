-- product_categories foi criada com RLS mas sem GRANT pra authenticated —
-- toda tabela nova recebe GRANT, essa ficou de fora por descuido na
-- migration original (20260714000001). Sem o GRANT, mesmo passando pelas
-- RLS policies o Postgres nega no nível de privilégio da tabela
-- ("permission denied for table product_categories", 42501) — foi a causa
-- real do "salva sem erro" relatado em Produtos (o formulário carrega a
-- categoria via essa tabela; a negação de acesso quebrava o fluxo).
GRANT SELECT, INSERT, UPDATE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;

-- Mesmo descuido encontrado em mais duas tabelas na mesma varredura —
-- corrigido junto já que é a mesma causa raiz.
GRANT SELECT, INSERT, UPDATE ON public.contact_list_options TO authenticated;
GRANT ALL ON public.contact_list_options TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.oportunidade_etapa_historico TO authenticated;
GRANT ALL ON public.oportunidade_etapa_historico TO service_role;
