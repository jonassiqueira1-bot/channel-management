-- Corrige o layout do relatório padrão de Pipeline
-- Usa página A3 (1123px) com margens mínimas → largura útil ~1083px
-- Elementos reajustados para caber horizontalmente sem corte

-- Remove a versão anterior e reinseriu com layout correto
DELETE FROM public.relatorios
WHERE titulo = 'Acompanhamento de Pipeline'
  AND owner_id = (
    SELECT p.id FROM public.profiles p
    WHERE p.tenant_id = relatorios.tenant_id
    ORDER BY p.created_at LIMIT 1
  );

-- Recria usando a mesma função (que já verifica duplicidade pelo título)
-- Como deletamos acima, a função irá inserir normalmente

CREATE OR REPLACE FUNCTION internal_seed_pipeline_report(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_elementos jsonb;
  v_config    jsonb;
  v_owner_id  uuid;
BEGIN
  SELECT id INTO v_owner_id
  FROM public.profiles
  WHERE tenant_id = p_tenant_id
  ORDER BY created_at LIMIT 1;

  IF v_owner_id IS NULL THEN RETURN; END IF;

  IF EXISTS (
    SELECT 1 FROM public.relatorios
    WHERE tenant_id = p_tenant_id
      AND titulo = 'Acompanhamento de Pipeline'
      AND deleted_at IS NULL
  ) THEN RETURN; END IF;

  -- A3 (1123px) com margens 20px → largura útil 1083px
  -- Layout: 3 colunas de ~351px (gap 15px) | 2 colunas de ~534px (gap 15px)
  v_config := '{
    "tamanhoPagina": "A3",
    "margens": { "top": 20, "right": 20, "bottom": 20, "left": 20 },
    "fundoPagina": { "tipo": "cor", "cor": "#f8fafc" },
    "cabecalho": {
      "ativo": true,
      "tipoFundo": "gradiente",
      "gradiente": { "cor1": "#1e3a5f", "cor2": "#2563eb", "angulo": 135 },
      "titulo": "Acompanhamento de Pipeline",
      "subtitulo": "Visão completa de oportunidades, conversão, origem e tendência"
    },
    "rodape": { "ativo": true, "paginacao": true, "texto": "Boostly · Pipeline Report", "corFundo": "#f1f5f9", "corTexto": "#94a3b8" }
  }'::jsonb;

  -- Largura útil: 1083px | col3: 351px | col2: 534px | gap: 15px
  -- Posições 3 colunas: 0 | 366 | 732
  -- Posições 2 colunas: 0 | 549
  v_elementos := '[
    {"id":"s-t1","tipo":"texto","x":0,"y":0,"w":1083,"h":30,
     "dados":{"conteudo":"📊  Visão Geral","fontSize":15,"fontWeight":"bold","color":"#1e293b"}},

    {"id":"s-k1","tipo":"kpi","x":0,  "y":38,"w":258,"h":108,
     "dados":{"titulo":"Oportunidades Criadas","sourceId":"pipeline","metrica":"COUNT","cor":"#2563EB"}},
    {"id":"s-k2","tipo":"kpi","x":273,"y":38,"w":258,"h":108,
     "dados":{"titulo":"Valor Total em Aberto","sourceId":"pipeline","metrica":"SUM","campoY":"valor","cor":"#10B981","prefixo":"R$ "}},
    {"id":"s-k3","tipo":"kpi","x":546,"y":38,"w":258,"h":108,
     "dados":{"titulo":"Ticket Médio","sourceId":"pipeline","metrica":"AVG","campoY":"valor","cor":"#F59E0B","prefixo":"R$ "}},
    {"id":"s-k4","tipo":"kpi","x":819,"y":38,"w":258,"h":108,
     "dados":{"titulo":"Soma de Valor Total","sourceId":"pipeline","metrica":"SUM","campoY":"valor","cor":"#8B5CF6","prefixo":"R$ "}},

    {"id":"s-div1","tipo":"divisor","x":0,"y":158,"w":1083,"h":8},

    {"id":"s-t2","tipo":"texto","x":0,"y":174,"w":1083,"h":28,
     "dados":{"conteudo":"🔀  Funil e Conversão por Etapa","fontSize":14,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g1","tipo":"grafico","x":0,  "y":210,"w":351,"h":230,
     "dados":{"titulo":"Por Situação","sourceId":"pipeline","tipoGrafico":"bar","metrica":"COUNT","campoX":"situacao","cor":"#2563EB"}},
    {"id":"s-g2","tipo":"grafico","x":366,"y":210,"w":351,"h":230,
     "dados":{"titulo":"Por Etapa do Pipeline","sourceId":"pipeline","tipoGrafico":"bar","metrica":"COUNT","campoX":"etapa_nome","cor":"#8B5CF6"}},
    {"id":"s-g3","tipo":"grafico","x":732,"y":210,"w":351,"h":230,
     "dados":{"titulo":"Volume R$ por Etapa","sourceId":"pipeline","tipoGrafico":"bar","metrica":"SUM","campoY":"valor","campoX":"etapa_nome","cor":"#10B981"}},

    {"id":"s-div2","tipo":"divisor","x":0,"y":452,"w":1083,"h":8},

    {"id":"s-t3","tipo":"texto","x":0,"y":468,"w":1083,"h":28,
     "dados":{"conteudo":"🎯  Origem e Campanhas","fontSize":14,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g4","tipo":"grafico","x":0,  "y":504,"w":351,"h":230,
     "dados":{"titulo":"Distribuição por Origem","sourceId":"pipeline","tipoGrafico":"pie","metrica":"COUNT","campoX":"origem","cor":"#F59E0B"}},
    {"id":"s-g5","tipo":"grafico","x":366,"y":504,"w":351,"h":230,
     "dados":{"titulo":"Qtd. por Campanha","sourceId":"pipeline","tipoGrafico":"bar","metrica":"COUNT","campoX":"campanha","cor":"#EF4444"}},
    {"id":"s-g6","tipo":"grafico","x":732,"y":504,"w":351,"h":230,
     "dados":{"titulo":"Valor R$ por Campanha","sourceId":"pipeline","tipoGrafico":"bar","metrica":"SUM","campoY":"valor","campoX":"campanha","cor":"#F97316"}},

    {"id":"s-div3","tipo":"divisor","x":0,"y":746,"w":1083,"h":8},

    {"id":"s-t4","tipo":"texto","x":0,"y":762,"w":1083,"h":28,
     "dados":{"conteudo":"👤  Performance por Responsável","fontSize":14,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g7","tipo":"grafico","x":0,  "y":798,"w":534,"h":230,
     "dados":{"titulo":"Qtd. de Oportunidades por Vendedor","sourceId":"pipeline","tipoGrafico":"bar","metrica":"COUNT","campoX":"responsavel","cor":"#06B6D4"}},
    {"id":"s-g8","tipo":"grafico","x":549,"y":798,"w":534,"h":230,
     "dados":{"titulo":"Volume R$ por Vendedor","sourceId":"pipeline","tipoGrafico":"bar","metrica":"SUM","campoY":"valor","campoX":"responsavel","cor":"#10B981"}},

    {"id":"s-div4","tipo":"divisor","x":0,"y":1040,"w":1083,"h":8},

    {"id":"s-t5","tipo":"texto","x":0,"y":1056,"w":1083,"h":28,
     "dados":{"conteudo":"📈  Tendência de Geração Mensal","fontSize":14,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g9","tipo":"grafico","x":0,"y":1092,"w":1083,"h":230,
     "dados":{"titulo":"Novas Oportunidades por Mês","sourceId":"pipeline","tipoGrafico":"line","metrica":"COUNT","campoX":"mes","cor":"#2563EB"}},

    {"id":"s-div5","tipo":"divisor","x":0,"y":1334,"w":1083,"h":8},

    {"id":"s-t6","tipo":"texto","x":0,"y":1350,"w":1083,"h":28,
     "dados":{"conteudo":"📋  Detalhamento Semanal — Origem · Campanha · Conversão","fontSize":14,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-tb1","tipo":"tabela","x":0,"y":1386,"w":1083,"h":420,
     "dados":{"titulo":"Tabela por Semana","sourceId":"pipeline","campos":["semana","origem","campanha","responsavel","etapa_nome","situacao","valor","titulo"],"limite":100}}
  ]'::jsonb;

  INSERT INTO public.relatorios (
    tenant_id, owner_id, titulo, tipo,
    config, elementos,
    acesso, papeis_permitidos, status,
    created_at, updated_at
  ) VALUES (
    p_tenant_id, v_owner_id,
    'Acompanhamento de Pipeline', 'relatorio',
    v_config, v_elementos,
    'todos', ARRAY[]::text[], 'publicado',
    now(), now()
  );
END;
$$;

-- Reinserir para todos os tenants existentes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.tenants LOOP
    PERFORM internal_seed_pipeline_report(r.id);
  END LOOP;
END;
$$;
