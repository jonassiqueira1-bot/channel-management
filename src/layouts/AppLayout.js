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
            <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
              <defs>
                <linearGradient id="bly-top" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4F8EF7"/>
                  <stop offset="100%" stopColor="#1E3A5F"/>
                </linearGradient>
              </defs>
              <rect width="40" height="40" rx="10" fill="url(#bly-top)"/>
              <rect x="11" y="24" width="5" height="8" rx="2.5" fill="white" fillOpacity="0.55"/>
              <rect x="18" y="17" width="5" height="15" rx="2.5" fill="white" fillOpacity="0.78"/>
              <rect x="25" y="10" width="5" height="22" rx="2.5" fill="white"/>
            </svg>
            <span style={s.topBrandName}>Boostly</span>
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
    overflowX: 'hidden',
    padding: 28,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
}
