-- Campanhas de Incentivo (agora só "Campanhas" na tela) ganham relacionamento
-- opcional com: Franquias (uma/algumas/todas), Contatos Canais, Contatos,
-- Empresas (por dimensão — segmento/ativas — ou específicas), Playbook e Funil.
-- materials sai do jsonb genérico "extra" (que hoje é mal-aproveitado, guarda
-- só os links) pra uma coluna própria, liberando espaço pros novos campos.
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS materials jsonb DEFAULT '[]';
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS franquia_modo text DEFAULT 'todas'; -- 'todas' | 'algumas'
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS franquia_ids jsonb DEFAULT '[]';
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS contato_canal_ids jsonb DEFAULT '[]';
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS contato_ids jsonb DEFAULT '[]';
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS empresa_ids jsonb DEFAULT '[]';
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS empresa_segmentos jsonb DEFAULT '[]';
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS empresa_apenas_ativas boolean DEFAULT false;
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS playbook_id uuid REFERENCES public.playbooks(id) ON DELETE SET NULL;
-- funil_id sem FK: funis não vivem em tabela própria, ficam como array dentro
-- de form_layouts.fields (ver useFunnels.js) — mesmo padrão "soft reference"
-- já usado pra funil_id em outras entidades do sistema.
ALTER TABLE public.campanhas ADD COLUMN IF NOT EXISTS funil_id uuid;

-- Migra o que já estava em `extra` (só continha os links de materiais) pra
-- a coluna própria, e limpa `extra` do uso indevido anterior.
UPDATE public.campanhas
SET materials = extra
WHERE materials = '[]'::jsonb AND jsonb_typeof(extra) = 'array' AND extra IS NOT NULL;

NOTIFY pgrst, 'reload schema';
