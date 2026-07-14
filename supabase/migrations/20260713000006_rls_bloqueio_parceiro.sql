-- Fecha o gap de segurança do papel 'parceiro' (Contato Canal): o bloqueio de rota
-- do React só protege a UI, não a API. Aqui adicionamos políticas RESTRICTIVE
-- (somam com AND às políticas existentes, não substituem nada) pra realmente
-- negar acesso a tabelas que o parceiro não deveria tocar de jeito nenhum.
--
-- Verificado antes de aplicar: products, perfis_acesso, form_layouts e
-- tenant_branches ficam de fora porque são lidos por telas que o parceiro
-- legitimamente acessa (Pipeline, Documentos, Playbooks) ou pelo próprio
-- sistema de permissões.

-- ─── Bloqueio total ─────────────────────────────────────────────────────────
CREATE POLICY "payments: block_parceiro" ON public.payments
  AS RESTRICTIVE FOR ALL USING (public.my_role() <> 'parceiro');

CREATE POLICY "projects: block_parceiro" ON public.projects
  AS RESTRICTIVE FOR ALL USING (public.my_role() <> 'parceiro');

CREATE POLICY "project_tasks: block_parceiro" ON public.project_tasks
  AS RESTRICTIVE FOR ALL USING (public.my_role() <> 'parceiro');

CREATE POLICY "time_logs: block_parceiro" ON public.time_logs
  AS RESTRICTIVE FOR ALL USING (public.my_role() <> 'parceiro');

CREATE POLICY "customer_health: block_parceiro" ON public.customer_health
  AS RESTRICTIVE FOR ALL USING (public.my_role() <> 'parceiro');

CREATE POLICY "equipes: block_parceiro" ON public.equipes
  AS RESTRICTIVE FOR ALL USING (public.my_role() <> 'parceiro');

CREATE POLICY "tabela_precos: block_parceiro" ON public.tabela_precos
  AS RESTRICTIVE FOR ALL USING (public.my_role() <> 'parceiro');

CREATE POLICY "integracoes: block_parceiro" ON public.integracoes
  AS RESTRICTIVE FOR ALL USING (public.my_role() <> 'parceiro');

CREATE POLICY "alert_rules: block_parceiro" ON public.alert_rules
  AS RESTRICTIVE FOR ALL USING (public.my_role() <> 'parceiro');

-- ─── Bloqueio parcial: sellers ──────────────────────────────────────────────
-- Parceiro precisa continuar lendo a própria linha (usado pra resolver o funil
-- travado dele em Pipeline.js), mas não a lista inteira nem pode escrever.
CREATE POLICY "sellers: block_parceiro_select" ON public.sellers
  AS RESTRICTIVE FOR SELECT
  USING (
    public.my_role() <> 'parceiro'
    OR id = (SELECT contact_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "sellers: block_parceiro_insert" ON public.sellers
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (public.my_role() <> 'parceiro');

CREATE POLICY "sellers: block_parceiro_update" ON public.sellers
  AS RESTRICTIVE FOR UPDATE
  USING (public.my_role() <> 'parceiro')
  WITH CHECK (public.my_role() <> 'parceiro');

CREATE POLICY "sellers: block_parceiro_delete" ON public.sellers
  AS RESTRICTIVE FOR DELETE
  USING (public.my_role() <> 'parceiro');
