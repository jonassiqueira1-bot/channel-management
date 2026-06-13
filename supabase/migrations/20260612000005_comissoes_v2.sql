-- ─── Comissões v2 — tipos de cálculo estendidos ──────────────────────────────
-- Adiciona suporte a 3 macro-modelos de regra:
--   1. percentual_fixo  → % por persona × receita (canal ISV)
--   2. cadeia_repasse   → cadeia bruto→líquido→base→comissão (Protheus/Quírons/MntNG)
--   3. escalonado       → faixas de meta individual + bônus equipe (Keepfy)
-- Adiciona campos de elegibilidade e vigência.

ALTER TABLE commission_rules
  -- ── Tipo de cálculo ─────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS tipo_calculo text NOT NULL DEFAULT 'percentual_fixo'
    CHECK (tipo_calculo IN ('percentual_fixo','cadeia_repasse','escalonado')),

  -- ── Cadeia de repasse ───────────────────────────────────────────────────
  -- repasse_origem_pct : % que o distribuidor/fabricante repassa à NG
  --                      (ex: TOTVS → NG = 50% no recorrente, 45% no CDU)
  ADD COLUMN IF NOT EXISTS repasse_origem_pct   numeric(5,2) DEFAULT NULL
    CHECK (repasse_origem_pct BETWEEN 0 AND 100),
  -- base_calculo_pct   : % do valor líquido NG usado como base de cálculo
  --                      (ex: 39% do líquido para MntNG/Quírons/Intera; 100% para CDU)
  ADD COLUMN IF NOT EXISTS base_calculo_pct     numeric(5,2) DEFAULT NULL
    CHECK (base_calculo_pct BETWEEN 0 AND 100),
  -- percentual_comissao: % aplicado sobre a base resultante
  --                      (ex: 5% Inside Sales Sênior)
  ADD COLUMN IF NOT EXISTS percentual_comissao  numeric(5,2) DEFAULT NULL
    CHECK (percentual_comissao BETWEEN 0 AND 100),

  -- ── Recorrência ─────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS tipo_recorrencia text DEFAULT 'indefinida'
    CHECK (tipo_recorrencia IN ('indefinida','prazo_fixo','unica')),
  ADD COLUMN IF NOT EXISTS prazo_meses integer DEFAULT NULL
    CHECK (prazo_meses > 0),

  -- ── Escalonamento — JSONB ────────────────────────────────────────────────
  -- Formato: [{label, min_pct, max_pct, comissao_pct}]
  ADD COLUMN IF NOT EXISTS escala_individual     jsonb DEFAULT NULL,
  -- Formato: [{label, min_pct, max_pct, bonus_pct}]
  ADD COLUMN IF NOT EXISTS escala_equipe         jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS condicao_bonus_equipe text  DEFAULT NULL,

  -- ── Elegibilidade ────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS exige_participacao_venda boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cessa_no_cancelamento    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notas_elegibilidade      text    DEFAULT NULL,

  -- ── Vigência ─────────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS vigencia_inicio date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vigencia_fim    date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS revisao_anual   boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN commission_rules.tipo_calculo IS
  'percentual_fixo = grade persona×receita | cadeia_repasse = bruto→repasse→base→% | escalonado = faixas de meta';
COMMENT ON COLUMN commission_rules.repasse_origem_pct IS
  'Percentual que o distribuidor/fabricante repassa à NG. Ex: TOTVS repassa 50% do bruto no recorrente.';
COMMENT ON COLUMN commission_rules.base_calculo_pct IS
  'Percentual do líquido NG usado como base. Ex: 39% do líquido NG para produtos Protheus recorrentes.';
COMMENT ON COLUMN commission_rules.escala_individual IS
  'Faixas de comissão individual por atingimento de meta. JSONB: [{label, min_pct, max_pct, comissao_pct}].';
COMMENT ON COLUMN commission_rules.escala_equipe IS
  'Faixas de bônus de equipe. JSONB: [{label, min_pct, max_pct, bonus_pct}].';
