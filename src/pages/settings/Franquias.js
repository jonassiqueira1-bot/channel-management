import { useState, useMemo } from 'react'
import { useLocalState } from '../../hooks/useLocalState'
import BrowseLayout from '../../components/BrowseLayout'
import { FullPageEdit, FPESection, FPEField, FPEGrid } from '../../components/ui'

function uid() { return Date.now() + Math.floor(Math.random() * 999) }

const CLASSIF_CONFIG = {
  franquia: { label: 'Franquia', color: 'var(--accent)',  bg: 'var(--accent-lite)' },
  unidade:  { label: 'Unidade',  color: '#10B981',        bg: '#D1FAE5'            },
}

function ClassifBadge({ value }) {
  const cfg = CLASSIF_CONFIG[value] || CLASSIF_CONFIG.franquia
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </span>
  )
}

function SituacaoBadge({ situacao }) {
  const ativo = situacao === 'ativo'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
      background: ativo ? '#D1FAE5' : '#F1F5F9',
      color:      ativo ? '#065F46' : '#475569',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ativo ? '#10B981' : '#9A9590' }} />
      {ativo ? 'Ativa' : 'Inativa'}
    </span>
  )
}

// ─── Bulk reclassify modal ────────────────────────────────────────────────────
function BulkReclassifyModal({ ids, franquias, onConfirm, onClose }) {
  const [classificacao, setClassificacao] = useState('franquia')
  const [franquiaId, setFranquiaId] = useState('')
  const franquiasMae = franquias.filter(f => f.classificacao !== 'unidade')
  const precisaFranquia = classificacao === 'unidade'
  const podeConfirmar = !precisaFranquia || franquiaId

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background:'var(--surface)', borderRadius:14, padding:28, width:420, boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ fontWeight:700, fontSize:15, color:'var(--text)', marginBottom:4 }}>Reclassificar em lote</div>
        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:20 }}>{ids.length} registro{ids.length > 1 ? 's' : ''} selecionado{ids.length > 1 ? 's' : ''}</div>

        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:6 }}>Classificação</div>
          <div style={{ display:'flex', gap:8 }}>
            {Object.entries(CLASSIF_CONFIG).map(([val, cfg]) => (
              <button key={val} type="button" onClick={() => { setClassificacao(val); setFranquiaId('') }}
                style={{ flex:1, padding:'10px 0', borderRadius:9, cursor:'pointer', fontWeight:700, fontSize:13,
                  border: classificacao === val ? `2px solid ${cfg.color}` : '2px solid var(--border)',
                  background: classificacao === val ? cfg.bg : 'var(--surface)',
                  color: classificacao === val ? cfg.color : 'var(--text-muted)',
                  transition:'all 0.12s' }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {precisaFranquia && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:6 }}>Franquia detentora *</div>
            <select className="fpe-field" value={franquiaId} onChange={e => setFranquiaId(e.target.value)}>
              <option value="">— Selecione a franquia —</option>
              {franquiasMae.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>
        )}

        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button type="button" onClick={onClose}
            style={{ padding:'8px 18px', borderRadius:8, border:'1px solid var(--border)', background:'none', cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>
            Cancelar
          </button>
          <button type="button" disabled={!podeConfirmar} onClick={() => onConfirmar({ classificacao, franquia_id: franquiaId || null })}
            style={{ padding:'8px 18px', borderRadius:8, border:'none', background: podeConfirmar ? 'var(--accent)' : 'var(--border)', color:'#fff', cursor: podeConfirmar ? 'pointer' : 'default', fontSize:13, fontWeight:700, transition:'background 0.12s' }}>
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Franquias() {
  const [franquias, setFranquias] = useLocalState('settings:franquias_v2', [])
  const [editando, setEditando]   = useState(null)
  const [form, setForm]           = useState(null)
  const [search, setSearch]       = useState('')
  const [bulkModal, setBulkModal] = useState(null) // ids[]

  const franquiasMae = useMemo(() => franquias.filter(f => f.classificacao !== 'unidade'), [franquias])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return franquias.filter(f => f.nome.toLowerCase().includes(q))
  }, [franquias, search])

  function abrirNovo() {
    setForm({ nome: '', codigo: '', situacao: 'ativo', classificacao: 'franquia', franquia_id: null })
    setEditando('novo')
  }

  function abrirEdicao(row) {
    setForm({ ...row })
    setEditando(row)
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const nomeErr = useMemo(() => {
    if (!form?.nome?.trim()) return null
    return franquias.some(
      f => f.id !== editando?.id && f.nome.trim().toLowerCase() === form.nome.trim().toLowerCase()
    ) ? 'Já existe um registro com este nome' : null
  }, [form?.nome, franquias, editando])

  const podeGravar = form?.nome?.trim() && !nomeErr

  function handleSave() {
    if (!podeGravar) return
    const data = {
      ...form,
      nome: form.nome.trim(),
      franquia_id: form.classificacao === 'unidade' ? form.franquia_id : null,
    }
    if (editando !== 'novo') {
      setFranquias(prev => prev.map(f => f.id === editando.id ? { ...f, ...data } : f))
    } else {
      setFranquias(prev => [...prev, { ...data, id: uid() }])
    }
    setEditando(null)
  }

  function handleDelete(id) {
    setFranquias(prev => prev.filter(f => f.id !== id))
    setEditando(null)
  }

  function handleBulkReclassify(ids) {
    setBulkModal(ids)
  }

  function applyBulk({ classificacao, franquia_id }) {
    const ids = new Set(bulkModal)
    setFranquias(prev => prev.map(f =>
      ids.has(f.id)
        ? { ...f, classificacao, franquia_id: classificacao === 'unidade' ? franquia_id : null }
        : f
    ))
    setBulkModal(null)
  }

  const columns = [
    {
      key: 'nome',
      label: 'Nome',
      render: (v, row) => {
        const franquiaMae = row.franquia_id ? franquias.find(f => f.id === row.franquia_id) : null
        return (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {row.codigo && <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:5, padding:'1px 6px' }}>{row.codigo}</span>}
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{v}</span>
            </div>
            {franquiaMae && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                ↳ {franquiaMae.codigo ? `[${franquiaMae.codigo}] ` : ''}{franquiaMae.nome}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'classificacao',
      label: 'Classificação',
      width: 130,
      render: v => <ClassifBadge value={v || 'franquia'} />,
    },
    {
      key: 'situacao',
      label: 'Situação',
      width: 110,
      render: v => <SituacaoBadge situacao={v} />,
    },
  ]

  // ── Form (early return) ───────────────────────────────────────────────────
  if (editando) {
    const isUnidade = form.classificacao === 'unidade'
    return (
      <FullPageEdit
        breadcrumb={[{ label: 'Franquias', onClick: () => setEditando(null) }]}
        title={editando === 'novo' ? 'Novo registro' : `Editar: ${editando.nome}`}
        onSave={podeGravar ? handleSave : undefined}
        onCancel={() => setEditando(null)}
        onDelete={editando !== 'novo' ? () => handleDelete(editando.id) : undefined}
      >
        <FPESection title="Identificação">
          {/* Linha 1: Classificação + Situação */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, gridColumn:'1/-1' }}>
            <FPEField label="Classificação" required>
              <select className="fpe-field" value={form.classificacao || 'franquia'}
                onChange={e => { set('classificacao', e.target.value); set('franquia_id', null) }}>
                {Object.entries(CLASSIF_CONFIG).map(([val, cfg]) => (
                  <option key={val} value={val}>{cfg.label}</option>
                ))}
              </select>
            </FPEField>
            <FPEField label="Situação">
              <select className="fpe-field" value={form.situacao || 'ativo'}
                onChange={e => set('situacao', e.target.value)}>
                <option value="ativo">Ativa</option>
                <option value="inativo">Inativa</option>
              </select>
            </FPEField>
          </div>

          {/* Linha 2: Código + Nome */}
          <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:12, gridColumn:'1/-1' }}>
            <FPEField label="Código">
              <input className="fpe-field" value={form.codigo || ''}
                onChange={e => set('codigo', e.target.value)}
                placeholder="Ex: FRQ-001" />
            </FPEField>
            <FPEField label={isUnidade ? 'Nome da Unidade' : 'Nome da Franquia'} required error={nomeErr}>
              <input className="fpe-field" value={form.nome}
                onChange={e => set('nome', e.target.value)}
                placeholder={isUnidade ? 'Ex: Unidade Norte' : 'Ex: Franquia Norte'}
                style={nomeErr ? { borderColor: 'var(--red)' } : {}} />
            </FPEField>
          </div>

          {/* Linha 3: Franquia detentora — só se Unidade */}
          {isUnidade && (
            <div style={{ gridColumn:'1/-1' }}>
              <FPEField label="Franquia detentora">
                <select className="fpe-field" value={form.franquia_id || ''}
                  onChange={e => set('franquia_id', e.target.value || null)}>
                  <option value="">— Nenhuma —</option>
                  {franquiasMae.filter(f => f.id !== editando?.id).map(f => (
                    <option key={f.id} value={f.id}>{f.codigo ? `[${f.codigo}] ` : ''}{f.nome}</option>
                  ))}
                </select>
              </FPEField>
            </div>
          )}
        </FPESection>
      </FullPageEdit>
    )
  }

  return (
    <>
      {bulkModal && (
        <BulkReclassifyModal
          ids={bulkModal}
          franquias={franquias}
          onConfirmar={applyBulk}
          onClose={() => setBulkModal(null)}
        />
      )}
      <BrowseLayout
        columns={columns}
        data={filtered}
        keyField="id"
        storageKey="settings_franquias"
        newLabel="Novo registro"
        onNew={abrirNovo}
        onRowClick={abrirEdicao}
        search={search}
        onSearchChange={setSearch}
        bulkActions={[
          { label: 'Reclassificar', onClick: handleBulkReclassify },
        ]}
        emptyState={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>🏢</span>
            <span style={{ fontSize: 13 }}>Nenhuma franquia ou unidade cadastrada.</span>
          </div>
        }
      />
    </>
  )
}
