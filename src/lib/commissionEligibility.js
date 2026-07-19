// Avalia se uma Oportunidade é elegível a comissão, para um membro específico
// (Time Interno ou Contato Canal), contra as regras cadastradas em Comissões
// (commission_rules — ver src/pages/Comissoes.js e src/data/mockComissoes.js).
//
// Resultado é sempre computado ao vivo (nunca persistido) — se ficasse gravado
// no banco, ficaria desatualizado assim que alguém editasse uma regra ou a
// própria oportunidade. "Sim" == existe pelo menos uma regra vigente, que
// alcança esse membro, e cujas condições de elegibilidade (as que dá pra
// avaliar automaticamente) são todas atendidas pela oportunidade.
//
// Limitação assumida: `condicoes_elegibilidade` guardadas numa regra podem
// referenciar entidades fora da Oportunidade (Contrato, Meta, Produto,
// Cliente) e `condicoes_join` cruzando entidades — não há dado de contrato/
// meta disponível neste ponto do fluxo (aba Equipe da Oportunidade), então
// essas condições não são avaliáveis aqui. Uma regra com qualquer condição
// não avaliável é tratada como "não atende" nesta tela, pra nunca dar um
// "Sim" falso-positivo — o vendedor pode abrir a regra em Comissões pra
// conferir o motivo exato.

const STATUS_POR_SITUACAO = {
  em_andamento: 'Aberta',
  suspensa:     'Em negociação',
  ganha:        'Fechada (ganho)',
  perdida:      'Fechada (perda)',
}

function compararOperador(valorOpp, operador, valorRegra) {
  switch (operador) {
    case '=':      return String(valorOpp) === String(valorRegra)
    case '!=':     return String(valorOpp) !== String(valorRegra)
    case '>=':     return Number(valorOpp) >= Number(valorRegra)
    case '<=':     return Number(valorOpp) <= Number(valorRegra)
    case '>':      return Number(valorOpp) > Number(valorRegra)
    case '<':      return Number(valorOpp) < Number(valorRegra)
    case 'contém': return String(valorOpp || '').toLowerCase().includes(String(valorRegra || '').toLowerCase())
    default:       return false
  }
}

// Monta o "retrato" da oportunidade nos campos que a entidade 'oportunidade'
// do construtor de condições conhece (ver ENTIDADES_ELEGIBILIDADE em mockComissoes.js).
function retratoOportunidade(opp, etapaNome) {
  return {
    status:        STATUS_POR_SITUACAO[opp.situacao] || 'Aberta',
    valor:         Number(opp.valor) || 0,
    etapa:         etapaNome || '',
    origem:        opp.origem || '',
    data_cadastro: opp.criado || '',
  }
}

function regraVigente(rule) {
  if (rule.ativo === false) return false
  if (rule.status && rule.status !== 'ativa') return false
  const hoje = new Date().toISOString().slice(0, 10)
  if (rule.vigencia_inicio && hoje < rule.vigencia_inicio) return false
  if (rule.vigencia_fim && hoje > rule.vigencia_fim) return false
  return true
}

function regraAlcancaMembro(rule, membro) {
  if (membro.tipo_membro === 'interno') {
    if (rule.escopo_interno) return true
    if (rule.escopo_equipe && (rule.equipe_ids || []).map(String).includes(String(membro.user_id))) return true
    return false
  }
  if (membro.tipo_membro === 'canal') {
    if (!rule.escopo_externo) return false
    // Sem beneficiário/contato específico marcado na regra = alcança qualquer contato de canal.
    if (!rule.beneficiario_id && !rule.contato_id) return true
    return String(rule.beneficiario_id) === String(membro.user_id) || String(rule.contato_id) === String(membro.user_id)
  }
  return false
}

function regraAlcancaProduto(rule, itens) {
  if (rule.produto_filtro_tipo === 'produto' && (rule.produto_ids || []).length > 0) {
    return itens.some(it => (rule.produto_ids || []).map(String).includes(String(it.produto_id)))
  }
  if (rule.produto_filtro_tipo === 'categoria' && (rule.produto_categorias || []).length > 0) {
    return itens.some(it => (rule.produto_categorias || []).includes(it.tipo))
  }
  // Sem filtro de produto configurado — regra vale pra qualquer produto.
  return true
}

// Retorna { ok, motivo } — motivo só preenchido quando ok=false, útil pra debug/tooltip.
function condicoesAtendidas(rule, retrato) {
  const condicoes = rule.condicoes_elegibilidade || []
  for (const cond of condicoes) {
    if (cond.entidade !== 'oportunidade') {
      return { ok: false, motivo: `condição em "${cond.entidade}" não avaliável nesta tela` }
    }
    const valorOpp = retrato[cond.campo]
    if (valorOpp === undefined || !compararOperador(valorOpp, cond.operador, cond.valor)) {
      return { ok: false, motivo: cond.label || `${cond.campo} ${cond.operador} ${cond.valor}` }
    }
  }
  return { ok: true, motivo: null }
}

// Avalia uma regra específica contra a oportunidade + membro. Retorna { elegivel, motivo }.
export function avaliarRegra(rule, opp, membro, etapaNome) {
  if (!regraVigente(rule))                    return { elegivel: false, motivo: 'regra fora de vigência' }
  if (!regraAlcancaMembro(rule, membro))       return { elegivel: false, motivo: 'regra não alcança este membro' }
  if (!regraAlcancaProduto(rule, opp.itens||[])) return { elegivel: false, motivo: 'produto da oportunidade fora do escopo da regra' }
  const retrato = retratoOportunidade(opp, etapaNome)
  const { ok, motivo } = condicoesAtendidas(rule, retrato)
  return { elegivel: ok, motivo: ok ? null : motivo }
}

// Resultado agregado pra um membro: Sim se QUALQUER regra vigente o alcança e
// é atendida pela oportunidade; senão Não (com o motivo da regra mais próxima,
// pra dar uma pista de por que não bateu, quando existe ao menos uma regra que
// alcança o membro mas não bate nas condições).
export function avaliarElegibilidadeMembro(rules, opp, membro, etapaNome) {
  const aplicaveis = (rules || []).filter(r => regraVigente(r) && regraAlcancaMembro(r, membro))
  if (aplicaveis.length === 0) return { elegivel: false, motivo: 'nenhuma regra de comissão vigente para este membro' }

  for (const rule of aplicaveis) {
    const r = avaliarRegra(rule, opp, membro, etapaNome)
    if (r.elegivel) return { elegivel: true, motivo: null, regra: rule.nome }
  }
  const primeiraFalha = avaliarRegra(aplicaveis[0], opp, membro, etapaNome)
  return { elegivel: false, motivo: primeiraFalha.motivo || 'não atende às condições da regra', regra: aplicaveis[0].nome }
}
