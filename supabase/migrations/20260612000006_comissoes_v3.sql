-- ─── Comissões v3 — regras individuais, tipos compostos, personas customizáveis ──
-- Mudanças:
--   1. Escopo individual: regra pode ser vinculada a um beneficiário específico
--   2. Tipos de cálculo compostos: array JSONB substitui a coluna texto único
--   3. Contexto: campo livre para descrever o "porquê" da regra
--   4. Elegibilidade aberta: condition builder (entidade + campo + operador + valor)
--   5. Personas customizáveis: nova tabela commission_personas por tenant

-- ─── 1. Personas por tenant ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commission_personas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug       text NOT NULL,                -- identificador interno: 'interno', 'externo', etc.
  label      text NOT NULL,               -- rótulo exibido: 'Interno', 'Inside Sales Sênior'
  descricao  text,
  cor        text NOT NULL DEFAULT '#6366F1', -- hex
  ordem      integer NOT NULL DEFAULT 0,
  ativo      boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, slug)
);

ALTER TABLE commission_personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_personas_all ON commission_personas
  USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid());

-- ─── 2. Novos campos em commission_rules ──────────────────────────────────────
ALTER TABLE commission_rules
  -- Escopo: global (todos os matching) ou individual (pessoa específica)
  ADD COLUMN IF NOT EXISTS escopo text NOT NULL DEFAULT 'global'
    CHECK (escopo IN ('global','individual')),
  ADD COLUMN IF NOT EXISTS beneficiario_id   uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS beneficiario_nome text DEFAULT NULL,

  -- Tipos compostos: substitui tipo_calculo (mantido por compatibilidade)
  -- Formato: ["percentual_fixo", "escalonado"]  — pode ter múltiplos
  ADD COLUMN IF NOT EXISTS tipos_calculo_arr jsonb NOT NULL DEFAULT '["percentual_fixo"]',

  -- Contexto / explicação da regra
  ADD COLUMN IF NOT EXISTS contexto text DEFAULT NULL,

  -- Elegibilidade aberta: condition builder
  -- Formato: [{id, entidade, campo, operador, valor, label}]
  -- Operadores: "=", "!=", ">=", "<=", ">", "<", "contém"
  ADD COLUMN IF NOT EXISTS condicoes_elegibilidade jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN commission_rules.escopo IS
  'global = aplica a todos os beneficiários da persona; individual = pessoa específica';
COMMENT ON COLUMN commission_rules.tipos_calculo_arr IS
  'Array de tipos ativos: percentual_fixo | cadeia_repasse | escalonado. Podem coexistir.';
COMMENT ON COLUMN commission_rules.condicoes_elegibilidade IS
  'Condition builder: [{entidade, campo, operador, valor, label}]. AND implícito entre condições.';
COMMENT ON COLUMN commission_rules.contexto IS
  'Explicação livre do contexto e motivação da regra (ex: campanha, produto, nível de seniority).';
