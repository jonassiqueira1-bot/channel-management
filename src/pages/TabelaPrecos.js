import { useState, useMemo } from 'react'
import { useProducts } from '../hooks/useProducts'
import { useTabelaPrecos } from '../hooks/useTabelaPrecos'
import Button from '../components/Button'
import SettingsLayout from '../components/ui/SettingsLayout'
import RotinasProdutosDrawer from '../components/RotinasProdutos'
import SearchSelect from '../components/SearchSelect'

// Índices mais usados em reajuste de contrato de prestação de
// serviços/software no Brasil (IPCA, IGP-M, INPC, IPC-Fipe) + variante
// mais comum de uso contínuo (IPCA-E) — "Manual" cobre qualquer negociação
// fora de índice oficial.
const INDICES = ['IPCA', 'IGPM', 'INPC', 'IPCA-E', 'IPC-Fipe', 'Manual']

// Mesmos rótulos usados no cadastro de Produtos (src/pages/Produtos.js) —
// duplicado aqui só como mapa label (sem cor/badge) pra filtrar/agrupar sem
// depender daquele arquivo.
const TIPO_LABEL = {
  saas: 'SaaS', licenca: 'Licença', servico: 'Serviço', hardware: 'Hardware',
  consultoria: 'Consultoria', treinamento: 'Treinamento',
}
const COBRANCA_LABEL = {
  mensal: 'Mensal', anual: 'Anual', unico: 'Pagamento único', uso: 'Por uso', usuario: 'Por usuário',
}
const STATUS_LABEL = { ativo: 'Ativo', rascunho: 'Rascunho', descontinuado: 'Descontinuado' }

const AGRUPAR_OPCOES = [
  { value: 'none',      label: 'Sem agrupamento' },
  { value: 'categoria', label: 'Categoria' },
  { value: 'tipo',      label: 'Tipo' },
  { value: 'cobranca',  label: 'Cobrança' },
]

// Sanitiza entrada numérica com decimal em vírgula ou ponto — inputs
// type="number" nativos deixam passar comportamento inconsistente entre
// navegador/locale (inclusive letras, em alguns casos). Aceita dígitos,
// um separador decimal e um sinal negativo no início (reajuste pode ser
// desconto).
function sanitizeDecimal(raw) {
  let v = raw.replace(/[^0-9,.-]/g, '')
  const neg = v.startsWith('-')
  v = v.replace(/-/g, '')
  const firstSep = v.search(/[,.]/)
  if (firstSep !== -1) {
    v = v.slice(0, firstSep + 1) + v.slice(firstSep + 1).replace(/[,.]/g, '')
  }
  return (neg ? '-' : '') + v
}
function parseDecimal(v) {
  return Number(String(v).replace(',', '.'))
}

function ReajusteModal({ produtos, tabelaPrecos, onClose }) {
  const [modo, setModo] = useState('massa') // 'massa' | 'individual'
  const [selecionados, setSelecionados] = useState([])
  const [percentual, setPercentual] = useState('')
  const [indice, setIndice] = useState('IPCA')
  const [vigencia, setVigencia] = useState(new Date().toISOString().slice(0, 10))
  const [observacoes, setObservacoes] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [novoPreco, setNovoPreco] = useState('')
  const [erro, setErro] = useState('')
  const [saving, setSaving] = useState(false)

  // Filtros/agrupamento da lista de produtos (aba Em massa) — reaproveita as
  // mesmas dimensões do cadastro de Produtos (tipo, categoria, cobrança,
  // status), sem precisar selecionar um a um ou tudo de uma vez.
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroCobranca, setFiltroCobranca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [agruparPor, setAgruparPor] = useState('none')

  const categoriasDisponiveis = useMemo(() => [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort(), [produtos])
  const tiposDisponiveis      = useMemo(() => [...new Set(produtos.map(p => p.tipo).filter(Boolean))], [produtos])
  const cobrancasDisponiveis  = useMemo(() => [...new Set(produtos.map(p => p.cobranca).filter(Boolean))], [produtos])

  const toggle = (id) => setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return produtos.filter(p =>
      (!q || (p.nome || '').toLowerCase().includes(q) || (p.codigo || '').toLowerCase().includes(q)) &&
      (!filtroCategoria || p.categoria === filtroCategoria) &&
      (!filtroTipo || p.tipo === filtroTipo) &&
      (!filtroCobranca || p.cobranca === filtroCobranca) &&
      (!filtroStatus || p.status === filtroStatus)
    )
  }, [produtos, busca, filtroCategoria, filtroTipo, filtroCobranca, filtroStatus])

  const grupos = useMemo(() => {
    if (agruparPor === 'none') return [{ chave: null, rotulo: null, itens: produtosFiltrados }]
    const labelMap = agruparPor === 'tipo' ? TIPO_LABEL : agruparPor === 'cobranca' ? COBRANCA_LABEL : null
    const porGrupo = {}
    produtosFiltrados.forEach(p => {
      const chave = p[agruparPor] || '(sem valor)'
      ;(porGrupo[chave] ??= []).push(p)
    })
    return Object.entries(porGrupo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chave, itens]) => ({ chave, rotulo: labelMap?.[chave] || chave, itens }))
  }, [produtosFiltrados, agruparPor])

  const preview = useMemo(() => {
    if (modo !== 'massa') return []
    const pct = parseDecimal(percentual || 0)
    return produtos.filter(p => selecionados.includes(p.id)).map(p => ({
      ...p, novoPreco: Math.round(Number(p.preco || 0) * (1 + pct / 100) * 100) / 100,
    }))
  }, [modo, percentual, produtos, selecionados])

  const todosFiltradosSelecionados = produtosFiltrados.length > 0 && produtosFiltrados.every(p => selecionados.includes(p.id))
  function toggleTodosFiltrados() {
    if (todosFiltradosSelecionados) {
      const idsFiltrados = new Set(produtosFiltrados.map(p => p.id))
      setSelecionados(prev => prev.filter(id => !idsFiltrados.has(id)))
    } else {
      setSelecionados(prev => [...new Set([...prev, ...produtosFiltrados.map(p => p.id)])])
    }
  }
  function grupoTodoSelecionado(itens) { return itens.length > 0 && itens.every(p => selecionados.includes(p.id)) }
  function toggleGrupo(itens) {
    if (grupoTodoSelecionado(itens)) {
      const ids = new Set(itens.map(p => p.id))
      setSelecionados(prev => prev.filter(id => !ids.has(id)))
    } else {
      setSelecionados(prev => [...new Set([...prev, ...itens.map(p => p.id)])])
    }
  }

  async function handleConfirmMassa() {
    if (selecionados.length === 0) { setErro('Selecione ao menos um produto.'); return }
    const pct = parseDecimal(percentual)
    if (percentual === '' || isNaN(pct)) { setErro('Informe o percentual.'); return }
    setSaving(true)
    const res = await tabelaPrecos.registrarReajusteEmMassa({
      produtos: produtos.filter(p => selecionados.includes(p.id)),
      percentual: pct, vigencia_inicio: vigencia, indice, observacoes,
    })
    setSaving(false)
    if (res.ok) onClose(); else setErro(res.message)
  }

  async function handleConfirmIndividual() {
    const produto = produtos.find(p => p.id === produtoId)
    if (!produto) { setErro('Selecione um produto.'); return }
    const preco = parseDecimal(novoPreco)
    if (novoPreco === '' || isNaN(preco)) { setErro('Informe o novo preço.'); return }
    setSaving(true)
    const res = await tabelaPrecos.registrarReajusteIndividual({
      produto_id: produto.id, preco_atual: produto.preco, preco,
      vigencia_inicio: vigencia, indice, observacoes,
    })
    setSaving(false)
    if (res.ok) onClose(); else setErro(res.message)
  }

  return (
    <div style={mo.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={mo.modal}>
        <div style={mo.header}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Novo reajuste</span>
          <button style={mo.close} onClick={onClose} type="button">✕</button>
        </div>

        <div style={mo.tabs}>
          <button style={mo.tab(modo === 'massa')} onClick={() => { setModo('massa'); setErro('') }}>Em massa (%)</button>
          <button style={mo.tab(modo === 'individual')} onClick={() => { setModo('individual'); setErro('') }}>Individual</button>
        </div>

        <div style={mo.body}>
          {erro && <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{erro}</div>}

          {modo === 'massa' ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Produtos</div>

              {/* Busca + filtros — evita ter que marcar um a um ou tudo de uma vez */}
              <input className="fpe-field" style={{ width: '100%', marginBottom: 8, boxSizing: 'border-box' }}
                value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nome ou código…" />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                <select className="fpe-field" value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}>
                  <option value="">Categoria (todas)</option>
                  {categoriasDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="fpe-field" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                  <option value="">Tipo (todos)</option>
                  {tiposDisponiveis.map(t => <option key={t} value={t}>{TIPO_LABEL[t] || t}</option>)}
                </select>
                <select className="fpe-field" value={filtroCobranca} onChange={e => setFiltroCobranca(e.target.value)}>
                  <option value="">Cobrança (todas)</option>
                  {cobrancasDisponiveis.map(c => <option key={c} value={c}>{COBRANCA_LABEL[c] || c}</option>)}
                </select>
                <select className="fpe-field" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                  <option value="">Status (todos)</option>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {produtosFiltrados.length} de {produtos.length} produto{produtos.length !== 1 ? 's' : ''}
                  </span>
                  {produtosFiltrados.length > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>
                      <input type="checkbox" checked={todosFiltradosSelecionados} onChange={toggleTodosFiltrados} />
                      Selecionar todos os filtrados
                    </label>
                  )}
                </div>
                <select className="fpe-field" style={{ width: 'auto', fontSize: 12, padding: '5px 8px' }} value={agruparPor} onChange={e => setAgruparPor(e.target.value)}>
                  {AGRUPAR_OPCOES.map(o => <option key={o.value} value={o.value}>Agrupar: {o.label}</option>)}
                </select>
              </div>

              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', marginBottom: 14 }}>
                {grupos.map(({ chave, rotulo, itens }) => (
                  <div key={chave ?? 'unico'} style={{ marginBottom: rotulo ? 8 : 0 }}>
                    {rotulo && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', cursor: 'pointer',
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <input type="checkbox" checked={grupoTodoSelecionado(itens)} onChange={() => toggleGrupo(itens)} />
                        {rotulo} ({itens.length})
                      </label>
                    )}
                    {itens.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0 4px 4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={selecionados.includes(p.id)} onChange={() => toggle(p.id)} />
                        <span style={{ flex: 1 }}>{p.nome}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>R$ {Number(p.preco || 0).toLocaleString('pt-BR')}</span>
                      </label>
                    ))}
                  </div>
                ))}
                {produtosFiltrados.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {produtos.length === 0 ? 'Nenhum produto cadastrado.' : 'Nenhum produto encontrado com esses filtros.'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Percentual (%)</div>
                  <input className="fpe-field" type="text" inputMode="decimal" value={percentual} onChange={e => setPercentual(sanitizeDecimal(e.target.value))} placeholder="Ex: 4,5" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Índice</div>
                  <select className="fpe-field" value={indice} onChange={e => setIndice(e.target.value)}>
                    {INDICES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Vigência a partir de</div>
                <input className="fpe-field" type="date" value={vigencia} onChange={e => setVigencia(e.target.value)} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Observações</div>
                <textarea className="fpe-field" style={{ minHeight: 56, resize: 'vertical' }} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Opcional" />
              </div>

              {preview.length > 0 && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface2)' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left' }}>Produto</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>Atual</th>
                        <th style={{ padding: '6px 10px', textAlign: 'right' }}>Novo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map(p => (
                        <tr key={p.id} style={{ borderTop: '1px solid var(--border2)' }}>
                          <td style={{ padding: '6px 10px' }}>{p.nome}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--mono)' }}>R$ {Number(p.preco || 0).toLocaleString('pt-BR')}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--green-text)' }}>R$ {p.novoPreco.toLocaleString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Produto</div>
                <SearchSelect
                  options={produtos.map(p => ({ id: p.id, label: p.nome, sublabel: `R$ ${Number(p.preco || 0).toLocaleString('pt-BR')}` }))}
                  value={produtoId}
                  onChange={id => setProdutoId(id || '')}
                  placeholder="Pesquisar produto…"
                  inputStyle={{ height: 38, border: '1px solid var(--border)', borderRadius: 7, padding: '0 12px', fontSize: 13, width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', fontFamily: 'var(--font)', color: 'var(--text)' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Novo preço (R$)</div>
                  <input className="fpe-field" type="text" inputMode="decimal" value={novoPreco} onChange={e => setNovoPreco(sanitizeDecimal(e.target.value))} placeholder="0,00" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Índice</div>
                  <select className="fpe-field" value={indice} onChange={e => setIndice(e.target.value)}>
                    {INDICES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Vigência a partir de</div>
                <input className="fpe-field" type="date" value={vigencia} onChange={e => setVigencia(e.target.value)} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Observações</div>
                <textarea className="fpe-field" style={{ minHeight: 56, resize: 'vertical' }} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Opcional" />
              </div>
            </>
          )}
        </div>

        <div style={mo.footer}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button disabled={saving} onClick={modo === 'massa' ? handleConfirmMassa : handleConfirmIndividual}>
            {saving ? 'Salvando…' : 'Registrar reajuste'}
          </Button>
        </div>
      </div>
    </div>
  )
}

const mo = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, backdropFilter: 'blur(2px)' },
  modal:   { background: 'var(--surface)', borderRadius: 14, width: 640, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.22)', overflow: 'hidden' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 12px', flexShrink: 0 },
  close:   { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: 4 },
  tabs:    { display: 'flex', gap: 4, padding: '0 24px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  tab:     (active) => ({ padding: '8px 14px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: active ? 'var(--accent-glow)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-muted)' }),
  body:    { padding: '18px 24px', overflowY: 'auto', flex: 1 },
  footer:  { padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end', background: 'var(--surface2)', flexShrink: 0 },
}

export default function TabelaPrecos() {
  const { produtos } = useProducts()
  const tabelaPrecos = useTabelaPrecos()
  const { historico, loading, aplicarAtualizacoes } = tabelaPrecos
  const [modalAberto, setModalAberto] = useState(false)
  const [rotinasAberto, setRotinasAberto] = useState(false)
  const [aplicando, setAplicando] = useState(false)

  const produtoNome = useMemo(() => {
    const map = {}
    produtos.forEach(p => { map[p.id] = p.nome })
    return map
  }, [produtos])

  async function handleAplicar() {
    setAplicando(true)
    const res = await aplicarAtualizacoes()
    setAplicando(false)
    if (res.ok) {
      const n = (res.mudancas || []).length
      alert(n > 0 ? `${n} produto(s) atualizado(s).` : 'Nenhuma atualização pendente.')
    } else {
      alert('Erro ao aplicar: ' + res.message)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px 0' }}>
        <Button variant="secondary" onClick={() => setRotinasAberto(true)}>⚙ Rotinas</Button>
        <Button variant="secondary" disabled={aplicando} onClick={handleAplicar}>
          {aplicando ? 'Aplicando…' : 'Aplicar atualizações pendentes'}
        </Button>
      </div>

      <SettingsLayout
        modulo="tabela_precos"
        title="Tabela de Preços"
        description="Histórico de reajustes de preço dos produtos. O cadastro de Produtos sempre reflete o preço vigente mais recente."
        columns={[
          { key: 'produto_id', label: 'Produto', render: (v) => produtoNome[v] || '—' },
          { key: 'preco_anterior', label: 'Anterior', align: 'right', render: (v) => v != null ? <span style={{ fontFamily: 'var(--mono)' }}>R$ {Number(v).toLocaleString('pt-BR')}</span> : '—' },
          { key: 'preco', label: 'Novo', align: 'right', render: (v) => <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>R$ {Number(v).toLocaleString('pt-BR')}</span> },
          { key: 'percentual', label: '%', align: 'right', render: (v) => v != null ? `${Number(v).toLocaleString('pt-BR')}%` : '—', priority: 2 },
          { key: 'indice', label: 'Índice', priority: 2 },
          { key: 'vigencia_inicio', label: 'Vigência', priority: 2 },
          { key: 'aplicado_em', label: 'Aplicado em', render: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : <span style={{ color: 'var(--yellow-text)' }}>Pendente</span>, priority: 2 },
        ]}
        data={historico}
        keyField="id"
        loading={loading}
        emptyLabel="Nenhum reajuste registrado ainda."
        onNew={() => setModalAberto(true)}
        newLabel="Novo reajuste"
        storageKey="settings_tabela_precos"
      />

      {modalAberto && (
        <ReajusteModal produtos={produtos} tabelaPrecos={tabelaPrecos} onClose={() => setModalAberto(false)} />
      )}

      {rotinasAberto && (
        <RotinasProdutosDrawer produtos={produtos} tabelaPrecos={tabelaPrecos} onClose={() => setRotinasAberto(false)} />
      )}
    </>
  )
}
