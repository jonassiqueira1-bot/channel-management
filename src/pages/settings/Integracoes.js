import { useState, useCallback, useEffect } from 'react'
import {
  X, Check, AlertCircle, Clock,
  Copy, CheckCheck, ExternalLink,
  ToggleLeft, ToggleRight, ArrowRight, Info,
  Download, Loader, ChevronDown, ChevronRight, Webhook,
} from 'lucide-react'
import { useProfile } from '../../hooks/useProfile'
import { useFunnels } from '../../hooks/useFunnels'
import { supabase } from '../../lib/supabase'
import SettingsLayout from '../../components/ui/SettingsLayout'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || ''
const ACCENT = 'var(--accent)'

// ─── Utilitários ──────────────────────────────────────────────────────────────
function gerarToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

function buildWebhookUrl(token) {
  return `${SUPABASE_URL}/functions/v1/integration-webhook?token=${token}`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([])
  function show(msg, type = 'success') {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }
  return { toasts, show }
}

function Toasts({ items }) {
  if (!items.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 900, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 10, minWidth: 240,
          background: t.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${t.type === 'error' ? '#FECACA' : '#BBF7D0'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          {t.type === 'error'
            ? <AlertCircle size={15} strokeWidth={2} color="#EF4444"/>
            : <Check size={15} strokeWidth={2.5} color="#10B981"/>}
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Modal payload ────────────────────────────────────────────────────────────
function PayloadModal({ log, onClose }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(log.payload, null, 2)
  function copy() {
    navigator.clipboard.writeText(json).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Payload do evento</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{fmtDate(log.created_at)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {copied ? <><CheckCheck size={12}/> Copiado</> : <><Copy size={12}/> Copiar</>}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <X size={16} strokeWidth={2}/>
            </button>
          </div>
        </div>
        <pre style={{ margin: '16px 20px 20px', padding: 16, background: '#0F172A', borderRadius: 10, fontSize: 11.5, color: '#E2E8F0', fontFamily: 'var(--mono)', overflowX: 'auto', lineHeight: 1.6, maxHeight: 380, overflow: 'auto' }}>
          {json}
        </pre>
      </div>
    </div>
  )
}

// ─── Campos de oportunidade mapeáveis ────────────────────────────────────────
const OPP_CAMPOS = [
  { key: 'titulo',        label: 'Título da oportunidade',  required: true  },
  { key: 'empresa_nome',  label: 'Empresa / Cliente',       required: true  },
  { key: 'contato_nome',  label: 'Nome do contato',         required: false },
  { key: 'contato_email', label: 'E-mail do contato',       required: false },
  { key: 'contato_fone',  label: 'Telefone do contato',     required: false },
  { key: 'valor',         label: 'Valor total (R$)',         required: false },
  { key: 'origem',        label: 'Origem do lead',          required: false },
  { key: 'responsavel',   label: 'Responsável',             required: false },
  { key: 'descricao',     label: 'Observações',             required: false },
]

// ─── Painel de eventos recebidos por este webhook ────────────────────────────
function EventosPanel({ integrationId, tenantId }) {
  const [logs, setLogs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [payloadLog, setPayloadLog] = useState(null)

  useEffect(() => {
    if (!integrationId || !tenantId) { setLoading(false); return }
    supabase
      .from('rd_leads_queue')
      .select('id, payload, processed, created_at')
      .eq('tenant_id', tenantId)
      .eq('integration_id', integrationId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [integrationId, tenantId])

  function exportCSV() {
    const rows = [
      ['Data/Hora', 'Status', 'Payload'].join(','),
      ...logs.map(l => [
        `"${new Date(l.created_at).toLocaleString('pt-BR')}"`,
        l.processed ? 'Processado' : 'Pendente',
        `"${JSON.stringify(l.payload).replace(/"/g, '""')}"`,
      ].join(',')),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `eventos-webhook-${integrationId.slice(0, 8)}.csv`
    a.click()
  }

  return (
    <>
      {payloadLog && <PayloadModal log={payloadLog} onClose={() => setPayloadLog(null)}/>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
          Eventos recebidos ({logs.length})
        </span>
        {logs.length > 0 && (
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            <Download size={11} strokeWidth={2}/> Exportar CSV
          </button>
        )}
      </div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Carregando…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <Clock size={32} strokeWidth={1} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }}/>
            Nenhum evento recebido neste webhook ainda.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 360 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0 }}>
                <tr>
                  {['Data / Hora', 'Status', 'Payload'].map(h => (
                    <th key={h} style={{ padding: '9px 14px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid var(--border2)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                        background: log.processed ? '#D1FAE5' : '#FEF9C3',
                        color:      log.processed ? '#065F46' : '#92400E' }}>
                        {log.processed ? 'Processado' : 'Pendente'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button onClick={() => setPayloadLog(log)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: ACCENT, background: 'none', border: `1px solid rgba(99,102,241,0.2)`, borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        <ExternalLink size={11} strokeWidth={2}/> Ver payload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Formulário de edição de webhook ─────────────────────────────────────────
function WebhookEdit({ integration, onClose, onSaved, toast }) {
  const { profile } = useProfile()
  const { funis }   = useFunnels()

  const isNew = !integration?.id

  const [nome, setNome]                 = useState(integration?.config?.nome_integracao || '')
  const [token]                         = useState(integration?.config?.webhook_token || gerarToken())
  const [funilId, setFunilId]           = useState(integration?.config?.funil_id || '')
  const [mapeamento, setMapeamento]     = useState(integration?.config?.mapeamento || {})
  const [criarEmpresa, setCriarEmpresa] = useState(integration?.config?.criar_empresa !== false)
  const [criarContato, setCriarContato] = useState(integration?.config?.criar_contato !== false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [copiedUrl, setCopiedUrl]       = useState(false)
  const [salvando, setSalvando]         = useState(false)

  const url = buildWebhookUrl(token)
  const funiAtivo = funis.find(f => String(f.id) === String(funilId)) || funis[0]

  function copyUrl() {
    navigator.clipboard.writeText(url).then(() => { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2500) })
  }

  async function salvar() {
    if (!nome.trim()) { toast.show('Informe um nome para o webhook.', 'error'); return }
    if (!profile?.tenant_id) return
    setSalvando(true)

    const row = {
      tenant_id:   profile.tenant_id,
      provider:    'webhook',
      credentials: {},
      config: {
        nome_integracao: nome.trim(),
        webhook_token:   token,
        funil_id:        funilId,
        mapeamento,
        criar_empresa:   criarEmpresa,
        criar_contato:   criarContato,
      },
      status:     integration?.status || 'active',
      updated_at: new Date().toISOString(),
    }

    let error, data
    if (isNew) {
      ;({ data, error } = await supabase.from('integracoes').insert(row).select().single())
    } else {
      ;({ data, error } = await supabase.from('integracoes').update(row).eq('id', integration.id).select().single())
    }

    setSalvando(false)
    if (error) { toast.show('Erro ao salvar: ' + error.message, 'error'); return }
    onSaved(data)
  }

  const inp = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', width: '100%', boxSizing: 'border-box', outline: 'none' }
  const lbl = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block' }
  const sec = { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 16, display: 'block' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflowY: 'auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 32px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}>
          <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} strokeWidth={2}/>
          Integrações e APIs
        </button>
        <span style={{ color: 'var(--border)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{isNew ? 'Novo webhook' : nome}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, cursor: salvando ? 'wait' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {salvando
              ? <><Loader size={12} style={{ animation: 'spin .8s linear infinite' }}/> Salvando…</>
              : <><Check size={12} strokeWidth={2.5}/> Salvar</>}
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 720 }}>

        {/* Identidade */}
        <div>
          <span style={sec}>Identidade</span>
          <label style={lbl}>Nome do webhook</label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Formulário do site, Lead CRM, Automação…"
            style={inp}
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            Nome interno para identificar este webhook. Não é exposto externamente.
          </p>
        </div>

        {/* URL */}
        <div>
          <span style={sec}>URL do Webhook</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              readOnly
              value={url}
              style={{ ...inp, flex: 1, color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--mono)' }}
            />
            <button onClick={copyUrl} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: copiedUrl ? '#F0FDF4' : 'var(--surface)', color: copiedUrl ? '#10B981' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {copiedUrl ? <><CheckCheck size={13}/> Copiado!</> : <><Copy size={13}/> Copiar URL</>}
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
            Configure este endpoint no sistema externo para enviar dados via <strong>HTTP POST</strong>. O parâmetro <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>?token=</code> autentica e identifica exclusivamente este webhook.
          </p>
        </div>

        {/* Funil */}
        <div>
          <span style={sec}>Funil de destino</span>
          <label style={lbl}>Leads recebidos entram em qual funil?</label>
          <select
            value={funilId}
            onChange={e => setFunilId(e.target.value)}
            style={{ ...inp, cursor: 'pointer' }}
          >
            <option value="">— Funil padrão —</option>
            {funis.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          {funiAtivo && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
              Leads entram em: <strong>{funiAtivo.etapas?.[0]?.nome || '—'}</strong>
            </p>
          )}
        </div>

        {/* Mapeamento (avançado) */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <button
            onClick={() => setAdvancedOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left' }}
          >
            {advancedOpen
              ? <ChevronDown size={15} color="var(--text-muted)"/>
              : <ChevronRight size={15} color="var(--text-muted)"/>}
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Mapeamento de campos</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
          </button>

          {advancedOpen && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Info size={14} color={ACCENT} style={{ flexShrink: 0, marginTop: 1 }}/>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Use <strong>notação dot-notation</strong> para campos aninhados: <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface)', padding: '1px 5px', borderRadius: 4 }}>lead.name</code>.
                  Se você usa Make, Zapier ou n8n, faça o mapeamento nessas ferramentas — não precisa preencher aqui.
                </span>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                      <th style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left', width: '45%' }}>Campo (Boostly)</th>
                      <th style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left' }}>Caminho no JSON recebido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OPP_CAMPOS.map((campo, i) => (
                      <tr key={campo.key} style={{ borderBottom: i < OPP_CAMPOS.length - 1 ? '1px solid var(--border2)' : 'none' }}>
                        <td style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          {campo.label}
                          {campo.required && <span style={{ color: ACCENT, fontWeight: 900, marginLeft: 4 }}>*</span>}
                        </td>
                        <td style={{ padding: '3px 6px' }}>
                          <input
                            value={mapeamento[campo.key] || ''}
                            onChange={e => setMapeamento(m => ({ ...m, [campo.key]: e.target.value }))}
                            placeholder={`ex: ${campo.key.replace(/_/g, '.')}`}
                            style={{ width: '100%', padding: '4px 8px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Criar empresa / contato */}
              {[
                { label: 'Criar / atualizar Empresa',  sub: 'Cada evento cria ou atualiza um registro em Empresas',  val: criarEmpresa, set: setCriarEmpresa },
                { label: 'Criar / atualizar Contato',  sub: 'O contato é salvo em Contatos e vinculado à Empresa',   val: criarContato, set: setCriarContato },
              ].map(({ label, sub, val, set }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
                  </div>
                  <button onClick={() => set(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {val
                      ? <ToggleRight size={28} strokeWidth={1.5} color={ACCENT}/>
                      : <ToggleLeft  size={28} strokeWidth={1.5} color="var(--border2)"/>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eventos recebidos (só em edição) */}
        {!isNew && profile?.tenant_id && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <EventosPanel integrationId={integration.id} tenantId={profile.tenant_id}/>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function SettingsIntegracoes() {
  const { profile }     = useProfile()
  const toast           = useToast()
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [editing, setEditing]           = useState(null)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('integracoes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at')
    setIntegrations(data || [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  async function toggleStatus(integ) {
    const novoStatus = integ.status === 'active' ? 'inactive' : 'active'
    const { error } = await supabase
      .from('integracoes')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', integ.id)
    if (error) { toast.show('Erro ao atualizar status.', 'error'); return }
    setIntegrations(prev => prev.map(i => i.id === integ.id ? { ...i, status: novoStatus } : i))
    toast.show(novoStatus === 'active'
      ? 'Webhook ativado — o endpoint aceita chamadas.'
      : 'Webhook desativado — o endpoint rejeita novas chamadas.')
  }

  async function handleDelete(integ) {
    const nome = integ.config?.nome_integracao || 'sem nome'
    if (!window.confirm(`Excluir o webhook "${nome}"?\nEsta ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('integracoes').delete().eq('id', integ.id)
    if (error) { toast.show('Erro ao excluir.', 'error'); return }
    setIntegrations(prev => prev.filter(i => i.id !== integ.id))
    toast.show('Webhook excluído.')
  }

  function handleSaved(data) {
    setIntegrations(prev => {
      const exists = prev.find(i => i.id === data.id)
      return exists ? prev.map(i => i.id === data.id ? data : i) : [...prev, data]
    })
    setEditing(null)
    toast.show('Integração salva com sucesso!')
  }

  if (editing !== null) {
    return (
      <>
        <WebhookEdit
          integration={editing?.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          toast={toast}
        />
        <Toasts items={toast.toasts}/>
      </>
    )
  }

  const q = search.toLowerCase()
  const filtered = integrations.filter(i =>
    !q || (i.config?.nome_integracao || '').toLowerCase().includes(q)
  )

  const COLS = [
    {
      key: 'nome', label: 'Integração',
      render: (_, i) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Webhook size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }}/>
          </div>
          <span style={{ fontWeight: 600, fontSize: 13 }}>{i.config?.nome_integracao || '—'}</span>
        </div>
      ),
    },
    {
      key: 'url', label: 'Endpoint',
      render: (_, i) => {
        const full  = i.config?.webhook_token ? buildWebhookUrl(i.config.webhook_token) : '—'
        const short = full.length > 55 ? full.slice(0, 55) + '…' : full
        return <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>{short}</span>
      },
    },
    {
      key: 'status', label: 'Status',
      render: (_, i) => (
        <button
          onClick={e => { e.stopPropagation(); toggleStatus(i) }}
          title={i.status === 'active' ? 'Clique para desativar' : 'Clique para ativar'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
            background: i.status === 'active' ? '#D1FAE5' : 'var(--surface2)',
            color:      i.status === 'active' ? '#065F46' : 'var(--text-muted)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: i.status === 'active' ? '#10B981' : '#94A3B8' }}/>
          {i.status === 'active' ? 'Ativo' : 'Inativo'}
        </button>
      ),
    },
    {
      key: 'created_at', label: 'Criado em',
      render: (_, i) => <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(i.created_at)}</span>,
    },
  ]

  return (
    <>
      <Toasts items={toast.toasts}/>
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <SettingsLayout
          title="Integrações e APIs"
          description="Webhooks para receber eventos de qualquer sistema externo via HTTP POST."
          columns={COLS}
          data={filtered}
          keyField="id"
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          newLabel="Nova integração"
          onNew={() => setEditing({})}
          emptyLabel="Nenhuma integração configurada. Clique em 'Nova integração' para criar um webhook."
          onRowClick={i => setEditing(i)}
          rowActions={[
            { label: 'Editar', onClick: i => setEditing(i) },
            { label: i => i.status === 'active' ? 'Desativar' : 'Ativar', onClick: toggleStatus },
            { label: 'Excluir', danger: true, onClick: handleDelete },
          ]}
        />
      </div>
    </>
  )
}
