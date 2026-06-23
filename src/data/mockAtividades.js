// Registros de atividades/interações de oportunidades
// Em produção: SELECT * FROM atividades WHERE opp_id = ? ORDER BY criado_em DESC

export const MOCK_ATIVIDADES = [
  // ── Opp 1 – Expansão Canal SP ──────────────────────────────────────────────
  { id:11, opp_id:1, tipo:'nota',      titulo:'Briefing inicial', conteudo:'Cliente confirmou interesse em expandir para São Paulo. Quer piloto em Q3. Precisa de proposta formal até 15/07.', usuario:'Lucas Ferreira', criado_em:'2026-05-28T16:25:00' },
  { id:12, opp_id:1, tipo:'whatsapp',  titulo:'', conteudo:'Oi Lucas! Consegui alinhar com o diretor aqui. Pode mandar a proposta até semana que vem?', usuario:'Lucas Ferreira', criado_em:'2026-06-01T09:12:00' },
  { id:13, opp_id:1, tipo:'email',     titulo:'Re: Proposta Boostly Pro', conteudo:'Enviada proposta completa com precificação, SLA e cronograma de implantação. Aguardando retorno em 5 dias úteis.', usuario:'Lucas Ferreira', criado_em:'2026-06-02T14:30:00' },

  // ── Opp 2 – Renovação Contrato 2025 ────────────────────────────────────────
  { id:21, opp_id:2, tipo:'ligacao',   titulo:'Ligação de qualificação', conteudo:'Falei com a Carla. Contrato vence em agosto. Eles querem negociar desconto de 15% para renovar por 24 meses.', usuario:'Carla Menezes', criado_em:'2026-05-20T11:00:00' },
  { id:22, opp_id:2, tipo:'email',     titulo:'Proposta de renovação', conteudo:'Enviada proposta de renovação com desconto de 10% e inclusão do Suporte Premium sem custo adicional no primeiro mês.', usuario:'Carla Menezes', criado_em:'2026-06-01T15:00:00' },
  { id:23, opp_id:2, tipo:'nota',      titulo:'Follow-up pendente', conteudo:'Cliente em férias até dia 20. Reagendar reunião de decisão para 22/06.', usuario:'Admin', criado_em:'2026-06-05T08:30:00' },

  // ── Opp 5 – Contrato financeiro SP ─────────────────────────────────────────
  { id:51, opp_id:5, tipo:'nota',      titulo:'Reunião com C-Level', conteudo:'Reunião com CFO e CTO. Ambos aprovaram o produto tecnicamente. Decisão final depende de aprovação do board em 10/06.', usuario:'Mariana Silva', criado_em:'2026-05-12T16:00:00' },
  { id:52, opp_id:5, tipo:'whatsapp',  titulo:'', conteudo:'Mariana, o board aprovou! Mas pediram uma revisão no prazo de implantação. Pode ser em 60 dias?', usuario:'Mariana Silva', criado_em:'2026-06-02T10:45:00' },
  { id:53, opp_id:5, tipo:'email',     titulo:'Ajuste no cronograma', conteudo:'Confirmado prazo de 60 dias para implantação. Contrato será enviado para assinatura via DocuSign até 12/06.', usuario:'Mariana Silva', criado_em:'2026-06-03T13:20:00' },
  { id:54, opp_id:5, tipo:'nota',      titulo:'Suspensão temporária', conteudo:'Negociação suspensa por 10 dias por reestruturação interna do cliente. Retomar contato em 01/06.', usuario:'Admin', criado_em:'2026-05-20T17:05:00' },

  // ── Opp 6 – Piloto agro PR ──────────────────────────────────────────────────
  { id:61, opp_id:6, tipo:'nota',      titulo:'Proposta aceita!', conteudo:'João confirmou fechamento. Cliente ficou muito satisfeito com a demo. Assina contrato presencialmente na sexta.', usuario:'João Lima', criado_em:'2026-05-10T15:35:00' },
  { id:62, opp_id:6, tipo:'ligacao',   titulo:'Ligação de fechamento', conteudo:'Ligação de 40min detalhando o onboarding. Cliente quer começar a implantação em 15/06. Kickoff agendado.', usuario:'João Lima', criado_em:'2026-05-28T10:00:00' },
  { id:63, opp_id:6, tipo:'whatsapp',  titulo:'', conteudo:'Contrato assinado! 🎉 Bem-vindo à família Boostly, AgriSmart!', usuario:'João Lima', criado_em:'2026-06-01T11:05:00' },

  // ── Opp 10 – Aprovação parceiro RJ ────────────────────────────────────────
  { id:101, opp_id:10, tipo:'nota',    titulo:'Perda confirmada', conteudo:'Cliente optou pela solução da concorrente após comparativo técnico. Preço foi fator decisivo — deles é 18% menor. Manter relacionamento para futuras oportunidades.', usuario:'Pedro Alves', criado_em:'2026-06-05T17:35:00' },
]
