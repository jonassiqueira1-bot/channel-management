import { useState, useMemo } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { useProducts } from '../../hooks/useProducts'
import { useFunnels } from '../../hooks/useFunnels'
import BrowseLayout from '../../components/BrowseLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

export const INDICADORES_KEY = 'settings:indicadores_v2'

export const MODULOS = [
  { value: 'pipeline',   label: 'Pipeline' },
  { value: 'contratos',  label: 'Contratos' },
  { value: 'projetos',   label: 'Projetos' },
  { value: 'cs',         label: 'Sucesso do Cliente' },
  { value: 'pagamentos', label: 'Pagamentos' },
  { value: 'comissoes',  label: 'Comissões' },
]

function etapasDosFunis(funis, funil_ids) {
  const fids = (funil_ids || []).map(String).filter(Boolean)
  const lista = fids.length ? (funis || []).filter(f => fids.includes(String(f.id))) : (funis || [])
  return new Set(lista.flatMap(f => (f.etapas || []).map(e => String(e.id))))
}

export function filtrarPorIndicador(dados, indicador, funis) {
  const fids = (indicador?.funil_ids || []).map(String).filter(Boolean)
  const pids = (indicador?.produto_ids || []).map(String).filter(Boolean)
  let base = dados

  if (fids.length) {
    const eids = etapasDosFunis(funis, fids)
    base = base.filter(o =>
      eids.has(String(o.etapa_id)) ||
      ((o.situacao === 'ganha' || o.situacao === 'perdida') && eids.has(String(o.etapa_id_origem || o.etapa_id)))
    )
  }

  if (pids.length) {
    base = base.filter(o => (o.itens || []).some(i => pids.includes(String(i.produto_id))))
  }

  return base
}

export const FONTES_INDICADOR = [
  {
    value: 'pipeline_opps_ganhas_qtd',
    label: 'Pipeline — Qtd. oportunidades ganhas',
    tipo: 'count',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (dados, ind, funis) => filtrarPorIndicador(dados, ind, funis).filter(o => o.situacao === 'ganha').length,
  },
  {
    value: 'pipeline_opps_ganhas_valor',
    label: 'Pipeline — Valor total das oportunidades ganhas',
    tipo: 'amount',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (dados, ind, funis) => {
      const pids = (ind?.produto_ids || []).map(String).filter(Boolean)
      const base = filtrarPorIndicador(dados, ind, funis).filter(o => o.situacao === 'ganha')
      if (!pids.length) return base.reduce((s, o) => s + (Number(o.valor) || 0), 0)
      return base.reduce((s, o) => {
        const sub = (o.itens || [])
          .filter(i => pids.includes(String(i.produto_id)))
          .reduce((si, i) => si + (Number(i.subtotal) || 0), 0)
        return s + sub
      }, 0)
    },
  },
  {
    value: 'pipeline_opps_abertas_qtd',
    label: 'Pipeline — Qtd. oportunidades em aberto',
    tipo: 'count',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (dados, ind, funis) =>
      filtrarPorIndicador(dados, ind, funis).filter(o => o.situacao !== 'ganha' && o.situacao !== 'perdida').length,
  },
  {
    value: 'pipeline_taxa_conversao',
    label: 'Pipeline — Taxa de conversão (%)',
    tipo: 'amount',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (dados, ind, funis) => {
      const base = filtrarPorIndicador(dados, ind, funis)
      if (!base.length) return 0
      return Math.round((base.filter(o => o.situacao === 'ganha').length / base.length) * 100)
    },
  },
  {
    value: 'pipeline_opps_por_etapa',
    label: 'Pipeline — Qtd. oportunidades em etapa(s)',
    tipo: 'count',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (dados, ind, funis) => {
      const eids = (ind?.etapa_ids || []).map(String).filter(Boolean)
      const base = filtrarPorIndicador(dados, ind, funis)
      if (!eids.length) return base.filter(o => o.situacao !== 'ganha' && o.situacao !== 'perdida').length
      return base.filter(o => eids.includes(String(o.etapa_id))).length
    },
  },
  {
    value: 'pipeline_conversao_etapa',
    label: 'Pipeline — Taxa de conversão da etapa (%)',
    tipo: 'amount',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (dados, ind, funis) => {
      const eids = (ind?.etapa_ids || []).map(String).filter(Boolean)
      const base = filtrarPorIndicador(dados, ind, funis)
      if (!eids.length) {
        if (!base.length) return 0
        return Math.round((base.filter(o => o.situacao === 'ganha').length / base.length) * 100)
      }
      const funilDaEtapa = (funis || []).find(f => (f.etapas || []).some(e => eids.includes(String(e.id))))
      if (!funilDaEtapa) return 0
      const etapasOrdenadas = (funilDaEtapa.etapas || []).map(e => String(e.id))
      const indiceCorte = Math.min(...eids.map(eid => etapasOrdenadas.indexOf(eid)).filter(i => i >= 0))
      if (indiceCorte < 0) return 0
      const etapasPosteriores = new Set(etapasOrdenadas.slice(indiceCorte + 1))
      const entraram = base.filter(o =>
        eids.includes(String(o.etapa_id)) || etapasPosteriores.has(String(o.etapa_id)) || o.situacao === 'ganha'
      )
      const passaram = base.filter(o => etapasPosteriores.has(String(o.etapa_id)) || o.situacao === 'ganha')
      if (!entraram.length) return 0
      return Math.round((passaram.length / entraram.length) * 100)
    },
  },
  {
    value: 'contratos_ativos_qtd',
    label: 'Contratos — Qtd. contratos ativos',
    tipo: 'count',
    modulos: ['contratos'],
    storageKey: 'crm:contratos_v2',
    fn: (dados) => dados.filter(c => c.situacao === 'ativo').length,
  },
  {
    value: 'contratos_mrr',
    label: 'Contratos — MRR total',
    tipo: 'amount',
    modulos: ['contratos'],
    storageKey: 'crm:contratos_v2',
    fn: (dados) => dados.filter(c => c.situacao === 'ativo').reduce((s, c) => s + (Number(c.mrr) || 0), 0),
  },
  {
    value: 'projetos_concluidos_qtd',
    label: 'Projetos — Qtd. projetos concluídos',
    tipo: 'count',
    modulos: ['projetos'],
    storageKey: 'projetos:lista_v2',
    fn: (dados) => dados.filter(p => p.status === 'concluido').length,
  },
  {
    value: 'cs_nps',
    label: 'Sucesso do Cliente — NPS médio',
    tipo: 'amount',
    modulos: ['cs'],
    storageKey: 'cs:nps_v2',
    fn: (dados) => dados.length
      ? Math.round(dados.reduce((s, r) => s + (Number(r.score) || 0), 0) / dados.length)
      : 0,
  },
]

export function calcValorIndicador(indicador, funis) {
  if (!indicador?.fonte_calculo) return null
  const fonte = FONTES_INDICADOR.find(f => f.value === indicador.fonte_calculo)
  if (!fonte?.fn || !fonte?.storageKey) return null
  try {
    const raw = localStorage.getItem(fonte.storageKey)
    const dados = raw ? JSON.parse(raw) : []
    return fonte.fn(dados, indicador, funis || [])
  } catch {
    return null
  }
}

const TENDENCIAS = [
  { value: 'subir',  label: '↑ Subir é bom' },
  { value: 'descer', label: '↓ Descer é bom' },
]

const EMPTY = {
  nome: '', descricao: '',
  modulo: '', fonte_calculo: '',
  unidade: '', tendencia: 'subir',
  produto_ids: [], funil_ids: [], etapa_ids: [],
  status: 'ativo',
}

function uid() { return Date.now() + Math.floor(Math.random() * 999) }

export default function SettingsIndicadores() {
  const [indicadores, setIndicadores] = useLocalState(INDICADORES_KEY, [])
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)
  const { produtos } = useProducts()
  const { funis } = useFunnels()

  function abrir(ind) { setEditando(ind); setForm({ ...ind }) }
  function fechar()   { setEditando(null); setForm(null) }

  function handleSave() {
    if (!form.nome || !form.modulo || !form.fonte_calculo) return
    setIndicadores(prev => {
      if (form.id) return prev.map(i => i.id === form.id ? form : i)
      return [...prev, { ...form, id: uid() }]
    })
    fechar()
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function toggleArr(k, v) {
    setEditando(f => {
      const arr = (f[k] || []).map(String)
      const sv = String(v)
      return { ...f, [k]: arr.includes(sv) ? arr.filter(x => x !== sv) : [...arr, sv] }
    })
  }

  const columns = useMemo(() => [
    { key: 'nome',          label: 'Nome',    render: (v) => <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span> },
    { key: 'modulo',        label: 'Módulo',  render: (v) => MODULOS.find(m => m.value === v)?.label || v },
    { key: 'fonte_calculo', label: 'Fonte',   render: (v) => <span style={{ fontSize: 12 }}>{FONTES_INDICADOR.find(f => f.value === v)?.label || v}</span> },
    { key: 'unidade',       label: 'Unidade', render: (v) => v || '—' },
    {
      key: 'status', label: 'Status', width: 90,
      render: (v) => (
        <span style={{
          fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px',
          background: v === 'ativo' ? 'var(--accent-lite)' : 'var(--surface)',
          color: v === 'ativo' ? 'var(--accent)' : 'var(--text-muted)',
          border: `1px solid ${v === 'ativo' ? 'var(--accent)' : 'var(--border)'}`,
        }}>
          {v === 'ativo' ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
  ], [])

  if (editando !== null && form !== null) {
    const fontesModulo = FONTES_INDICADOR.filter(f => f.modulos.includes(form.modulo))
    const fonteSel = FONTES_INDICADOR.find(f => f.value === form.fonte_calculo)
    const mostraEtapas = ['pipeline_opps_por_etapa', 'pipeline_conversao_etapa'].includes(form.fonte_calculo)
    const podeGravar = !!(form.nome && form.modulo && form.fonte_calculo)

    function handleModulo(v) {
      setForm(f => ({ ...f, modulo: v, fonte_calculo: '', unidade: '' }))
    }
    function handleFonte(v) {
      const fonte = FONTES_INDICADOR.find(f => f.value === v)
      const unidade = fonte?.tipo === 'amount' ? 'R$' : fonte?.tipo === 'count' ? 'un' : form.unidade
      setForm(f => ({ ...f, fonte_calculo: v, unidade }))
    }

    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Indicadores', onClick: fechar }]}
        title={form.id ? form.nome : 'Novo indicador'}
        onSave={podeGravar ? handleSave : undefined}
        onCancel={fechar}
        onDelete={form.id ? () => { setIndicadores(prev => prev.filter(i => i.id !== form.id)); fechar() } : undefined}
      >
        <FPESection title="Identificação">
          <FPEField label="Nome" required>
            <input className="fpe-field" value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: MRR, Qtd. ganhas, NPS…" autoFocus />
          </FPEField>
          <FPEField label="Descrição">
            <input className="fpe-field" value={form.descricao || ''} onChange={e => set('descricao', e.target.value)}
              placeholder="Descrição opcional" />
          </FPEField>
        </FPESection>

        <FPESection title="Módulo e cálculo">
          <FPEField label="Módulo" required>
            <select className="fpe-field" value={form.modulo} onChange={e => handleModulo(e.target.value)}>
              <option value="">Selecione…</option>
              {MODULOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </FPEField>
          {form.modulo && (
            <FPEField label="Fonte de cálculo" required>
              <select className="fpe-field" value={form.fonte_calculo} onChange={e => handleFonte(e.target.value)}>
                <option value="">Selecione…</option>
                {fontesModulo.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </FPEField>
          )}
          {fonteSel && (
            <FPEField label="Unidade de medida">
              <input className="fpe-field" value={form.unidade || ''} onChange={e => set('unidade', e.target.value)}
                placeholder="Ex: R$, %, opps, contratos…" />
            </FPEField>
          )}
          <FPEField label="Tendência">
            <select className="fpe-field" value={form.tendencia || 'subir'} onChange={e => set('tendencia', e.target.value)}>
              {TENDENCIAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FPEField>
        </FPESection>

        {form.modulo === 'pipeline' && (
          <FPESection title="Filtros" description="Todos opcionais. Em branco = considera tudo.">
            {(produtos || []).filter(p => p.status === 'ativo').length > 0 && (
              <FPEField label="Produtos" style={{ gridColumn: '1/-1' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(produtos || []).filter(p => p.status === 'ativo').map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer',
                      padding: '3px 8px', borderRadius: 6,
                      background: (form.produto_ids || []).map(String).includes(String(p.id)) ? 'var(--accent-lite)' : 'transparent' }}>
                      <input type="checkbox"
                        checked={(form.produto_ids || []).map(String).includes(String(p.id))}
                        onChange={() => toggleArr('produto_ids', p.id)} />
                      {p.nome}
                    </label>
                  ))}
                </div>
              </FPEField>
            )}
            {(funis || []).length > 1 && (
              <FPEField label="Funis" style={{ gridColumn: '1/-1' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(funis || []).map(f => (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer',
                      padding: '3px 8px', borderRadius: 6,
                      background: (form.funil_ids || []).map(String).includes(String(f.id)) ? 'var(--accent-lite)' : 'transparent' }}>
                      <input type="checkbox"
                        checked={(form.funil_ids || []).map(String).includes(String(f.id))}
                        onChange={() => toggleArr('funil_ids', f.id)} />
                      {f.nome}
                    </label>
                  ))}
                </div>
              </FPEField>
            )}
            {mostraEtapas && (
              <FPEField label="Etapas" style={{ gridColumn: '1/-1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(funis || []).map(f => (
                    <div key={f.id}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>{f.nome}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(f.etapas || []).map((e, idx) => (
                          <label key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, cursor: 'pointer',
                            padding: '3px 8px', borderRadius: 6,
                            background: (form.etapa_ids || []).map(String).includes(String(e.id)) ? 'var(--accent-lite)' : 'transparent' }}>
                            <input type="checkbox"
                              checked={(form.etapa_ids || []).map(String).includes(String(e.id))}
                              onChange={() => toggleArr('etapa_ids', e.id)} />
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginRight: 2 }}>{idx + 1}.</span>
                            {e.nome}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </FPEField>
            )}
          </FPESection>
        )}

        <FPESection title="Status">
          <FPEField label="Status">
            <select className="fpe-field" value={form.status || 'ativo'} onChange={e => set('status', e.target.value)}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </FPEField>
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <BrowseLayout
      columns={columns}
      data={indicadores}
      keyField="id"
      storageKey="settings_indicadores"
      onNew={() => abrir({ ...EMPTY })}
      newLabel="+ Novo indicador"
      onRowClick={abrir}
    />
  )
}
