import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

function useBreakpoint() {
  const [bp, setBp] = useState(() => getBreakpoint(window.innerWidth))
  useEffect(() => {
    function onResize() { setBp(getBreakpoint(window.innerWidth)) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return bp
}

function getBreakpoint(w) {
  if (w < 768)  return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

export default function AppLayout() {
  const bp                      = useBreakpoint()
  const isMobile                = bp === 'mobile'
  const isTablet                = bp === 'tablet'
  const [drawerOpen, setDrawer] = useState(false)
  // colapsa automaticamente no tablet, expande no desktop
  const [collapsed, setCollapsed] = useState(false)
  const sidebarCollapsed = isMobile ? false : (isTablet ? true : collapsed)

  // fecha drawer ao redimensionar para tablet/desktop
  useEffect(() => { if (!isMobile) setDrawer(false) }, [isMobile])

  return (
    <div style={s.shell}>

      {/* ── Top bar (mobile only) ── */}
      {isMobile && (
        <header style={s.topBar}>
          <button style={s.hamburger} onClick={() => setDrawer(true)} aria-label="Abrir menu">
            <span style={s.hLine} />
            <span style={s.hLine} />
            <span style={s.hLine} />
          </button>
          <div style={s.topBrand}>
            <div style={s.topLogoMark}>CN</div>
            <span style={s.topBrandName}>Canais NG</span>
          </div>
          {/* espaço espelho para centralizar o brand */}
          <div style={{ width: 40 }} />
        </header>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* ── Overlay backdrop (mobile) ── */}
        {isMobile && drawerOpen && (
          <div style={s.backdrop} onClick={() => setDrawer(false)} />
        )}

        {/* ── Sidebar / Drawer ── */}
        {(!isMobile || drawerOpen) && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setCollapsed(c => !c)}
            isMobile={isMobile}
            onClose={() => setDrawer(false)}
          />
        )}

        {/* ── Conteúdo principal ── */}
        <main style={{
          ...s.main,
          padding: isMobile ? '16px 14px' : 28,
        }}>
          <Outlet />
        </main>

      </div>
    </div>
  )
}

const s = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: 'var(--bg)',
  },

  /* ── Top bar mobile ── */
  topBar: {
    height: 52,
    backgroundColor: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px',
    flexShrink: 0,
    zIndex: 200,
  },
  hamburger: {
    width: 40,
    height: 40,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: 0,
    flexShrink: 0,
  },
  hLine: {
    display: 'block',
    width: 22,
    height: 2,
    background: 'rgba(255,255,255,0.7)',
    borderRadius: 2,
  },
  topBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  topLogoMark: {
    width: 30,
    height: 30,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 7,
    color: '#fff',
    fontWeight: 700,
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--mono)',
  },
  topBrandName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '-0.2px',
  },

  /* ── Overlay ── */
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 299,
  },

  /* ── Main ── */
  main: {
    flex: 1,
    backgroundColor: 'var(--bg)',
    overflowY: 'auto',
    padding: 28,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
}
