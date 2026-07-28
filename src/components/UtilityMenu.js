import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, LifeBuoy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import AlertsPanel from './AlertsPanel'
import { DOCS_BASE_URL } from '../config/docs'

// Ponto único de utilidades flutuante — reúne Pendências e Ajuda/Documentação
// num só ícone (sino, com o badge de contagem), evitando dois botões
// circulares competindo pelo mesmo canto da tela. Um clique abre um menu
// pequeno com as duas opções; "Pendências" abre o painel arrastável
// (AlertsPanel), "Ajuda e documentação" abre a doc em nova aba.
export default function UtilityMenu() {
  const { profile } = useProfile()
  const [menuOpen, setMenuOpen]   = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [alerts, setAlerts]       = useState([])
  const [loading, setLoading]     = useState(false)
  const menuRef = useRef(null)

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
      .limit(100)
    setAlerts(data || [])
    setLoading(false)
  }, [tenantId, usuarioId])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (panelOpen) load() }, [panelOpen, load])

  useEffect(() => {
    if (!menuOpen) return
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  async function resolve(id) {
    setAlerts(prev => prev.filter(a => a.id !== id))
    await supabase.from('alerts').update({ resolvido: true, resolvido_em: new Date().toISOString() }).eq('id', id)
  }

  async function resolveAll(ids) {
    setAlerts(prev => prev.filter(a => !ids.includes(a.id)))
    await supabase.from('alerts').update({ resolvido: true, resolvido_em: new Date().toISOString() }).in('id', ids)
  }

  const count = alerts.length

  return (
    <>
      <div ref={menuRef} style={{ position: 'fixed', top: 8, right: 8, zIndex: 60 }}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          title="Utilidades"
          aria-label="Utilidades"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: '50%',
            background: menuOpen ? 'var(--accent)' : 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            cursor: 'pointer', transition: 'background 0.15s',
          }}
        >
          <span style={{ position: 'relative', display: 'inline-flex' }}>
            <Bell size={13} strokeWidth={1.75} color={menuOpen ? '#fff' : (count > 0 ? '#ef4444' : 'var(--text-muted)')} />
            {count > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -6,
                background: '#ef4444', color: '#fff',
                fontSize: 8, fontWeight: 800, lineHeight: 1,
                padding: '1.5px 3.5px', borderRadius: 99, minWidth: 12,
                textAlign: 'center', boxShadow: '0 0 0 1.5px var(--surface)',
              }}>
                {count > 99 ? '99+' : count}
              </span>
            )}
          </span>
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: 34, right: 0, width: 200,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
            padding: 4, zIndex: 9999,
          }}>
            <button
              onClick={() => { setPanelOpen(true); setMenuOpen(false) }}
              style={itemStyle}
            >
              <Bell size={13} strokeWidth={1.75} color="var(--text-muted)" />
              <span style={{ flex: 1, textAlign: 'left' }}>Pendências</span>
              {count > 0 && (
                <span style={{
                  background: 'var(--surface2)', color: 'var(--text-muted)',
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                  border: '1px solid var(--border)',
                }}>{count > 99 ? '99+' : count}</span>
              )}
            </button>
            <a
              href={DOCS_BASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              style={{ ...itemStyle, textDecoration: 'none' }}
            >
              <LifeBuoy size={13} strokeWidth={1.75} color="var(--text-muted)" />
              <span style={{ flex: 1, textAlign: 'left' }}>Ajuda e documentação</span>
            </a>
          </div>
        )}
      </div>

      {panelOpen && (
        <AlertsPanel
          alerts={alerts}
          loading={loading}
          onResolve={resolve}
          onResolveAll={resolveAll}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  )
}

const itemStyle = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  padding: '8px 10px', borderRadius: 7, border: 'none', background: 'none',
  cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
  fontFamily: 'var(--font)', boxSizing: 'border-box',
}
