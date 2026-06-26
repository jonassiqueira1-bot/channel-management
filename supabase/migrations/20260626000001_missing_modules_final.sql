-- ============================================================
-- MIGRATION FINAL — Módulos ausentes + RLS correto
-- Converte tabelas criadas com text PKs para uuid e aplica
-- RLS no padrão my_tenant_id() / my_role().
-- Totalmente idempotente (CREATE ... IF NOT EXISTS, DROP POLICY IF EXISTS).
-- Data: 2026-06-26
-- ============================================================

-- ─── 1. AUDIT LOGS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  timestamp    timestamptz NOT NULL DEFAULT now(),
  usuario_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  usuario_nome text,
  acao         text        NOT NULL,
  entidade     text        NOT NULL,
  entidade_id  text,
  descricao    text,
  antes        jsonb,
  depois       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant    ON public.audit_logs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entidade  ON public.audit_logs (entidade);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts        ON public.audit_logs (timestamp DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs: view"   ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs: insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select"  ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert"  ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_update"  ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete"  ON public.audit_logs;
CREATE POLICY "audit_logs: view"   ON public.audit_logs
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "audit_logs: insert" ON public.audit_logs
  FOR INSERT WITH CHECK (tenant_id = public.my_tenant_id());

-- ─── 2. CUSTOMER HEALTH ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_health (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id       uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  company_id      uuid        REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name    text,
  company_city    text,
  company_uf      text,
  csm             text,
  laer_stage      text,
  touch_model     text,
  health_score    int         DEFAULT 0,
  renewal_date    date,
  notes           text,
  action_plans    jsonb       DEFAULT '[]',
  checkins        jsonb       DEFAULT '[]',
  attachments     jsonb       DEFAULT '[]',
  contract_id     uuid        REFERENCES public.contracts(id) ON DELETE SET NULL,
  contract_numero text,
  criado_em       date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customer_health_tenant  ON public.customer_health (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_company ON public.customer_health (company_id);

ALTER TABLE public.customer_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_health: view"   ON public.customer_health;
DROP POLICY IF EXISTS "customer_health: manage" ON public.customer_health;
DROP POLICY IF EXISTS "customer_health_select"  ON public.customer_health;
DROP POLICY IF EXISTS "customer_health_insert"  ON public.customer_health;
DROP POLICY IF EXISTS "customer_health_update"  ON public.customer_health;
DROP POLICY IF EXISTS "customer_health_delete"  ON public.customer_health;
CREATE POLICY "customer_health: view"   ON public.customer_health
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "customer_health: manage" ON public.customer_health
  FOR ALL    USING (tenant_id = public.my_tenant_id());

-- ─── 3. FECHAMENTO DE HORAS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fechamentos_horas (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  periodo     text        NOT NULL,   -- 'YYYY-MM'
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name   text        NOT NULL,
  status      text        NOT NULL DEFAULT 'aberto',
  log_ids     jsonb       DEFAULT '[]',
  horas_total numeric     DEFAULT 0,
  enviado_em  date,
  aprovado_em date,
  rejeitado_em date,
  obs         text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, periodo, user_name)
);
CREATE INDEX IF NOT EXISTS idx_fechamentos_tenant_periodo ON public.fechamentos_horas (tenant_id, periodo);

ALTER TABLE public.fechamentos_horas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fechamentos_horas: view"   ON public.fechamentos_horas;
DROP POLICY IF EXISTS "fechamentos_horas: manage" ON public.fechamentos_horas;
DROP POLICY IF EXISTS "fechamentos_horas_select"  ON public.fechamentos_horas;
DROP POLICY IF EXISTS "fechamentos_horas_insert"  ON public.fechamentos_horas;
DROP POLICY IF EXISTS "fechamentos_horas_update"  ON public.fechamentos_horas;
DROP POLICY IF EXISTS "fechamentos_horas_delete"  ON public.fechamentos_horas;
CREATE POLICY "fechamentos_horas: view"   ON public.fechamentos_horas
  FOR SELECT USING (tenant_id = public.my_tenant_id() AND (user_id = auth.uid() OR public.my_role() = 'admin_isv'));
CREATE POLICY "fechamentos_horas: manage" ON public.fechamentos_horas
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND (user_id = auth.uid() OR public.my_role() = 'admin_isv'));

-- ─── 4. APROVAÇÕES DE COMISSÕES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commission_approvals (
  id                uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid      NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id         uuid      REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  periodo           text      NOT NULL,
  beneficiario_nome text      NOT NULL,
  status            text      NOT NULL DEFAULT 'aberto',
  total_valor       numeric   DEFAULT 0,
  payment_ids       jsonb     DEFAULT '[]',
  enviado_em        date,
  aprovado_em       date,
  rejeitado_em      date,
  obs               text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, periodo, beneficiario_nome)
);
CREATE INDEX IF NOT EXISTS idx_commission_approvals_tenant ON public.commission_approvals (tenant_id, periodo);

ALTER TABLE public.commission_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commission_approvals: view"   ON public.commission_approvals;
DROP POLICY IF EXISTS "commission_approvals: manage" ON public.commission_approvals;
DROP POLICY IF EXISTS "commission_approvals_select"  ON public.commission_approvals;
DROP POLICY IF EXISTS "commission_approvals_insert"  ON public.commission_approvals;
DROP POLICY IF EXISTS "commission_approvals_update"  ON public.commission_approvals;
DROP POLICY IF EXISTS "commission_approvals_delete"  ON public.commission_approvals;
CREATE POLICY "commission_approvals: view"   ON public.commission_approvals
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "commission_approvals: manage" ON public.commission_approvals
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 5. HABILITAÇÕES ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.habilitacoes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  nome        text        NOT NULL,
  situacao    text        NOT NULL DEFAULT 'ativo',
  produto_id  uuid        REFERENCES public.products(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_habilitacoes_tenant ON public.habilitacoes (tenant_id);

ALTER TABLE public.habilitacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "habilitacoes: view"   ON public.habilitacoes;
DROP POLICY IF EXISTS "habilitacoes: manage" ON public.habilitacoes;
DROP POLICY IF EXISTS "habilitacoes_select"  ON public.habilitacoes;
DROP POLICY IF EXISTS "habilitacoes_insert"  ON public.habilitacoes;
DROP POLICY IF EXISTS "habilitacoes_update"  ON public.habilitacoes;
DROP POLICY IF EXISTS "habilitacoes_delete"  ON public.habilitacoes;
CREATE POLICY "habilitacoes: view"   ON public.habilitacoes
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "habilitacoes: manage" ON public.habilitacoes
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 6. TIPOS DE AÇÃO ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tipos_acao (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label      text        NOT NULL,
  slug       text,
  icon       text,
  color      text,
  bg         text,
  text_color text,
  criado_em  date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_tipos_acao_tenant ON public.tipos_acao (tenant_id);

ALTER TABLE public.tipos_acao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tipos_acao: view"   ON public.tipos_acao;
DROP POLICY IF EXISTS "tipos_acao: manage" ON public.tipos_acao;
DROP POLICY IF EXISTS "tipos_acao_select"  ON public.tipos_acao;
DROP POLICY IF EXISTS "tipos_acao_insert"  ON public.tipos_acao;
DROP POLICY IF EXISTS "tipos_acao_update"  ON public.tipos_acao;
DROP POLICY IF EXISTS "tipos_acao_delete"  ON public.tipos_acao;
CREATE POLICY "tipos_acao: view"   ON public.tipos_acao
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "tipos_acao: manage" ON public.tipos_acao
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 7. CAMPANHAS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.campanhas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id     uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  nome          text        NOT NULL,
  tipo          text,
  status        text        DEFAULT 'rascunho',
  inicio        date,
  fim           date,
  objetivo      text,
  meta          numeric     DEFAULT 0,
  descricao     text,
  produtos      jsonb       DEFAULT '[]',
  participantes jsonb       DEFAULT '[]',
  pontua_metas  boolean     DEFAULT false,
  extra         jsonb       DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campanhas_tenant ON public.campanhas (tenant_id);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON public.campanhas (tenant_id, status);

ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "campanhas: view"   ON public.campanhas;
DROP POLICY IF EXISTS "campanhas: manage" ON public.campanhas;
DROP POLICY IF EXISTS "campanhas_select"  ON public.campanhas;
DROP POLICY IF EXISTS "campanhas_insert"  ON public.campanhas;
DROP POLICY IF EXISTS "campanhas_update"  ON public.campanhas;
DROP POLICY IF EXISTS "campanhas_delete"  ON public.campanhas;
CREATE POLICY "campanhas: view"   ON public.campanhas
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "campanhas: manage" ON public.campanhas
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 8. PARCEIROS / UNIDADES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parceiros (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome            text        NOT NULL,
  classificacao   text        DEFAULT 'franquia',
  tipo_parceiro   text,
  franquia_id     uuid        REFERENCES public.parceiros(id) ON DELETE SET NULL,
  codigo          text,
  cnpj            text,
  email           text,
  telefone        text,
  responsavel     text,
  cidade          text,
  uf              text,
  status          text        DEFAULT 'ativo',
  extra           jsonb       DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parceiros_tenant   ON public.parceiros (tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_franquia ON public.parceiros (franquia_id);

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parceiros: view"   ON public.parceiros;
DROP POLICY IF EXISTS "parceiros: manage" ON public.parceiros;
DROP POLICY IF EXISTS "parceiros_select"  ON public.parceiros;
DROP POLICY IF EXISTS "parceiros_insert"  ON public.parceiros;
DROP POLICY IF EXISTS "parceiros_update"  ON public.parceiros;
DROP POLICY IF EXISTS "parceiros_delete"  ON public.parceiros;
CREATE POLICY "parceiros: view"   ON public.parceiros
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "parceiros: manage" ON public.parceiros
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 9. PERFIS DE ACESSO ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.perfis_acesso (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  slug          text,
  nome          text        NOT NULL,
  nativo        boolean     DEFAULT false,
  cor           text,
  icon          text,
  descricao     text,
  franquia_ids  jsonb       DEFAULT '[]',
  permissions   jsonb       DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_perfis_acesso_tenant ON public.perfis_acesso (tenant_id);

ALTER TABLE public.perfis_acesso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "perfis_acesso: view"   ON public.perfis_acesso;
DROP POLICY IF EXISTS "perfis_acesso: manage" ON public.perfis_acesso;
DROP POLICY IF EXISTS "perfis_acesso_select"  ON public.perfis_acesso;
DROP POLICY IF EXISTS "perfis_acesso_insert"  ON public.perfis_acesso;
DROP POLICY IF EXISTS "perfis_acesso_update"  ON public.perfis_acesso;
DROP POLICY IF EXISTS "perfis_acesso_delete"  ON public.perfis_acesso;
CREATE POLICY "perfis_acesso: view"   ON public.perfis_acesso
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "perfis_acesso: manage" ON public.perfis_acesso
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 10. EQUIPES ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.equipes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id   uuid        REFERENCES public.tenant_branches(id) ON DELETE SET NULL,
  nome        text        NOT NULL,
  descricao   text,
  lider_id    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  membro_ids  jsonb       DEFAULT '[]',
  cor         text        DEFAULT '#6366f1',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_equipes_tenant ON public.equipes (tenant_id);

ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipes: view"   ON public.equipes;
DROP POLICY IF EXISTS "equipes: manage" ON public.equipes;
CREATE POLICY "equipes: view"   ON public.equipes
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "equipes: manage" ON public.equipes
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 11. INDICADORES (KPIs) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.indicadores (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        text        NOT NULL,
  descricao   text,
  unidade     text,
  formula     text,
  categoria   text,
  status      text        DEFAULT 'ativo',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_indicadores_tenant ON public.indicadores (tenant_id);

ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indicadores: view"   ON public.indicadores;
DROP POLICY IF EXISTS "indicadores: manage" ON public.indicadores;
CREATE POLICY "indicadores: view"   ON public.indicadores
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "indicadores: manage" ON public.indicadores
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 12. METAS / KPIs ────────────────────────────────────────────────────────
-- (goals já existe via 20260621000001 — esta tabela é para metas_kpi da tela Settings)
CREATE TABLE IF NOT EXISTS public.metas_kpi (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  indicador_id    uuid        REFERENCES public.indicadores(id) ON DELETE SET NULL,
  nome            text        NOT NULL,
  alvo            numeric,
  periodo_mes     int,
  periodo_ano     int,
  alvo_tipo       text,
  alvo_id         text,
  status          text        DEFAULT 'ativa',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metas_kpi_tenant ON public.metas_kpi (tenant_id);

ALTER TABLE public.metas_kpi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "metas_kpi: view"   ON public.metas_kpi;
DROP POLICY IF EXISTS "metas_kpi: manage" ON public.metas_kpi;
CREATE POLICY "metas_kpi: view"   ON public.metas_kpi
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "metas_kpi: manage" ON public.metas_kpi
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 13. COMPARTILHAMENTO ENTRE FILIAIS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compartilhamento_regras (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  descricao    text,
  filial_ids   jsonb       NOT NULL DEFAULT '[]',  -- UUIDs das filiais (parceiros)
  modulos      jsonb       NOT NULL DEFAULT '[]',  -- chaves dos módulos compartilhados
  permissao    text        NOT NULL DEFAULT 'leitura' CHECK (permissao IN ('leitura','leitura_escrita')),
  acesso       text        NOT NULL DEFAULT 'todos' CHECK (acesso IN ('todos','perfis','usuarios')),
  perfil_ids   jsonb       DEFAULT '[]',
  usuario_ids  jsonb       DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compartilhamento_tenant ON public.compartilhamento_regras (tenant_id);

ALTER TABLE public.compartilhamento_regras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "compartilhamento: view"   ON public.compartilhamento_regras;
DROP POLICY IF EXISTS "compartilhamento: manage" ON public.compartilhamento_regras;
CREATE POLICY "compartilhamento: view"   ON public.compartilhamento_regras
  FOR SELECT USING (tenant_id = public.my_tenant_id());
CREATE POLICY "compartilhamento: manage" ON public.compartilhamento_regras
  FOR ALL    USING (tenant_id = public.my_tenant_id() AND public.my_role() = 'admin_isv');

-- ─── 14. COLUNAS EXTRAS EM PROFILES ─────────────────────────────────────────
-- (idem ao supabase_migration.sql, mas idempotente)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS perfis_acesso_ids   jsonb   DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS regras_comissao_ids jsonb   DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS senioridade         text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tipo_recurso        text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS billing_rate        numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custo_hora          numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS horas_semana        int     DEFAULT 40;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS habilidades         jsonb   DEFAULT '[]';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin_url        text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp            text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS franquia_id         uuid    REFERENCES public.parceiros(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS branch_ids          jsonb   DEFAULT '[]';

-- ─── 15. TRIGGERS updated_at ─────────────────────────────────────────────────
-- Garante que todos os módulos novos têm o trigger de updated_at

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.customer_health'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customer_health
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.fechamentos_horas'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.fechamentos_horas
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.commission_approvals'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.commission_approvals
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.habilitacoes'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.habilitacoes
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.campanhas'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.campanhas
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.parceiros'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.parceiros
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.perfis_acesso'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.perfis_acesso
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.equipes'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.equipes
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.indicadores'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.indicadores
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.metas_kpi'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.metas_kpi
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'public.compartilhamento_regras'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.compartilhamento_regras
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ─── VERIFICAÇÃO ──────────────────────────────────────────────────────────────
-- Rode após aplicar para confirmar que todas as tabelas existem e têm RLS:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'audit_logs','customer_health','fechamentos_horas','commission_approvals',
--     'habilitacoes','tipos_acao','campanhas','parceiros','perfis_acesso',
--     'equipes','indicadores','metas_kpi','compartilhamento_regras'
--   )
-- ORDER BY tablename;
--
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'audit_logs','customer_health','fechamentos_horas','commission_approvals',
--     'habilitacoes','tipos_acao','campanhas','parceiros','perfis_acesso',
--     'equipes','indicadores','metas_kpi','compartilhamento_regras'
--   )
-- ORDER BY tablename, policyname;
