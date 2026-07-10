-- Adiciona elemento de qualificação ao relatório "Acompanhamento de Pipeline":
--   Tabela dinâmica: Etapa › Situação — mostra por etapa quantas oportunidades
--   estão em andamento, ganhas ou perdidas, com % dentro de cada etapa (pct_parent)
--   Isso responde: "qual a taxa de conversão/qualificação por etapa do funil?"

DO $$
DECLARE
  v_novos jsonb;
BEGIN
  -- Acrescenta após os elementos já existentes (último termina em ~y=2406)
  v_novos := '[
    {"id":"s-div8","tipo":"divisor","x":0,"y":2414,"w":1083,"h":8},

    {"id":"s-t9","tipo":"texto","x":0,"y":2430,"w":1083,"h":28,
     "dados":{"conteudo":"🎯  Qualificação por Etapa — Situação das Oportunidades","fontSize":14,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-td3","tipo":"tabela_dinamica","x":0,"y":2466,"w":1083,"h":320,
     "dados":{
       "titulo":"Por Etapa › Situação (ganho · perdido · em andamento)",
       "sourceId":"pipeline",
       "camposAgrupadores":[
         {"campo":"etapa_nome","granularidade":"nenhuma"},
         {"campo":"situacao","granularidade":"nenhuma"}
       ],
       "colunas":[
         {"id":"c1","tipo":"count","label":"Qtd"},
         {"id":"c2","tipo":"pct_parent","label":"% da Etapa"},
         {"id":"c3","tipo":"pct_total","label":"% do Total"}
       ],
       "ordenar":"grupo_asc",
       "limite":50
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
