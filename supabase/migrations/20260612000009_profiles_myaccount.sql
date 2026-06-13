-- ─── Perfis — ajustes para Minha Conta ──────────────────────────────────────
-- Adiciona phone, avatar_url e endereço; reforça RLS de auto-edição.

ALTER TABLE perfis
  ADD COLUMN IF NOT EXISTS phone      text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cargo      text DEFAULT NULL;

COMMENT ON COLUMN perfis.phone      IS 'Telefone / WhatsApp pessoal do usuário.';
COMMENT ON COLUMN perfis.avatar_url IS 'URL pública do avatar no Supabase Storage (bucket: avatars).';
COMMENT ON COLUMN perfis.cargo      IS 'Cargo / função exibida no perfil.';

-- ─── RLS: cada usuário pode ler e editar apenas o próprio perfil ──────────────
-- (admin_isv e admin_franquia já têm policies mais amplas — esta cobre os demais)
DROP POLICY IF EXISTS "self_read"   ON perfis;
DROP POLICY IF EXISTS "self_edit"   ON perfis;
DROP POLICY IF EXISTS "self_select" ON perfis;
DROP POLICY IF EXISTS "self_update" ON perfis;

CREATE POLICY "self_select" ON perfis
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "self_update" ON perfis
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ─── Storage: bucket de avatares ──────────────────────────────────────────────
-- Crie o bucket 'avatars' como PUBLIC no painel do Supabase Storage.
-- Política de upload: authenticated, path = {user_id}/avatar.*
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;
