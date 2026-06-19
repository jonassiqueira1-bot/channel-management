import { useState, useMemo } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { useFunnels } from '../../hooks/useFunnels'
import BrowseLayout from '../../components/BrowseLayout'
import { FullPageEdit, FPESection, FPEField } from '../../components/ui'
import { INDICADORES_KEY, calcValorIndicador } from './Indicadores'

export const METAS_KEY = 'settings:metas_v2'

const PERIODOS = [
  { value: 'mensal',      label: 'Mensal' },
  { value: 'trimestral',  label: 'Trimestral' },
  { value: 'semestral',   label: 'Semestral' },
  { value: 'anual',       label: 'Anual' },
]

const ESCOPOS = [
  { value: 'empresa', label: 'Empresa' },
  { value: 'equipe',  label: 'Equipe' },
  { value: 'usuario', label: 'Usuário' },
]

const EMPTY = {
  nome: '', indicador_id: '',
  scope: 'empresa', usuario_id: '', equipe_nome: '',
  valor_alvo: '',
  periodo: 'mensal', data_inicio: '', data_fim: '',
  meta_pai_id: '',
  status: 'ativo',
}

function uid() { return Date.now() + Math.floor(Math.random() * 999) }

function fmtValor(v, unidade) {
  if (v === null || v === undefined) return '—'
  return `${unidade || ''} ${Number(v).toLocaleString('pt-BR')}`.trim()
}

function ValorAtual({ indicadorId, indicadores, funis }) {
  const ind = indicadores.find(i => i.id === indicadorId)
  if (!ind) return null
  const valor = calcValorIndicador(ind, funis)
  if (valor === null || valor === undefined) return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Valor atual: —</div>
  )
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981', marginTop: 4 }}>
      Valor atual: {fmtValor(valor, ind.unidade)}
    </div>
  )
}

function MetaForm({ item, metas, onSave, onCancel }) {
  const [form, setForm] = useState(item)
  const [indicadores] = useLocalState(INDICADORES_KEY, [])
  const [perfis] = useLocalState('settings:perfis_v2', [])
  const { funis } = useFunnels()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const indicadoresAtivos = useMemo(() => indicadores.filter(i => i.status === 'ativo'), [indicadores])

  const metasPai = useMemo(() =>
    metas.filter(m =>
      m.status === 'ativo' &&
      m.indicador_id === form.indicador_id &&
      m.id !== form.id
    ), [metas, form.indicador_id, form.id])

  const podeGravar = form.nome && form.indicador_id && form.valor_alvo

  const indSel = indicadoresAtivos.find(i => i.id === form.indicador_id)

  return (
    <FullPageEdit
      titulo={form.id ? form.nome : 'Nova meta'}
      onSave={() => podeGravar && onSave(form)}
      onCancel={onCancel}
      podeGravar={!!podeGravar}
    >
      <FPESection titulo="Identificação">
        <FPEField label="Nome" required>
          <input className="fpe-field" value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Ex: MRR mensal, Conversão do funil…" />
        </FPEField>
        <FPEField label="Indicador" required>
          <select className="fpe-field" value={form.indicador_id} onChange={e => set('indicador_id', e.target.value)}>
            <option value="">Selecione um indicador...</option>
            {indicadoresAtivos.map(i => (
              <option key={i.id} value={i.id}>{i.nome} — {i.modulo}</option>
            ))}
          </select>
          {form.indicador_id && (
            <ValorAtual indicadorId={form.indicador_id} indicadores={indicadoresAtivos} funis={funis} />
          )}
        </FPEField>
      </FPESection>

      <FPESection titulo="Responsável">
        <FPEField label="Escopo">
          <select className="fpe-field" value={form.scope} onChange={e => set('scope', e.target.value)}>
            {ESCOPOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </FPEField>
        {form.scope === 'usuario' && (
          <FPEField label="Usuário">
            <select className="fpe-field" value={form.usuario_id} onChange={e => set('usuario_id', e.target.value)}>
              <option value="">Selecione...</option>
              {(perfis || []).map(p => (
                <option key={p.id} value={p.id}>{p.nome || p.email}</option>
              ))}
            </select>
          </FPEField>
        )}
        {form.scope === 'equipe' && (
          <FPEField label="Nome da equipe">
            <input className="fpe-field" value={form.equipe_nome} onChange={e => set('equipe_nome', e.target.value)} placeholder="Ex: Equipe Sul, SDRs…" />
          </FPEField>
        )}
      </FPESection>

      <FPESection titulo="Meta">
        <FPEField label={`Valor-alvo${indSel?.unidade ? ` (${indSel.unidade})` : ''}`} required>
          <input className="fpe-field" type="number" value={form.valor_alvo} onChange={e => set('valor_alvo', e.target.value)} placeholder="Ex: 50000" />
        </FPEField>
        <FPEField label="Período">
          <select className="fpe-field" value={form.periodo} onChange={e => set('periodo', e.target.value)}>
            {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </FPEField>
        <FPEField label="Data início">
          <input className="fpe-field" type="date" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)} />
        </FPEField>
        <FPEField label="Data fim">
          <input className="fpe-field" type="date" value={form.data_fim} onChange={e => set('data_fim', e.target.value)} />
        </FPEField>
      </FPESection>

      <FPESection titulo="Hierarquia">
        <FPEField label="Meta pai">
          <select className="fpe-field" value={form.meta_pai_id} onChange={e => set('meta_pai_id', e.target.value)}>
            <option value="">Nenhuma (meta raiz)</option>
            {metasPai.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Ao definir uma meta pai, esta meta contribui para o valor consolidado dela.
          </div>
        </FPEField>
      </FPESection>

      <FPESection titulo="Status">
        <FPEField label="Status">
          <select className="fpe-field" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </FPEField>
      </FPESection>
    </FullPageEdit>
  )
}

function ProgressBar({ valorAtual, valorAlvo, tendencia }) {
  if (valorAtual === null || !valorAlvo) {
    return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
  }
  const alvo = Number(valorAlvo)
  const atual = Number(valorAtual)
  const pct = alvo > 0
    ? Math.min(Math.round((tendencia === 'descer' ? alvo / atual : atual / alvo) * 100), 100)
    : 0
  const cor = pct >= 100 ? '#10B981' : pct >= 75 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, color: cor, fontWeight: 700, fontFamily: 'var(--mono)' }}>{pct}%</span>
    </div>
  )
}

const COLUNAS = ['Nome', 'Indicador', 'Responsável', 'Valor-alvo', 'Período', 'Progresso', 'Status']

export default function SettingsMetas() {
  const [metas, setMetas] = useLocalState(METAS_KEY, [])
  const [indicadores] = useLocalState(INDICADORES_KEY, [])
  const [editando, setEditando] = useState(null)
  const [busca, setBusca] = useState('')
  const { funis } = useFunnels()

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return metas.filter(m => !q || m.nome?.toLowerCase().includes(q))
  }, [metas, busca])

  function handleSave(form) {
    setMetas(prev => {
      if (form.id) return prev.map(m => m.id === form.id ? form : m)
      return [...prev, { ...form, id: uid() }]
    })
    setEditando(null)
  }

  if (editando !== null) {
    return (
      <MetaForm
        item={editando}
        metas={metas}
        onSave={handleSave}
        onCancel={() => setEditando(null)}
      />
    )
  }

  return (
    <BrowseLayout
      titulo="Metas e KPIs"
      subtitulo="Instâncias com responsável, valor-alvo e período"
      colunas={COLUNAS}
      onNew={() => setEditando({ ...EMPTY })}
      newLabel="+ Nova meta"
      busca={busca}
      onBusca={setBusca}
    >
      {lista.length === 0 ? (
        <tr>
          <td colSpan={COLUNAS.length} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            {busca ? 'Nenhuma meta encontrada.' : 'Nenhuma meta cadastrada. Clique em "Nova meta" para começar.'}
          </td>
        </tr>
      ) : lista.map(meta => {
        const ind = indicadores.find(i => i.id === meta.indicador_id)
        const valorAtual = ind ? calcValorIndicador(ind, funis) : null
        const metaPai = meta.meta_pai_id ? metas.find(m => m.id === meta.meta_pai_id) : null

        let responsavel = 'Empresa'
        if (meta.scope === 'equipe') responsavel = meta.equipe_nome || 'Equipe'
        if (meta.scope === 'usuario') responsavel = `Usuário ${meta.usuario_id}`

        const periodoLabel = PERIODOS.find(p => p.value === meta.periodo)?.label || meta.periodo

        return (
          <tr key={meta.id} onClick={() => setEditando(meta)} style={{ cursor: 'pointer' }}>
            <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text)' }}>
              <div style={{ fontWeight: 600 }}>{meta.nome}</div>
              {metaPai && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>filha de {metaPai.nome}</div>
              )}
            </td>
            <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>{ind?.nome || '—'}</td>
            <td style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)' }}>{responsavel}</td>
            <td style={{ padding: '10px 12px', fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
              {ind?.unidade} {Number(meta.valor_alvo).toLocaleString('pt-BR')}
            </td>
            <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{periodoLabel}</td>
            <td style={{ padding: '10px 12px' }}>
              <ProgressBar valorAtual={valorAtual} valorAlvo={meta.valor_alvo} tendencia={ind?.tendencia} />
            </td>
            <td style={{ padding: '10px 12px' }}>
              <span style={{
                fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 10px',
                background: meta.status === 'ativo' ? 'var(--accent-lite)' : 'var(--surface)',
                color: meta.status === 'ativo' ? 'var(--accent)' : 'var(--text-muted)',
                border: `1px solid ${meta.status === 'ativo' ? 'var(--accent)' : 'var(--border)'}`,
              }}>
                {meta.status === 'ativo' ? 'Ativo' : 'Inativo'}
              </span>
            </td>
          </tr>
        )
      })}
    </BrowseLayout>
  )
}
