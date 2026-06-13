// Tabela: oportunidade_membros
// Schema Supabase (referência):
//
//   CREATE TABLE oportunidade_membros (
//     id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//     oportunidade_id bigint NOT NULL REFERENCES oportunidades(id) ON DELETE CASCADE,
//     user_id         uuid   NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
//     tipo_membro     text   NOT NULL CHECK (tipo_membro IN ('interno','externo')),
//     papel           text   NOT NULL,   -- vendedor | pre_vendas | gerente_canais | engenheiro | supervisor | outro
//     tenant_id       uuid   NOT NULL,
//     criado_em       timestamptz DEFAULT now(),
//     UNIQUE (oportunidade_id, user_id)
//   );
//
// RLS:
//   -- Internos (ISV): acesso total dentro do tenant
//   CREATE POLICY "interno_full" ON oportunidade_membros
//     FOR ALL USING (
//       auth.uid() IN (SELECT id FROM users WHERE tenant_id = oportunidade_membros.tenant_id AND tipo = 'interno')
//     );
//
//   -- Externos (franquias): veem apenas membros da própria franquia
//   --   OU membros internos já vinculados à mesma oportunidade
//   CREATE POLICY "externo_read" ON oportunidade_membros
//     FOR SELECT USING (
//       user_id = auth.uid()
//       OR tipo_membro = 'interno'
//       OR user_id IN (
//         SELECT user_id FROM users
//         WHERE franquia_id = (SELECT franquia_id FROM users WHERE id = auth.uid())
//       )
//     );
//
//   CREATE POLICY "externo_insert" ON oportunidade_membros
//     FOR INSERT WITH CHECK (
//       user_id IN (
//         SELECT id FROM users
//         WHERE franquia_id = (SELECT franquia_id FROM users WHERE id = auth.uid())
//       )
//       OR tipo_membro = 'interno'
//     );

// Seeds para oportunidades 1, 2 e 5 (ids do MOCK_OPORTUNIDADES)
export const MOCK_MEMBROS_OPP = [
  // Oportunidade 1 — Expansão Canal SP
  { id: 'm1', oportunidade_id: 1, user_id: 'u1', tipo_membro: 'interno', papel: 'gerente_canais', tenant_id: 't1' },
  { id: 'm2', oportunidade_id: 1, user_id: 'u3', tipo_membro: 'interno', papel: 'pre_vendas',     tenant_id: 't1' },
  { id: 'm3', oportunidade_id: 1, user_id: 'u7', tipo_membro: 'externo', papel: 'vendedor',       tenant_id: 't1' },

  // Oportunidade 2 — Renovação Contrato 2025
  { id: 'm4', oportunidade_id: 2, user_id: 'u2', tipo_membro: 'interno', papel: 'vendedor',       tenant_id: 't1' },
  { id: 'm5', oportunidade_id: 2, user_id: 'u9', tipo_membro: 'externo', papel: 'vendedor',       tenant_id: 't1' },

  // Oportunidade 5 — Contrato financeiro SP
  { id: 'm6', oportunidade_id: 5, user_id: 'u5', tipo_membro: 'interno', papel: 'gerente_canais', tenant_id: 't1' },
  { id: 'm7', oportunidade_id: 5, user_id: 'u4', tipo_membro: 'interno', papel: 'engenheiro',     tenant_id: 't1' },
  { id: 'm8', oportunidade_id: 5, user_id: 'u11',tipo_membro: 'externo', papel: 'vendedor',       tenant_id: 't1' },
]

export const PAPEIS = [
  { value: 'vendedor',       label: 'Vendedor' },
  { value: 'pre_vendas',     label: 'Pré-vendas' },
  { value: 'gerente_canais', label: 'Gerente de Canais' },
  { value: 'engenheiro',     label: 'Engenheiro de Soluções' },
  { value: 'supervisor',     label: 'Supervisor' },
  { value: 'outro',          label: 'Outro' },
]
