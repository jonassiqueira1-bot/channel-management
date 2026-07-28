import { useState, useEffect, useRef } from 'react'
import { Bell, X, Check, ExternalLink, Search, ChevronDown, ChevronUp, GripHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Chaves cobrem tanto o `entidade_tipo` gravado pelo motor atual (= rule.origem,
// nomes de tabela) quanto os valores legados do processador antigo (singular/PT).
const LINKS = {
  // motor atual (src/pages/settings/Alertas.js → executarEngine)
  oportunidades:       '/pipeline',
  contracts:           '/contratos',
  projects:            '/projetos',
  tasks:               '/tarefas',
  actions:             '/acoes',
  commission_payments: '/comissoes',
  payments:            '/pagamentos',
  companies:           '/empresas',
  goals:               '/metas',
  sellers:             '/vendedores',
  contacts:            '/contatos',
  customer_health:     '/customer-success',
  provisoes:           '/pagamentos',
  // legado (processadores fixos antigos)
  oportunidade: '/pipeline',
  contrato:     '/contratos',
  pagamento:    '/pagamentos',
  projeto:      '/projetos',
  cs:           '/customer-success',
}

function fmtDias(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (d === 0) return 'hoje'
  if (d === 1) return '1d'
  return `${d}d`
}

const DEFAULT_POS = { x: window.innerWidth - 356, y: 42 }

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

// Painel arrastável de pendências — puramente apresentacional (dados e ações
// vêm de props). Aberto/fechado é controlado por quem monta o componente
// (ver UtilityMenu, que reúne o gatilho de Pendências e Ajuda num só ícone).
export default function AlertsPanel({ alerts, loading, onResolve, onResolveAll, onClose }) {
  const navigate = useNavigate()
  const [minimized, setMinimized] = useState(false)
  const [search, setSearch]       = useState('')
  const [pos, setPos]             = useState(() => {
    try { return JSON.parse(localStorage.getItem('inbox_pos')) || DEFAULT_POS } catch { return DEFAULT_POS }
  })
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const widgetRef = useRef(null)

  // Drag
  function onMouseDown(e) {
    if (e.target.closest('button') || e.target.closest('input')) return
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragging.current) return
      const nx = clamp(e.clientX - dragOffset.current.x, 0, window.innerWidth - 340)
      const ny = clamp(e.clientY - dragOffset.current.y, 0, window.innerHeight - 48)
      setPos({ x: nx, y: ny })
    }
    function onUp() {
      if (!dragging.current) return
      dragging.current = false
      setPos(p => { localStorage.setItem('inbox_pos', JSON.stringify(p)); return p })
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const q = search.toLowerCase()
  const filtered = alerts.filter(a =>
    !q || a.titulo?.toLowerCase().includes(q) || a.entidade_nome?.toLowerCase().includes(q) || a.mensagem?.toLowerCase().includes(q)
  )
  const count = alerts.length

  return (
    <div
      ref={widgetRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 340,
        zIndex: 9999,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: minimized ? 'auto' : 480,
        userSelect: 'none',
      }}
    >
      {/* Header (arraste aqui) */}
      <div
        onMouseDown={onMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: minimized ? 'none' : '1px solid var(--border)',
          borderRadius: minimized ? 12 : '12px 12px 0 0',
          cursor: 'grab',
          background: 'var(--surface2)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <GripHorizontal size={12} strokeWidth={2} color="var(--text-muted)" style={{ flexShrink:0 }} />
          <Bell size={13} strokeWidth={2} color={count > 0 ? '#ef4444' : 'var(--text-muted)'} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Pendências</span>
          {count > 0 && (
            <span style={{
              background: 'var(--surface)', color: 'var(--text-muted)',
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
              border: '1px solid var(--border)',
            }}>
              {filtered.length !== count ? `${filtered.length} / ${count}` : count}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {!minimized && count > 0 && (
            <button onClick={() => onResolveAll(filtered.map(a => a.id))} style={s.hdrBtn} title="Resolver todas visíveis">
              <Check size={12} strokeWidth={2.5} />
            </button>
          )}
          <button onClick={() => setMinimized(m => !m)} style={s.hdrBtn} title={minimized ? 'Expandir' : 'Minimizar'}>
            {minimized ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
          </button>
          <button onClick={onClose} style={s.hdrBtn} title="Fechar">
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Busca */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
            <Search size={12} strokeWidth={2} color="var(--text-muted)"
              style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar pendências…"
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 28, paddingRight: search ? 28 : 10,
                height: 30, border: '1px solid var(--border)', borderRadius: 6,
                background: 'var(--surface2)', color: 'var(--text)',
                fontSize: 12, fontFamily: 'var(--font)', outline: 'none',
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
            )}
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <div style={s.empty}>Carregando…</div>}
            {!loading && filtered.length === 0 && (
              <div style={s.empty}>{search ? 'Nenhuma pendência encontrada.' : 'Nenhuma pendência no momento.'}</div>
            )}
            {!loading && filtered.map(a => (
              <div key={a.id} style={s.item}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: a.prioridade === 'alta' ? '#ef4444' : a.prioridade === 'baixa' ? 'var(--text-muted)' : '#f59e0b',
                      display: 'inline-block',
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {a.titulo}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                      {fmtDias(a.created_at)}
                    </span>
                  </div>
                  {a.entidade_nome && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, paddingLeft: 12 }}>
                      {a.entidade_nome}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  {a.entidade_tipo && (
                    <button onClick={() => { navigate(a.link || LINKS[a.entidade_tipo] || '/'); onClose() }} style={s.actionBtn} title="Ver registro">
                      <ExternalLink size={11} strokeWidth={2} />
                    </button>
                  )}
                  <button onClick={() => onResolve(a.id)} style={s.actionBtn} title="Marcar como resolvido">
                    <Check size={11} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={() => { navigate('/settings/alertas'); onClose() }}
              style={{ ...s.hdrBtn, fontSize: 11, color: 'var(--text-muted)', width: '100%', justifyContent: 'center' }}
            >
              Configurar alertas
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const s = {
  hdrBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', padding: '4px 5px', borderRadius: 6,
    fontFamily: 'var(--font)',
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '9px 12px', borderBottom: '1px solid var(--border)',
  },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: '1px solid var(--border)',
    borderRadius: 5, cursor: 'pointer', color: 'var(--text-muted)',
    padding: '3px 5px',
  },
  empty: {
    padding: '32px 20px', textAlign: 'center',
    fontSize: 12, color: 'var(--text-muted)',
  },
}
