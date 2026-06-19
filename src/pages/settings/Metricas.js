import { useState, useMemo } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
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

const EMPTY = {
  nome: '', descricao: '',
  modulos: [],
  valor_alvo: '', unidade: '', tendencia: 'subir',
  periodo: 1, intervalo: 'meses',
  usuario_ids: [], franquia_ids: [], produto_ids: [],
  cor: '#3B82F6', status: 'ativo',
}

function uid() { return Date.now() + Math.floor(Math.random() * 999) }

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

  const [editando, setEditando] = useState(null)
  const [form, setForm]         = useState(null)
  const [search, setSearch]     = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return metricas.filter(m => m.nome.toLowerCase().includes(q))
  }, [metricas, search])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function toggleModulo(val) {
    set('modulos', form.modulos.includes(val)
      ? form.modulos.filter(x => x !== val)
      : [...form.modulos, val])
  }

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

  const podeGravar = form?.nome?.trim() && form?.valor_alvo && form?.unidade && (form?.modulos||[]).length > 0

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
    { key: 'modulos',   label: 'Módulos',    render: v => <ModulosBadges values={v} /> },
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

        {/* Módulos */}
        <FPESection title="Módulos" description="Em quais funcionalidades esta métrica é exibida">
          <div style={{ gridColumn: '1/-1', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MODULOS.map(m => {
              const checked = (form.modulos || []).includes(m.value)
              return (
                <label key={m.value} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8,
                  border: `1px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                  background: checked ? 'color-mix(in srgb, var(--accent) 6%, transparent)' : 'var(--surface)',
                  cursor: 'pointer', transition: 'all 0.12s' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleModulo(m.value)}
                    style={{ accentColor: 'var(--accent)', width: 14, height: 14 }} />
                  <span style={{ fontSize: 13, fontWeight: checked ? 600 : 400, color: checked ? 'var(--accent)' : 'var(--text)' }}>{m.label}</span>
                </label>
              )
            })}
          </div>
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
          <FPEField label="Intervalo de acompanhamento" style={{ gridColumn: 'span 3' }}>
            <select className="fpe-field" value={form.intervalo} onChange={e => set('intervalo', e.target.value)}>
              {INTERVALOS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
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
