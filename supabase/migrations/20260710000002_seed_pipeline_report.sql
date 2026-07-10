-- Seed do relatório padrão de Pipeline
-- Inserido para todos os tenants existentes e adicionado ao seed_tenant para novos

-- ── Helper: insere o relatório para um tenant se ainda não existir ────────────
CREATE OR REPLACE FUNCTION internal_seed_pipeline_report(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_elementos jsonb;
  v_config    jsonb;
BEGIN
  -- Não duplica se já existe um relatório de pipeline padrão
  IF EXISTS (
    SELECT 1 FROM public.relatorios
    WHERE tenant_id = p_tenant_id
      AND titulo = 'Acompanhamento de Pipeline'
      AND deleted_at IS NULL
  ) THEN RETURN; END IF;

  v_config := '{
    "fundoPagina": { "tipo": "cor", "cor": "#f8fafc" },
    "cabecalho": {
      "ativo": true,
      "tipoFundo": "gradiente",
      "gradiente": { "cor1": "#1e3a5f", "cor2": "#2563eb", "angulo": 135 },
      "titulo": "Acompanhamento de Pipeline",
      "subtitulo": "Visão completa de oportunidades, conversão, origem e tendência"
    }
  }'::jsonb;

  v_elementos := '[
    {"id":"s-t1","tipo":"texto","x":0,"y":0,"w":1176,"h":34,
     "dados":{"conteudo":"📊  Visão Geral","fontSize":16,"fontWeight":"bold","color":"#1e293b"}},

    {"id":"s-k1","tipo":"kpi","x":0,"y":42,"w":278,"h":108,
     "dados":{"titulo":"Oportunidades Criadas","sourceId":"pipeline","metrica":"COUNT","cor":"#2563EB"}},

    {"id":"s-k2","tipo":"kpi","x":294,"y":42,"w":278,"h":108,
     "dados":{"titulo":"Valor Total em Aberto","sourceId":"pipeline","metrica":"SUM","campoY":"valor","cor":"#10B981","prefixo":"R$ "}},

    {"id":"s-k3","tipo":"kpi","x":588,"y":42,"w":278,"h":108,
     "dados":{"titulo":"Ticket Médio","sourceId":"pipeline","metrica":"AVG","campoY":"valor","cor":"#F59E0B","prefixo":"R$ "}},

    {"id":"s-k4","tipo":"kpi","x":882,"y":42,"w":278,"h":108,
     "dados":{"titulo":"Valor Médio por Oportunidade","sourceId":"pipeline","metrica":"AVG","campoY":"valor","cor":"#8B5CF6","prefixo":"R$ "}},

    {"id":"s-div1","tipo":"divisor","x":0,"y":166,"w":1176,"h":10},

    {"id":"s-t2","tipo":"texto","x":0,"y":186,"w":1176,"h":30,
     "dados":{"conteudo":"🔀  Funil e Conversão por Etapa","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g1","tipo":"grafico","x":0,"y":224,"w":380,"h":230,
     "dados":{"titulo":"Por Situação","sourceId":"pipeline","tipoGrafico":"bar","metrica":"COUNT","campoX":"situacao","cor":"#2563EB"}},

    {"id":"s-g2","tipo":"grafico","x":396,"y":224,"w":380,"h":230,
     "dados":{"titulo":"Por Etapa do Pipeline","sourceId":"pipeline","tipoGrafico":"bar","metrica":"COUNT","campoX":"etapa_nome","cor":"#8B5CF6"}},

    {"id":"s-g3","tipo":"grafico","x":792,"y":224,"w":380,"h":230,
     "dados":{"titulo":"Volume (R$) por Etapa","sourceId":"pipeline","tipoGrafico":"bar","metrica":"SUM","campoY":"valor","campoX":"etapa_nome","cor":"#10B981"}},

    {"id":"s-div2","tipo":"divisor","x":0,"y":470,"w":1176,"h":10},

    {"id":"s-t3","tipo":"texto","x":0,"y":490,"w":1176,"h":30,
     "dados":{"conteudo":"🎯  Origem e Campanhas","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g4","tipo":"grafico","x":0,"y":528,"w":380,"h":230,
     "dados":{"titulo":"Distribuição por Origem","sourceId":"pipeline","tipoGrafico":"pie","metrica":"COUNT","campoX":"origem","cor":"#F59E0B"}},

    {"id":"s-g5","tipo":"grafico","x":396,"y":528,"w":380,"h":230,
     "dados":{"titulo":"Oportunidades por Campanha","sourceId":"pipeline","tipoGrafico":"bar","metrica":"COUNT","campoX":"campanha","cor":"#EF4444"}},

    {"id":"s-g6","tipo":"grafico","x":792,"y":528,"w":380,"h":230,
     "dados":{"titulo":"Valor (R$) por Campanha","sourceId":"pipeline","tipoGrafico":"bar","metrica":"SUM","campoY":"valor","campoX":"campanha","cor":"#F97316"}},

    {"id":"s-div3","tipo":"divisor","x":0,"y":774,"w":1176,"h":10},

    {"id":"s-t4","tipo":"texto","x":0,"y":794,"w":1176,"h":30,
     "dados":{"conteudo":"👤  Performance por Responsável","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g7","tipo":"grafico","x":0,"y":832,"w":576,"h":230,
     "dados":{"titulo":"Qtd. de Oportunidades por Vendedor","sourceId":"pipeline","tipoGrafico":"bar","metrica":"COUNT","campoX":"responsavel","cor":"#06B6D4"}},

    {"id":"s-g8","tipo":"grafico","x":592,"y":832,"w":576,"h":230,
     "dados":{"titulo":"Volume (R$) por Vendedor","sourceId":"pipeline","tipoGrafico":"bar","metrica":"SUM","campoY":"valor","campoX":"responsavel","cor":"#10B981"}},

    {"id":"s-div4","tipo":"divisor","x":0,"y":1078,"w":1176,"h":10},

    {"id":"s-t5","tipo":"texto","x":0,"y":1098,"w":1176,"h":30,
     "dados":{"conteudo":"📈  Tendência de Geração Mensal","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g9","tipo":"grafico","x":0,"y":1136,"w":1176,"h":240,
     "dados":{"titulo":"Novas Oportunidades por Mês","sourceId":"pipeline","tipoGrafico":"line","metrica":"COUNT","campoX":"mes","cor":"#2563EB"}},

    {"id":"s-div5","tipo":"divisor","x":0,"y":1392,"w":1176,"h":10},

    {"id":"s-t6","tipo":"texto","x":0,"y":1412,"w":1176,"h":30,
     "dados":{"conteudo":"📋  Detalhamento Semanal — Origem · Campanha · Conversão","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-tb1","tipo":"tabela","x":0,"y":1450,"w":1176,"h":400,
     "dados":{"titulo":"Tabela por Semana","sourceId":"pipeline","campos":["semana","origem","campanha","responsavel","etapa_nome","situacao","valor","titulo"],"limite":100}}
  ]'::jsonb;

  INSERT INTO public.relatorios (
    tenant_id, owner_id, titulo, tipo,
    config, elementos,
    acesso, papeis_permitidos, status,
    created_at, updated_at
  ) VALUES (
    p_tenant_id,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Acompanhamento de Pipeline',
    'relatorio',
    v_config,
    v_elementos,
    'todos',
    '[]'::jsonb,
    'publicado',
    now(), now()
  );
END;
$$;

-- ── Inserir para todos os tenants já existentes ───────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.tenants LOOP
    PERFORM internal_seed_pipeline_report(r.id);
  END LOOP;
END;
$$;

-- ── Atualizar seed_tenant para novos tenants ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.seed_tenant(
  p_tenant_id  uuid,
  p_branch_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

  -- ── 1. Perfis de acesso padrão ──────────────────────────────────────────
  INSERT INTO public.tenant_roles (tenant_id, name, base_role, is_system, permissions)
  VALUES
    (p_tenant_id, 'Administrador',   'admin_isv',  true, '{"all": true}'::jsonb),
    (p_tenant_id, 'Vendedor',        'vendedor',   true, '{}'::jsonb),
    (p_tenant_id, 'Financeiro',      'financeiro', true, '{}'::jsonb),
    (p_tenant_id, 'Customer Success','cs',         true, '{}'::jsonb),
    (p_tenant_id, 'Projetos',        'projetos',   true, '{}'::jsonb)
  ON CONFLICT DO NOTHING;

  -- ── 2. Etapas do pipeline padrão ────────────────────────────────────────
  INSERT INTO public.pipeline_stages (tenant_id, name, order_idx, color, is_won, is_lost)
  VALUES
    (p_tenant_id, 'Prospecção',   1, '#6366f1', false, false),
    (p_tenant_id, 'Qualificação', 2, '#3b82f6', false, false),
    (p_tenant_id, 'Proposta',     3, '#f59e0b', false, false),
    (p_tenant_id, 'Negociação',   4, '#f97316', false, false),
    (p_tenant_id, 'Fechado',      5, '#10b981', true,  false),
    (p_tenant_id, 'Perdido',      6, '#ef4444', false, true)
  ON CONFLICT DO NOTHING;

  -- ── 3. Tipos de ação padrão ─────────────────────────────────────────────
  INSERT INTO public.tipos_acao (tenant_id, label, slug, icon, color, bg, text_color)
  VALUES
    (p_tenant_id, 'Ligação',   'ligacao',  'phone',          '#3b82f6', '#eff6ff', '#1d4ed8'),
    (p_tenant_id, 'E-mail',    'email',    'mail',           '#8b5cf6', '#f5f3ff', '#6d28d9'),
    (p_tenant_id, 'Reunião',   'reuniao',  'users',          '#10b981', '#f0fdf4', '#065f46'),
    (p_tenant_id, 'Visita',    'visita',   'map-pin',        '#f59e0b', '#fffbeb', '#92400e'),
    (p_tenant_id, 'WhatsApp',  'whatsapp', 'message-circle', '#22c55e', '#f0fdf4', '#166534'),
    (p_tenant_id, 'Proposta',  'proposta', 'file-text',      '#6366f1', '#eef2ff', '#3730a3')
  ON CONFLICT (tenant_id, slug) DO NOTHING;

  -- ── 4. Relatório padrão de Pipeline ─────────────────────────────────────
  PERFORM internal_seed_pipeline_report(p_tenant_id);

END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_tenant(uuid, uuid) TO authenticated;
