import { useState } from 'react'

// Padrão único de "custos com aprovação" — usado em Ações, Campanhas e
// Orçamento (lançamentos manuais). Antes cada tela tinha sua própria cópia
// colada do mesmo componente (com divergências, incluindo pills que uma
// cópia corrigiu e as outras não) — agora é uma fonte só.
//
// Fluxo: item nasce com previsto → solicita aprovação → admin/financeiro
// aprova ou rejeita → só depois de aprovado dá pra marcar como executado
// (que é quando o valor realizado passa a contar de verdade).
//
// Armazenamento é decisão de quem usa o componente: onAdd/onUpdate/onRemove
// são callbacks — podem atualizar um array em memória (Ações/Campanhas,
// custom_fields.custos) ou persistir cada item numa tabela própria
// (Orçamento, orcamento_lancamentos). O componente não sabe a diferença.

const APROVACAO_CFG = {
  aguardando: { label: 'Aguardando aprovação', color: '#B45309' },
  aprovado:   { label: 'Aprovado',             color: '#059669' },
  rejeitado:  { label: 'Rejeitado',            color: '#DC2626' },
}
const TIPO_CFG = {
  despesa: { label: 'Despesa', color: '#DC2626' },
  receita: { label: 'Receita', color: '#059669' },
}

function fmtMoeda(v) {
  if (!v && v !== 0) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const lblS = { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 3 }

export default function CustosSection({
  items, onAdd, onUpdate, onRemove,
  podeAprovar = false, nomeUsuario = 'Usuário',
  mostrarClassificacao = false,
  addLabel = '+ Adicionar item de custo',
  allowBulk = true,
}) {
  const [abertoId, setAbertoId] = useState(null)
  const [selected, setSelected] = useState([])
  const [obsInput, setObsInput] = useState({})

  const totalPrev = items.reduce((s, c) => s + (Number(c.valor_previsto) || 0), 0)
  const totalExec = items.reduce((s, c) => s + (c.executado ? (Number(c.valor_realizado) || 0) : 0), 0)

  function solicitarAprovacao(item) {
    const entrada = { id: crypto.randomUUID(), status: 'aguardando', obs: '', por: nomeUsuario, em: new Date().toISOString() }
    onUpdate(item.id, { aprovacoes: [entrada] })
  }
  function aprovar(item, status) {
    const entrada = { id: crypto.randomUUID(), status, obs: obsInput[item.id] || '', por: nomeUsuario, em: new Date().toISOString() }
    onUpdate(item.id, { aprovacoes: [...(item.aprovacoes || []), entrada] })
    setObsInput(o => ({ ...o, [item.id]: '' }))
  }
  function marcarExecutado(item, executado) {
    // Sem valor realizado preenchido, "executado" ficaria contando R$ 0,00
    // silenciosamente — assume o previsto como ponto de partida (editável).
    const valorRealizado = executado && !Number(item.valor_realizado) ? item.valor_previsto : item.valor_realizado
    onUpdate(item.id, { executado, valor_realizado: valorRealizado })
  }

  const toggleSel = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const allSel = items.length > 0 && selected.length === items.length
  const toggleAll = () => setSelected(allSel ? [] : items.map(c => c.id))
  const bulkAprovar = status => {
    selected.forEach(id => {
      const item = items.find(c => c.id === id)
      if (!item) return
      onUpdate(id, { aprovacoes: [...(item.aprovacoes || []), { id: crypto.randomUUID(), status, obs: '', por: nomeUsuario, em: new Date().toISOString() }] })
    })
    setSelected([])
  }
  const bulkExecutar = executado => {
    selected.forEach(id => {
      const item = items.find(c => c.id === id)
      if (item) marcarExecutado(item, executado)
    })
    setSelected([])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['Total previsto', fmtMoeda(totalPrev), false], ['Total executado', fmtMoeda(totalExec), totalExec > totalPrev]].map(([lbl, val, red]) => (
            <div key={lbl} style={{ padding: '8px 12px', background: 'var(--surface2)', borderRadius: 7, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{lbl}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: red ? '#EF4444' : 'var(--text)', marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {allowBulk && items.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
          <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor: 'pointer' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selected.length > 0 ? `${selected.length} selecionado(s)` : 'Selecionar todos'}</span>
          {selected.length > 0 && (
            <>
              {podeAprovar && (
                <>
                  <button onClick={() => bulkAprovar('aprovado')} style={btnSolid('#10B981')}>✓ Aprovar selecionados</button>
                  <button onClick={() => bulkAprovar('rejeitado')} style={btnSolid('#EF4444')}>✗ Rejeitar selecionados</button>
                </>
              )}
              <button onClick={() => bulkExecutar(true)} style={btnOutline('#6366F1')}>✔ Marcar como executado</button>
              <button onClick={() => bulkExecutar(false)} style={btnOutline('var(--text-muted)', 'var(--border)')}>Desmarcar execução</button>
            </>
          )}
        </div>
      )}

      {items.map((item, idx) => {
        const ultima = (item.aprovacoes || []).slice(-1)[0]
        const cfgAp = ultima ? (APROVACAO_CFG[ultima.status] || APROVACAO_CFG.aguardando) : null
        const aprovado = ultima?.status === 'aprovado'
        const isOpen = abertoId === item.id
        return (
          <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface2)', cursor: 'pointer' }}
              onClick={() => setAbertoId(isOpen ? null : item.id)}>
              {allowBulk && (
                <input type="checkbox" checked={selected.includes(item.id)} onClick={e => e.stopPropagation()} onChange={() => toggleSel(item.id)} style={{ cursor: 'pointer', flexShrink: 0 }} />
              )}
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 }}>#{idx + 1}</span>
              {mostrarClassificacao && (
                <span style={{ fontSize: 10, fontWeight: 700, color: TIPO_CFG[item.tipo || 'despesa']?.color, flexShrink: 0 }}>{TIPO_CFG[item.tipo || 'despesa']?.label}</span>
              )}
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.descricao || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem descrição</span>}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{fmtMoeda(item.valor_previsto)}</span>
              {cfgAp && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: cfgAp.color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfgAp.color, flexShrink: 0 }} />{cfgAp.label}
                </span>
              )}
              {aprovado && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: item.executado ? '#6D28D9' : 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.executado ? '#6D28D9' : 'var(--border2)', flexShrink: 0 }} />
                  {item.executado ? 'Executado' : 'Não executado'}
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
              <button onClick={e => { e.stopPropagation(); if (window.confirm('Remover?')) onRemove(item.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            {isOpen && (
              <>
                <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: mostrarClassificacao ? '110px 1fr' : '1fr', gap: 8 }}>
                  {mostrarClassificacao && (
                    <div>
                      <label style={lblS}>Classificação</label>
                      <select className="so-field" value={item.tipo || 'despesa'} onChange={e => onUpdate(item.id, { tipo: e.target.value })} style={{ width: '100%', boxSizing: 'border-box' }}>
                        {Object.entries(TIPO_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label style={lblS}>Descrição / Justificativa</label>
                    <input className="so-field" value={item.descricao} onChange={e => onUpdate(item.id, { descricao: e.target.value })} placeholder="Finalidade do custo…" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ padding: '0 10px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={lblS}>Previsto (R$)</label>
                    <input className="so-field" type="number" min="0" step="0.01" value={item.valor_previsto} onChange={e => onUpdate(item.id, { valor_previsto: e.target.value })} placeholder="0,00" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={lblS}>Realizado (R$)</label>
                    <input className="so-field" type="number" min="0" step="0.01" value={item.valor_realizado} onChange={e => onUpdate(item.id, { valor_realizado: e.target.value })} placeholder="0,00" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>

                {aprovado && (
                  <div style={{ padding: '0 10px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" id={`exec-${item.id}`} checked={!!item.executado} onChange={e => marcarExecutado(item, e.target.checked)} style={{ cursor: 'pointer' }} />
                    <label htmlFor={`exec-${item.id}`} style={{ fontSize: 12, fontWeight: 600, color: item.executado ? '#5B21B6' : 'var(--text)', cursor: 'pointer' }}>
                      {item.executado ? 'Custo executado' : 'Marcar como executado'}
                    </label>
                  </div>
                )}

                {(item.aprovacoes || []).length > 0 && (
                  <div style={{ margin: '0 10px 6px', background: 'var(--surface2)', borderRadius: 6, padding: '6px 8px' }}>
                    {(item.aprovacoes || []).map(ap => {
                      const ac = APROVACAO_CFG[ap.status] || APROVACAO_CFG.aguardando
                      return (
                        <div key={ap.id} style={{ display: 'flex', gap: 6, fontSize: 10, marginBottom: 2, color: 'var(--text-muted)' }}>
                          <span style={{ color: ac.color, fontWeight: 700 }}>{ap.status === 'aprovado' ? '✓' : ap.status === 'rejeitado' ? '✗' : '⏳'}</span>
                          <span><b style={{ color: 'var(--text)' }}>{ac.label}</b> · {ap.por} · {new Date(ap.em).toLocaleString('pt-BR')}{ap.obs ? ` — ${ap.obs}` : ''}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                {(item.aprovacoes || []).length === 0 ? (
                  <div style={{ padding: '0 10px 8px' }}>
                    <button onClick={() => solicitarAprovacao(item)} style={btnOutline('var(--accent)', 'var(--accent)')}>Solicitar aprovação</button>
                  </div>
                ) : podeAprovar && !aprovado ? (
                  <div style={{ display: 'flex', gap: 6, padding: '0 10px 8px', alignItems: 'center' }}>
                    <input className="so-field" value={obsInput[item.id] || ''} onChange={e => setObsInput(o => ({ ...o, [item.id]: e.target.value }))}
                      placeholder="Observação (opcional)…" style={{ flex: 1, fontSize: 11 }} />
                    <button onClick={() => aprovar(item, 'aprovado')} style={btnSolid('#10B981')}>✓ Aprovar</button>
                    <button onClick={() => aprovar(item, 'rejeitado')} style={btnSolid('#EF4444')}>✗ Rejeitar</button>
                  </div>
                ) : !podeAprovar && !aprovado ? (
                  <div style={{ padding: '4px 10px 8px', fontSize: 11, color: 'var(--text-muted)' }}>Aguardando aprovação do administrador ou financeiro.</div>
                ) : null}
              </>
            )}
          </div>
        )
      })}

      <button onClick={onAdd} style={{ padding: '6px 0', borderRadius: 7, border: '1px dashed var(--border)', background: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
        {addLabel}
      </button>
    </div>
  )
}

function btnSolid(bg) {
  return { padding: '5px 10px', borderRadius: 6, border: 'none', background: bg, color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }
}
function btnOutline(color, borderColor = color) {
  return { padding: '5px 10px', borderRadius: 6, border: `1px solid ${borderColor}`, background: 'none', color, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }
}
