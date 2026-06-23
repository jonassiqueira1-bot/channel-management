// Histórico de alterações de oportunidades
// Em produção: SELECT * FROM oportunidade_logs WHERE opp_id = ? ORDER BY criado_em DESC
// Campos: id, opp_id, evento, campos (array de { campo, de, para }), usuario, criado_em

export const MOCK_LOGS_OPORTUNIDADE = [

  // ── Oportunidade 1 — Expansão Canal SP ──────────────────────────────────────
  { id:101, opp_id:1, evento:'criado',           campos:[], usuario:'Lucas Ferreira',  criado_em:'2026-05-01T09:12:00' },
  { id:102, opp_id:1, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Prospecção', para:'Qualificação' }], usuario:'Lucas Ferreira', criado_em:'2026-05-08T14:30:00' },
  { id:103, opp_id:1, evento:'editado',          campos:[{ campo:'Valor MRR', de:'R$ 650', para:'R$ 890' }], usuario:'Lucas Ferreira', criado_em:'2026-05-15T10:05:00' },
  { id:104, opp_id:1, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Qualificação', para:'Proposta' }], usuario:'Lucas Ferreira', criado_em:'2026-05-28T16:20:00' },
  { id:105, opp_id:1, evento:'produto_adicionado', campos:[{ campo:'Produto', de:'—', para:'Boostly Pro × 1' }], usuario:'Lucas Ferreira', criado_em:'2026-05-28T16:22:00' },
  { id:106, opp_id:1, evento:'editado',          campos:[{ campo:'Prazo', de:'2026-07-15', para:'2026-07-30' }], usuario:'Admin', criado_em:'2026-06-02T09:00:00' },

  // ── Oportunidade 2 — Renovação Contrato 2025 ────────────────────────────────
  { id:201, opp_id:2, evento:'criado',           campos:[], usuario:'Carla Menezes',   criado_em:'2026-05-10T08:45:00' },
  { id:202, opp_id:2, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Prospecção', para:'Qualificação' }], usuario:'Carla Menezes', criado_em:'2026-05-14T11:30:00' },
  { id:203, opp_id:2, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Qualificação', para:'Proposta' }], usuario:'Carla Menezes', criado_em:'2026-05-20T15:10:00' },
  { id:204, opp_id:2, evento:'editado',          campos:[{ campo:'Valor MRR', de:'R$ 890', para:'R$ 1.340' },{ campo:'Responsável', de:'Carla Menezes', para:'Carla Menezes' }], usuario:'Carla Menezes', criado_em:'2026-05-22T09:30:00' },
  { id:205, opp_id:2, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Proposta', para:'Negociação' }], usuario:'Carla Menezes', criado_em:'2026-06-01T14:00:00' },
  { id:206, opp_id:2, evento:'produto_adicionado', campos:[{ campo:'Produto', de:'—', para:'Boostly Pro × 1' }], usuario:'Carla Menezes', criado_em:'2026-06-01T14:03:00' },
  { id:207, opp_id:2, evento:'produto_adicionado', campos:[{ campo:'Produto', de:'—', para:'Suporte Premium × 1' }], usuario:'Carla Menezes', criado_em:'2026-06-01T14:04:00' },

  // ── Oportunidade 5 — Contrato financeiro SP ─────────────────────────────────
  { id:501, opp_id:5, evento:'criado',           campos:[], usuario:'Mariana Silva',   criado_em:'2026-04-12T10:00:00' },
  { id:502, opp_id:5, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Prospecção', para:'Qualificação' }], usuario:'Mariana Silva', criado_em:'2026-04-18T11:00:00' },
  { id:503, opp_id:5, evento:'editado',          campos:[{ campo:'Responsável', de:'João Lima', para:'Mariana Silva' }], usuario:'Admin', criado_em:'2026-04-20T08:30:00' },
  { id:504, opp_id:5, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Qualificação', para:'Proposta' }], usuario:'Mariana Silva', criado_em:'2026-04-28T16:45:00' },
  { id:505, opp_id:5, evento:'editado',          campos:[{ campo:'Valor MRR', de:'R$ 1.800', para:'R$ 3.200' }], usuario:'Mariana Silva', criado_em:'2026-05-05T09:15:00' },
  { id:506, opp_id:5, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Proposta', para:'Negociação' }], usuario:'Mariana Silva', criado_em:'2026-05-12T14:20:00' },
  { id:507, opp_id:5, evento:'situacao_alterada',campos:[{ campo:'Situação', de:'Em andamento', para:'Suspensa' }], usuario:'Admin', criado_em:'2026-05-20T17:00:00' },
  { id:508, opp_id:5, evento:'situacao_alterada',campos:[{ campo:'Situação', de:'Suspensa', para:'Em andamento' }], usuario:'Admin', criado_em:'2026-06-01T09:00:00' },

  // ── Oportunidade 6 — Piloto agro PR ─────────────────────────────────────────
  { id:601, opp_id:6, evento:'criado',           campos:[], usuario:'João Lima',       criado_em:'2026-03-05T08:00:00' },
  { id:602, opp_id:6, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Prospecção', para:'Qualificação' }], usuario:'João Lima', criado_em:'2026-03-15T10:30:00' },
  { id:603, opp_id:6, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Qualificação', para:'Proposta' }], usuario:'João Lima', criado_em:'2026-04-01T14:00:00' },
  { id:604, opp_id:6, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Proposta', para:'Negociação' }], usuario:'João Lima', criado_em:'2026-04-20T09:00:00' },
  { id:605, opp_id:6, evento:'produto_adicionado',campos:[{ campo:'Produto', de:'—', para:'Implantação Assistida × 1' }], usuario:'João Lima', criado_em:'2026-04-20T09:05:00' },
  { id:606, opp_id:6, evento:'etapa_alterada',   campos:[{ campo:'Etapa', de:'Negociação', para:'Fechamento' }], usuario:'João Lima', criado_em:'2026-05-10T15:30:00' },
  { id:607, opp_id:6, evento:'situacao_alterada',campos:[{ campo:'Situação', de:'Em andamento', para:'Ganha' }], usuario:'João Lima', criado_em:'2026-06-01T11:00:00' },

  // ── Oportunidade 10 — Aprovação parceiro RJ ──────────────────────────────────
  { id:1001, opp_id:10, evento:'criado',          campos:[], usuario:'Pedro Alves',    criado_em:'2026-04-28T09:00:00' },
  { id:1002, opp_id:10, evento:'etapa_alterada',  campos:[{ campo:'Etapa', de:'Prospecção', para:'Qualificação' }], usuario:'Pedro Alves', criado_em:'2026-05-05T10:00:00' },
  { id:1003, opp_id:10, evento:'editado',         campos:[{ campo:'Valor MRR', de:'R$ 890', para:'R$ 1.780' }], usuario:'Pedro Alves', criado_em:'2026-05-10T14:00:00' },
  { id:1004, opp_id:10, evento:'etapa_alterada',  campos:[{ campo:'Etapa', de:'Qualificação', para:'Proposta' }], usuario:'Pedro Alves', criado_em:'2026-05-20T16:00:00' },
  { id:1005, opp_id:10, evento:'situacao_alterada',campos:[{ campo:'Situação', de:'Em andamento', para:'Perdida' },{ campo:'Motivo', de:'—', para:'Escolheu concorrente' }], usuario:'Pedro Alves', criado_em:'2026-06-05T17:30:00' },
]
