import { useState, useMemo } from 'react'
import {
  Search, X, Check, ChevronRight, AlertCircle, Clock,
  Copy, CheckCheck, ExternalLink, Zap, RefreshCw,
  ToggleLeft, ToggleRight, Play, ArrowRight, Info,
} from 'lucide-react'
import { useLocalState } from '../../hooks/useLocalState'
import {
  PROVIDERS, DEFAULT_SETTINGS, MOCK_LOGS,
  INTEGRATIONS_STORAGE_KEY,
} from '../../data/mockIntegrations'
import Button from '../../components/Button'
import Drawer from '../../components/Drawer'

const ACCENT = '#6366F1'

// ─── Utilitários ──────────────────────────────────────────────────────────────
function fmtDate(iso) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}

function generateWebhookUrl(providerId, settingId) {
  return `https://api.canaisng.com.br/webhooks/${providerId}/${settingId.slice(0,8)}`
}

// ─── Toast simples ────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([])
  function show(msg, type='success') {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }
  return { toasts, show }
}

function Toasts({ items }) {
  if (!items.length) return null
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:900, display:'flex', flexDirection:'column', gap:8 }}>
      {items.map(t => (
        <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderRadius:10, background: t.type==='error' ? '#FEF2F2' : t.type==='warning' ? '#FFFBEB' : '#F0FDF4', border:`1px solid ${t.type==='error'?'#FECACA':t.type==='warning'?'#FDE68A':'#BBF7D0'}`, boxShadow:'0 4px 16px rgba(0,0,0,0.1)', animation:'fadeIn 0.2s ease', minWidth:240 }}>
          {t.type === 'error'   && <AlertCircle size={15} strokeWidth={2} color="#EF4444"/>}
          {t.type === 'warning' && <AlertCircle size={15} strokeWidth={2} color="#F59E0B"/>}
          {t.type === 'success' && <Check        size={15} strokeWidth={2.5} color="#10B981"/>}
          <span style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    active:   { label:'Conectado',   bg:'#D1FAE5', color:'#065F46', dot:'#10B981' },
    inactive: { label:'Disponível',  bg:'#F1F5F9', color:'#475569', dot:'#94A3B8' },
    error:    { label:'Com erro',    bg:'#FEF2F2', color:'#991B1B', dot:'#EF4444' },
  }[status] || { label:status, bg:'#F1F5F9', color:'#475569', dot:'#94A3B8' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:cfg.bg, color:cfg.color, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.dot }}/>
      {cfg.label}
    </span>
  )
}

// ─── Log status badge ─────────────────────────────────────────────────────────
function LogBadge({ status }) {
  const cfg = {
    success: { label:'Sucesso', bg:'#D1FAE5', color:'#065F46' },
    error:   { label:'Erro',    bg:'#FEF2F2', color:'#991B1B' },
    warning: { label:'Aviso',   bg:'#FFFBEB', color:'#92400E' },
  }[status] || { label:status, bg:'#F1F5F9', color:'#475569' }
  return (
    <span style={{ display:'inline-flex', padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
  )
}

// ─── Provider icon (iniciais coloridas) ───────────────────────────────────────
function ProviderIcon({ provider, size=44 }) {
  const initials = provider.name.split(' ').map(w => w[0]).slice(0,2).join('')
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.22), background:`${provider.color}18`, border:`1.5px solid ${provider.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ fontSize:Math.round(size*0.33), fontWeight:800, color:provider.color, fontFamily:'var(--mono)', letterSpacing:'-1px' }}>{initials}</span>
    </div>
  )
}

// ─── Webhook → Pipeline: constantes ──────────────────────────────────────────
const WEBHOOK_MAPPING_KEY = 'integrations:webhook_mapping_v1'

const DEFAULT_WEBHOOK_MAPPING = {
  enabled: false,
  funil_stage: '1',
  fields: {
    titulo:          '',
    empresa:         '',
    valor_cdu:       '',
    valor_sms:       '',
    valor_servico:   '',
    responsavel:     '',
    campanha:        '',
    descricao:       '',
  },
}

const OP_FIELDS = [
  { key: 'titulo',        label: 'Título da oportunidade', required: true,  placeholder: 'ex: deal.name' },
  { key: 'empresa',       label: 'Empresa / Cliente',      required: true,  placeholder: 'ex: contact.company' },
  { key: 'valor_cdu',     label: 'Valor CDU (R$)',         required: false, placeholder: 'ex: revenue.cdu' },
  { key: 'valor_sms',     label: 'Valor SMS (R$)',         required: false, placeholder: 'ex: revenue.sms' },
  { key: 'valor_servico', label: 'Valor Serviço (R$)',     required: false, placeholder: 'ex: revenue.service' },
  { key: 'responsavel',   label: 'Responsável',            required: false, placeholder: 'ex: owner.name' },
  { key: 'campanha',      label: 'Campanha',               required: false, placeholder: 'ex: campaign.title' },
  { key: 'descricao',     label: 'Observações',            required: false, placeholder: 'ex: notes' },
]

const FUNIL_STAGES = [
  { value: '1', label: 'Prospecção' },
  { value: '2', label: 'Qualificação' },
  { value: '3', label: 'Proposta' },
  { value: '4', label: 'Negociação' },
  { value: '5', label: 'Fechamento' },
]

// Resolve um caminho dot-notation num objeto: "deal.name" → obj.deal.name
function resolvePath(obj, path) {
  if (!path || !obj) return undefined
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

// ─── Aba: Mapeamento para Pipeline ────────────────────────────────────────────
function WebhookMapeamentoTab({ toast }) {
  const [mapping, setMapping] = useLocalState(WEBHOOK_MAPPING_KEY, DEFAULT_WEBHOOK_MAPPING)
  const [testJson, setTestJson]     = useState('{\n  "deal": {\n    "name": "Proposta Empresa X",\n    "company": "Empresa X Ltda"\n  },\n  "revenue": {\n    "cdu": 1200,\n    "sms": 350\n  },\n  "owner": { "name": "Jonas S." }\n}')
  const [testResult, setTestResult] = useState(null)
  const [jsonError,  setJsonError]  = useState(null)

  function setField(key, val) {
    setMapping(m => ({ ...m, fields: { ...m.fields, [key]: val } }))
  }

  function toggleEnabled() {
    setMapping(m => ({ ...m, enabled: !m.enabled }))
  }

  function runSimulation() {
    setJsonError(null); setTestResult(null)
    let payload
    try { payload = JSON.parse(testJson) } catch {
      setJsonError('JSON inválido — verifique a sintaxe.'); return
    }
    const result = {}
    OP_FIELDS.forEach(f => {
      const path = mapping.fields[f.key]
      if (path) result[f.key] = resolvePath(payload, path)
    })
    result._stage = FUNIL_STAGES.find(s => s.value === mapping.funil_stage)?.label || '—'
    setTestResult(result)
    toast.show('Simulação executada com sucesso!')
  }

  function saveToStorage() {
    // Grava no localStorage de oportunidades se habilitado (simulação)
    toast.show('Configuração de mapeamento salva!')
  }

  const isEnabled = mapping.enabled

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Toggle principal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: 10, border: `1.5px solid ${isEnabled ? ACCENT+'44' : 'var(--border)'}`, background: isEnabled ? `${ACCENT}06` : 'var(--surface2)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Criar oportunidades automaticamente</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Ao receber um POST neste webhook, uma oportunidade será criada no Pipeline</div>
          </div>
          <button onClick={toggleEnabled} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
            {isEnabled
              ? <ToggleRight size={32} strokeWidth={1.5} color={ACCENT} />
              : <ToggleLeft  size={32} strokeWidth={1.5} color="var(--border2)" />}
          </button>
        </div>

        {isEnabled && (<>

          {/* Estágio padrão no funil */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Posição padrão no funil</label>
            <select
              value={mapping.funil_stage}
              onChange={e => setMapping(m => ({ ...m, funil_stage: e.target.value }))}
              style={{ ...s.input, cursor: 'pointer' }}>
              {FUNIL_STAGES.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          {/* Tabela de mapeamento */}
          <div style={s.fieldGroup}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <label style={s.label}>Mapeamento de campos</label>
              <span title="Use notação dot-notation para acessar campos aninhados: ex. deal.contact.name">
                <Info size={12} strokeWidth={1.75} color="var(--text-muted)" style={{ cursor: 'help' }} />
              </span>
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: 0, padding: '8px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Campo no Payload JSON</span>
                <span />
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Campo na Oportunidade</span>
              </div>
              {OP_FIELDS.map((f, i) => (
                <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', alignItems: 'center', gap: 0, padding: '10px 14px', borderBottom: i < OP_FIELDS.length - 1 ? '1px solid var(--border2)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>
                  <input
                    value={mapping.fields[f.key] || ''}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={{ ...s.input, padding: '6px 10px', fontSize: 12, fontFamily: 'var(--mono)' }}
                  />
                  <ArrowRight size={13} strokeWidth={1.75} color="var(--border2)" style={{ justifySelf: 'center' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)' }}>{f.label}</span>
                    {f.required && <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 800 }}>*</span>}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>
              * Campos obrigatórios. Use dot-notation para caminhos aninhados: <code style={{ fontFamily: 'var(--mono)', background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>deal.contact.name</code>
            </p>
          </div>

          {/* Simulador */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Simulador de Payload</span>
              <button onClick={runSimulation}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                <Play size={11} strokeWidth={2.5} /> Simular
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: testResult ? '1fr 1fr' : '1fr', gap: 0 }}>
              <div style={{ padding: '12px 14px', borderRight: testResult ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Payload de entrada</div>
                <textarea
                  value={testJson}
                  onChange={e => { setTestJson(e.target.value); setJsonError(null); setTestResult(null) }}
                  rows={10}
                  style={{ ...s.input, fontFamily: 'var(--mono)', fontSize: 11, resize: 'vertical', lineHeight: 1.6, borderColor: jsonError ? 'var(--red)' : undefined }}
                />
                {jsonError && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 4 }}>{jsonError}</div>}
              </div>

              {testResult && (
                <div style={{ padding: '12px 14px', background: '#F0FDF4' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Check size={12} strokeWidth={2.5} /> Oportunidade que seria criada
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {OP_FIELDS.map(f => {
                      const val = testResult[f.key]
                      return (
                        <div key={f.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#047857', minWidth: 110, flexShrink: 0 }}>{f.label}:</span>
                          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: val !== undefined ? '#065F46' : '#94A3B8', fontStyle: val !== undefined ? 'normal' : 'italic' }}>
                            {val !== undefined ? String(val) : '—'}
                          </span>
                        </div>
                      )
                    })}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 4, paddingTop: 8, borderTop: '1px solid #BBF7D0' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#047857', minWidth: 110 }}>Estágio Funil:</span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#065F46' }}>{testResult._stage}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </>)}

        {!isEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 24px', color: 'var(--text-muted)', textAlign: 'center' }}>
            <ToggleLeft size={36} strokeWidth={1} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-soft)' }}>Criação automática desativada</div>
            <div style={{ fontSize: 12, maxWidth: 280 }}>Ative o toggle acima para configurar como os dados do webhook serão mapeados para oportunidades no Pipeline.</div>
          </div>
        )}
      </div>

      {/* Footer */}
      {isEnabled && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0 }}>
          <button onClick={saveToStorage}
            style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: ACCENT, border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check size={13} strokeWidth={2.5} /> Salvar mapeamento
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Modal de payload JSON ────────────────────────────────────────────────────
function PayloadModal({ log, onClose }) {
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(log.payload, null, 2)

  function copyJson() {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={s.overlay} onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ ...s.modal, maxWidth:540 }}>
        <div style={s.mHeader}>
          <div>
            <div style={s.mTitle}>Payload do Evento</div>
            <div style={s.mSub}>{log.event_type} · {fmtDate(log.created_at)}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Button variant="secondary" onClick={copyJson} icon={copied ? <CheckCheck size={13} strokeWidth={2}/> : <Copy size={13} strokeWidth={1.75}/>}>
              {copied ? 'Copiado' : 'Copiar JSON'}
            </Button>
            <button onClick={onClose} style={s.closeBtn}><X size={15} strokeWidth={2}/></button>
          </div>
        </div>
        {log.error_message && (
          <div style={{ margin:'0 20px 0', padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:8, fontSize:12, color:'#991B1B', display:'flex', gap:8, alignItems:'flex-start' }}>
            <AlertCircle size={14} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }}/>
            {log.error_message}
          </div>
        )}
        <pre style={{ margin:'16px 20px 20px', padding:'16px', background:'#0F172A', borderRadius:10, fontSize:12, color:'#94A3B8', fontFamily:'var(--mono)', overflowX:'auto', lineHeight:1.6, maxHeight:380 }}>
          <code style={{ color:'#E2E8F0' }}>{json}</code>
        </pre>
      </div>
    </div>
  )
}

// ─── Aba: Logs de Eventos ─────────────────────────────────────────────────────
function LogsTab({ providerId }) {
  const logs = MOCK_LOGS[providerId] || []
  const [payloadLog, setPayloadLog] = useState(null)

  if (!logs.length) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:'48px 24px', color:'var(--text-muted)' }}>
        <Clock size={32} strokeWidth={1} style={{ opacity:0.3 }}/>
        <span style={{ fontSize:14 }}>Nenhum evento registrado ainda</span>
        <span style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center', maxWidth:260 }}>Os logs aparecerão aqui assim que a integração processar os primeiros eventos.</span>
      </div>
    )
  }

  return (
    <>
      <div style={{ overflowY:'auto', flex:1 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              {['Data / Hora','Evento','Status',''].map(h => (
                <th key={h} style={{ padding:'10px 16px', fontSize:10.5, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', textAlign:'left', borderBottom:'1px solid var(--border)', background:'var(--surface2)', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={log.id} style={{ borderBottom:'1px solid var(--border2)', background: i%2===0 ? 'transparent' : 'var(--surface2)' }}>
                <td style={{ padding:'11px 16px', fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>{fmtDate(log.created_at)}</td>
                <td style={{ padding:'11px 16px', fontSize:13, color:'var(--text)', fontWeight:500 }}>
                  {log.event_type.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}
                </td>
                <td style={{ padding:'11px 16px' }}><LogBadge status={log.status}/></td>
                <td style={{ padding:'11px 16px', textAlign:'right' }}>
                  <button onClick={() => setPayloadLog(log)}
                    style={{ fontSize:12, fontWeight:600, color:ACCENT, background:'none', border:`1px solid ${ACCENT}30`, borderRadius:6, padding:'4px 10px', cursor:'pointer', fontFamily:'var(--font)', display:'inline-flex', alignItems:'center', gap:4 }}>
                    <ExternalLink size={11} strokeWidth={2}/> Ver payload
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payloadLog && <PayloadModal log={payloadLog} onClose={() => setPayloadLog(null)}/>}
    </>
  )
}

// ─── Aba: Configuração ────────────────────────────────────────────────────────
function ConfigTab({ provider, setting, onSave, onDisconnect, toast }) {
  const [form, setForm] = useState(() => ({ ...setting.credentials }))
  const [saving, setSaving]   = useState(false)
  const isActive = setting.status === 'active'

  const webhookUrl = generateWebhookUrl(provider.id, setting.id)
  const [copiedUrl, setCopiedUrl] = useState(false)

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000)
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    const required = provider.fields.filter(f => f.required)
    const missing  = required.filter(f => !String(form[f.key]||'').trim())
    if (missing.length) { toast.show(`Campo obrigatório: ${missing[0].label}`, 'error'); return }
    setSaving(true)
    try {
      await new Promise(r => setTimeout(r, 700)) // simula latência
      onSave({ ...setting, credentials: { ...form }, status: 'active' })
      toast.show('Configuração salva com sucesso!')
    } catch {
      toast.show('Erro ao salvar configuração.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    onDisconnect(setting.id)
    toast.show(`${provider.name} desconectado.`, 'warning')
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* Webhook URL gerada (somente leitura) */}
        <div style={s.fieldGroup}>
          <label style={s.label}>
            Webhook URL <span style={{ fontWeight:500, textTransform:'none', fontSize:11, color:'var(--accent)', background:'var(--accent-glow)', padding:'1px 6px', borderRadius:4 }}>Gerado pelo sistema</span>
          </label>
          <div style={{ display:'flex', gap:8 }}>
            <input readOnly value={webhookUrl}
              style={{ ...s.input, flex:1, background:'var(--surface2)', color:'var(--text-muted)', fontFamily:'var(--mono)', fontSize:11 }}/>
            <button type="button" onClick={copyUrl}
              style={{ ...s.ghostBtn, flexShrink:0, gap:5, padding:'9px 12px' }}>
              {copiedUrl ? <CheckCheck size={13} strokeWidth={2}/> : <Copy size={13} strokeWidth={1.75}/>}
            </button>
          </div>
          <span style={{ fontSize:11, color:'var(--text-muted)', lineHeight:1.5 }}>Use esta URL como destino do webhook no painel do {provider.name}.</span>
        </div>

        {/* Campos dinâmicos do provedor */}
        {provider.fields.map(field => (
          <div key={field.key} style={s.fieldGroup}>
            <label style={s.label}>
              {field.label}
              {field.required && <span style={{ color:'var(--red)', marginLeft:2 }}>*</span>}
            </label>
            <input
              type={field.type}
              value={form[field.key]||''}
              onChange={e => setForm(f => ({...f, [field.key]: e.target.value}))}
              placeholder={field.placeholder}
              style={s.input}
              autoComplete="off"
            />
          </div>
        ))}

        {/* Estado da integração */}
        {isActive && (
          <div style={{ padding:'12px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, display:'flex', alignItems:'center', gap:10 }}>
            <Check size={15} strokeWidth={2.5} color="#10B981"/>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#065F46' }}>Integração ativa e funcionando</div>
              <div style={{ fontSize:11, color:'#047857', marginTop:2 }}>Última atualização: {fmtDate(setting.updated_at)}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderTop:'1px solid var(--border)', background:'var(--surface2)', flexShrink:0 }}>
        <div>
          {isActive && (
            <button type="button" onClick={handleDisconnect} disabled={saving}
              style={{ fontSize:13, color:'var(--red)', background:'none', border:'1px solid rgba(220,38,38,0.25)', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontFamily:'var(--font)' }}>
              Desconectar
            </button>
          )}
        </div>
        <button type="submit" disabled={saving}
          style={{ fontSize:13, fontWeight:700, color:'#fff', background:ACCENT, border:'none', borderRadius:8, padding:'8px 20px', cursor:saving?'wait':'pointer', fontFamily:'var(--font)', display:'flex', alignItems:'center', gap:6, opacity:saving?0.7:1 }}>
          {saving ? <><RefreshCw size={13} strokeWidth={2} style={{ animation:'spin 0.8s linear infinite' }}/> Salvando…</> : <><Check size={13} strokeWidth={2.5}/> Salvar configuração</>}
        </button>
      </div>
    </form>
  )
}

// ─── Drawer Lateral ───────────────────────────────────────────────────────────
function IntegrationDrawer({ provider, setting, onClose, onSave, onDisconnect, toast }) {
  const [tab, setTab] = useState('config')
  const logCount = (MOCK_LOGS[provider.id]||[]).length
  const isWebhook = provider.id === 'webhook'

  return (
    <Drawer
      open
      onClose={onClose}
      title={provider.name}
      subtitle={provider.description}
    >
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Provider icon + status + tabs */}
      <div style={{ margin:'-12px -14px 12px', padding:'12px 20px 0', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
          <ProviderIcon provider={provider} size={36}/>
          <StatusBadge status={setting.status}/>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0 }}>
          {[
            { id:'config',    label:'Configuração' },
            ...(isWebhook ? [{ id:'mapping', label:'Pipeline' }] : []),
            { id:'logs',      label:`Logs${logCount ? ` (${logCount})` : ''}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'9px 18px', fontSize:13, fontWeight:tab===t.id?700:500, color:tab===t.id?ACCENT:'var(--text-muted)', background:'none', border:'none', borderBottom:`2px solid ${tab===t.id?ACCENT:'transparent'}`, cursor:'pointer', fontFamily:'var(--font)', transition:'color 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'config'  && <ConfigTab provider={provider} setting={setting} onSave={onSave} onDisconnect={onDisconnect} toast={toast}/>}
      {tab === 'mapping' && <WebhookMapeamentoTab toast={toast}/>}
      {tab === 'logs'    && <LogsTab providerId={provider.id}/>}
    </Drawer>
  )
}

// ─── Card de integração ───────────────────────────────────────────────────────
function IntegrationCard({ provider, setting, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display:'flex', flexDirection:'column', gap:0, padding:0, background:'var(--surface)', border:`1.5px solid ${hovered ? provider.color+'44' : 'var(--border2)'}`, borderRadius:14, cursor:'pointer', textAlign:'left', fontFamily:'var(--font)', overflow:'hidden', transition:'border-color 0.15s, box-shadow 0.15s', boxShadow: hovered ? `0 4px 20px ${provider.color}14` : 'none' }}
    >
      {/* Topo colorido */}
      <div style={{ height:4, background: setting.status==='active' ? provider.color : 'var(--border2)' }}/>

      <div style={{ padding:'18px 18px 16px', display:'flex', flexDirection:'column', gap:12, flex:1 }}>
        {/* Icon + status */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <ProviderIcon provider={provider} size={44}/>
          <StatusBadge status={setting.status}/>
        </div>

        {/* Info */}
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:4 }}>{provider.name}</div>
          <div style={{ fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>{provider.description}</div>
        </div>

        {/* Categoria + seta */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:4 }}>
          <span style={{ fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border2)' }}>{provider.category}</span>
          <ChevronRight size={15} strokeWidth={2} color={hovered ? provider.color : 'var(--text-muted)'} style={{ transition:'color 0.15s' }}/>
        </div>
      </div>
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Integracoes() {
  const [settings, setSettings] = useLocalState(INTEGRATIONS_STORAGE_KEY, DEFAULT_SETTINGS)
  const [search,  setSearch]    = useState('')
  const [filter,  setFilter]    = useState('all')  // all | active | inactive | error
  const [openId,  setOpenId]    = useState(null)   // provider_name do drawer aberto
  const toast = useToast()

  const filtered = useMemo(() => {
    return PROVIDERS.filter(p => {
      const setting = settings.find(s => s.provider_name === p.id)
      const status  = setting?.status || 'inactive'
      const matchQ  = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
      const matchF  = filter === 'all' || status === filter
      return matchQ && matchF
    })
  }, [search, filter, settings])

  const counts = useMemo(() => ({
    active:   settings.filter(s => s.status==='active').length,
    error:    settings.filter(s => s.status==='error').length,
  }), [settings])

  function getSetting(providerId) {
    return settings.find(s => s.provider_name === providerId) || {
      id: `mock-${providerId}`, provider_name: providerId,
      credentials: {}, status: 'inactive',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }
  }

  function handleSave(updatedSetting) {
    setSettings(prev => prev.map(s => s.provider_name === updatedSetting.provider_name ? { ...updatedSetting, updated_at: new Date().toISOString() } : s))
  }

  function handleDisconnect(settingId) {
    setSettings(prev => prev.map(s => s.id === settingId ? { ...s, status:'inactive', credentials:{}, updated_at: new Date().toISOString() } : s))
  }

  const openProvider = openId ? PROVIDERS.find(p => p.id === openId) : null
  const openSetting  = openId ? getSetting(openId) : null

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Cabeçalho ── */}
      <div style={pg.header}>
        <div>
          <h1 style={pg.title}>Integrações e APIs</h1>
          <p style={pg.desc}>Conecte o canal a ferramentas externas e monitore os eventos em tempo real.</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Busca */}
          <div style={{ position:'relative' }}>
            <Search size={14} strokeWidth={1.75} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar integração…"
              style={{ ...pg.searchInput, paddingLeft:32, paddingRight: search ? 28 : 12 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:0 }}>
                <X size={13} strokeWidth={2}/>
              </button>
            )}
          </div>

          {/* Filtro status */}
          <select value={filter} onChange={e => setFilter(e.target.value)} style={pg.select}>
            <option value="all">Todos os status</option>
            <option value="active">Conectados</option>
            <option value="inactive">Disponíveis</option>
            <option value="error">Com erro</option>
          </select>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={pg.kpis}>
        <div style={pg.kpi}>
          <div>
            <div style={{ ...pg.kpiVal, color: counts.active > 0 ? '#10B981' : 'var(--text)' }}>{counts.active}</div>
            <div style={pg.kpiLbl}>Conectadas</div>
          </div>
          <Zap size={18} strokeWidth={1.75} color={counts.active>0?'#10B981':'var(--border)'}/>
        </div>
        <div style={pg.kpi}>
          <div>
            <div style={pg.kpiVal}>{PROVIDERS.length}</div>
            <div style={pg.kpiLbl}>Disponíveis</div>
          </div>
        </div>
        <div style={{ ...pg.kpi, borderRight:'none' }}>
          <div>
            <div style={{ ...pg.kpiVal, color: counts.error > 0 ? '#EF4444' : 'var(--text)' }}>{counts.error}</div>
            <div style={pg.kpiLbl}>Com Erro</div>
          </div>
          {counts.error > 0 && <AlertCircle size={18} strokeWidth={1.75} color="#EF4444"/>}
        </div>
      </div>

      {/* ── Grid de cards ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>
        {filtered.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, minHeight:200, justifyContent:'center', color:'var(--text-muted)' }}>
            <Search size={28} strokeWidth={1} style={{ opacity:0.3 }}/>
            <span style={{ fontSize:14 }}>Nenhuma integração encontrada</span>
            {search && <button onClick={() => setSearch('')} style={{ fontSize:12, color:ACCENT, background:'none', border:'none', cursor:'pointer' }}>Limpar busca</button>}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16 }}>
            {filtered.map(provider => (
              <IntegrationCard
                key={provider.id}
                provider={provider}
                setting={getSetting(provider.id)}
                onClick={() => setOpenId(provider.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      {openProvider && openSetting && (
        <IntegrationDrawer
          provider={openProvider}
          setting={openSetting}
          onClose={() => setOpenId(null)}
          onSave={handleSave}
          onDisconnect={handleDisconnect}
          toast={toast}
        />
      )}

      <Toasts items={toast.toasts}/>
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const pg = {
  header:     { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'28px 32px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  title:      { fontSize:18, fontWeight:700, color:'var(--text)', margin:0, letterSpacing:'-0.3px' },
  desc:       { fontSize:13, color:'var(--text-muted)', margin:'4px 0 0' },
  kpis:       { display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 },
  kpi:        { flex:1, padding:'14px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', borderRight:'1px solid var(--border)', borderTop:'3px solid var(--border)' },
  kpiVal:     { fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1 },
  kpiLbl:     { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  searchInput:{ height:34, fontSize:13, border:'1px solid var(--border)', borderRadius:8, background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font)', width:200, outline:'none' },
  select:     { height:34, fontSize:12, border:'1px solid var(--border)', borderRadius:8, background:'var(--surface2)', color:'var(--text)', fontFamily:'var(--font)', padding:'0 10px', outline:'none', cursor:'pointer' },
}

const s = {
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:600, backdropFilter:'blur(2px)' },
  modal:     { background:'var(--surface)', borderRadius:14, width:'100%', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden', animation:'fadeIn 0.2s ease' },
  mHeader:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px 14px', borderBottom:'1px solid var(--border)', flexShrink:0 },
  mTitle:    { fontSize:15, fontWeight:800, color:'var(--text)' },
  mSub:      { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  closeBtn:  { background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:'4px 8px', borderRadius:6, display:'flex', alignItems:'center' },
  ghostBtn:  { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, color:'var(--text-soft)', fontFamily:'var(--font)', cursor:'pointer', fontWeight:500 },
  fieldGroup:{ display:'flex', flexDirection:'column', gap:6 },
  label:     { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:6 },
  input:     { padding:'9px 12px', fontSize:13, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' },
}
