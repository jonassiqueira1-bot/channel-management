-- Adiciona dois elementos ao relatório "Acompanhamento de Pipeline":
--   1. Tabela dinâmica: Origem › Campanha (Qtd + % Total)
--   2. Tabela dinâmica: Funil por Etapa (Qtd + % Total + % Conversão)
-- Os novos elementos são anexados ao final do array elementos existente.

DO $$
DECLARE
  v_novos jsonb;
BEGIN
  -- y=1806 é onde o último elemento (tabela semanal) termina (y=1386 h=420)
  -- Acrescenta divisor → título → td1 → divisor → título → td2
  v_novos := '[
    {"id":"s-div6","tipo":"divisor","x":0,"y":1814,"w":1083,"h":8},

    {"id":"s-t7","tipo":"texto","x":0,"y":1830,"w":1083,"h":28,
     "dados":{"conteudo":"🌐  Origem e Campanha — Distribuição e Peso","fontSize":14,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-td1","tipo":"tabela_dinamica","x":0,"y":1866,"w":1083,"h":240,
     "dados":{
       "titulo":"Oportunidades por Origem › Campanha",
       "sourceId":"pipeline",
       "camposAgrupadores":[
         {"campo":"origem","granularidade":"nenhuma"},
         {"campo":"campanha","granularidade":"nenhuma"}
       ],
       "colunas":[
         {"id":"c1","tipo":"count","label":"Qtd"},
         {"id":"c2","tipo":"pct_total","label":"% do Total"}
       ],
       "ordenar":"valor_desc",
       "limite":30
     }},

    {"id":"s-div7","tipo":"divisor","x":0,"y":2114,"w":1083,"h":8},

    {"id":"s-t8","tipo":"texto","x":0,"y":2130,"w":1083,"h":28,
     "dados":{"conteudo":"🔽  Funil de Conversão por Etapa","fontSize":14,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-td2","tipo":"tabela_dinamica","x":0,"y":2166,"w":1083,"h":240,
     "dados":{
       "titulo":"Taxa de Conversão entre Etapas",
       "sourceId":"pipeline",
       "camposAgrupadores":[
         {"campo":"etapa_nome","granularidade":"nenhuma"}
       ],
       "colunas":[
         {"id":"c1","tipo":"count","label":"Qtd"},
         {"id":"c2","tipo":"pct_total","label":"% do Total"},
         {"id":"c3","tipo":"pct_prev","label":"Conversão →"}
       ],
       "ordenar":"grupo_asc",
       "limite":20
     }}
  ]'::jsonb;

  UPDATE public.relatorios
  SET
    elementos = elementos || v_novos,
    updated_at = now()
  WHERE titulo = 'Acompanhamento de Pipeline'
    AND deleted_at IS NULL;

END;
$$;
