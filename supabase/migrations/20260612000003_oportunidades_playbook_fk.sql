-- ─── Vincula oportunidades ao Playbook de produto/solução ────────────────────
-- playbook_id é opcional: a oportunidade pode ou não ter um playbook associado.
-- Quando presente, o front-end exibe guias contextuais por etapa do funil.

ALTER TABLE oportunidades
  ADD COLUMN IF NOT EXISTS playbook_id uuid
    REFERENCES playbooks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oportunidades_playbook ON oportunidades(playbook_id);

COMMENT ON COLUMN oportunidades.playbook_id IS
  'Playbook de produto/solução associado. Usado para exibir guias de venda contextuais por etapa do funil.';
