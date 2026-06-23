import { useState, useMemo, useCallback } from 'react'
import { ClipboardList, CheckCircle2, MessageSquare, ThumbsUp } from 'lucide-react'
import { useLocalState } from '../hooks/useLocalState'
import { TIPO_CFG, STATUS_CFG } from '../data/mockQuestionarios'
import { useQuestionnaires } from '../hooks/useQuestionnaires'
import Button from '../components/Button'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormSection, FormGrid, FormField } from '../components/ui/SlideOver'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid()     { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
function novoSecId() { return `sec-${uid()}` }
function novoPId()   { return `p-${uid()}` }
function novoSubId() { return `sub-${uid()}` }

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })
}

function totalPerguntas(tpl) {
  return (tpl?.estrutura_secoes?.secoes || []).reduce((s, sec) => s + (sec.perguntas || []).length, 0)
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  const cfg = TIPO_CFG[tipo] || TIPO_CFG.pre_venda
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
      background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.color}33`, whiteSpace: 'nowrap' }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.rascunho
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
      background: cfg.bg, color: cfg.text, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {cfg.label}
    </span>
  )
}

// ─── Modal: Resposta somente leitura ──────────────────────────────────────────
function RespostaModal({ submission, template, onClose }) {
  const secoes = template?.estrutura_secoes?.secoes || []

  function renderValor(pergunta, valor) {
    if (valor === undefined || valor === null || valor === '') return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Não respondido</span>
    if (Array.isArray(valor)) {
      if (valor.length === 0) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Não respondido</span>
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {valor.map((v, i) => (
            <span key={i} style={{ padding: '3px 10px', borderRadius: 6, background: 'var(--accent-glow)',
              color: 'var(--accent)', fontSize: 12, fontWeight: 600, border: '1px solid var(--accent)33' }}>
              {v}
            </span>
          ))}
        </div>
      )
    }
    return <span style={{ fontSize: 13, color: 'var(--text)' }}>{String(valor)}</span>
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1099 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1100, width: 580, maxWidth: '95vw', maxHeight: '86vh',
        background: 'var(--surface)', borderRadius: 14, boxShadow: '0 24px 72px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Resposta — {submission.company_nome}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge status={submission.status} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                {submission.answered_by_nome} · {fmtData(submission.submitted_at || submission.created_at)}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: '4px 6px', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {secoes.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Template sem estrutura definida.</div>
          )}
          {secoes.map((sec, si) => (
            <div key={sec.id} style={{ marginBottom: si < secoes.length - 1 ? 28 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase',
                letterSpacing: '0.07em', marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid var(--border2)' }}>
                {sec.titulo}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {(sec.perguntas || []).map(p => (
                  <div key={p.id}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft)',
                      textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 5, display: 'flex', gap: 4 }}>
                      {p.label}
                      {p.obrigatorio && <span style={{ color: 'var(--red)' }}>*</span>}
                    </div>
                    {renderValor(p, submission.valores_respostas?.[p.id])}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 24px 16px', borderTop: '1px solid var(--border)', flexShrink: 0, textAlign: 'right' }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', background: 'none', border: '1px solid var(--border)', borderRadius: 8,
              fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Fechar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Construtor de Estrutura ──────────────────────────────────────────────────
function EstruturaBuilder({ draft, onChange, errs = {}, setErrs }) {
  const secoes = draft.estrutura_secoes?.secoes || []

  function updateSecoes(newSecoes) {
    onChange({ ...draft, estrutura_secoes: { secoes: newSecoes } })
  }
  function addSection() { updateSecoes([...secoes, { id: novoSecId(), titulo: 'Nova seção', perguntas: [] }]) }
  function removeSection(secId) { updateSecoes(secoes.filter(s => s.id !== secId)) }
  function updateSection(secId, key, val) { updateSecoes(secoes.map(s => s.id === secId ? { ...s, [key]: val } : s)) }
  function addQuestion(secId) {
    updateSecoes(secoes.map(s => s.id === secId
      ? { ...s, perguntas: [...(s.perguntas || []), { id: novoPId(), tipo: 'texto', label: 'Nova pergunta', obrigatorio: false, opcoes: [] }] }
      : s))
  }
  function removeQuestion(secId, pId) {
    updateSecoes(secoes.map(s => s.id === secId ? { ...s, perguntas: s.perguntas.filter(p => p.id !== pId) } : s))
  }
  function updateQuestion(secId, pId, key, val) {
    updateSecoes(secoes.map(s => s.id === secId
      ? { ...s, perguntas: s.perguntas.map(p => p.id === pId ? { ...p, [key]: val } : p) }
      : s))
  }
  function addOption(secId, pId) {
    updateSecoes(secoes.map(s => s.id === secId
      ? { ...s, perguntas: s.perguntas.map(p => p.id === pId ? { ...p, opcoes: [...(p.opcoes || []), ''] } : p) }
      : s))
  }
  function updateOption(secId, pId, idx, val) {
    updateSecoes(secoes.map(s => s.id === secId
      ? { ...s, perguntas: s.perguntas.map(p => {
          if (p.id !== pId) return p
          const o = [...(p.opcoes || [])]
          o[idx] = val
          return { ...p, opcoes: o }
        }) }
      : s))
  }
  function removeOption(secId, pId, idx) {
    updateSecoes(secoes.map(s => s.id === secId
      ? { ...s, perguntas: s.perguntas.map(p => p.id === pId
          ? { ...p, opcoes: p.opcoes.filter((_, i) => i !== idx) }
          : p) }
      : s))
  }

  const TIPOS = [
    { value: 'texto',            label: 'Texto livre' },
    { value: 'numero',           label: 'Número' },
    { value: 'multipla_escolha', label: 'Múltipla escolha' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <FormSection label="Identificação">
        <FormGrid cols={2}>
          <FormField label="Título do template" required error={errs.title}>
            <input className="so-field" value={draft.title || ''}
              onChange={e => { onChange({ ...draft, title: e.target.value }); if (errs.title) setErrs(p => ({...p, title:''})) }}
              placeholder="Ex: Levantamento de Pré-Venda"
              style={{ borderColor: errs.title ? '#DC2626' : '', gridColumn: '1/-1' }} />
          </FormField>
          <FormField label="Tipo">
            <select className="so-field" value={draft.type || 'pre_venda'}
              onChange={e => onChange({ ...draft, type: e.target.value })}>
              {Object.entries(TIPO_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </FormField>
        </FormGrid>
        <FormGrid cols={1}>
          <FormField label="Descrição">
            <input className="so-field" value={draft.description || ''}
              onChange={e => onChange({ ...draft, description: e.target.value })}
              placeholder="Descreva brevemente o objetivo deste questionário" />
          </FormField>
        </FormGrid>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-soft)' }}>
          <input type="checkbox" checked={draft.is_active}
            onChange={e => onChange({ ...draft, is_active: e.target.checked })}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 15, height: 15 }} />
          Template ativo
        </label>
      </FormSection>

      <div style={{ height: 1, background: 'var(--border)' }} />

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Seções e perguntas
      </div>

      {secoes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: 10 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nenhuma seção ainda</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Clique em "Adicionar seção" para começar</div>
        </div>
      )}

      {secoes.map((sec, si) => (
        <div key={sec.id} style={{ border: '1px solid var(--border)', borderRadius: 10,
          background: 'var(--surface2)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
            borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
              fontFamily: 'var(--mono)', flexShrink: 0 }}>
              {si + 1}
            </div>
            <input
              style={{ flex: 1, border: 'none', background: 'none', fontSize: 13, fontWeight: 700,
                color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none' }}
              value={sec.titulo}
              onChange={e => updateSection(sec.id, 'titulo', e.target.value)}
              placeholder="Título da seção"
            />
            <button onClick={() => removeSection(sec.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: 14, padding: '2px 6px', borderRadius: 5, lineHeight: 1 }}
              title="Remover seção">✕</button>
          </div>

          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(sec.perguntas || []).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', fontStyle: 'italic' }}>
                Nenhuma pergunta nesta seção.
              </div>
            )}

            {(sec.perguntas || []).map((p, pi) => (
              <div key={p.id} style={{ background: 'var(--surface)', borderRadius: 8,
                border: '1px solid var(--border2)', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)',
                    flexShrink: 0, minWidth: 18 }}>{pi + 1}.</span>
                  <input
                    className="so-field"
                    style={{ flex: 1, padding: '6px 10px' }}
                    value={p.label}
                    onChange={e => updateQuestion(sec.id, p.id, 'label', e.target.value)}
                    placeholder="Texto da pergunta"
                  />
                  <select
                    className="so-field"
                    style={{ padding: '6px 8px', width: 160, flexShrink: 0 }}
                    value={p.tipo}
                    onChange={e => {
                      const newTipo = e.target.value
                      updateQuestion(sec.id, p.id, 'tipo', newTipo)
                      if (newTipo !== 'multipla_escolha') updateQuestion(sec.id, p.id, 'opcoes', [])
                    }}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                    fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={p.obrigatorio}
                      onChange={e => updateQuestion(sec.id, p.id, 'obrigatorio', e.target.checked)}
                      style={{ accentColor: 'var(--accent)', cursor: 'pointer' }} />
                    Obrigatório
                  </label>
                  <button onClick={() => removeQuestion(sec.id, p.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                      fontSize: 13, padding: '2px 5px', borderRadius: 5, lineHeight: 1, flexShrink: 0 }}
                    title="Remover pergunta">✕</button>
                </div>

                {p.tipo === 'multipla_escolha' && (
                  <div style={{ marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>
                      Opções de resposta
                    </div>
                    {(p.opcoes || []).map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
                        <input
                          className="so-field"
                          style={{ flex: 1, padding: '5px 10px', fontSize: 12 }}
                          value={opt}
                          placeholder={`Opção ${oi + 1}`}
                          onChange={e => updateOption(sec.id, p.id, oi, e.target.value)}
                        />
                        <button onClick={() => removeOption(sec.id, p.id, oi)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                            fontSize: 12, padding: '2px 4px', lineHeight: 1 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => addOption(sec.id, p.id)}
                      style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: '1px dashed var(--border)', borderRadius: 6,
                        fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', padding: '5px 10px',
                        fontFamily: 'var(--font)', marginTop: 2 }}>
                      + Adicionar opção
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button onClick={() => addQuestion(sec.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                background: 'none', border: '1px dashed var(--accent)44', borderRadius: 7,
                fontSize: 12, color: 'var(--accent)', cursor: 'pointer', padding: '7px 12px',
                fontFamily: 'var(--font)', fontWeight: 500, marginTop: 2 }}>
              + Pergunta
            </button>
          </div>
        </div>
      ))}

      <button onClick={addSection}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px', border: '2px dashed var(--border)', borderRadius: 10,
          background: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
          fontFamily: 'var(--font)', fontWeight: 500 }}>
        + Adicionar seção
      </button>
    </div>
  )
}

// ─── Aba: Respostas Recebidas ─────────────────────────────────────────────────
function RespostasTab({ template, submissions, onSaveSubmission }) {
  const [selected,      setSelected]      = useState(null)
  const [novaEmpresa,   setNovaEmpresa]   = useState('')
  const [showNovaForm,  setShowNovaForm]  = useState(false)

  const lista = submissions.filter(s => s.template_id === template.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  function criarSubmission() {
    if (!novaEmpresa.trim()) return
    const now = new Date().toISOString()
    onSaveSubmission({
      id: novoSubId(), tenant_id: 't1', template_id: template.id,
      company_nome: novaEmpresa.trim(), status: 'rascunho',
      answered_by_nome: 'Você', valores_respostas: {},
      created_at: now, submitted_at: null,
    })
    setNovaEmpresa(''); setShowNovaForm(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
          {lista.length} resposta{lista.length !== 1 ? 's' : ''} recebida{lista.length !== 1 ? 's' : ''}
        </span>
        <button onClick={() => setShowNovaForm(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7,
            fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          + Nova resposta
        </button>
      </div>

      {showNovaForm && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 14px', background: 'var(--surface2)',
          borderRadius: 8, border: '1px solid var(--border)' }}>
          <input className="so-field" style={{ flex: 1 }} value={novaEmpresa} autoFocus
            placeholder="Nome da empresa / franquia"
            onChange={e => setNovaEmpresa(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') criarSubmission() }} />
          <button onClick={criarSubmission}
            style={{ padding: '7px 16px', background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Criar
          </button>
          <button onClick={() => setShowNovaForm(false)}
            style={{ padding: '7px 12px', background: 'none', border: '1px solid var(--border)',
              borderRadius: 7, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Cancelar
          </button>
        </div>
      )}

      {lista.length === 0 && !showNovaForm ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nenhuma resposta ainda</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Clique em "+ Nova resposta" para registrar a primeira</div>
        </div>
      ) : lista.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Empresa', 'Status', 'Respondido por', 'Data'].map((h, i) => (
                  <th key={i} style={{ padding: '9px 14px', fontSize: 10, fontWeight: 700,
                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em',
                    textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((sub, i) => (
                <tr key={sub.id} onClick={() => setSelected(sub)}
                  style={{ borderBottom: i < lista.length - 1 ? '1px solid var(--border2)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {sub.company_nome}
                  </td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={sub.status} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-soft)' }}>
                    {sub.answered_by_nome || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                    {fmtData(sub.submitted_at || sub.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RespostaModal submission={selected} template={template} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

// ─── Conteúdo do SlideOver ────────────────────────────────────────────────────
function TemplateForm({ template: initial, submissions, onClose, onSave, onSaveSubmission, onDelete }) {
  const isNew = !initial?.id
  const [draft, setDraft] = useState(() => initial || {
    id: `tpl-${uid()}`, tenant_id: 't1', title: '', description: '',
    type: 'pre_venda', is_active: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    estrutura_secoes: { secoes: [] },
  })
  const [tab,    setTab]    = useState('estrutura')
  const [saving, setSaving] = useState(false)
  const [errs,   setErrs]   = useState({})

  const TABS = [
    { id: 'estrutura', label: 'Estrutura' },
    { id: 'respostas', label: `Respostas (${submissions.filter(s => s.template_id === draft.id).length})` },
  ]

  function handleSave() {
    if (!draft.title.trim()) { setErrs({ title: 'Título é obrigatório' }); return }
    setSaving(true)
    setTimeout(() => {
      onSave({ ...draft, updated_at: new Date().toISOString() })
      setSaving(false)
      onClose()
    }, 300)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, background: 'var(--surface2)', borderRadius: 9, padding: 3, border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            style={{ padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500, fontFamily: 'var(--font)',
              background: tab === t.id ? 'var(--surface)' : 'none',
              color: tab === t.id ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'estrutura' && (
        <EstruturaBuilder draft={draft} onChange={setDraft} errs={errs} setErrs={setErrs} />
      )}
      {tab === 'respostas' && !isNew && (
        <RespostasTab template={draft} submissions={submissions} onSaveSubmission={onSaveSubmission} />
      )}
      {tab === 'respostas' && isNew && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💾</div>
          <div style={{ fontSize: 13 }}>Salve o template primeiro para receber respostas.</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <div>
          {!isNew && onDelete && (
            <button onClick={() => { if (window.confirm('Excluir este template?')) { onDelete(draft.id); onClose() } }}
              style={{ padding: '8px 14px', borderRadius: 8, background: 'none', border: '1px solid rgba(239,68,68,0.35)',
                color: '#EF4444', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Excluir
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={saving} onClick={handleSave}>
            {isNew ? 'Criar template' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Questionarios() {
  const { templates, submissions, saveTemplate, removeTemplate, saveSubmission } = useQuestionnaires()
  const [search,       setSearch]       = useState('')
  const [activeFilters, setActiveFilters] = useState({})
  const [drawer,       setDrawer]       = useState(null)  // null | 'novo' | template object

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    const tipoF = activeFilters.type || []
    return templates.filter(t =>
      (!tipoF.length || tipoF.includes(t.type)) &&
      (!q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [templates, activeFilters, search])

  const kpis = useMemo(() => ({
    total:     templates.length,
    ativos:    templates.filter(t => t.is_active).length,
    respostas: submissions.length,
    aprovados: submissions.filter(s => s.status === 'aprovado').length,
  }), [templates, submissions])

  const submissoesPorTemplate = useCallback(id => submissions.filter(s => s.template_id === id).length, [submissions])

  const COLUMNS = [
    { key: 'title', label: 'Template', render: (val, row) => {
      const cfg = TIPO_CFG[row.type] || TIPO_CFG.pre_venda
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
            {cfg.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 7 }}>
              {val}
              {!row.is_active && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontWeight: 600 }}>Inativo</span>}
            </div>
            {row.description && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>
                {row.description}
              </div>
            )}
          </div>
        </div>
      )
    }},
    { key: 'type', label: 'Tipo', render: val => <TipoBadge tipo={val} /> },
    { key: 'estrutura_secoes', label: 'Seções / Perguntas', render: (_, row) => {
      const secoes = (row.estrutura_secoes?.secoes || []).length
      const total  = totalPerguntas(row)
      return (
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{secoes} seção{secoes !== 1 ? 'ões' : ''}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{total} perg.</span>
        </div>
      )
    }},
    { key: 'id', label: 'Respostas', render: (val) => {
      const count = submissoesPorTemplate(val)
      return (
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: count > 0 ? 'var(--text)' : 'var(--text-muted)', fontWeight: count > 0 ? 700 : 400 }}>
          {count}
        </span>
      )
    }},
    { key: 'created_at', label: 'Criado em', render: val =>
      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{fmtData(val)}</span>
    },
  ]

  const FILTERS = [
    { key: 'type', label: 'Tipo', options: Object.entries(TIPO_CFG).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` })) },
  ]

  const kpisNode = (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
      {[
        { label: 'Templates',  value: kpis.total,     Icon: ClipboardList, color: 'var(--border)'  },
        { label: 'Ativos',     value: kpis.ativos,    Icon: CheckCircle2,  color: 'var(--accent)'  },
        { label: 'Respostas',  value: kpis.respostas, Icon: MessageSquare, color: '#F59E0B'         },
        { label: 'Aprovadas',  value: kpis.aprovados, Icon: ThumbsUp,      color: '#10B981'         },
      ].map(m => (
        <div key={m.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, borderTop: `3px solid ${m.color}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: `${m.color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
        storageKey="questionarios_browse"
        onRowClick={row => setDrawer(row)}
        onNew={() => setDrawer('novo')}
        newLabel="+ Novo questionário"
        kpis={kpisNode}
        bulkEditFields={[
          { key: 'type', label: 'Tipo', type: 'select',
            options: Object.entries(TIPO_CFG).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` })) },
        ]}
        onBulkEdit={(ids, changes) =>
          ids.forEach(id => { const t = templates.find(t => t.id === id); if (t) saveTemplate({ ...t, ...changes }) })
        }
        renderCard={row => {
          const cfg    = TIPO_CFG[row.type] || TIPO_CFG.pre_venda
          const total  = totalPerguntas(row)
          const secoes = (row.estrutura_secoes?.secoes || []).length
          const count  = submissoesPorTemplate(row.id)
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.title}
                  </div>
                  {row.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {row.description}
                    </div>
                  )}
                </div>
                <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
                  background: row.is_active ? '#10B981' : '#9CA3AF', marginTop: 5 }} />
              </div>
              <TipoBadge tipo={row.type} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 8, borderTop: '1px solid var(--border2)' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                    {secoes} seção{secoes !== 1 ? 'ões' : ''}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                    {total} perg.
                  </span>
                </div>
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {count} resp.
                </span>
              </div>
            </div>
          )
        }}
        emptyState={
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {search || Object.keys(activeFilters).length ? 'Nenhum template encontrado' : 'Nenhum template ainda'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {search || Object.keys(activeFilters).length ? 'Tente ajustar os filtros' : 'Crie o primeiro clicando em "+ Novo questionário"'}
            </div>
          </div>
        }
      />

      <SlideOver
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer && drawer !== 'novo' ? (drawer.title || 'Editar questionário') : 'Novo questionário'}
        subtitle={drawer && drawer !== 'novo' ? `Atualizado ${fmtData(drawer.updated_at)}` : 'Defina a estrutura do template'}
        defaultWidth={760}
        showFooter={false}
      >
        {drawer && (
          <TemplateForm
            template={drawer === 'novo' ? null : drawer}
            submissions={submissions}
            onClose={() => setDrawer(null)}
            onSave={saveTemplate}
            onSaveSubmission={saveSubmission}
            onDelete={removeTemplate}
          />
        )}
      </SlideOver>
    </>
  )
}
