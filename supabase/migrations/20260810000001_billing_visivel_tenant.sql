-- Assinatura.js (tela do próprio cliente) já espera ler asaas_cobrancas e
-- chamar count_active_users, mas as duas coisas estavam restritas a
-- service_role — o cliente nunca conseguiu ver as próprias faturas nem o
-- plano calculado. Mesmo padrão de bug de GRANT/RLS ausente já visto em
-- product_categories/contact_list_options/oportunidade_etapa_historico.

-- asaas_cobrancas: cliente só enxerga as cobranças do próprio tenant.
-- Escrita continua exclusiva do service_role (webhook do Asaas).
DROP POLICY IF EXISTS "tenant_view_own_cobrancas" ON public.asaas_cobrancas;
CREATE POLICY "tenant_view_own_cobrancas" ON public.asaas_cobrancas
  FOR SELECT USING (tenant_id = public.my_tenant_id());

GRANT SELECT ON public.asaas_cobrancas TO authenticated;

-- count_active_users(p_tenant_id) não validava que o tenant informado era o
-- do próprio chamador — dar EXECUTE pra authenticated como estava permitiria
-- qualquer usuário logado descobrir a contagem de usuários ativos de
-- QUALQUER outro tenant, só passando o UUID. Redefinida pra bloquear isso
-- quando quem chama é um usuário comum (role authenticated), mas manter o
-- parâmetro livre pra chamadas internas (triggers, backfill, service_role —
-- ex: o gatilho de histórico de plano em 20260810000002 precisa contar
-- usuários de um tenant que não é necessariamente o do "chamador").
CREATE OR REPLACE FUNCTION public.count_active_users(p_tenant_id uuid)
RETURNS int
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND p_tenant_id IS DISTINCT FROM public.my_tenant_id() THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  RETURN (SELECT COUNT(*)::int FROM public.profiles WHERE tenant_id = p_tenant_id AND status = 'active');
END;
$$;

-- Funções usadas pela própria tela do cliente para calcular o plano atual.
GRANT EXECUTE ON FUNCTION public.count_active_users(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_plan(int) TO authenticated;

NOTIFY pgrst, 'reload schema';
