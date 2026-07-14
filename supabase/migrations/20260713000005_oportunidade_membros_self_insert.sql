-- A tabela oportunidade_membros nunca teve a coluna tipo_membro (interno/canal),
-- mas o app (Pipeline.js, useOppMembros.js) sempre esperou esse campo pra separar
-- as seções "Time Interno" / "Contatos Canal" da aba Equipe — o insert real
-- sempre falhava silenciosamente (usava só o fallback de localStorage).
ALTER TABLE public.oportunidade_membros
  ADD COLUMN IF NOT EXISTS tipo_membro text NOT NULL DEFAULT 'interno';

-- Permite que qualquer usuário se auto-adicione como membro (seção "Contatos Canal")
-- de uma oportunidade que ele mesmo está criando — sem abrir gerenciamento amplo,
-- que continua restrito a admin_isv pela policy já existente.
CREATE POLICY "oportunidade_membros: self_insert" ON public.oportunidade_membros
  FOR INSERT WITH CHECK (
    tenant_id = public.my_tenant_id()
    AND user_id = auth.uid()
    AND tipo_membro = 'canal'
  );
