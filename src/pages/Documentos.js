import { useState, useMemo, useRef, useEffect } from 'react'
import { useLocalState } from '../hooks/useLocalState'
import { FileText, CheckCircle2, Clock, Link } from 'lucide-react'
import { CATEGORIA_CFG, STATUS_CFG } from '../data/mockDocumentos'
import { useDocuments } from '../hooks/useDocuments'
import Button from '../components/Button'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormSection, FormGrid, FormField } from '../components/ui/SlideOver'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function CategoriaBadge({ categoria }) {
  const cfg = CATEGORIA_CFG[categoria] || CATEGORIA_CFG.outro
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
      background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.color}33`, whiteSpace: 'nowrap',
    }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.rascunho
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
      background: cfg.bg, color: cfg.text, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ─── PerfilMultiSelect ────────────────────────────────────────────────────────
function PerfilMultiSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggle(id) {
    onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  }

  const label = value.length === 0
    ? 'Todos têm acesso'
    : options.filter(p => value.includes(p.id)).map(p => p.nome).join(', ')

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7,
          background: 'var(--surface)', color: value.length ? 'var(--text)' : 'var(--text-muted)',
          fontSize: 13, fontFamily: 'var(--font)', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
        <span style={{ marginLeft: 8, fontSize: 10, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4,
          border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto',
        }}>
          {options.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum perfil cadastrado.</div>
          ) : options.map((p, idx) => {
            const selected = value.includes(p.id)
            return (
              <label key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
                background: selected ? 'var(--accent-light, #EFF6FF)' : 'var(--surface)',
                borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
              }}>
                <input type="checkbox" checked={selected} onChange={() => toggle(p.id)}
                  style={{ accentColor: p.cor || 'var(--accent)', width: 14, height: 14, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: selected ? 'var(--accent)' : 'var(--text)', fontWeight: selected ? 600 : 400 }}>
                  {p.nome}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── DocForm ──────────────────────────────────────────────────────────────────
function DocForm({ doc: initial, onClose, onSave, uploadFile, removeFile }) {
  const isNew = !initial?.id
  const fileInputRef = useRef(null)
  const [perfisStore] = useState(() => {
    try { return JSON.parse(localStorage.getItem('perfis:roles') || '[]') } catch { return [] }
  })
  const [draft, setDraft] = useState(() => initial || {
    id: uid(), tenant_id: 't1',
    title: '', description: '', categoria: 'proposta', status: 'ativo',
    prazo_validade: '', data_revisao: '', perfis_acesso: [],
    file_url: null, file_name: null, file_size: null, file_path: null,
    link_externo: '',
    created_by: 'Você', created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  function handleSave() {
    if (!draft.title.trim()) { alert('Título é obrigatório'); return }
    setSaving(true)
    const now = new Date().toISOString()
    onSave({ ...draft, updated_at: now, ...(isNew ? { created_at: now } : {}) })
    setSaving(false)
    onClose()
  }

  async function handleFileSelect(file) {
    if (!file) return
    setUploading(true)
    const res = await uploadFile(file)
    setUploading(false)
    if (!res.ok) { alert('Erro ao enviar arquivo: ' + res.message); return }
    set('file_url', res.url); set('file_name', res.name); set('file_size', res.size); set('file_path', res.path || null)
  }

  async function handleRemoveFile() {
    if (draft.file_path) await removeFile(draft.file_path)
    set('file_url', null); set('file_name', null); set('file_size', null); set('file_path', null)
  }

  function togglePerfil(id) {
    const curr = draft.perfis_acesso || []
    set('perfis_acesso', curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id])
  }

  const inp = {
    padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7,
    background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
    fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <SlideOver
      open
      title={isNew ? 'Novo Documento' : 'Editar Documento'}
      subtitle={isNew ? 'Adicione um documento ao repositório' : draft.title}
      onClose={onClose}
      showFooter
      onSave={handleSave}
      saveLabel={saving ? 'Salvando…' : (isNew ? 'Cadastrar' : 'Salvar')}
      cancelLabel="Cancelar"
      onDelete={!isNew ? () => { onSave(null, draft.id); onClose() } : undefined}
      deleteConfirm="Excluir este documento? Esta ação não pode ser desfeita."
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px', gap: 0 }}>
        <FormSection label="Identificação">
          <FormGrid cols={1}>
            <FormField label="Título" required>
              <input style={inp} value={draft.title} onChange={e => set('title', e.target.value)} placeholder="Nome do documento" autoFocus />
            </FormField>
            <FormField label="Descrição">
              <textarea style={{ ...inp, resize: 'vertical', minHeight: 72 }} value={draft.description || ''} onChange={e => set('description', e.target.value)} placeholder="Breve descrição do conteúdo…" rows={3} />
            </FormField>
          </FormGrid>
          <FormGrid cols={2}>
            <FormField label="Categoria">
              <select style={inp} value={draft.categoria} onChange={e => set('categoria', e.target.value)}>
                {Object.entries(CATEGORIA_CFG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select style={inp} value={draft.status} onChange={e => set('status', e.target.value)}>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection label="Datas de Controle">
          <FormGrid cols={2}>
            <FormField label="Prazo de Validade">
              <input type="date" style={inp} value={draft.prazo_validade || ''} onChange={e => set('prazo_validade', e.target.value)} />
            </FormField>
            <FormField label="Data de Revisão">
              <input type="date" style={inp} value={draft.data_revisao || ''} onChange={e => set('data_revisao', e.target.value)} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection label="Conteúdo do Documento">
          <FormGrid cols={1}>
            <FormField label="Link externo">
              <input type="url" style={inp} value={draft.link_externo || ''} onChange={e => set('link_externo', e.target.value)} placeholder="https://drive.google.com/…" />
            </FormField>
          </FormGrid>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Arquivo Anexo</div>
            {draft.file_url ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 20 }}>📎</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{draft.file_name}</div>
                  {draft.file_size && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtBytes(draft.file_size)}</div>}
                </div>
                <a href={draft.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Abrir</a>
                <button onClick={handleRemoveFile} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 13, padding: '2px 6px', fontFamily: 'var(--font)' }}>✕ Remover</button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {uploading ? 'Enviando…' : '📎 Clique para anexar um arquivo'}
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files?.[0])} />
              </div>
            )}
          </div>
        </FormSection>

        <FormSection label="Controle de Acesso">
          <FormField label="Perfis com acesso" hint="Se nenhum for selecionado, todos têm acesso.">
            <PerfilMultiSelect
              options={perfisStore}
              value={draft.perfis_acesso || []}
              onChange={ids => set('perfis_acesso', ids)}
            />
          </FormField>
        </FormSection>

        {!isNew && (
          <div style={{ padding: '10px 0', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            Criado por {draft.created_by} · Atualizado em {fmtDate(draft.updated_at)}
          </div>
        )}
      </div>
    </SlideOver>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Documentos() {
  const { docs, save: saveDoc, remove: deleteDoc, uploadFile, removeFile } = useDocuments()
  const [search, setSearch] = useLocalState('browse:documentos_browse:search', '')
  const [activeFilters, setActiveFilters] = useLocalState('browse:documentos_browse:filters', {})
  const [drawer, setDrawer] = useState(null) // null | 'novo' | doc object

  function validadeStyle(prazo_validade) {
    if (!prazo_validade) return {}
    const v   = new Date(prazo_validade); v.setHours(0, 0, 0, 0)
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const d7  = new Date(now); d7.setDate(d7.getDate() + 7)
    const d30 = new Date(now); d30.setDate(d30.getDate() + 30)
    if (v < now)   return { color: '#EF4444', fontWeight: 700 }
    if (v <= d7)   return { color: '#EF4444', fontWeight: 700 }
    if (v <= d30)  return { color: '#F59E0B', fontWeight: 600 }
    return {}
  }

  const filtered = useMemo(() => {
    const q       = search.toLowerCase().trim()
    const catF    = activeFilters.categoria || []
    const statusF = activeFilters.status    || []
    return docs.filter(d =>
      (!catF.length    || catF.includes(d.categoria)) &&
      (!statusF.length || statusF.includes(d.status)) &&
      (!q || d.title.toLowerCase().includes(q) || (d.description || '').toLowerCase().includes(q))
    ).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  }, [docs, activeFilters, search])


  function handleSave(docOrNull, deleteId) {
    if (deleteId) { deleteDoc(deleteId); return }
    saveDoc(docOrNull)
  }

  const COLUMNS = [
    {
      key: 'title', label: 'Documento', render: (val, row) => {
        const cfg = CATEGORIA_CFG[row.categoria] || CATEGORIA_CFG.outro
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: cfg.bg, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>
              {cfg.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>{val}</div>
              {row.description && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                  {row.description}
                </div>
              )}
            </div>
          </div>
        )
      },
    },
    { key: 'categoria',      label: 'Categoria', render: val => <CategoriaBadge categoria={val} /> },
    {
      key: 'prazo_validade', label: 'Validade', render: val => (
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', ...validadeStyle(val) }}>
          {fmtDate(val)}
        </span>
      ),
    },
    {
      key: 'data_revisao',   label: 'Revisão', render: val => (
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
          {fmtDate(val)}
        </span>
      ),
    },
    {
      key: 'perfis_acesso',  label: 'Acesso', render: val => {
        const count = (val || []).length
        return (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {count === 0 ? 'Todos' : `${count} perfil${count > 1 ? 'is' : ''}`}
          </span>
        )
      },
    },
    {
      key: 'link_externo',   label: 'Link', render: val => val
        ? <span title={val} style={{ fontSize: 14 }}>🔗</span>
        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>,
    },
  ]

  const FILTERS = [
    { key: 'categoria', label: 'Categoria', options: Object.entries(CATEGORIA_CFG).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` })) },
    { key: 'status',    label: 'Status',    options: Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label })) },
  ]

  const kpisNode = (data) => {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    const d30 = new Date(now); d30.setDate(d30.getDate() + 30)
    const metrics = {
      total:          data.length,
      validos:        data.filter(d => d.status === 'ativo' && (!d.prazo_validade || new Date(d.prazo_validade) >= now)).length,
      proximosVencer: data.filter(d => {
        if (!d.prazo_validade) return false
        const v = new Date(d.prazo_validade)
        return v >= now && v <= d30
      }).length,
      comLink:        data.filter(d => d.link_externo).length,
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total de documentos', value: metrics.total,          Icon: FileText,     color: 'var(--border)' },
          { label: 'Válidos',             value: metrics.validos,        Icon: CheckCircle2, color: '#10B981' },
          { label: 'Próximos a vencer',   value: metrics.proximosVencer, Icon: Clock,        color: '#F59E0B' },
          { label: 'Com link externo',    value: metrics.comLink,        Icon: Link,         color: 'var(--accent)' },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
            padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, borderTop: `3px solid ${m.color}`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, background: `${m.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <m.Icon size={16} strokeWidth={1.75} style={{ color: m.color }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{m.value}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <BrowseLayout
        data={filtered}
        columns={COLUMNS}
        filters={FILTERS}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        search={search}
        onSearchChange={setSearch}
        keyField="id"
        storageKey="documentos_browse"
        onRowClick={row => setDrawer(row)}
        onNew={() => setDrawer('novo')}
        newLabel="Novo Documento"
        kpis={kpisNode}
        bulkActions={[
          {
            label: 'Arquivar', onClick: ids => {
              ids.forEach(id => {
                const d = docs.find(x => x.id === id); if (d) saveDoc({ ...d, status: 'arquivado' })
              })
            },
          },
          {
            label: 'Excluir', onClick: ids => {
              if (window.confirm(`Excluir ${ids.length} documento(s)?`)) ids.forEach(id => deleteDoc(id))
            },
          },
        ]}
        renderCard={row => {
          const cfg = CATEGORIA_CFG[row.categoria] || CATEGORIA_CFG.outro
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, background: cfg.bg, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>
                  {cfg.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.title}
                  </div>
                  <div style={{
                    fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 2,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {row.description}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <CategoriaBadge categoria={row.categoria} />
                <StatusBadge status={row.status} />
                {row.link_externo && <span style={{ fontSize: 12 }}>🔗</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border2)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', ...validadeStyle(row.prazo_validade) }}>
                  {row.prazo_validade ? `Válido até ${fmtDate(row.prazo_validade)}` : 'Sem validade'}
                </span>
                {row.file_url && (
                  <a
                    href={row.file_url} target="_blank" rel="noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
                      color: 'var(--accent)', textDecoration: 'none', padding: '3px 8px',
                      border: '1px solid var(--accent)', borderRadius: 5, lineHeight: 1,
                    }}
                    title={row.file_name}
                  >
                    ↓ Baixar
                  </a>
                )}
              </div>
            </div>
          )
        }}
        emptyState={
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {search || Object.keys(activeFilters).length ? 'Nenhum documento encontrado' : 'Nenhum documento ainda'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {search || Object.keys(activeFilters).length ? 'Tente ajustar os filtros' : 'Crie o primeiro clicando em "+ Novo Documento"'}
            </div>
          </div>
        }
      />

      {drawer && (
        <DocForm
          doc={drawer === 'novo' ? null : drawer}
          onClose={() => setDrawer(null)}
          onSave={handleSave}
          uploadFile={uploadFile}
          removeFile={removeFile}
        />
      )}
    </>
  )
}
