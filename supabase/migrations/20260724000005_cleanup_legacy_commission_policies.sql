-- Pendência 2: commission_rules e commission_personas acumularam 3 gerações
-- de policies (rls_<tabela>_select/insert/update/delete → <nome>: view/manage
-- → <tabela>: view/manage) sem nunca limpar as mais antigas. Isso não é só
-- sujeira: como as policies são PERMISSIVE (combinam com OR), as legadas —
-- que só checam tenant_id, sem checar filial (commission_rules) ou papel
-- admin_isv (ambas, no manage) — alargavam o acesso além do que as policies
-- atuais pretendem permitir.
--
-- commission_rules: mantém "commission_rules: view/manage" (respeitam
-- filial) + commission_rules_branch_share_edit + no_hard_delete +
-- soft_delete_filter. Remove rls_commission_rules_* e rules: view/manage.
--
-- commission_personas: mantém "personas: view/manage" (view igual à legada,
-- manage restringe a admin_isv) + soft_delete_filter. Remove
-- rls_personas_* — confirmado que o app só soft-deleta essa tabela
-- (useCommissions.js usa softDeleteMany, nunca DELETE direto), então não
-- sobra nenhuma policy de DELETE depois — comportamento correto (histórico
-- de comissão não deve ser apagado de verdade).
DROP POLICY IF EXISTS rls_commission_rules_select ON public.commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_insert ON public.commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_update ON public.commission_rules;
DROP POLICY IF EXISTS rls_commission_rules_delete ON public.commission_rules;
DROP POLICY IF EXISTS "rules: view"   ON public.commission_rules;
DROP POLICY IF EXISTS "rules: manage" ON public.commission_rules;

DROP POLICY IF EXISTS rls_personas_select ON public.commission_personas;
DROP POLICY IF EXISTS rls_personas_insert ON public.commission_personas;
DROP POLICY IF EXISTS rls_personas_update ON public.commission_personas;
DROP POLICY IF EXISTS rls_personas_delete ON public.commission_personas;
