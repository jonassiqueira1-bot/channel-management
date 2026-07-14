import { useState, useCallback } from 'react'
import { useProfile } from '../hooks/useProfile'
import { useRoutines } from '../hooks/useRoutines'

// ─── Estilos (mesma linguagem visual de Rotinas.js, componente próprio pois
// contexto='produtos' não se encaixa no motor de execução pipeline-only) ──────
const C = {
  bg: 'var(--bg)', surface: 'var(--surface)', border: 'var(--border)',
  text: 'var(--text)', muted: 'var(--text-muted)', primary: 'var(--accent)',
  danger: '#ef4444', success: '#22c55e',
}
const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' },
  drawer:  { width:420, height:'100vh', background:C.bg, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column' },
  header:  { padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' },
  title:   { fontWeight:600, fontSize:15, color:C.text, margin:0 },
  body:    { flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 },
  btn: (variant='primary') => ({
    padding:'7px 14px', borderRadius:6, cursor:'pointer', fontSize:13, fontWeight:500,
    background: variant==='primary' ? C.primary : variant==='danger' ? C.danger : C.surface,
    color: variant==='ghost' ? C.text : '#fff',
    border: variant==='ghost' ? `1px solid ${C.border}` : 'none',
  }),
  card:  { background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 14px' },
  input: { width:'100%', padding:'7px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, boxSizing:'border-box' },
  label: { fontSize:12, color:C.muted, marginBottom:4, display:'block' },
  row:   { display:'flex', gap:8, alignItems:'center' },
  badge: (color='#888') => ({ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 7px', borderRadius:10, background:color+'22', color }),
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:1300, display:'flex', alignItems:'center', justifyContent:'center' },
  wizard:{ width:520, maxHeight:'90vh', background:C.bg, borderRadius:12, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden' },
}

const INDICES = ['IPCA', 'IGPM', 'Manual']

// ─── Executa o reajuste de uma rotina de produtos ────────────────────────────
export async function executarReajusteProdutos({ routine, produtos, saveExecution, tabelaPrecos }) {
  const p = routine.parametros || {}
  const alvo = p.aplicar_todos
    ? produtos.filter(x => x.status === 'ativo')
    : produtos.filter(x => (p.produto_ids || []).includes(x.id))

  if (!alvo.length) return { ok: false, message: 'Nenhum produto encontrado para esta rotina.' }

  const pct = Number(p.percentual || 0)
  const snapshot_antes  = alvo.map(x => ({ id: x.id, preco: Number(x.preco || 0) }))
  const snapshot_depois = alvo.map(x => ({ id: x.id, preco: Math.round(Number(x.preco || 0) * (1 + pct / 100) * 100) / 100 }))

  const ins = await tabelaPrecos.registrarReajusteEmMassa({
    produtos: alvo, percentual: pct, vigencia_inicio: p.vigencia_inicio, indice: p.indice, observacoes: p.observacoes,
  })
  if (!ins.ok) return { ok: false, message: ins.message }

  const exec = await saveExecution({
    routine_id: routine.id, modo: 'manual', status: 'sucesso',
    snapshot_antes, snapshot_depois,
    resumo: { produtos_afetados: alvo.length, percentual: pct, indice: p.indice, tabela_precos_ids: (ins.data || []).map(r => r.id) },
  })
  if (!exec.ok) return { ok: false, message: 'Reajuste registrado, mas falha ao salvar execução.' }

  const aplic = await tabelaPrecos.aplicarAtualizacoes()
  return { ok: true, produtosAfetados: alvo.length, aplicadas: aplic.mudancas || [] }
}

// ─── Reverte uma execução: restaura products.preco e remove o histórico gerado
export async function reverterExecucaoProdutos(execution, revert, tabelaPrecos) {
  const r = await revert(execution, 'products')
  const ids = execution.resumo?.tabela_precos_ids || []
  if (ids.length) await tabelaPrecos.removerLinhas(ids)
  return r
}

// ─── Wizard (1 tela: cadastro da rotina) ─────────────────────────────────────
function RotinaProdutosForm({ initial, produtos, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    nome: initial?.nome || '',
    aplicar_todos: initial?.parametros?.aplicar_todos ?? true,
    produto_ids: initial?.parametros?.produto_ids || [],
    percentual: initial?.parametros?.percentual ?? '',
    indice: initial?.parametros?.indice || 'IPCA',
    vigencia_inicio: initial?.parametros?.vigencia_inicio || new Date().toISOString().slice(0, 10),
    observacoes: initial?.parametros?.observacoes || '',
  }))
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleProduto = (id) => setForm(f => ({
    ...f, produto_ids: f.produto_ids.includes(id) ? f.produto_ids.filter(x => x !== id) : [...f.produto_ids, id],
  }))

  async function handleSave() {
    if (!form.nome.trim()) { setErro('Dê um nome para a rotina.'); return }
    if (!form.aplicar_todos && form.produto_ids.length === 0) { setErro('Selecione ao menos um produto ou marque "Todos".'); return }
    if (form.percentual === '' || isNaN(Number(form.percentual))) { setErro('Informe o percentual de reajuste.'); return }
    setSaving(true)
    const res = await onSaved({
      id: initial?.id,
      nome: form.nome,
      parametros: {
        aplicar_todos: form.aplicar_todos,
        produto_ids: form.produto_ids,
        percentual: Number(form.percentual),
        indice: form.indice,
        vigencia_inicio: form.vigencia_inicio,
        observacoes: form.observacoes,
      },
    })
    setSaving(false)
    if (res.ok) onClose()
    else setErro(res.message || 'Erro ao salvar rotina.')
  }

  return (
    <div style={s.modal} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={s.wizard}>
        <div style={s.header}>
          <span style={s.title}>{initial ? 'Editar rotina' : 'Nova rotina de reajuste'}</span>
          <button style={s.btn('ghost')} onClick={onClose}>✕</button>
        </div>
        <div style={{ ...s.body }}>
          {erro && <div style={{ ...s.card, borderColor: C.danger, color: C.danger, fontSize: 13 }}>{erro}</div>}

          <div>
            <label style={s.label}>Nome da rotina</label>
            <input style={s.input} value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: Reajuste anual IPCA" />
          </div>

          <div style={s.row}>
            <label style={{ ...s.row, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.aplicar_todos} onChange={e => set('aplicar_todos', e.target.checked)} />
              Aplicar em todos os produtos ativos
            </label>
          </div>

          {!form.aplicar_todos && (
            <div style={{ ...s.card, maxHeight: 180, overflowY: 'auto' }}>
              {produtos.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>Nenhum produto cadastrado.</div>}
              {produtos.map(p => (
                <label key={p.id} style={{ ...s.row, cursor: 'pointer', fontSize: 13, padding: '4px 0' }}>
                  <input type="checkbox" checked={form.produto_ids.includes(p.id)} onChange={() => toggleProduto(p.id)} />
                  <span style={{ flex: 1 }}>{p.nome}</span>
                  <span style={{ fontSize: 11, color: C.muted, fontFamily: 'var(--mono)' }}>R$ {Number(p.preco || 0).toLocaleString('pt-BR')}</span>
                </label>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Percentual de reajuste (%)</label>
              <input style={s.input} type="number" step="0.01" value={form.percentual}
                onChange={e => set('percentual', e.target.value)} placeholder="Ex: 4,5" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Índice</label>
              <select style={s.input} value={form.indice} onChange={e => set('indice', e.target.value)}>
                {INDICES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={s.label}>Vigência a partir de</label>
            <input style={s.input} type="date" value={form.vigencia_inicio} onChange={e => set('vigencia_inicio', e.target.value)} />
          </div>

          <div>
            <label style={s.label}>Observações</label>
            <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }} value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button style={s.btn('ghost')} onClick={onClose}>Cancelar</button>
          <button style={s.btn('primary')} disabled={saving} onClick={handleSave}>{saving ? 'Salvando…' : 'Salvar rotina'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Relatório de execuções + reverter ───────────────────────────────────────
function RelatorioProdutosModal({ rotina, executions, onClose, onRevert }) {
  const [verExec, setVerExec] = useState(null)
  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...s.drawer, maxWidth: 460 }}>
        <div style={s.header}>
          <span style={s.title}>📋 Relatório — {rotina.nome}</span>
          <button style={s.btn('ghost')} onClick={onClose}>✕</button>
        </div>
        <div style={{ ...s.body, gap: 8 }}>
          {executions.length === 0 && <div style={{ fontSize: 13, color: C.muted }}>Nenhuma execução ainda.</div>}
          {executions.map(ex => (
            <div key={ex.id} style={{ ...s.card, marginBottom: 0 }}>
              <div style={s.row}>
                <span style={s.badge(ex.status === 'sucesso' ? '#00aa44' : ex.status === 'parcial' ? '#f59e0b' : '#ef4444')}>{ex.status}</span>
                <span style={{ fontSize: 12, color: C.muted }}>
                  {new Date(ex.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{ex.resumo?.produtos_afetados ?? '?'} produto(s)
                </span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button style={{ ...s.btn('ghost'), fontSize: 11 }} onClick={() => setVerExec(verExec?.id === ex.id ? null : ex)}>
                    {verExec?.id === ex.id ? 'Fechar' : 'Detalhes'}
                  </button>
                  {!ex.revertido && (
                    <button style={{ ...s.btn('danger'), fontSize: 11 }} onClick={() => onRevert(ex)}>Reverter</button>
                  )}
                  {ex.revertido && <span style={s.badge('#888')}>Revertido</span>}
                </div>
              </div>
              {verExec?.id === ex.id && (
                <div style={{ marginTop: 10, fontSize: 12, color: C.text }}>
                  <div><b>Índice:</b> {ex.resumo?.indice || '—'} · <b>Percentual:</b> {ex.resumo?.percentual ?? '—'}%</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Drawer principal (equivalente ao RotinasDrawer, mas para produtos) ──────
export default function RotinasProdutosDrawer({ produtos, tabelaPrecos, onClose }) {
  const { profile } = useProfile()
  const tenantId = profile?.tenant_id
  const { routines, loading, save, remove, saveExecution, loadExecutions, revert } = useRoutines('produtos')
  const [form, setForm] = useState(null)
  const [relatorio, setRelatorio] = useState(null)
  const [executando, setExecutando] = useState(null)

  const abrirRelatorio = useCallback(async (r) => {
    const execs = await loadExecutions(r.id)
    setRelatorio({ rotina: r, executions: execs })
  }, [loadExecutions])

  async function handleExecutar(routine) {
    setExecutando(routine.id)
    const res = await executarReajusteProdutos({ routine, produtos, saveExecution, tabelaPrecos })
    setExecutando(null)
    if (res.ok) alert(`Reajuste aplicado em ${res.produtosAfetados} produto(s).`)
    else alert('Erro: ' + res.message)
  }

  return (
    <>
      <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div style={s.drawer}>
          <div style={s.header}>
            <span style={s.title}>⚙ Rotinas — produtos</span>
            <button style={s.btn('ghost')} onClick={onClose}>✕</button>
          </div>
          <div style={s.body}>
            <button style={s.btn('primary')} onClick={() => setForm({})}>+ Nova rotina de reajuste</button>

            {loading && <div style={{ color: C.muted, fontSize: 13 }}>Carregando...</div>}
            {!loading && routines.length === 0 && (
              <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', marginTop: 24 }}>
                Nenhuma rotina de reajuste criada ainda.
              </div>
            )}

            {routines.map(r => (
              <div key={r.id} style={s.card}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{r.nome}</div>
                <div style={{ ...s.row, flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  <span style={s.badge('#3b82f6')}>{r.parametros?.percentual ?? 0}% · {r.parametros?.indice || 'manual'}</span>
                  <span style={s.badge('#888')}>{r.parametros?.aplicar_todos ? 'todos os produtos' : `${(r.parametros?.produto_ids || []).length} produto(s)`}</span>
                  {r.ultima_execucao && (
                    <span style={{ fontSize: 11, color: C.muted }}>
                      Última: {new Date(r.ultima_execucao).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div style={s.row}>
                  <button style={s.btn('primary')} disabled={executando === r.id} onClick={() => handleExecutar(r)}>
                    {executando === r.id ? 'Executando…' : '▶ Executar'}
                  </button>
                  <button style={s.btn('ghost')} onClick={() => setForm(r)}>✏ Editar</button>
                  <button style={s.btn('ghost')} onClick={() => abrirRelatorio(r)}>📋 Relatório</button>
                  <button style={{ ...s.btn('ghost'), marginLeft: 'auto', color: C.danger, borderColor: C.danger }}
                    onClick={() => { if (window.confirm('Remover rotina?')) remove(r.id) }}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {relatorio && (
        <RelatorioProdutosModal
          rotina={relatorio.rotina}
          executions={relatorio.executions}
          onClose={() => setRelatorio(null)}
          onRevert={async (ex) => {
            if (!window.confirm(`Reverter reajuste de ${(ex.snapshot_antes || []).length} produto(s)?`)) return
            const r = await reverterExecucaoProdutos(ex, revert, tabelaPrecos)
            if (r.ok) { const execs = await loadExecutions(relatorio.rotina.id); setRelatorio(prev => ({ ...prev, executions: execs })) }
            else alert('Erro ao reverter: ' + (r.errors || []).map(e => e.error).join(', '))
          }}
        />
      )}

      {form !== null && (
        <RotinaProdutosForm
          initial={form.id ? form : null}
          produtos={produtos}
          onClose={() => setForm(null)}
          onSaved={(data) => save({ ...data, tenant_id: tenantId })}
        />
      )}
    </>
  )
}
