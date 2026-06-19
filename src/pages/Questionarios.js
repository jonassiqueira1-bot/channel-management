import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { useLocalState } from '../hooks/useLocalState'
import { TIPO_CFG, STATUS_CFG } from '../data/mockQuestionarios'
import { useQuestionnaires } from '../hooks/useQuestionnaires'
import Button from '../components/Button'
import { FullPageEdit } from '../components/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '14px 18px',
      display: 'flex', flexDirection: 'column', gap: 4, border: '1px solid var(--border2)',
      boxShadow: 'var(--shadow)', borderTop: `3px solid ${color || 'var(--border)'}` }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</span>
    </div>
  )
}

// ─── Eye Icon ─────────────────────────────────────────────────────────────────

// ─── Ações Dropdown ───────────────────────────────────────────────────────────
function AcoesDropdown({ onClose, anchorRef }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, anchorRef])
  const item = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
    color: 'var(--text)', fontFamily: 'var(--font)', textAlign: 'left', borderRadius: 7, transition: 'background 0.12s' }
  return (
    <div ref={ref} style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 600,
      width: 200, background: 'var(--surface)', borderRadius: 10,
      border: '1px solid var(--border)', boxShadow: '0 8px 28px rgba(0,0,0,0.13)', padding: 6 }}>
      <button style={item}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Exportar templates
      </button>
    </div>
  )
}

// ─── Template Card (Browse) ───────────────────────────────────────────────────
function TemplateCard({ template, submissionsCount, onClick }) {
  const cfg    = TIPO_CFG[template.type] || TIPO_CFG.pre_venda
  const total  = totalPerguntas(template)
  const secoes = (template.estrutura_secoes?.secoes || []).length

  return (
    <div onClick={onClick}
      style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 12,
        padding: '18px 20px', cursor: 'pointer', boxShadow: 'var(--shadow)',
        display: 'flex', flexDirection: 'column', gap: 12,
        borderTop: `3px solid ${cfg.color}`, transition: 'box-shadow 0.15s, transform 0.1s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.11)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow)'; e.currentTarget.style.transform = 'none' }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {template.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {template.description}
          </div>
        </div>
        <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%',
          background: template.is_active ? '#10B981' : '#9CA3AF', marginTop: 5 }} />
      </div>

      <TipoBadge tipo={template.type} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 10, borderTop: '1px solid var(--border2)' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            {secoes} seção{secoes !== 1 ? 'ões' : ''}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
            {total} pergunta{total !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4,
          background: 'var(--surface2)', borderRadius: 6, padding: '3px 8px' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--text-muted)' }}>
            <rect x="1" y="2" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M4 5h4M4 7.5h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', fontWeight: 600 }}>
            {submissionsCount}
          </span>
        </div>
      </div>
    </div>
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

        {/* Header */}
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

        {/* Corpo */}
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
function EstruturaBuilder({ draft, onChange }) {
  const secoes = draft.estrutura_secoes?.secoes || []

  function updateSecoes(newSecoes) {
    onChange({ ...draft, estrutura_secoes: { secoes: newSecoes } })
  }

  function addSection() {
    updateSecoes([...secoes, { id: novoSecId(), titulo: 'Nova seção', perguntas: [] }])
  }

  function removeSection(secId) {
    updateSecoes(secoes.filter(s => s.id !== secId))
  }

  function updateSection(secId, key, val) {
    updateSecoes(secoes.map(s => s.id === secId ? { ...s, [key]: val } : s))
  }

  function addQuestion(secId) {
    updateSecoes(secoes.map(s => s.id === secId
      ? { ...s, perguntas: [...(s.perguntas || []), { id: novoPId(), tipo: 'texto', label: 'Nova pergunta', obrigatorio: false, opcoes: [] }] }
      : s))
  }

  function removeQuestion(secId, pId) {
    updateSecoes(secoes.map(s => s.id === secId
      ? { ...s, perguntas: s.perguntas.filter(p => p.id !== pId) }
      : s))
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
    { value: 'texto',           label: 'Texto livre' },
    { value: 'numero',          label: 'Número' },
    { value: 'multipla_escolha', label: 'Múltipla escolha' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Info header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={lbl}>Título do template</label>
          <input style={inp} value={draft.title || ''}
            onChange={e => onChange({ ...draft, title: e.target.value })}
            placeholder="Ex: Levantamento de Pré-Venda" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={lbl}>Tipo</label>
          <select style={inp} value={draft.type || 'pre_venda'}
            onChange={e => onChange({ ...draft, type: e.target.value })}>
            {Object.entries(TIPO_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <label style={lbl}>Descrição</label>
        <input style={inp} value={draft.description || ''}
          onChange={e => onChange({ ...draft, description: e.target.value })}
          placeholder="Descreva brevemente o objetivo deste questionário" />
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

      {/* Seções */}
      {secoes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nenhuma seção ainda</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Clique em "Adicionar seção" para começar</div>
        </div>
      )}

      {secoes.map((sec, si) => (
        <div key={sec.id} style={{ border: '1px solid var(--border)', borderRadius: 10,
          background: 'var(--surface2)', overflow: 'hidden' }}>

          {/* Cabeçalho da seção */}
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

          {/* Perguntas */}
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

                {/* Linha principal da pergunta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)',
                    flexShrink: 0, minWidth: 18 }}>{pi + 1}.</span>
                  <input
                    style={{ flex: 1, ...inp, padding: '6px 10px' }}
                    value={p.label}
                    onChange={e => updateQuestion(sec.id, p.id, 'label', e.target.value)}
                    placeholder="Texto da pergunta"
                  />
                  <select
                    style={{ ...inp, padding: '6px 8px', width: 160, flexShrink: 0 }}
                    value={p.tipo}
                    onChange={e => {
                      const newTipo = e.target.value
                      updateQuestion(sec.id, p.id, 'tipo', newTipo)
                      if (newTipo !== 'multipla_escolha') {
                        updateQuestion(sec.id, p.id, 'opcoes', [])
                      }
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

                {/* Editor de opções (multipla_escolha) */}
                {p.tipo === 'multipla_escolha' && (
                  <div style={{ marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>
                      Opções de resposta
                    </div>
                    {(p.opcoes || []).map((opt, oi) => (
                      <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)', flexShrink: 0 }} />
                        <input
                          style={{ flex: 1, ...inp, padding: '5px 10px', fontSize: 12 }}
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
                fontFamily: 'var(--font)', fontWeight: 500, marginTop: 2, transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-glow)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              + Pergunta
            </button>
          </div>
        </div>
      ))}

      <button onClick={addSection}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px', border: '2px dashed var(--border)', borderRadius: 10,
          background: 'none', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
          fontFamily: 'var(--font)', fontWeight: 500, transition: 'border-color 0.15s, color 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text-muted)' }}>
        + Adicionar seção
      </button>
    </div>
  )
}

// ─── Aba: Respostas Recebidas ─────────────────────────────────────────────────
function RespostasTab({ template, submissions, onSaveSubmission }) {
  const [selected, setSelected] = useState(null)
  const [novaEmpresa, setNovaEmpresa] = useState('')
  const [showNovaForm, setShowNovaForm] = useState(false)

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
    setNovaEmpresa('')
    setShowNovaForm(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Toolbar da aba */}
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

      {/* Formulário rápido nova resposta */}
      {showNovaForm && (
        <div style={{ display: 'flex', gap: 8, padding: '12px 14px', background: 'var(--surface2)',
          borderRadius: 8, border: '1px solid var(--border)' }}>
          <input style={{ flex: 1, ...inp, padding: '7px 12px' }} value={novaEmpresa}
            autoFocus placeholder="Nome da empresa / franquia"
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

      {/* Tabela */}
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
                <tr key={sub.id}
                  onClick={() => setSelected(sub)}
                  style={{ borderBottom: i < lista.length - 1 ? '1px solid var(--border2)' : 'none',
                    cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {sub.company_nome}
                  </td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={sub.status} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-soft)' }}>
                    {sub.answered_by_nome || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)',
                    fontFamily: 'var(--mono)' }}>
                    {fmtData(sub.submitted_at || sub.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal leitura */}
      {selected && (
        <RespostaModal
          submission={selected}
          template={template}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ─── Template FullPage ───────────────────────────────────────────────────────
function TemplateFullPage({ template: initial, submissions, onClose, onSave, onSaveSubmission, onDelete }) {
  const isNew = !initial?.id
  const [draft, setDraft] = useState(() => initial || {
    id: `tpl-${uid()}`, tenant_id: 't1', title: '', description: '',
    type: 'pre_venda', is_active: true,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    estrutura_secoes: { secoes: [] },
  })
  const [tab, setTab]   = useState('estrutura')
  const [saving, setSaving] = useState(false)

  function handleSave() {
    if (!draft.title.trim()) { alert('Informe o título do template'); return }
    setSaving(true)
    setTimeout(() => {
      onSave({ ...draft, updated_at: new Date().toISOString() })
      setSaving(false)
      onClose()
    }, 300)
  }

  const TABS = [
    { id: 'estrutura', label: 'Estrutura' },
    { id: 'respostas', label: `Respostas recebidas (${submissions.filter(s => s.template_id === draft.id).length})` },
  ]

  return (
    <FullPageEdit
      breadcrumb={[{ label: 'Questionários', onClick: onClose }]}
      title={isNew ? 'Novo questionário' : draft.title || 'Editar questionário'}
      subtitle={isNew ? 'Defina a estrutura do template' : `Atualizado ${fmtData(draft.updated_at)}`}
      onSave={handleSave}
      onCancel={onClose}
      onDelete={!isNew && onDelete ? () => { onDelete(draft.id); onClose() } : undefined}
      saving={saving}
      saveLabel={saving ? 'Salvando…' : isNew ? 'Criar template' : 'Salvar alterações'}
      columns={1}
    >
      {/* Checkbox ativo */}
      <div style={{ marginBottom: 4 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#71717A' }}>
          <input type="checkbox" checked={draft.is_active}
            onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))}
            style={{ accentColor: '#1E3A5F', cursor: 'pointer', width: 15, height: 15 }} />
          Template ativo
        </label>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E4E4E7', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            style={{ padding: '9px 18px', background: 'none', border: 'none', fontSize: 13,
              fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit',
              color: tab === t.id ? '#1E3A5F' : '#71717A',
              borderBottom: tab === t.id ? '2px solid #1E3A5F' : '2px solid transparent',
              marginBottom: -2, transition: 'color 0.15s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'estrutura' && (
        <EstruturaBuilder draft={draft} onChange={setDraft} />
      )}
      {tab === 'respostas' && !isNew && (
        <RespostasTab template={draft} submissions={submissions} onSaveSubmission={onSaveSubmission} />
      )}
      {tab === 'respostas' && isNew && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#71717A' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💾</div>
          <div style={{ fontSize: 13 }}>Salve o template primeiro para receber respostas.</div>
        </div>
      )}
    </FullPageEdit>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Questionarios() {
  const { templates, submissions, saveTemplate, removeTemplate, saveSubmission } = useQuestionnaires()
  const [search,       setSearch]       = useLocalState('questionarios:search', '')
  const [filtroTipo,   setFiltroTipo]   = useLocalState('questionarios:filtroTipo', '')
  const [showMetrics,  setShowMetrics]  = useLocalState('questionarios:showMetrics', true)
  const [acoesOpen,    setAcoesOpen]    = useState(false)
  const [drawer,       setDrawer]       = useState(null)  // null | template object
  const acoesRef = useRef(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return templates.filter(t =>
      (!filtroTipo || t.type === filtroTipo) &&
      (!q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
    ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [templates, filtroTipo, search])

  const kpis = useMemo(() => ({
    total:   templates.length,
    ativos:  templates.filter(t => t.is_active).length,
    respostas: submissions.length,
    aprovados: submissions.filter(s => s.status === 'aprovado').length,
  }), [templates, submissions])

  const submissoesPorTemplate = useCallback(id => submissions.filter(s => s.template_id === id).length, [submissions])

  function handleSaveTemplate(updated) { saveTemplate(updated) }
  function handleSaveSubmission(sub) { saveSubmission(sub) }

  if (drawer) {
    return (
      <TemplateFullPage
        template={drawer === 'novo' ? null : drawer}
        submissions={submissions}
        onClose={() => setDrawer(null)}
        onSave={handleSaveTemplate}
        onSaveSubmission={handleSaveSubmission}
        onDelete={removeTemplate}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

      <div style={{ flexShrink: 0, padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── Header ── */}
        <div style={pg.pageHeader}>
          <div>
            <div style={pg.breadcrumb}>
              <span>Operação</span><span style={pg.sep}>›</span><span>Questionários</span>
            </div>
            <h1 style={pg.title}>Questionários</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowMetrics(v => !v)}
              title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28,
                borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)',
                color:'var(--text-muted)', cursor:'pointer', flexShrink:0, marginTop:18 }}>
              {showMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <div ref={acoesRef} style={{ position: 'relative' }}>
              <button style={{ ...pg.ghostBtn, ...(acoesOpen ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}) }}
                onClick={() => setAcoesOpen(v => !v)}>
                Ações <span style={{ fontSize: 10 }}>▾</span>
              </button>
              {acoesOpen && (
                <AcoesDropdown onClose={() => setAcoesOpen(false)} anchorRef={acoesRef} />
              )}
            </div>
            <Button onClick={() => setDrawer('novo')}>+ Novo questionário</Button>
          </div>
        </div>

        {/* ── KPIs retráteis ── */}
        <div style={{ display: 'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease', overflow: 'hidden' }}>
          <div style={{ minHeight: 0, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, paddingBottom: 4 }}>
              <KpiCard label="Templates"      value={kpis.total}     color="var(--border)" />
              <KpiCard label="Ativos"         value={kpis.ativos}    color="var(--accent)" />
              <KpiCard label="Respostas"      value={kpis.respostas} color="#F59E0B" />
              <KpiCard label="Aprovadas"      value={kpis.aprovados} color="#10B981" />
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div style={pg.toolbar}>
          <div style={pg.tbLeft}>
            <div style={pg.searchWrap}>
              <span style={pg.searchIcon}>⌕</span>
              <input style={pg.searchInput} placeholder="Buscar template por nome ou descrição…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select style={pg.select} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              {Object.entries(TIPO_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div style={pg.tbDivider} />
          <div style={pg.tbRight}>
            {(search || filtroTipo) && (
              <button style={pg.ghostBtn} onClick={() => { setSearch(''); setFiltroTipo('') }}>
                ✕ Limpar
              </button>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
              {filtered.length} template{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

      </div>

      {/* ── Grid de Templates ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 28px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {search || filtroTipo ? 'Nenhum template encontrado' : 'Nenhum template ainda'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {search || filtroTipo ? 'Tente ajustar os filtros' : 'Crie o primeiro clicando em "+ Novo questionário"'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14, paddingTop: 8 }}>
            {filtered.map(tpl => (
              <TemplateCard
                key={tpl.id}
                template={tpl}
                submissionsCount={submissoesPorTemplate(tpl.id)}
                onClick={() => setDrawer(tpl)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const pg = {
  pageHeader:  { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  breadcrumb:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)', marginBottom: 4 },
  sep:         { color: 'var(--border)' },
  title:       { margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' },
  newBtn:      { padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  iconBtn:     { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-muted)', cursor: 'pointer' },
  iconBtnActive: { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-glow)' },
  ghostBtn:    { height: 36, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text-soft)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' },
  toolbar:     { background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', border: '1px solid var(--border2)', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 8 },
  tbLeft:      { display: 'flex', alignItems: 'center', gap: 8, flex: 1, flexShrink: 1, minWidth: 0 },
  tbDivider:   { width: 1, height: 24, background: 'var(--border)', flexShrink: 0 },
  tbRight:     { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  searchWrap:  { position: 'relative', flexShrink: 0 },
  searchIcon:  { position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' },
  searchInput: { width: 300, height: 36, padding: '0 10px 0 28px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' },
  select:      { height: 36, padding: '0 8px', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'var(--font)' },
}

const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: 0.4 }
const inp = {
  padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 7,
  background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
  outline: 'none', fontFamily: 'var(--font)', width: '100%', boxSizing: 'border-box',
}
