-- Relatório essencial de lançamento (tema Projetos): Horas por Projeto —
-- Estimado x Executado. Usa a fonte de dados "projetos" já existente no
-- CanvasEditor (horas_est/horas_exec vêm de custom_fields.total_hours_*).
-- Não há campo de faturamento/valor ligado a Projeto ainda (gap real,
-- reportado à parte) — por isso o relatório cobre só o lado de horas.
INSERT INTO public.relatorios (tenant_id, branch_id, owner_id, titulo, tipo, config, elementos, acesso, papeis_permitidos, status)
SELECT
  t.id,
  NULL,
  NULL,
  'Horas por Projeto — Estimado x Executado',
  'relatorio',
  '{
    "tamanhoPagina": "A4",
    "margens": {"top":76,"right":76,"bottom":76,"left":76},
    "fundoPagina": {"tipo":"cor","cor":"#ffffff"},
    "cabecalho": {"ativo":true,"tipoFundo":"cor","corFundo":"#1E3A5F","titulo":"Horas por Projeto","subtitulo":"Estimado x Executado"},
    "rodape": {"ativo":true,"texto":"","paginacao":true}
  }'::jsonb,
  '[
    {"id":"el_seed_1","tipo":"kpi","x":0,"y":0,"w":206,"h":100,
     "dados":{"sourceId":"projetos","titulo":"Horas Estimadas (total)","metrica":"SUM","campoY":"horas_est","cor":"#2563EB"}},
    {"id":"el_seed_2","tipo":"kpi","x":218,"y":0,"w":206,"h":100,
     "dados":{"sourceId":"projetos","titulo":"Horas Executadas (total)","metrica":"SUM","campoY":"horas_exec","cor":"#10B981"}},
    {"id":"el_seed_3","tipo":"kpi","x":436,"y":0,"w":206,"h":100,
     "dados":{"sourceId":"projetos","titulo":"Qtd. de Projetos","metrica":"COUNT","cor":"#F59E0B"}},
    {"id":"el_seed_4","tipo":"tabela_dinamica","x":0,"y":108,"w":642,"h":320,
     "dados":{"sourceId":"projetos","titulo":"Horas por Projeto","campoAgrupador":"nome",
       "colunas":[
         {"id":"c1","tipo":"sum","campo":"horas_est","label":"Estimado (h)"},
         {"id":"c2","tipo":"sum","campo":"horas_exec","label":"Executado (h)"}
       ],
       "ordenar":"valor_desc","limite":50}}
  ]'::jsonb,
  'equipe',
  ARRAY['admin_isv','financeiro','projetos'],
  'publicado'
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.relatorios r
  WHERE r.tenant_id = t.id AND r.titulo = 'Horas por Projeto — Estimado x Executado'
);

NOTIFY pgrst, 'reload schema';
