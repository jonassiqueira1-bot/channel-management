-- Adiciona tabela dinâmica: Semana › Origem › Campanha
-- Colunas: Novas · Ganho · Perdas · % Conv. · Tkt Médio · Real. (R$)
-- Inspirada no relatório Power BI de acompanhamento de pipeline

DO $$
DECLARE
  v_novos jsonb;
BEGIN
  -- Último elemento termina em ~y=2786 (2466 + 320)
  v_novos := '[
    {"id":"s-div9","tipo":"divisor","x":0,"y":2794,"w":1083,"h":8},

    {"id":"s-t10","tipo":"texto","x":0,"y":2810,"w":1083,"h":28,
     "dados":{"conteudo":"📅  Detalhamento por Semana · Origem · Campanha","fontSize":14,"fontWeight":"bold","color":"#374151"}},

    {"id":"s-td4","tipo":"tabela_dinamica","x":0,"y":2846,"w":1083,"h":400,
     "dados":{
       "titulo":"Novas · Ganho · Perdas · % Conv. · Ticket · Realizado",
       "sourceId":"pipeline",
       "camposAgrupadores":[
         {"campo":"semana","granularidade":"nenhuma"},
         {"campo":"origem","granularidade":"nenhuma"},
         {"campo":"campanha","granularidade":"nenhuma"}
       ],
       "colunas":[
         {"id":"c1","tipo":"count","label":"Novas"},
         {"id":"c2","tipo":"count","label":"Ganho",
          "filtro":{"campo":"situacao","valor":"ganho"}},
         {"id":"c3","tipo":"count","label":"Perdas",
          "filtro":{"campo":"situacao","valor":"perdido"}},
         {"id":"c4","tipo":"pct_group","label":"% Conv.",
          "filtro":{"campo":"situacao","valor":"ganho"}},
         {"id":"c5","tipo":"avg","campo":"valor","label":"Tkt Méd.",
          "filtro":{"campo":"situacao","valor":"ganho"}},
         {"id":"c6","tipo":"sum","campo":"valor","label":"Real. (R$)",
          "filtro":{"campo":"situacao","valor":"ganho"}}
       ],
       "ordenar":"grupo_asc",
       "limite":60
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
