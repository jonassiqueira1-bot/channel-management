-- Corrige vínculos de franquia/parceiro que foram salvos com IDs da lista mock
-- (settings:franquias_v2 no localStorage) em vez do id real da tabela parceiros.
-- Estratégia: usar o nome salvo junto (ex: franquia_ar_nome, empresa_nome) para
-- encontrar o parceiro real e corrigir o id.

-- 1) companies.custom_fields.franquia_ar_id → corrige usando franquia_ar_nome
UPDATE public.companies c
SET custom_fields = jsonb_set(
  c.custom_fields,
  '{franquia_ar_id}',
  to_jsonb(p.id::text)
)
FROM public.parceiros p
WHERE c.custom_fields->>'franquia_ar_nome' IS NOT NULL
  AND c.custom_fields->>'franquia_ar_nome' != ''
  AND p.nome = c.custom_fields->>'franquia_ar_nome'
  AND p.tenant_id = c.tenant_id
  AND c.custom_fields->>'franquia_ar_id' IS DISTINCT FROM p.id::text;

-- 2) sellers.custom_fields.franquia_id → corrige usando franquia_nome
UPDATE public.sellers s
SET custom_fields = jsonb_set(
  s.custom_fields,
  '{franquia_id}',
  to_jsonb(p.id::text)
)
FROM public.parceiros p
WHERE s.custom_fields->>'franquia_nome' IS NOT NULL
  AND s.custom_fields->>'franquia_nome' != ''
  AND p.nome = s.custom_fields->>'franquia_nome'
  AND p.tenant_id = s.tenant_id
  AND s.custom_fields->>'franquia_id' IS DISTINCT FROM p.id::text;

-- 3) actions.custom_fields.empresa_id → corrige usando empresa_nome
--    (empresa_id em Ações representa a Unidade/Franquia, mapeado para parceiros)
UPDATE public.actions a
SET custom_fields = jsonb_set(
  a.custom_fields,
  '{empresa_id}',
  to_jsonb(p.id::text)
)
FROM public.parceiros p
WHERE a.custom_fields->>'empresa_nome' IS NOT NULL
  AND a.custom_fields->>'empresa_nome' != ''
  AND p.nome = a.custom_fields->>'empresa_nome'
  AND p.tenant_id = a.tenant_id
  AND a.custom_fields->>'empresa_id' IS DISTINCT FROM p.id::text;
