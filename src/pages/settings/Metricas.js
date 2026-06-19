import { useState, useMemo } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { useProducts } from '../../hooks/useProducts'
import BrowseLayout from '../../components/BrowseLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'

export const METRICAS_KEY  = 'settings:metricas_v2'
export const LEITURAS_KEY  = 'metricas:leituras_v2'

export const INTERVALOS = [
  { value: 'horas',      label: 'Horas' },
  { value: 'dias',       label: 'Dias' },
  { value: 'semanas',    label: 'Semanas' },
  { value: 'meses',      label: 'Meses' },
  { value: 'trimestre',  label: 'Trimestre' },
  { value: 'semestre',   label: 'Semestre' },
  { value: 'ano',        label: 'Ano' },
]

export const MODULOS = [
  { value: 'pipeline',   label: 'Pipeline' },
  { value: 'projetos',   label: 'Projetos' },
  { value: 'cs',         label: 'Sucesso do Cliente' },
  { value: 'contratos',  label: 'Contratos' },
  { value: 'pagamentos', label: 'Pagamentos' },
  { value: 'comissoes',  label: 'Comissões' },
]

export const TENDENCIAS = [
  { value: 'subir',  label: '↑ Subir é bom', color: '#10B981' },
  { value: 'descer', label: '↓ Descer é bom', color: '#3B82F6' },
]

const CORES = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','var(--accent)','#06B6D4','#EC4899']

// Fontes de cálculo automático — cada entry define como derivar o valor atual dos dados do sistema
export const FONTES_CALCULO = [
  {
    value: 'manual',
    label: 'Registro manual',
    desc: 'O valor é informado manualmente em cada período.',
    modulos: ['pipeline','projetos','cs','contratos','pagamentos','comissoes'],
  },
  {
    value: 'pipeline_opps_fechadas_qtd',
    label: 'Pipeline — Qtd. oportunidades ganhas',
    desc: 'Conta oportunidades com situação "ganha". Se a métrica tiver produto vinculado, filtra apenas oportunidades que contenham esse produto.',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (data, metrica) => {
      const ganhas = data.filter(o => o.situacao === 'ganha')
      if (!metrica?.produto_id) return ganhas.length
      return ganhas.filter(o => (o.itens || []).some(i => String(i.produto_id) === String(metrica.produto_id))).length
    },
  },
  {
    value: 'pipeline_opps_fechadas_valor',
    label: 'Pipeline — Valor total das oportunidades ganhas (R$)',
    desc: 'Soma o campo "valor" das oportunidades ganhas. Se a métrica tiver produto vinculado, soma apenas o subtotal desse produto nos itens.',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (data, metrica) => {
      const ganhas = data.filter(o => o.situacao === 'ganha')
      if (!metrica?.produto_id) return ganhas.reduce((s, o) => s + (Number(o.valor) || 0), 0)
      return ganhas.reduce((s, o) => {
        const item = (o.itens || []).find(i => String(i.produto_id) === String(metrica.produto_id))
        return s + (item ? (Number(item.subtotal) || 0) : 0)
      }, 0)
    },
  },
  {
    value: 'pipeline_opps_abertas_qtd',
    label: 'Pipeline — Qtd. oportunidades em aberto',
    desc: 'Conta oportunidades que não estão ganhas nem perdidas. Filtra por produto se a métrica tiver um vinculado.',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (data, metrica) => {
      const abertas = data.filter(o => o.situacao !== 'ganha' && o.situacao !== 'perdida')
      if (!metrica?.produto_id) return abertas.length
      return abertas.filter(o => (o.itens || []).some(i => String(i.produto_id) === String(metrica.produto_id))).length
    },
  },
  {
    value: 'pipeline_taxa_conversao',
    label: 'Pipeline — Taxa de conversão (%)',
    desc: 'Percentual de oportunidades ganhas sobre o total. Filtra por produto se a métrica tiver um vinculado.',
    modulos: ['pipeline'],
    storageKey: 'opps_cache_v1',
    fn: (data, metrica) => {
      const base = metrica?.produto_id
        ? data.filter(o => (o.itens || []).some(i => String(i.produto_id) === String(metrica.produto_id)))
        : data
      if (!base.length) return 0
      const ganhas = base.filter(o => o.situacao === 'ganha').length
      return Math.round((ganhas / base.length) * 100)
    },
  },
  {
    value: 'contratos_ativos_qtd',
    label: 'Contratos — Qtd. contratos ativos',
    desc: 'Conta os contratos com situação "ativo".',
    modulos: ['contratos'],
    storageKey: 'crm:contratos_v2',
    fn: (data) => data.filter(c => c.situacao === 'ativo').length,
  },
  {
    value: 'contratos_mrr',
    label: 'Contratos — MRR total (R$)',
    desc: 'Soma o MRR de todos os contratos ativos.',
    modulos: ['contratos'],
    storageKey: 'crm:contratos_v2',
    fn: (data) => data.filter(c => c.situacao === 'ativo').reduce((s, c) => s + (Number(c.mrr) || 0), 0),
  },
  {
    value: 'projetos_concluidos_qtd',
    label: 'Projetos — Qtd. projetos concluídos',
    desc: 'Conta os projetos com status "concluído".',
    modulos: ['projetos'],
    storageKey: 'projetos:lista_v2',
    fn: (data) => data.filter(p => p.status === 'concluido').length,
  },
  {
    value: 'cs_nps',
    label: 'Sucesso do Cliente — NPS médio',
    desc: 'Média dos scores de NPS registrados.',
    modulos: ['cs'],
    storageKey: 'cs:nps_v2',
    fn: (data) => data.length ? Math.round(data.reduce((s, r) => s + (Number(r.score) || 0), 0) / data.length) : 0,
  },
]

const EMPTY = {
  nome: '', descricao: '',
  modulo: '',
  valor_alvo: '', unidade: '', tendencia: 'subir',
  periodo: 1, intervalo: 'meses',
  data_inicio: '', data_fim: '',
  usuario_ids: [], franquia_ids: [], produto_id: '',
  fonte_calculo: 'manual',
  cor: '#3B82F6', status: 'ativo',
}

function uid() { return Date.now() + Math.floor(Math.random() * 999) }

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function foraDoperiodo(metrica) {
  const hoje = new Date().toISOString().slice(0, 10)
  if (metrica.data_inicio && hoje < metrica.data_inicio) return `Vigência inicia em ${fmtData(metrica.data_inicio)}`
  if (metrica.data_fim   && hoje > metrica.data_fim)    return `Vigência encerrou em ${fmtData(metrica.data_fim)}`
  return null
}

function NovaMedicaoModal({ metrica, onSave, onClose }) {
  const [valor, setValor] = useState('')
  const [nota, setNota]   = useState('')
  const bloqueio = foraDoperiodo(metrica)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: 28, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Nova medição</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: bloqueio ? 12 : 20 }}>
          {metrica.nome} · Meta: {metrica.unidade} {Number(metrica.valor_alvo).toLocaleString('pt-BR')}
          {(metrica.data_inicio || metrica.data_fim) && (
            <span style={{ marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 11 }}>
              ({metrica.data_inicio ? fmtData(metrica.data_inicio) : '…'} → {metrica.data_fim ? fmtData(metrica.data_fim) : '…'})
            </span>
          )}
        </div>

        {bloqueio ? (
          <div style={{ padding: '12px 14px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #F59E0B',
            fontSize: 13, color: '#92400E', marginBottom: 20 }}>
            ⚠ {bloqueio}. Medições só são aceitas dentro do período de vigência.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Valor medido ({metrica.unidade}) *
              </label>
              <input className="fpe-field" type="number" value={valor} onChange={e => setValor(e.target.value)}
                placeholder={`Ex: ${Math.round(metrica.valor_alvo * 0.8)}`}
                style={{ width: '100%', boxSizing: 'border-box' }} autoFocus />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Observação (opcional)
              </label>
              <input className="fpe-field" value={nota} onChange={e => setNota(e.target.value)}
                placeholder="Ex: semana de feriado, pico sazonal…"
                style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}>
            {bloqueio ? 'Fechar' : 'Cancelar'}
          </button>
          {!bloqueio && (
            <button type="button" disabled={!valor}
              onClick={() => onSave({ metrica_id: metrica.id, valor: Number(valor), nota, data: new Date().toISOString() })}
              style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
                background: valor ? 'var(--accent)' : 'var(--border)', color: '#fff',
                cursor: valor ? 'pointer' : 'default', fontSize: 13, fontWeight: 700 }}>
              Registrar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MedicoesTable({ metrica }) {
  const [leituras, setLeituras] = useLocalState(LEITURAS_KEY, [])
  const [modal, setModal] = useState(false)

  const minhas = leituras
    .filter(l => l.metrica_id === metrica.id)
    .sort((a, b) => new Date(b.data) - new Date(a.data))

  function handleSave(leitura) {
    setLeituras(prev => [...prev, { ...leitura, id: uid() }])
    setModal(false)
  }

  function handleDelete(id) {
    if (window.confirm('Remover esta medição?')) {
      setLeituras(prev => prev.filter(l => l.id !== id))
    }
  }

  const bloqueio = foraDoperiodo(metrica)
  const podeRegistrar = !bloqueio && metrica.fonte_calculo === 'manual'

  return (
    <>
      {modal && <NovaMedicaoModal metrica={metrica} onSave={handleSave} onClose={() => setModal(false)} />}

      <div style={{ padding: '0 32px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Medições registradas</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {minhas.length} registro{minhas.length !== 1 ? 's' : ''}
              {(metrica.data_inicio || metrica.data_fim) && (
                <span style={{ marginLeft: 8, fontFamily: 'var(--mono)', fontSize: 11 }}>
                  · vigência {metrica.data_inicio ? fmtData(metrica.data_inicio) : '…'} → {metrica.data_fim ? fmtData(metrica.data_fim) : '…'}
                </span>
              )}
            </div>
          </div>
          {podeRegistrar && (
            <button type="button" onClick={() => setModal(true)}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)',
                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nova medição
            </button>
          )}
          {!podeRegistrar && bloqueio && (
            <span style={{ fontSize: 12, color: '#92400E', background: '#FEF3C7', border: '1px solid #F59E0B',
              borderRadius: 8, padding: '6px 12px' }}>⚠ {bloqueio}</span>
          )}
          {!podeRegistrar && !bloqueio && metrica.fonte_calculo !== 'manual' && (
            <span style={{ fontSize: 12, color: '#065F46', background: '#D1FAE5', border: '1px solid #10B981',
              borderRadius: 8, padding: '6px 12px' }}>✓ Cálculo automático</span>
          )}
        </div>

        {minhas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13,
            border: '1px dashed var(--border)', borderRadius: 10 }}>
            Nenhuma medição registrada ainda.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Data', 'Valor', 'Observação', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {minhas.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {fmtData(l.data)}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                    {metrica.unidade} {Number(l.valor).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {l.nota || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button type="button" onClick={() => handleDelete(l.id)}
                      title="Remover"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444',
                        fontSize: 14, padding: '2px 6px', borderRadius: 4, lineHeight: 1 }}>
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function TendenciaBadge({ value }) {
  const t = TENDENCIAS.find(x => x.value === value) || TENDENCIAS[0]
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: t.color, background: t.color + '18',
      borderRadius: 20, padding: '2px 10px', fontFamily: 'var(--mono)' }}>
      {t.label}
    </span>
  )
}

function ModulosBadges({ values = [] }) {
  const labels = MODULOS.filter(m => values.includes(m.value)).map(m => m.label)
  if (!labels.length) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {labels.map(l => (
        <span key={l} style={{ fontSize: 11, background: 'var(--accent-lite)', color: 'var(--accent)',
          borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>{l}</span>
      ))}
    </div>
  )
}

export default function Metricas() {
  const [metricas, setMetricas] = useLocalState(METRICAS_KEY, [])
  const [usuarios]  = useLocalState('settings:perfis_v2', [])
  const [franquias] = useLocalState('settings:franquias_v2', [])
  const { produtos } = useProducts()

  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(null)
  const [search, setSearch]     = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return metricas.filter(m => m.nome.toLowerCase().includes(q))
  }, [metricas, search])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function toggleUsuario(id) {
    const ids = form.usuario_ids || []
    set('usuario_ids', ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  function toggleFranquia(id) {
    const ids = form.franquia_ids || []
    set('franquia_ids', ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }


  function abrirNovo() { setForm({ ...EMPTY }); setEditando('novo') }
  function abrirEdicao(row) { setForm({ ...row }); setEditando(row) }

  const podeGravar = form?.nome?.trim() && form?.valor_alvo && form?.unidade && form?.modulo

  function handleSave() {
    if (!podeGravar) return
    const data = { ...form, valor_alvo: Number(form.valor_alvo) }
    if (editando === 'novo') {
      setMetricas(prev => [...prev, { ...data, id: uid(), criado_em: new Date().toISOString() }])
    } else {
      setMetricas(prev => prev.map(m => m.id === editando.id ? { ...m, ...data } : m))
    }
    setEditando(null)
    setForm(null)
  }

  function handleDelete(id) {
    setMetricas(prev => prev.filter(m => m.id !== id))
    setEditando(null)
    setForm(null)
  }

  const columns = [
    {
      key: 'nome', label: 'Métrica',
      render: (v, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: row.cor || 'var(--accent)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
            {row.descricao && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.descricao}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'modulo', label: 'Módulo', width: 160,
      render: v => {
        const m = MODULOS.find(x => x.value === v)
        if (!m) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
        return <span style={{ fontSize: 11, background: 'var(--accent-lite)', color: 'var(--accent)', borderRadius: 4, padding: '1px 7px', fontWeight: 600 }}>{m.label}</span>
      },
    },
    {
      key: 'valor_alvo', label: 'Meta',
      render: (v, row) => <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)' }}>{row.unidade} {Number(v).toLocaleString('pt-BR')}</span>,
    },
    { key: 'tendencia', label: 'Tendência', width: 170, render: v => <TendenciaBadge value={v} /> },
    {
      key: 'intervalo', label: 'Intervalo', width: 120,
      render: (v, row) => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.periodo}× {INTERVALOS.find(x => x.value === v)?.label || v}</span>,
    },
    {
      key: 'status', label: 'Status', width: 90,
      render: v => (
        <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '2px 10px',
          background: v === 'ativo' ? '#D1FAE5' : '#F1F5F9',
          color: v === 'ativo' ? '#065F46' : '#475569' }}>
          {v === 'ativo' ? 'Ativa' : 'Inativa'}
        </span>
      ),
    },
  ]

  if (editando !== null) {
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Métricas', onClick: () => { setEditando(null); setForm(null) } }]}
        title={editando === 'novo' ? 'Nova Métrica' : `Editar: ${editando.nome}`}
        onSave={podeGravar ? handleSave : undefined}
        onCancel={() => { setEditando(null); setForm(null) }}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
      >
        {/* Identificação */}
        <FPESection title="Identificação">
          <FPEField label="Nome da métrica" required style={{ gridColumn: '1/-1' }}>
            <input className="fpe-field" value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Receita Mensal, Taxa de Conversão, NPS…" />
          </FPEField>
          <FPEField label="Descrição" style={{ gridColumn: '1/-1' }}>
            <input className="fpe-field" value={form.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder="Explique o que esta métrica mede" />
          </FPEField>
          <FPEField label="Status">
            <select className="fpe-field" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="ativo">Ativa</option>
              <option value="inativo">Inativa</option>
            </select>
          </FPEField>
          <FPEField label="Cor de destaque">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', paddingTop: 4 }}>
              {CORES.map(c => (
                <button key={c} type="button" onClick={() => set('cor', c)}
                  style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: form.cor === c ? '3px solid var(--text)' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
              ))}
            </div>
          </FPEField>
        </FPESection>

        {/* Módulo */}
        <FPESection title="Módulo" description="Em qual funcionalidade esta métrica é exibida" columns={2}>
          <FPEField label="Funcionalidade" required style={{ gridColumn: '1/-1' }}>
            <select className="fpe-field" value={form.modulo || ''} onChange={e => { set('modulo', e.target.value); set('fonte_calculo', 'manual') }}>
              <option value="">— Selecione —</option>
              {MODULOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </FPEField>
        </FPESection>

        {/* Meta e Tendência */}
        <FPESection title="Meta e avaliação" columns={4}>
          <FPEField label="Valor alvo" required style={{ gridColumn: 'span 1' }}>
            <input className="fpe-field" type="number" value={form.valor_alvo} onChange={e => set('valor_alvo', e.target.value)}
              placeholder="Ex: 100000" />
          </FPEField>
          <FPEField label="Unidade de medida" required style={{ gridColumn: 'span 1' }}>
            <input className="fpe-field" value={form.unidade} onChange={e => set('unidade', e.target.value)}
              placeholder="R$, %, clientes, dias…" />
          </FPEField>
          <FPEField label="Tendência esperada" required style={{ gridColumn: 'span 2' }}>
            <select className="fpe-field" value={form.tendencia} onChange={e => set('tendencia', e.target.value)}>
              {TENDENCIAS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FPEField>
          <FPEField label="Período (quantidade)" style={{ gridColumn: 'span 1' }}>
            <input className="fpe-field" type="number" min="1" value={form.periodo} onChange={e => set('periodo', e.target.value)} />
          </FPEField>
          <FPEField label="Intervalo de acompanhamento" style={{ gridColumn: 'span 2' }}>
            <select className="fpe-field" value={form.intervalo} onChange={e => set('intervalo', e.target.value)}>
              {INTERVALOS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
          </FPEField>
          <FPEField label="Data início" style={{ gridColumn: 'span 1' }}>
            <input className="fpe-field" type="date" value={form.data_inicio || ''} onChange={e => set('data_inicio', e.target.value)} />
          </FPEField>
          <FPEField label="Data fim" style={{ gridColumn: 'span 1' }}>
            <input className="fpe-field" type="date" value={form.data_fim || ''} onChange={e => set('data_fim', e.target.value)} />
          </FPEField>
        </FPESection>

        {/* Equipe e Usuários */}
        {usuarios.length > 0 && (
          <FPESection title="Usuários responsáveis" description="Sem seleção, a métrica vale para todos">
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {usuarios.filter(u => u.status !== 'inativo').map(u => {
                const checked = (form.usuario_ids || []).includes(u.id)
                return (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                    border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                    background: checked ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'var(--surface)',
                    cursor: 'pointer', transition: 'all 0.12s' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleUsuario(u.id)}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-lite)', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {u.nome?.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: checked ? 600 : 400, color: checked ? 'var(--accent)' : 'var(--text)', flex: 1 }}>{u.nome}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.papel}</span>
                  </label>
                )
              })}
            </div>
          </FPESection>
        )}

        {/* Franquias */}
        {franquias.length > 0 && (
          <FPESection title="Franquias" description="Sem seleção, a métrica vale para todo o tenant">
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {franquias.map(f => {
                const checked = (form.franquia_ids || []).includes(String(f.id))
                return (
                  <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                    border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                    background: checked ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'var(--surface)',
                    cursor: 'pointer', transition: 'all 0.12s' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleFranquia(String(f.id))}
                      style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                    <span style={{ fontSize: 13, fontWeight: checked ? 600 : 400, color: checked ? 'var(--accent)' : 'var(--text)', flex: 1 }}>
                      {f.codigo ? <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', marginRight: 6 }}>[{f.codigo}]</span> : null}
                      {f.nome}
                    </span>
                    {f.classificacao === 'unidade' && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px' }}>Unidade</span>
                    )}
                  </label>
                )
              })}
            </div>
          </FPESection>
        )}

        {/* Produto */}
        <FPESection title="Produto" description="Associa esta métrica a um produto específico. Quando vinculada, os cálculos automáticos filtrarão apenas oportunidades que contenham este produto.">
          <FPEField label="Produto relacionado" style={{ gridColumn: '1/-1' }}>
            <select className="fpe-field" value={form.produto_id || ''} onChange={e => set('produto_id', e.target.value || '')}>
              <option value="">— Nenhum (todos os produtos) —</option>
              {produtos.filter(p => p.status === 'ativo').map(p => (
                <option key={p.id} value={String(p.id)}>
                  {p.codigo ? `[${p.codigo}] ` : ''}{p.nome}
                </option>
              ))}
            </select>
          </FPEField>
        </FPESection>

        {/* Cálculo */}
        <FPESection title="Cálculo" description="Define como o valor atual desta métrica é obtido — manualmente ou extraído automaticamente dos dados do sistema.">
          <FPEField label="Fonte de cálculo" style={{ gridColumn: '1/-1' }}>
            <select className="fpe-field" value={form.fonte_calculo || 'manual'}
              onChange={e => set('fonte_calculo', e.target.value)}>
              {FONTES_CALCULO
                .filter(f => !form.modulo || f.modulos.includes(form.modulo))
                .map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </FPEField>
          {(() => {
            const fonte = FONTES_CALCULO.find(f => f.value === (form.fonte_calculo || 'manual'))
            if (!fonte) return null
            return (
              <div style={{ gridColumn: '1/-1', padding: '10px 14px', borderRadius: 8,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {fonte.desc}
                {fonte.value !== 'manual' && (
                  <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                    ✓ O valor será calculado automaticamente — sem necessidade de registro manual.
                  </span>
                )}
              </div>
            )
          })()}
        </FPESection>

        {/* Medições — só exibe ao editar uma métrica existente */}
        {editando !== 'novo' && (
          <MedicoesTable metrica={editando} />
        )}
      </FullPageEdit>
    )
  }

  return (
    <BrowseLayout
      columns={columns}
      data={filtered}
      keyField="id"
      storageKey="settings_metricas"
      newLabel="Nova métrica"
      onNew={abrirNovo}
      onRowClick={abrirEdicao}
      search={search}
      onSearchChange={setSearch}
      emptyState={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
          <span style={{ fontSize: 28, opacity: 0.3 }}>📊</span>
          <span style={{ fontSize: 13 }}>Nenhuma métrica cadastrada.</span>
        </div>
      }
    />
  )
}
