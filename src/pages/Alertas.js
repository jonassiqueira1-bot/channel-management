import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { Bell, Check, CheckCheck, AlertTriangle, Info, Clock, RefreshCw } from 'lucide-react'

const ENTIDADE_LABEL = {
  oportunidades:              'Oportunidade',
  contracts:                  'Contrato',
  projects:                   'Projeto',
  tasks:                      'Tarefa',
  commission_payments:        'Pagamento',
  companies:                  'Empresa',
  goals:                      'Meta',
  parceiros:                  'Parceiro',
  partner_maturity_scores:    'Score de Maturidade',
  partner_habilitacoes:       'Habilitação de Parceiro',
}

const PRIORIDADE_CFG = {
  alta:  { color: '#EF4444', bg: '#FEF2F2', label: 'Alta'  },
  media: { color: '#F59E0B', bg: '#FFFBEB', label: 'Média' },
  baixa: { color: '#6B7280', bg: '#F3F4F6', label: 'Baixa' },
}

function fmtDate(iso) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const min  = Math.floor(diff / 60000)
  const h    = Math.floor(diff / 3600000)
  const dias = Math.floor(diff / 86400000)
  if (min < 2)  return 'agora'
  if (min < 60) return `${min}min atrás`
  if (h < 24)   return `${h}h atrás`
  if (dias < 7) return `${dias}d atrás`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function Alertas() {
  const { profile } = useProfile()
  const [alerts, setAlerts]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState('pendentes') // 'pendentes' | 'todos'
  const [resolving, setResolving] = useState(new Set())

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    let q = supabase.from('alerts').select('*, alert_rules(gatilho_nome, origem)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (filtro === 'pendentes') q = q.eq('resolvido', false)
    const { data } = await q
    setAlerts(data || [])
    setLoading(false)
  }, [tenantId, filtro])

  useEffect(() => { load() }, [load])

  async function resolver(id) {
    setResolving(prev => new Set([...prev, id]))
    await supabase.from('alerts').update({ resolvido: true, resolvido_em: new Date().toISOString() }).eq('id', id)
    setAlerts(prev => filtro === 'pendentes'
      ? prev.filter(a => a.id !== id)
      : prev.map(a => a.id === id ? { ...a, resolvido: true } : a)
    )
    setResolving(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  async function resolverTodos() {
    const pendentes = alerts.filter(a => !a.resolvido).map(a => a.id)
    if (!pendentes.length) return
    await supabase.from('alerts').update({ resolvido: true, resolvido_em: new Date().toISOString() }).in('id', pendentes)
    setAlerts(prev => filtro === 'pendentes' ? [] : prev.map(a => ({ ...a, resolvido: true })))
  }

  const pendentes = alerts.filter(a => !a.resolvido).length

  const S = {
    page:    { padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860 },
    header:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    h1:      { fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: 10 },
    badge:   { fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'var(--accent)', color: '#fff' },
    tabs:    { display: 'flex', gap: 4, padding: '3px', background: 'var(--surface2)', borderRadius: 10, alignSelf: 'flex-start', border: '1px solid var(--border)' },
    tab:     (active) => ({ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer', border: 'none', fontFamily: 'var(--font)', background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text)' : 'var(--text-muted)', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }),
    toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    card:    (resolvido) => ({ border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', background: resolvido ? 'var(--surface2)' : 'var(--surface)', display: 'flex', gap: 16, alignItems: 'flex-start', opacity: resolvido ? 0.6 : 1, transition: 'opacity 0.2s' }),
    icon:    (prioridade) => { const c = PRIORIDADE_CFG[prioridade] || PRIORIDADE_CFG.media; return { width: 36, height: 36, borderRadius: 10, background: c.bg, border: `1px solid ${c.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } },
    btnIcon: { background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font)', gap: 4, fontSize: 12, fontWeight: 600 },
  }

  function PrioIcon({ prioridade }) {
    const c = (PRIORIDADE_CFG[prioridade] || PRIORIDADE_CFG.media).color
    if (prioridade === 'alta')  return <AlertTriangle size={16} strokeWidth={2} color={c} />
    if (prioridade === 'baixa') return <Info          size={16} strokeWidth={2} color={c} />
    return <Bell size={16} strokeWidth={2} color={c} />
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>
          <Bell size={20} strokeWidth={2} color="var(--accent)" />
          Alertas
          {pendentes > 0 && <span style={S.badge}>{pendentes}</span>}
        </h1>
        <button onClick={load} style={S.btnIcon}>
          <RefreshCw size={13} strokeWidth={2} /> Atualizar
        </button>
      </div>

      {/* Tabs + ações */}
      <div style={S.toolbar}>
        <div style={S.tabs}>
          {[['pendentes','Pendentes'],['todos','Todos']].map(([k,l]) => (
            <button key={k} onClick={() => setFiltro(k)} style={S.tab(filtro === k)}>{l}</button>
          ))}
        </div>
        {pendentes > 0 && (
          <button onClick={resolverTodos} style={{ ...S.btnIcon, color: 'var(--accent)', borderColor: 'var(--accent)' }}>
            <CheckCheck size={13} strokeWidth={2} /> Marcar todos como lidos
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '48px 0', color: 'var(--text-muted)', justifyContent: 'center' }}>
          <RefreshCw size={16} strokeWidth={1.5} style={{ animation: 'spin .8s linear infinite' }} />
          Carregando alertas…
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '64px 24px', color: 'var(--text-muted)', textAlign: 'center' }}>
          <Bell size={40} strokeWidth={1} style={{ opacity: 0.2 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-soft)' }}>
            {filtro === 'pendentes' ? 'Nenhum alerta pendente' : 'Nenhum alerta registrado'}
          </div>
          <div style={{ fontSize: 13, maxWidth: 320 }}>
            {filtro === 'pendentes'
              ? 'Você está em dia! Configure regras em Configurações → Alertas para receber notificações automáticas.'
              : 'As regras de alerta ainda não geraram nenhum registro.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map(a => {
            const prio  = PRIORIDADE_CFG[a.prioridade] || PRIORIDADE_CFG.media
            const entid = ENTIDADE_LABEL[a.entidade_tipo] || a.entidade_tipo || ''
            return (
              <div key={a.id} style={S.card(a.resolvido)}>
                {/* Ícone prioridade */}
                <div style={S.icon(a.prioridade)}>
                  <PrioIcon prioridade={a.prioridade} />
                </div>

                {/* Conteúdo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', lineHeight: 1.35 }}>
                      {a.titulo}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: prio.bg, color: prio.color }}>
                        {prio.label}
                      </span>
                      {!a.resolvido && (
                        <button onClick={() => resolver(a.id)} disabled={resolving.has(a.id)}
                          title="Marcar como lido"
                          style={{ ...S.btnIcon, padding: '4px 6px', color: '#10B981', borderColor: '#10B98140' }}>
                          <Check size={13} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  {a.mensagem && a.mensagem !== a.titulo && (
                    <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 8, lineHeight: 1.5 }}>{a.mensagem}</div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {entid && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'var(--accent-glow)', color: 'var(--accent)' }}>
                        {entid}{a.entidade_nome ? ` · ${a.entidade_nome}` : ''}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} strokeWidth={2} /> {fmtDate(a.created_at)}
                    </span>
                    {a.resolvido && (
                      <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={11} strokeWidth={2.5} /> Resolvido
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
