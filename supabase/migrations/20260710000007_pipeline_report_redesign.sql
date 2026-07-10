-- Redesign completo do relatório "Acompanhamento de Pipeline"
-- Melhorias:
--   • KPIs filtrados: Ganhas, Perdidas, Em Andamento, Valor Realizado, Ticket Médio Ganho
--   • Seção de Cohort: movimentação das opps por mês de criação × situação atual
--   • Reorganização geral das seções para fluxo mais natural de leitura
--   • Remove redundâncias; funil consolidado em 2 gráficos lado a lado

CREATE OR REPLACE FUNCTION internal_seed_pipeline_report(p_tenant_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_elementos jsonb;
  v_config    jsonb;
  v_owner_id  uuid;
BEGIN
  SELECT id INTO v_owner_id FROM public.profiles
  WHERE tenant_id = p_tenant_id ORDER BY created_at LIMIT 1;
  IF v_owner_id IS NULL THEN RETURN; END IF;
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
      "subtitulo": "Visão completa de oportunidades, conversão, cohort e tendência"
    }
  }'::jsonb;

  v_elementos := $ELEM$[
    {"id":"s-t1","tipo":"texto","x":0,"y":0,"w":1176,"h":28,
     "dados":{"conteudo":"📊  Visão Geral","fontSize":15,"fontWeight":"bold","color":"#1e293b"}},

    {"id":"s-k1","tipo":"kpi","x":0,"y":36,"w":270,"h":100,
     "dados":{"titulo":"Oportunidades Abertas","sourceId":"pipeline","metrica":"COUNT",
              "filtro":{"campo":"situacao","valor":"em_andamento"},"cor":"#2563EB"}},
    {"id":"s-k2","tipo":"kpi","x":288,"y":36,"w":270,"h":100,
     "dados":{"titulo":"Oportunidades Ganhas","sourceId":"pipeline","metrica":"COUNT",
              "filtro":{"campo":"situacao","valor":"ganho"},"cor":"#10B981"}},
    {"id":"s-k3","tipo":"kpi","x":576,"y":36,"w":270,"h":100,
     "dados":{"titulo":"Oportunidades Perdidas","sourceId":"pipeline","metrica":"COUNT",
              "filtro":{"campo":"situacao","valor":"perdido"},"cor":"#EF4444"}},
    {"id":"s-k4","tipo":"kpi","x":864,"y":36,"w":312,"h":100,
     "dados":{"titulo":"Total no Período","sourceId":"pipeline","metrica":"COUNT","cor":"#6366F1"}},

    {"id":"s-k5","tipo":"kpi","x":0,"y":154,"w":380,"h":100,
     "dados":{"titulo":"Valor em Aberto","sourceId":"pipeline","metrica":"SUM","campoY":"valor",
              "filtro":{"campo":"situacao","valor":"em_andamento"},"cor":"#2563EB","prefixo":"R$ "}},
    {"id":"s-k6","tipo":"kpi","x":398,"y":154,"w":380,"h":100,
     "dados":{"titulo":"Valor Realizado (Ganhos)","sourceId":"pipeline","metrica":"SUM","campoY":"valor",
              "filtro":{"campo":"situacao","valor":"ganho"},"cor":"#10B981","prefixo":"R$ "}},
    {"id":"s-k7","tipo":"kpi","x":796,"y":154,"w":380,"h":100,
     "dados":{"titulo":"Ticket Médio (Ganhos)","sourceId":"pipeline","metrica":"AVG","campoY":"valor",
              "filtro":{"campo":"situacao","valor":"ganho"},"cor":"#F59E0B","prefixo":"R$ "}},

    {"id":"s-div1","tipo":"divisor","x":0,"y":272,"w":1176,"h":8},

    {"id":"s-t2","tipo":"texto","x":0,"y":288,"w":1176,"h":28,
     "dados":{"conteudo":"🔀  Funil de Vendas","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g1","tipo":"grafico","x":0,"y":324,"w":576,"h":240,
     "dados":{"titulo":"Oportunidades por Etapa","sourceId":"pipeline","tipoGrafico":"bar",
              "metrica":"COUNT","campoX":"etapa_nome","cor":"#6366F1"}},
    {"id":"s-g2","tipo":"grafico","x":600,"y":324,"w":576,"h":240,
     "dados":{"titulo":"Volume (R$) por Etapa","sourceId":"pipeline","tipoGrafico":"bar",
              "metrica":"SUM","campoY":"valor","campoX":"etapa_nome","cor":"#10B981"}},

    {"id":"s-div2","tipo":"divisor","x":0,"y":582,"w":1176,"h":8},

    {"id":"s-t3","tipo":"texto","x":0,"y":598,"w":1176,"h":28,
     "dados":{"conteudo":"📅  Cohort de Movimentação — O que aconteceu com cada mês de pipeline?","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-td-cohort","tipo":"tabela_dinamica","x":0,"y":634,"w":1176,"h":320,
     "dados":{
       "titulo":"Oportunidades por Mês de Criação × Situação Atual",
       "sourceId":"pipeline",
       "camposAgrupadores":[{"campo":"mes","granularidade":"nenhuma"}],
       "colunas":[
         {"id":"cc1","tipo":"count","label":"Total"},
         {"id":"cc2","tipo":"dimensao","campo":"situacao","metrica":"count","campoDado":"","label":"Por Situação"},
         {"id":"cc3","tipo":"pct_group","label":"% Conversão","filtro":{"campo":"situacao","valor":"ganho"}},
         {"id":"cc4","tipo":"sum","campo":"valor","label":"Valor Ganho (R$)","filtro":{"campo":"situacao","valor":"ganho"}}
       ],
       "ordenar":"grupo_desc",
       "limite":24
     }},

    {"id":"s-div3","tipo":"divisor","x":0,"y":972,"w":1176,"h":8},

    {"id":"s-t4","tipo":"texto","x":0,"y":988,"w":1176,"h":28,
     "dados":{"conteudo":"📈  Tendência Mensal","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g3","tipo":"grafico","x":0,"y":1024,"w":576,"h":240,
     "dados":{"titulo":"Novas Oportunidades por Mês","sourceId":"pipeline","tipoGrafico":"line",
              "metrica":"COUNT","campoX":"mes","cor":"#2563EB"}},
    {"id":"s-g4","tipo":"grafico","x":600,"y":1024,"w":576,"h":240,
     "dados":{"titulo":"Valor Gerado por Mês (R$)","sourceId":"pipeline","tipoGrafico":"bar",
              "metrica":"SUM","campoY":"valor","campoX":"mes","cor":"#10B981"}},

    {"id":"s-div4","tipo":"divisor","x":0,"y":1282,"w":1176,"h":8},

    {"id":"s-t5","tipo":"texto","x":0,"y":1298,"w":1176,"h":28,
     "dados":{"conteudo":"🎯  Origem e Campanhas","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g5","tipo":"grafico","x":0,"y":1334,"w":380,"h":230,
     "dados":{"titulo":"Distribuição por Origem","sourceId":"pipeline","tipoGrafico":"pie",
              "metrica":"COUNT","campoX":"origem","cor":"#F59E0B"}},
    {"id":"s-g6","tipo":"grafico","x":398,"y":1334,"w":380,"h":230,
     "dados":{"titulo":"Oportunidades por Campanha","sourceId":"pipeline","tipoGrafico":"bar",
              "metrica":"COUNT","campoX":"campanha","cor":"#EF4444"}},
    {"id":"s-g7","tipo":"grafico","x":796,"y":1334,"w":380,"h":230,
     "dados":{"titulo":"Valor (R$) por Campanha","sourceId":"pipeline","tipoGrafico":"bar",
              "metrica":"SUM","campoY":"valor","campoX":"campanha","cor":"#F97316"}},

    {"id":"s-div5","tipo":"divisor","x":0,"y":1582,"w":1176,"h":8},

    {"id":"s-t6","tipo":"texto","x":0,"y":1598,"w":1176,"h":28,
     "dados":{"conteudo":"👤  Performance por Responsável","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-g8","tipo":"grafico","x":0,"y":1634,"w":576,"h":230,
     "dados":{"titulo":"Qtd. de Oportunidades por Vendedor","sourceId":"pipeline","tipoGrafico":"bar",
              "metrica":"COUNT","campoX":"responsavel","cor":"#06B6D4"}},
    {"id":"s-g9","tipo":"grafico","x":600,"y":1634,"w":576,"h":230,
     "dados":{"titulo":"Volume (R$) por Vendedor","sourceId":"pipeline","tipoGrafico":"bar",
              "metrica":"SUM","campoY":"valor","campoX":"responsavel","cor":"#10B981"}},

    {"id":"s-div6","tipo":"divisor","x":0,"y":1882,"w":1176,"h":8},

    {"id":"s-t7","tipo":"texto","x":0,"y":1898,"w":1176,"h":28,
     "dados":{"conteudo":"📋  Detalhamento por Semana · Origem · Campanha","fontSize":15,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-td1","tipo":"tabela_dinamica","x":0,"y":1934,"w":1176,"h":380,
     "dados":{
       "titulo":"Novas · Ganho · Perdas · % Conv. · Ticket · Realizado",
       "sourceId":"pipeline",
       "camposAgrupadores":[
         {"campo":"semana","granularidade":"nenhuma"},
         {"campo":"origem","granularidade":"nenhuma"},
         {"campo":"campanha","granularidade":"nenhuma"}
       ],
       "colunas":[
         {"id":"d1","tipo":"count","label":"Novas"},
         {"id":"d2","tipo":"count","label":"Ganho","filtro":{"campo":"situacao","valor":"ganho"}},
         {"id":"d3","tipo":"count","label":"Perdas","filtro":{"campo":"situacao","valor":"perdido"}},
         {"id":"d4","tipo":"pct_group","label":"% Conv.","filtro":{"campo":"situacao","valor":"ganho"}},
         {"id":"d5","tipo":"avg","campo":"valor","label":"Tkt Méd.","filtro":{"campo":"situacao","valor":"ganho"}},
         {"id":"d6","tipo":"sum","campo":"valor","label":"Real. (R$)","filtro":{"campo":"situacao","valor":"ganho"}}
       ],
       "ordenar":"grupo_desc",
       "limite":60
     }}
  ]$ELEM$::jsonb;

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

-- Atualiza o relatório existente para todos os tenants
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT tenant_id FROM public.relatorios
           WHERE titulo = 'Acompanhamento de Pipeline' AND deleted_at IS NULL
  LOOP
    UPDATE public.relatorios
    SET elementos = (
      SELECT v_elementos FROM (
        SELECT $ELEM2$[
          {"id":"s-t1","tipo":"texto","x":0,"y":0,"w":1176,"h":28,
           "dados":{"conteudo":"📊  Visão Geral","fontSize":15,"fontWeight":"bold","color":"#1e293b"}},

          {"id":"s-k1","tipo":"kpi","x":0,"y":36,"w":270,"h":100,
           "dados":{"titulo":"Oportunidades Abertas","sourceId":"pipeline","metrica":"COUNT",
                    "filtro":{"campo":"situacao","valor":"em_andamento"},"cor":"#2563EB"}},
          {"id":"s-k2","tipo":"kpi","x":288,"y":36,"w":270,"h":100,
           "dados":{"titulo":"Oportunidades Ganhas","sourceId":"pipeline","metrica":"COUNT",
                    "filtro":{"campo":"situacao","valor":"ganho"},"cor":"#10B981"}},
          {"id":"s-k3","tipo":"kpi","x":576,"y":36,"w":270,"h":100,
           "dados":{"titulo":"Oportunidades Perdidas","sourceId":"pipeline","metrica":"COUNT",
                    "filtro":{"campo":"situacao","valor":"perdido"},"cor":"#EF4444"}},
          {"id":"s-k4","tipo":"kpi","x":864,"y":36,"w":312,"h":100,
           "dados":{"titulo":"Total no Período","sourceId":"pipeline","metrica":"COUNT","cor":"#6366F1"}},

          {"id":"s-k5","tipo":"kpi","x":0,"y":154,"w":380,"h":100,
           "dados":{"titulo":"Valor em Aberto","sourceId":"pipeline","metrica":"SUM","campoY":"valor",
                    "filtro":{"campo":"situacao","valor":"em_andamento"},"cor":"#2563EB","prefixo":"R$ "}},
          {"id":"s-k6","tipo":"kpi","x":398,"y":154,"w":380,"h":100,
           "dados":{"titulo":"Valor Realizado (Ganhos)","sourceId":"pipeline","metrica":"SUM","campoY":"valor",
                    "filtro":{"campo":"situacao","valor":"ganho"},"cor":"#10B981","prefixo":"R$ "}},
          {"id":"s-k7","tipo":"kpi","x":796,"y":154,"w":380,"h":100,
           "dados":{"titulo":"Ticket Médio (Ganhos)","sourceId":"pipeline","metrica":"AVG","campoY":"valor",
                    "filtro":{"campo":"situacao","valor":"ganho"},"cor":"#F59E0B","prefixo":"R$ "}},

          {"id":"s-div1","tipo":"divisor","x":0,"y":272,"w":1176,"h":8},

          {"id":"s-t2","tipo":"texto","x":0,"y":288,"w":1176,"h":28,
           "dados":{"conteudo":"🔀  Funil de Vendas","fontSize":15,"fontWeight":"bold","color":"#374151"}},

          {"id":"s-g1","tipo":"grafico","x":0,"y":324,"w":576,"h":240,
           "dados":{"titulo":"Oportunidades por Etapa","sourceId":"pipeline","tipoGrafico":"bar",
                    "metrica":"COUNT","campoX":"etapa_nome","cor":"#6366F1"}},
          {"id":"s-g2","tipo":"grafico","x":600,"y":324,"w":576,"h":240,
           "dados":{"titulo":"Volume (R$) por Etapa","sourceId":"pipeline","tipoGrafico":"bar",
                    "metrica":"SUM","campoY":"valor","campoX":"etapa_nome","cor":"#10B981"}},

          {"id":"s-div2","tipo":"divisor","x":0,"y":582,"w":1176,"h":8},

          {"id":"s-t3","tipo":"texto","x":0,"y":598,"w":1176,"h":28,
           "dados":{"conteudo":"📅  Cohort de Movimentação — O que aconteceu com cada mês de pipeline?","fontSize":15,"fontWeight":"bold","color":"#374151"}},

          {"id":"s-td-cohort","tipo":"tabela_dinamica","x":0,"y":634,"w":1176,"h":320,
           "dados":{
             "titulo":"Oportunidades por Mês de Criação × Situação Atual",
             "sourceId":"pipeline",
             "camposAgrupadores":[{"campo":"mes","granularidade":"nenhuma"}],
             "colunas":[
               {"id":"cc1","tipo":"count","label":"Total"},
               {"id":"cc2","tipo":"dimensao","campo":"situacao","metrica":"count","campoDado":"","label":"Por Situação"},
               {"id":"cc3","tipo":"pct_group","label":"% Conversão","filtro":{"campo":"situacao","valor":"ganho"}},
               {"id":"cc4","tipo":"sum","campo":"valor","label":"Valor Ganho (R$)","filtro":{"campo":"situacao","valor":"ganho"}}
             ],
             "ordenar":"grupo_desc",
             "limite":24
           }},

          {"id":"s-div3","tipo":"divisor","x":0,"y":972,"w":1176,"h":8},

          {"id":"s-t4","tipo":"texto","x":0,"y":988,"w":1176,"h":28,
           "dados":{"conteudo":"📈  Tendência Mensal","fontSize":15,"fontWeight":"bold","color":"#374151"}},

          {"id":"s-g3","tipo":"grafico","x":0,"y":1024,"w":576,"h":240,
           "dados":{"titulo":"Novas Oportunidades por Mês","sourceId":"pipeline","tipoGrafico":"line",
                    "metrica":"COUNT","campoX":"mes","cor":"#2563EB"}},
          {"id":"s-g4","tipo":"grafico","x":600,"y":1024,"w":576,"h":240,
           "dados":{"titulo":"Valor Gerado por Mês (R$)","sourceId":"pipeline","tipoGrafico":"bar",
                    "metrica":"SUM","campoY":"valor","campoX":"mes","cor":"#10B981"}},

          {"id":"s-div4","tipo":"divisor","x":0,"y":1282,"w":1176,"h":8},

          {"id":"s-t5","tipo":"texto","x":0,"y":1298,"w":1176,"h":28,
           "dados":{"conteudo":"🎯  Origem e Campanhas","fontSize":15,"fontWeight":"bold","color":"#374151"}},

          {"id":"s-g5","tipo":"grafico","x":0,"y":1334,"w":380,"h":230,
           "dados":{"titulo":"Distribuição por Origem","sourceId":"pipeline","tipoGrafico":"pie",
                    "metrica":"COUNT","campoX":"origem","cor":"#F59E0B"}},
          {"id":"s-g6","tipo":"grafico","x":398,"y":1334,"w":380,"h":230,
           "dados":{"titulo":"Oportunidades por Campanha","sourceId":"pipeline","tipoGrafico":"bar",
                    "metrica":"COUNT","campoX":"campanha","cor":"#EF4444"}},
          {"id":"s-g7","tipo":"grafico","x":796,"y":1334,"w":380,"h":230,
           "dados":{"titulo":"Valor (R$) por Campanha","sourceId":"pipeline","tipoGrafico":"bar",
                    "metrica":"SUM","campoY":"valor","campoX":"campanha","cor":"#F97316"}},

          {"id":"s-div5","tipo":"divisor","x":0,"y":1582,"w":1176,"h":8},

          {"id":"s-t6","tipo":"texto","x":0,"y":1598,"w":1176,"h":28,
           "dados":{"conteudo":"👤  Performance por Responsável","fontSize":15,"fontWeight":"bold","color":"#374151"}},

          {"id":"s-g8","tipo":"grafico","x":0,"y":1634,"w":576,"h":230,
           "dados":{"titulo":"Qtd. de Oportunidades por Vendedor","sourceId":"pipeline","tipoGrafico":"bar",
                    "metrica":"COUNT","campoX":"responsavel","cor":"#06B6D4"}},
          {"id":"s-g9","tipo":"grafico","x":600,"y":1634,"w":576,"h":230,
           "dados":{"titulo":"Volume (R$) por Vendedor","sourceId":"pipeline","tipoGrafico":"bar",
                    "metrica":"SUM","campoY":"valor","campoX":"responsavel","cor":"#10B981"}},

          {"id":"s-div6","tipo":"divisor","x":0,"y":1882,"w":1176,"h":8},

          {"id":"s-t7","tipo":"texto","x":0,"y":1898,"w":1176,"h":28,
           "dados":{"conteudo":"📋  Detalhamento por Semana · Origem · Campanha","fontSize":15,"fontWeight":"bold","color":"#374151"}},

          {"id":"s-td1","tipo":"tabela_dinamica","x":0,"y":1934,"w":1176,"h":380,
           "dados":{
             "titulo":"Novas · Ganho · Perdas · % Conv. · Ticket · Realizado",
             "sourceId":"pipeline",
             "camposAgrupadores":[
               {"campo":"semana","granularidade":"nenhuma"},
               {"campo":"origem","granularidade":"nenhuma"},
               {"campo":"campanha","granularidade":"nenhuma"}
             ],
             "colunas":[
               {"id":"d1","tipo":"count","label":"Novas"},
               {"id":"d2","tipo":"count","label":"Ganho","filtro":{"campo":"situacao","valor":"ganho"}},
               {"id":"d3","tipo":"count","label":"Perdas","filtro":{"campo":"situacao","valor":"perdido"}},
               {"id":"d4","tipo":"pct_group","label":"% Conv.","filtro":{"campo":"situacao","valor":"ganho"}},
               {"id":"d5","tipo":"avg","campo":"valor","label":"Tkt Méd.","filtro":{"campo":"situacao","valor":"ganho"}},
               {"id":"d6","tipo":"sum","campo":"valor","label":"Real. (R$)","filtro":{"campo":"situacao","valor":"ganho"}}
             ],
             "ordenar":"grupo_desc",
             "limite":60
           }}
        ]$ELEM2$::jsonb AS v_elementos
      ) sub
    ),
    updated_at = now()
    WHERE tenant_id = r.tenant_id
      AND titulo = 'Acompanhamento de Pipeline'
      AND deleted_at IS NULL;
  END LOOP;
END;
$$;
