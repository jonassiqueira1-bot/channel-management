import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, X, Check, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useNavigate } from 'react-router-dom'

const LINKS = {
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

export default function AlertsInbox({ collapsed }) {
  const { profile }    = useProfile()
  const navigate       = useNavigate()
  const [open, setOpen]       = useState(false)
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)

  const tenantId  = profile?.tenant_id
  const usuarioId = profile?.id

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('resolvido', false)
      .or(`usuario_id.is.null,usuario_id.eq.${usuarioId}`)
      .order('created_at', { ascending: false })
      .limit(30)
    setAlerts(data || [])
    setLoading(false)
  }, [tenantId, usuarioId])

  useEffect(() => { if (open) load() }, [open, load])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function resolve(id) {
    setAlerts(prev => prev.filter(a => a.id !== id))
    await supabase.from('alerts').update({ resolvido: true, resolvido_em: new Date().toISOString() }).eq('id', id)
  }

  async function resolveAll() {
    const ids = alerts.map(a => a.id)
    setAlerts([])
    await supabase.from('alerts').update({ resolvido: true, resolvido_em: new Date().toISOString() }).in('id', ids)
  }

  const count = alerts.length

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Botão na sidebar */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Pendências"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 8, width: '100%', padding: collapsed ? '8px 4px' : '8px 16px',
          background: open ? 'var(--sb-surface)' : 'none', border: 'none',
          color: open ? '#fff' : 'var(--sb-muted)', fontSize: 12,
          cursor: 'pointer', fontFamily: 'var(--font)',
          transition: 'color var(--transition)',
          position: 'relative',
        }}
      >
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <Bell size={15} strokeWidth={1.75} />
          {count > 0 && (
            <span style={{
              position: 'absolute', top: -5, right: -6,
              background: 'var(--accent)', color: '#fff',
              fontSize: 9, fontWeight: 700, lineHeight: 1,
              padding: '2px 4px', borderRadius: 99, minWidth: 14,
              textAlign: 'center',
            }}>
              {count > 99 ? '99+' : count}
            </span>
          )}
        </span>
        {!collapsed && <span>Pendências</span>}
      </button>

      {/* Painel */}
      {open && (
        <div style={{
          position: 'fixed',
          left: collapsed ? 56 : 220,
          bottom: 0,
          top: 0,
          width: 320,
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
          zIndex: 400,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={14} strokeWidth={2} color="var(--text-muted)" />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Pendências</span>
              {count > 0 && (
                <span style={{
                  background: 'var(--surface2)', color: 'var(--text-muted)',
                  fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                  border: '1px solid var(--border)',
                }}>
                  {count}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {count > 0 && (
                <button onClick={resolveAll} style={s.hdrBtn} title="Marcar todas como resolvidas">
                  <Check size={12} strokeWidth={2.5} />
                </button>
              )}
              <button onClick={() => setOpen(false)} style={s.hdrBtn}>
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && (
              <div style={s.empty}>Carregando…</div>
            )}
            {!loading && count === 0 && (
              <div style={s.empty}>Nenhuma pendência no momento.</div>
            )}
            {!loading && alerts.map(a => (
              <div key={a.id} style={s.item}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: a.prioridade === 'alta' ? 'var(--danger, #ef4444)' : a.prioridade === 'baixa' ? 'var(--text-muted)' : 'var(--warning, #f59e0b)',
                      display: 'inline-block',
                    }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {a.titulo}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
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
                    <button
                      onClick={() => { navigate(a.link || LINKS[a.entidade_tipo] || '/'); setOpen(false) }}
                      style={s.actionBtn}
                      title="Ver registro"
                    >
                      <ExternalLink size={11} strokeWidth={2} />
                    </button>
                  )}
                  <button onClick={() => resolve(a.id)} style={s.actionBtn} title="Marcar como resolvido">
                    <Check size={11} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={() => { navigate('/settings/alertas'); setOpen(false) }}
              style={{ ...s.hdrBtn, fontSize: 11, color: 'var(--text-muted)', background: 'none', padding: '4px 0', width: '100%', justifyContent: 'center' }}
            >
              Configurar alertas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  hdrBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6,
    fontFamily: 'var(--font)',
  },
  item: {
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '10px 14px', borderBottom: '1px solid var(--border)',
  },
  actionBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'none', border: '1px solid var(--border)',
    borderRadius: 5, cursor: 'pointer', color: 'var(--text-muted)',
    padding: '3px 5px',
  },
  empty: {
    padding: '40px 20px', textAlign: 'center',
    fontSize: 13, color: 'var(--text-muted)',
  },
}
