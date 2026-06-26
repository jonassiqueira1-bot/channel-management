import { useState, useMemo } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import { useFunnels } from '../../hooks/useFunnels'
import { useAuditLog } from '../../hooks/useAuditLog'
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

export default function SettingsMetas() {
  const [metas, setMetas] = useLocalState(METAS_KEY, [])
  const [indicadores] = useLocalState(INDICADORES_KEY, [])
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(null)
  const { funis } = useFunnels()
  const [perfis] = useLocalState('settings:perfis_v2', [])
  const { registrar: log } = useAuditLog()

  function abrir(meta) { setEditando(meta); setForm({ ...meta }) }
  function fechar()    { setEditando(null); setForm(null) }

  function handleSave() {
    if (!form.nome || !form.indicador_id || !form.valor_alvo) return
    const isNew = !form.id
    const saved = isNew ? { ...form, id: uid() } : form
    setMetas(prev => {
      if (!isNew) return prev.map(m => m.id === form.id ? form : m)
      return [...prev, saved]
    })
    log(isNew ? 'criar' : 'editar', 'meta_kpi', saved.id, { descricao: `Meta/KPI ${isNew ? 'criada' : 'editada'}: ${form.nome}` })
    fechar()
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const columns = useMemo(() => [
    {
      key: 'nome', label: 'Nome',
      render: (v, row) => {
        const pai = row.meta_pai_id ? metas.find(m => m.id === row.meta_pai_id) : null
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
            {pai && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>↳ {pai.nome}</div>}
          </div>
        )
      },
    },
    {
      key: 'indicador_id', label: 'Indicador',
      render: (v) => indicadores.find(i => i.id === v)?.nome || '—',
    },
    {
      key: 'scope', label: 'Responsável',
      render: (v, row) => {
        if (v === 'equipe') return row.equipe_nome || 'Equipe'
        if (v === 'usuario') {
          const p = perfis.find(p => p.id === row.usuario_id)
          return p?.nome || p?.email || `Usuário ${row.usuario_id}`
        }
        return 'Empresa'
      },
    },
    {
      key: 'valor_alvo', label: 'Valor-alvo',
      render: (v, row) => {
        const ind = indicadores.find(i => i.id === row.indicador_id)
        return `${ind?.unidade || ''} ${Number(v).toLocaleString('pt-BR')}`.trim()
      },
    },
    {
      key: 'periodo', label: 'Período',
      render: (v) => PERIODOS.find(p => p.value === v)?.label || v,
    },
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
  ], [indicadores, metas, perfis])

  if (editando !== null && form !== null) {
    const indicadoresAtivos = indicadores.filter(i => i.status === 'ativo')
    const indSel = indicadoresAtivos.find(i => i.id === form.indicador_id)
    const metasPai = metas.filter(m =>
      m.status === 'ativo' && m.indicador_id === form.indicador_id && m.id !== form.id
    )
    const podeGravar = !!(form.nome && form.indicador_id && form.valor_alvo)
    const valorAtual = indSel ? calcValorIndicador(indSel, funis) : null

    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Metas e KPIs', onClick: fechar }]}
        title={form.id ? form.nome : 'Nova meta'}
        onSave={podeGravar ? handleSave : undefined}
        onCancel={fechar}
        onDelete={form.id ? () => { setMetas(prev => prev.filter(m => m.id !== form.id)); log('excluir', 'meta_kpi', form.id, { descricao: `Meta/KPI excluída: ${form.nome}` }); fechar() } : undefined}
      >
        <FPESection title="Identificação">
          <FPEField label="Nome" required>
            <input className="fpe-field" value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: MRR mensal, Conversão do funil…" autoFocus />
          </FPEField>
          <FPEField label="Indicador" required>
            <select className="fpe-field" value={form.indicador_id} onChange={e => set('indicador_id', e.target.value)}>
              <option value="">Selecione um indicador…</option>
              {indicadoresAtivos.map(i => (
                <option key={i.id} value={i.id}>{i.nome} — {i.modulo}</option>
              ))}
            </select>
            {valorAtual !== null && (
              <div style={{ fontSize: 12, fontWeight: 700, color: '#10B981', marginTop: 4 }}>
                Valor atual: {indSel?.unidade || ''} {Number(valorAtual).toLocaleString('pt-BR')}
              </div>
            )}
          </FPEField>
        </FPESection>

        <FPESection title="Responsável">
          <FPEField label="Escopo">
            <select className="fpe-field" value={form.scope} onChange={e => set('scope', e.target.value)}>
              {ESCOPOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </FPEField>
          {form.scope === 'usuario' && (
            <FPEField label="Usuário">
              <select className="fpe-field" value={form.usuario_id} onChange={e => set('usuario_id', e.target.value)}>
                <option value="">Selecione…</option>
                {(perfis || []).map(p => (
                  <option key={p.id} value={p.id}>{p.nome || p.email}</option>
                ))}
              </select>
            </FPEField>
          )}
          {form.scope === 'equipe' && (
            <FPEField label="Nome da equipe">
              <input className="fpe-field" value={form.equipe_nome} onChange={e => set('equipe_nome', e.target.value)}
                placeholder="Ex: Equipe Sul, SDRs…" />
            </FPEField>
          )}
        </FPESection>

        <FPESection title="Meta">
          <FPEField label={`Valor-alvo${indSel?.unidade ? ` (${indSel.unidade})` : ''}`} required>
            <input className="fpe-field" type="number" value={form.valor_alvo}
              onChange={e => set('valor_alvo', e.target.value)} placeholder="Ex: 50000" />
          </FPEField>
          <FPEField label="Período">
            <select className="fpe-field" value={form.periodo} onChange={e => set('periodo', e.target.value)}>
              {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </FPEField>
          <FPEField label="Data início">
            <input className="fpe-field" type="date" value={form.data_inicio}
              onChange={e => set('data_inicio', e.target.value)} />
          </FPEField>
          <FPEField label="Data fim">
            <input className="fpe-field" type="date" value={form.data_fim}
              onChange={e => set('data_fim', e.target.value)} />
          </FPEField>
        </FPESection>

        <FPESection title="Hierarquia">
          <FPEField label="Meta pai">
            <select className="fpe-field" value={form.meta_pai_id} onChange={e => set('meta_pai_id', e.target.value)}>
              <option value="">Nenhuma (meta raiz)</option>
              {metasPai.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </FPEField>
        </FPESection>

        <FPESection title="Status">
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

  return (
    <BrowseLayout
      columns={columns}
      data={metas}
      keyField="id"
      storageKey="settings_metas"
      onNew={() => abrir({ ...EMPTY })}
      newLabel="+ Nova meta"
      onRowClick={abrir}
    />
  )
}
