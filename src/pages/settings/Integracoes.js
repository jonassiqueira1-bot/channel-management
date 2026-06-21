import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  X, Check, AlertCircle, Clock,
  Copy, CheckCheck, ExternalLink, RefreshCw,
  ToggleLeft, ToggleRight, Play, ArrowRight, Info,
  Download, Loader,
} from 'lucide-react'
import { useLocalState } from '../../hooks/useLocalState'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../hooks/useProfile'
import { useFunnels } from '../../hooks/useFunnels'
import { supabase } from '../../lib/supabase'
import {
  PROVIDERS, DEFAULT_SETTINGS, MOCK_LOGS,
  INTEGRATIONS_STORAGE_KEY,
} from '../../data/mockIntegrations'
import Button from '../../components/Button'
import SettingsLayout from '../../components/ui/SettingsLayout'
import { FullPageEdit, FPESection } from '../../components/ui'

const SUPABASE_URL = 'https://kkvnvlfyswevlpnchilu.supabase.co'

const ACCENT = 'var(--accent)'

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

function gerarWebhookToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

// ─── Campos de oportunidade mapeáveis ────────────────────────────────────────
const OPP_CAMPOS_MAPEAVEIS = [
  { key: 'titulo',        label: 'Título da oportunidade' },
  { key: 'empresa_nome',  label: 'Empresa' },
  { key: 'contato_nome',  label: 'Nome do contato' },
  { key: 'contato_email', label: 'E-mail do contato' },
  { key: 'contato_fone',  label: 'Telefone' },
  { key: 'valor',         label: 'Valor (R$)' },
  { key: 'descricao',     label: 'Descrição / Observações' },
  { key: 'origem',        label: 'Origem' },
]

// ─── Métodos de conexão disponíveis ──────────────────────────────────────────
const METODOS_CONEXAO = [
  { id: 'webhook', label: 'Webhook', desc: 'Receba eventos em tempo real via HTTP POST', tag: 'Ativo' },
  { id: 'api_polling', label: 'API Polling', desc: 'Consulta periódica à API do sistema', tag: 'Em breve', disabled: true },
  { id: 'oauth2', label: 'OAuth 2.0', desc: 'Autenticação segura com fluxo de autorização', tag: 'Em breve', disabled: true },
]

function exportarLogsCSV(logs, nomeIntegracao) {
  const header = 'Data/Hora,Evento,Status,Payload'
  const rows = logs.map(l =>
    `"${new Date(l.created_at).toLocaleString('pt-BR')}","${l.event_type}","${l.status}","${JSON.stringify(l.payload || {}).replace(/"/g, '""')}"`
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `logs-${nomeIntegracao.replace(/\s+/g,'-').toLowerCase()}-${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ─── RD Station: tela completa (3 blocos) ────────────────────────────────────
function RdStationFullEdit({ provider, onClose, toast }) {
  const { profile } = useProfile()
  const { funis } = useFunnels()
  const [allOpps, setAllOpps] = useLocalState('opps_cache_v1', [])

  // Bloco 1 — Identidade
  const [nomeIntegracao, setNomeIntegracao] = useState(provider.name)
  const [logoData, setLogoData]             = useState(null) // base64

  // Bloco 2 — Método
  const [metodo, setMetodo]               = useState('webhook')
  const [funilId, setFunilId]             = useState('')
  const [webhookToken, setWebhookToken]   = useState('')
  const [copiedUrl, setCopiedUrl]         = useState(false)
  const [leads, setLeads]                 = useState(null)
  const [loadingLeads, setLoadingLeads]   = useState(false)
  const [selecionados, setSelecionados]   = useState(new Set())
  const [intStatus, setIntStatus]         = useState('inactive')
  const [lastSync, setLastSync]           = useState(null)
  const [salvando, setSalvando]           = useState(false)
  const [salvado, setSalvado]             = useState(false)

  // Mapeamento de campos e campanha
  const defaultMap = Object.fromEntries(OPP_CAMPOS_MAPEAVEIS.map(f => [f.key, '']))
  const [mapeamento, setMapeamento]   = useState(defaultMap)
  const [campanhaId, setCampanhaId]   = useState('')
  const [campanhas]                   = useLocalState('settings:campanhas_v1', [])

  // Bloco 3 — Logs
  const [payloadLog, setPayloadLog] = useState(null)
  const logs90 = MOCK_LOGS[provider.id] || []

  useEffect(() => {
    if (!profile?.tenant_id) return
    supabase.from('integracoes')
      .select('config, status, last_sync_at')
      .eq('tenant_id', profile.tenant_id)
      .eq('provider', provider.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setFunilId(data.config?.funil_id || '')
        setWebhookToken(data.config?.webhook_token || '')
        setNomeIntegracao(data.config?.nome_integracao || provider.name)
        setLogoData(data.config?.logo_data || null)
        setIntStatus(data.status || 'inactive')
        setLastSync(data.last_sync_at)
        setMapeamento({ ...defaultMap, ...(data.config?.mapeamento || {}) })
        setCampanhaId(data.config?.campanha_id || '')
      })
  }, [profile?.tenant_id]) // eslint-disable-line

  async function salvar() {
    if (!profile?.tenant_id) { toast.show('Tenant não identificado', 'error'); return }
    setSalvando(true)
    const wToken = webhookToken || gerarWebhookToken()
    if (!webhookToken) setWebhookToken(wToken)
    const { error } = await supabase.from('integracoes').upsert({
      tenant_id:   profile.tenant_id,
      provider:    provider.id,
      credentials: {},
      config:      { funil_id: funilId, webhook_token: wToken, nome_integracao: nomeIntegracao, logo_data: logoData, mapeamento, campanha_id: campanhaId },
      status:      'active',
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'tenant_id,provider' })
    setSalvando(false)
    if (error) { toast.show('Erro ao salvar: ' + error.message, 'error'); return }
    setSalvado(true); setIntStatus('active')
    setTimeout(() => setSalvado(false), 3000)
    toast.show('Configuração salva!')
  }

  function copyWebhookUrl() {
    const url = `${SUPABASE_URL}/functions/v1/integration-webhook?token=${webhookToken}`
    navigator.clipboard.writeText(url).then(() => { setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2500) })
  }

  function aplicarMapeamento(payload) {
    // Resolve um caminho dot-notation no payload: "lead.name" → payload.lead.name
    function get(obj, path) {
      if (!path) return undefined
      return path.split('.').reduce((acc, k) => acc?.[k], obj)
    }
    const lead = payload.leads?.[0] || payload.lead || payload
    const flat = { ...payload, ...lead } // achata para facilitar acesso simples

    const resultado = {}
    OPP_CAMPOS_MAPEAVEIS.forEach(({ key }) => {
      const path = mapeamento[key]
      if (path) resultado[key] = get(flat, path) ?? get(flat, path.replace('lead.', '')) ?? ''
    })

    // Fallbacks para campos não mapeados
    return {
      titulo:        resultado.titulo        || lead.name || lead.email || 'Lead sem título',
      empresa_nome:  resultado.empresa_nome  || lead.company_name || '',
      contato_nome:  resultado.contato_nome  || lead.name || '',
      contato_email: resultado.contato_email || lead.email || '',
      contato_fone:  resultado.contato_fone  || lead.mobile_phone || lead.phone || '',
      valor:         Number(resultado.valor) || 0,
      descricao:     resultado.descricao     || [
        lead.city ? `Cidade: ${lead.city}` : '',
        payload.conversion_identifier ? `Conversão: ${payload.conversion_identifier}` : '',
      ].filter(Boolean).join('\n'),
      origem:        resultado.origem        || nomeIntegracao,
    }
  }

  async function buscarLeadsPendentes() {
    if (!profile?.tenant_id) return
    setLoadingLeads(true)
    const { data } = await supabase.from('rd_leads_queue')
      .select('id, payload, created_at')
      .eq('tenant_id', profile.tenant_id)
      .eq('processed', false)
      .order('created_at', { ascending: false })
    setLoadingLeads(false)
    const mapeados = (data || []).map((row) => {
      const campos = aplicarMapeamento(row.payload)
      const lead = row.payload.leads?.[0] || row.payload.lead || row.payload
      return { _queueId: row.id, ...campos, rd_lead_id: lead.uuid || lead.id || row.id, criado_em: row.created_at }
    })
    setLeads(mapeados); setSelecionados(new Set(mapeados.map((_, i) => i)))
    if (!mapeados.length) toast.show('Nenhum lead pendente.')
    else toast.show(`${mapeados.length} lead(s) aguardando importação`)
  }

  async function importarSelecionados() {
    if (!leads || !selecionados.size) return
    const funil = funis.find(f => String(f.id) === String(funilId)) || funis[0]
    const primeiraEtapa = funil?.etapas?.[0]
    const hoje = new Date().toISOString().slice(0, 10)
    const sArr = [...selecionados]
    const novas = sArr.map((i, idx) => {
      const l = leads[i]
      return { id: `rd_${Date.now()}_${idx}`, titulo: l.titulo, empresa_nome: l.empresa_nome,
        contato_nome: l.contato_nome, contato_email: l.contato_email, contato_fone: l.contato_fone,
        descricao: l.descricao, origem: l.origem || nomeIntegracao, situacao: 'em_negociacao',
        valor: l.valor || 0, campanha_id: campanhaId || null,
        funil_id: funil?.id || '', etapa_id: primeiraEtapa?.id || '', rd_lead_id: l.rd_lead_id, criado: hoje }
    })
    const existentes = new Set(allOpps.map(o => o.rd_lead_id).filter(Boolean))
    const novasFiltradas = novas.filter(o => !existentes.has(o.rd_lead_id))
    setAllOpps(prev => [...prev, ...novasFiltradas])
    const queueIds = sArr.map(i => leads[i]._queueId).filter(Boolean)
    if (queueIds.length) await supabase.from('rd_leads_queue').update({ processed: true }).in('id', queueIds)
    toast.show(`${novasFiltradas.length} oportunidade(s) criada(s) no Pipeline!`)
    setLeads(null)
  }

  function handleLogoUpload(e) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogoData(ev.target.result)
    reader.readAsDataURL(file)
  }

  const webhookUrl = webhookToken ? `${SUPABASE_URL}/functions/v1/integration-webhook?token=${webhookToken}` : ''
  const funiAtivo = funis.find(f => String(f.id) === String(funilId)) || funis[0]

  const bloco = { borderBottom: '1px solid var(--border)', padding: '28px 36px' }
  const secLabel = { fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 18, display: 'block' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflowY: 'auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 36px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}>
          <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} strokeWidth={2}/>
          Integrações e APIs
        </button>
        <span style={{ color: 'var(--border)', fontSize: 12 }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{nomeIntegracao}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          {intStatus === 'active' && (
            <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }}/> Ativo
            </span>
          )}
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid var(--border)', background: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{ padding: '7px 18px', borderRadius: 7, border: 'none', background: ACCENT, color: '#fff', fontSize: 13, fontWeight: 700, cursor: salvando ? 'wait' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {salvando ? <><Loader size={12} strokeWidth={2} style={{ animation: 'spin .8s linear infinite' }}/> Salvando…</> : salvado ? <><Check size={12} strokeWidth={2.5}/> Salvo!</> : <><Check size={12} strokeWidth={2.5}/> Salvar</>}
          </button>
        </div>
      </div>

      {/* ── Bloco 1: Identidade ─────────────────────────────────────────────── */}
      <div style={bloco}>
        <span style={secLabel}>Identidade</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Logo */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {logoData
              ? <img src={logoData} alt="logo" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'contain', border: '1px solid var(--border)', background: '#fff' }}/>
              : <ProviderIcon provider={{ ...provider, name: nomeIntegracao }} size={64}/>
            }
            <label htmlFor="logo-upload" style={{ position: 'absolute', bottom: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Download size={11} strokeWidth={2.5}/>
              <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }}/>
            </label>
          </div>
          {/* Nome editável */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, maxWidth: 480 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Nome da integração</label>
            <input
              value={nomeIntegracao}
              onChange={e => setNomeIntegracao(e.target.value)}
              placeholder={provider.name}
              style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', background: 'transparent', border: 'none', borderBottom: '2px solid var(--border)', padding: '6px 0', outline: 'none', fontFamily: 'var(--font)', width: '100%' }}
              onFocus={e => e.target.style.borderBottomColor = ACCENT}
              onBlur={e => e.target.style.borderBottomColor = 'var(--border)'}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{provider.description}</span>
          </div>
        </div>
      </div>

      {/* ── Bloco 2: Método e configuração ─────────────────────────────────── */}
      <div style={bloco}>
        <span style={secLabel}>Método de conexão</span>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Lista de métodos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {METODOS_CONEXAO.map(m => (
              <button key={m.id} onClick={() => !m.disabled && setMetodo(m.id)} disabled={m.disabled}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10,
                  border: `1.5px solid ${metodo === m.id ? ACCENT : 'var(--border)'}`,
                  background: metodo === m.id ? 'var(--accent-glow)' : 'var(--surface)',
                  cursor: m.disabled ? 'not-allowed' : 'pointer', textAlign: 'left', opacity: m.disabled ? 0.5 : 1,
                  fontFamily: 'var(--font)', transition: 'all 0.15s' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${metodo === m.id ? ACCENT : 'var(--border)'}`, background: metodo === m.id ? ACCENT : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {metodo === m.id && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.label}
                    {m.tag && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: metodo === m.id ? ACCENT : 'var(--surface2)', color: metodo === m.id ? '#fff' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.tag}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Configuração do método selecionado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {metodo === 'webhook' && (
              <>
                {/* URL do Webhook */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>URL do Webhook</label>
                  {webhookUrl ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input readOnly value={webhookUrl} style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--mono)', outline: 'none' }}/>
                      <button onClick={copyWebhookUrl} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--border)', background: copiedUrl ? '#F0FDF4' : 'var(--surface)', color: copiedUrl ? '#10B981' : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                        {copiedUrl ? <><CheckCheck size={13}/> Copiado!</> : <><Copy size={13}/> Copiar URL</>}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px dashed var(--border)', background: 'var(--surface2)', fontSize: 12, color: 'var(--text-muted)' }}>
                      Salve a configuração para gerar a URL. Cole-a depois em: <strong>RD Station → Configurações → Automações → Webhooks</strong>
                    </div>
                  )}
                  {lastSync && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Último evento recebido: {new Date(lastSync).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                </div>

                {/* Funil de destino */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Funil de destino dos leads</label>
                  <select value={funilId} onChange={e => setFunilId(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer' }}>
                    <option value="">— Funil padrão —</option>
                    {funis.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                  {funiAtivo && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Leads entram em: <strong>{funiAtivo.etapas?.[0]?.nome || '—'}</strong></span>}
                </div>

                {/* ── Mapeamento de campos ── */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Mapeamento de campos</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>campo externo → nosso campo</span>
                  </div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                          <th style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left' }}>Nosso campo</th>
                          <th style={{ padding: '7px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left' }}>Campo do sistema externo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {OPP_CAMPOS_MAPEAVEIS.map((campo, i) => (
                          <tr key={campo.key} style={{ borderBottom: i < OPP_CAMPOS_MAPEAVEIS.length - 1 ? '1px solid var(--border2)' : 'none' }}>
                            <td style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', width: '40%' }}>{campo.label}</td>
                            <td style={{ padding: '3px 6px' }}>
                              <input
                                value={mapeamento[campo.key] || ''}
                                onChange={e => setMapeamento(m => ({ ...m, [campo.key]: e.target.value }))}
                                placeholder={campo.key === 'titulo' ? 'lead.name' : campo.key === 'contato_email' ? 'email' : campo.key}
                                style={{ width: '100%', padding: '4px 7px', fontSize: 11, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--mono)', outline: 'none', boxSizing: 'border-box' }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    Use ponto para aninhados: <code style={{ background: 'var(--surface2)', padding: '1px 3px', borderRadius: 3 }}>lead.name</code>. Vazio = valor padrão.
                  </span>
                </div>

                {/* ── Campanha associada ── */}
                {campanhas.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Campanha associada</label>
                    <select value={campanhaId} onChange={e => setCampanhaId(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer' }}>
                      <option value="">— Nenhuma campanha —</option>
                      {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome || c.name}</option>)}
                    </select>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Leads importados entram vinculados a esta campanha.</span>
                  </div>
                )}

                {/* Leads pendentes */}
                {leads !== null && leads.length > 0 && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 14px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{leads.length} lead{leads.length !== 1 ? 's' : ''} pendente{leads.length !== 1 ? 's' : ''}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setSelecionados(new Set(leads.map((_, i) => i)))} style={{ fontSize: 11, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer' }}>Todos</button>
                        <button onClick={() => setSelecionados(new Set())} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Nenhum</button>
                      </div>
                    </div>
                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {leads.map((lead, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: i < leads.length - 1 ? '1px solid var(--border2)' : 'none', background: selecionados.has(i) ? 'var(--accent-glow)' : 'transparent', cursor: 'pointer' }}>
                          <input type="checkbox" checked={selecionados.has(i)} onChange={() => setSelecionados(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })}/>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{lead.titulo}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{[lead.empresa_nome, lead.contato_email].filter(Boolean).join(' · ')}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {leads !== null && leads.length === 0 && (
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface2)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum lead pendente no momento.</div>
                )}

                {/* Ações */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={buscarLeadsPendentes} disabled={loadingLeads || !webhookToken}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: loadingLeads || !webhookToken ? 'not-allowed' : 'pointer', opacity: !webhookToken ? 0.5 : 1, fontFamily: 'var(--font)' }}>
                    {loadingLeads ? <><Loader size={12} style={{ animation: 'spin .8s linear infinite' }}/> Buscando…</> : <><RefreshCw size={12}/> Ver leads pendentes</>}
                  </button>
                  {leads !== null && selecionados.size > 0 && (
                    <button onClick={importarSelecionados}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#10B981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      <Download size={12}/> Importar {selecionados.size} lead{selecionados.size !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bloco 3: Logs ───────────────────────────────────────────────────── */}
      <div style={{ ...bloco, flex: 1, borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={secLabel}>Logs dos últimos 90 dias ({logs90.length})</span>
          {logs90.length > 0 && (
            <button onClick={() => exportarLogsCSV(logs90, nomeIntegracao)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              <Download size={12} strokeWidth={2}/> Exportar CSV
            </button>
          )}
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {logs90.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <Clock size={32} strokeWidth={1} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }}/>
              Nenhum evento registrado ainda.
            </div>
          ) : (
            <div style={{ overflowY: 'auto', maxHeight: 380 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0 }}>
                  <tr>
                    {['Data / Hora', 'Evento', 'Status', 'Payload'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs90.map((log, i) => (
                    <tr key={log.id} style={{ borderBottom: i < logs90.length - 1 ? '1px solid var(--border2)' : 'none', background: i % 2 === 0 ? 'transparent' : 'var(--surface2)' }}>
                      <td style={{ padding: '11px 16px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{fmtDate(log.created_at)}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{log.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td>
                      <td style={{ padding: '11px 16px' }}><LogBadge status={log.status}/></td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        <button onClick={() => setPayloadLog(log)}
                          style={{ fontSize: 12, fontWeight: 600, color: ACCENT, background: 'none', border: `1px solid ${ACCENT}30`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
      </div>

      {payloadLog && <PayloadModal log={payloadLog} onClose={() => setPayloadLog(null)}/>}
    </div>
  )
}

// ─── RD Station: tab completa ─────────────────────────────────────────────────
function RdStationTab({ toast }) {
  const { session } = useAuth()
  const { profile } = useProfile()
  const { funis } = useFunnels()
  const [allOpps, setAllOpps] = useLocalState('opps_cache_v1', [])

  const [funilId, setFunilId]       = useState('')
  const [webhookToken, setWebhookToken] = useState('')
  const [salvando, setSalvando]     = useState(false)
  const [salvado, setSalvado]       = useState(false)
  const [leads, setLeads]           = useState(null)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [selecionados, setSelecionados] = useState(new Set())
  const [lastSync, setLastSync]     = useState(null)
  const [intStatus, setIntStatus]   = useState('inactive')
  const [copiedUrl, setCopiedUrl]   = useState(false)

  // Carrega config salva do Supabase
  useEffect(() => {
    if (!profile?.tenant_id) return
    supabase.from('integracoes')
      .select('config, status, last_sync_at')
      .eq('tenant_id', profile.tenant_id)
      .eq('provider', 'rd_station')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        setFunilId(data.config?.funil_id || '')
        setWebhookToken(data.config?.webhook_token || '')
        setIntStatus(data.status || 'inactive')
        setLastSync(data.last_sync_at)
      })
  }, [profile?.tenant_id])

  async function salvarConfig() {
    if (!profile?.tenant_id) { toast.show('Tenant não identificado', 'error'); return }
    setSalvando(true)
    const wToken = webhookToken || gerarWebhookToken()
    if (!webhookToken) setWebhookToken(wToken)
    const payload = {
      tenant_id:   profile.tenant_id,
      provider:    'rd_station',
      credentials: {},
      config:      { funil_id: funilId, webhook_token: wToken },
      status:      'active',
      updated_at:  new Date().toISOString(),
    }
    const { error } = await supabase.from('integracoes').upsert(payload, { onConflict: 'tenant_id,provider' })
    setSalvando(false)
    if (error) { toast.show('Erro ao salvar: ' + error.message, 'error'); return }
    setSalvado(true)
    setIntStatus('active')
    setTimeout(() => setSalvado(false), 3000)
    toast.show('Configuração salva! Cole a URL do webhook no RD Station.')
  }

  async function buscarLeadsPendentes() {
    if (!profile?.tenant_id) return
    setLoadingLeads(true)
    const { data, error } = await supabase
      .from('rd_leads_queue')
      .select('id, payload, created_at')
      .eq('tenant_id', profile.tenant_id)
      .eq('processed', false)
      .order('created_at', { ascending: false })
    setLoadingLeads(false)
    if (error) { toast.show('Erro ao buscar leads: ' + error.message, 'error'); return }
    const mapeados = (data || []).map((row, i) => {
      const p = row.payload
      const lead = p.leads?.[0] || p.lead || p
      return {
        _queueId:      row.id,
        titulo:        lead.name || lead.email || 'Lead RD Station',
        empresa_nome:  lead.company_name || '',
        contato_nome:  lead.name || '',
        contato_email: lead.email || '',
        contato_fone:  lead.mobile_phone || lead.phone || '',
        descricao:     [
          lead.city  ? `Cidade: ${lead.city}` : '',
          lead.state ? `Estado: ${lead.state}` : '',
          p.conversion_identifier ? `Conversão: ${p.conversion_identifier}` : '',
        ].filter(Boolean).join('\n'),
        rd_lead_id:    lead.uuid || lead.id || row.id,
        fonte:         'rd_station',
        criado_em:     row.created_at,
      }
    })
    setLeads(mapeados)
    setSelecionados(new Set(mapeados.map((_, i) => i)))
    if (!mapeados.length) toast.show('Nenhum lead pendente no momento.')
    else toast.show(`${mapeados.length} lead(s) aguardando importação`)
  }

  function copyWebhookUrl() {
    const url = `${SUPABASE_URL}/functions/v1/integration-webhook?token=${webhookToken}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2500)
    })
  }

  function toggleLead(i) {
    setSelecionados(prev => {
      const s = new Set(prev)
      s.has(i) ? s.delete(i) : s.add(i)
      return s
    })
  }

  async function importarSelecionados() {
    if (!leads || !selecionados.size) return
    const funil = funis.find(f => String(f.id) === String(funilId)) || funis[0]
    const primeiraEtapa = funil?.etapas?.[0]
    const hoje = new Date().toISOString().slice(0, 10)
    const selecionadosArr = [...selecionados]
    const novas = selecionadosArr.map((i, idx) => {
      const l = leads[i]
      return {
        id:           `rd_${Date.now()}_${idx}`,
        titulo:        l.titulo,
        empresa_nome:  l.empresa_nome,
        contato_nome:  l.contato_nome,
        contato_email: l.contato_email,
        contato_fone:  l.contato_fone,
        descricao:     l.descricao,
        origem:        'RD Station Marketing',
        situacao:      'em_negociacao',
        valor:         0,
        funil_id:      funil?.id || '',
        etapa_id:      primeiraEtapa?.id || '',
        rd_lead_id:    l.rd_lead_id,
        criado:        hoje,
      }
    })
    const existentes = new Set(allOpps.map(o => o.rd_lead_id).filter(Boolean))
    const novasFiltradas = novas.filter(o => !existentes.has(o.rd_lead_id))
    setAllOpps(prev => [...prev, ...novasFiltradas])

    // Marca como processado no Supabase
    const queueIds = selecionadosArr.map(i => leads[i]._queueId).filter(Boolean)
    if (queueIds.length > 0) {
      await supabase.from('rd_leads_queue')
        .update({ processed: true, opp_id: novasFiltradas[0]?.id || null })
        .in('id', queueIds)
    }

    toast.show(`${novasFiltradas.length} oportunidade(s) criada(s) no Pipeline!`)
    setLeads(null)
  }

  const funiAtivo = funis.find(f => String(f.id) === String(funilId)) || funis[0]
  const webhookUrl = webhookToken
    ? `${SUPABASE_URL}/functions/v1/integration-webhook?token=${webhookToken}`
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10,
          background: intStatus === 'active' ? '#F0FDF4' : 'var(--surface2)',
          border: `1px solid ${intStatus === 'active' ? '#BBF7D0' : 'var(--border)'}` }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: intStatus === 'active' ? '#10B981' : '#94A3B8', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: intStatus === 'active' ? '#065F46' : 'var(--text-muted)' }}>
            {intStatus === 'active' ? 'Webhook ativo' : 'Não configurado — salve para gerar a URL'}
          </span>
          {lastSync && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Último lead: {new Date(lastSync).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* URL do Webhook */}
        {webhookUrl ? (
          <div style={s.fieldGroup}>
            <label style={s.label}>URL do Webhook</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input readOnly value={webhookUrl} style={{ ...s.input, flex: 1, fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface2)' }} />
              <button onClick={copyWebhookUrl}
                style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
                  background: copiedUrl ? '#F0FDF4' : 'var(--surface)', color: copiedUrl ? '#10B981' : 'var(--text)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font)' }}>
                {copiedUrl ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Cole esta URL no RD Station: Configurações → Automações → Webhooks → Nova URL. Quando um lead é criado, ele chega aqui automaticamente.
            </span>
          </div>
        ) : (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
            Salve a configuração para gerar a URL do webhook que deve ser cadastrada no RD Station.
          </div>
        )}

        {/* Funil destino */}
        <div style={s.fieldGroup}>
          <label style={s.label}>Funil de destino dos leads</label>
          <select style={{ ...s.input, cursor: 'pointer' }} value={funilId} onChange={e => setFunilId(e.target.value)}>
            <option value="">— Funil padrão —</option>
            {funis.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
          {funiAtivo && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Leads entram na etapa: <strong>{funiAtivo.etapas?.[0]?.nome || '—'}</strong>
            </span>
          )}
        </div>

        {/* Lista de leads pendentes */}
        {leads !== null && (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                {leads.length} lead{leads.length !== 1 ? 's' : ''} pendente{leads.length !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setSelecionados(new Set(leads.map((_, i) => i)))}
                  style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>Todos</button>
                <button onClick={() => setSelecionados(new Set())}
                  style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Nenhum</button>
              </div>
            </div>
            {leads.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhum lead pendente no momento.
              </div>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {leads.map((lead, i) => (
                  <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                    borderBottom: i < leads.length - 1 ? '1px solid var(--border2)' : 'none',
                    background: selecionados.has(i) ? 'var(--accent-glow)' : 'transparent', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selecionados.has(i)} onChange={() => toggleLead(i)} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{lead.titulo}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {[lead.empresa_nome, lead.contato_email, lead.criado_em ? new Date(lead.criado_em).toLocaleDateString('pt-BR') : ''].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', flexShrink: 0, gap: 10 }}>
        <button onClick={buscarLeadsPendentes} disabled={loadingLeads || !webhookToken}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
            fontSize: 13, fontWeight: 600, cursor: loadingLeads || !webhookToken ? 'not-allowed' : 'pointer',
            opacity: loadingLeads || !webhookToken ? 0.5 : 1, fontFamily: 'var(--font)' }}>
          {loadingLeads ? <><Loader size={13} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} /> Buscando…</>
                        : <><RefreshCw size={13} strokeWidth={2} /> Ver leads pendentes</>}
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {leads !== null && selecionados.size > 0 && (
            <button onClick={importarSelecionados}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                background: '#10B981', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'var(--font)' }}>
              <Download size={13} strokeWidth={2.5} />
              Importar {selecionados.size} lead{selecionados.size !== 1 ? 's' : ''}
            </button>
          )}
          <button onClick={salvarConfig} disabled={salvando}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 8,
              background: ACCENT, color: '#fff', border: 'none', fontSize: 13, fontWeight: 700,
              cursor: salvando ? 'wait' : 'pointer', opacity: salvando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
            {salvando ? <><RefreshCw size={13} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} /> Salvando…</>
                      : salvado ? <><Check size={13} strokeWidth={2.5} /> Salvo!</>
                      : <><Check size={13} strokeWidth={2.5} /> Salvar configuração</>}
          </button>
        </div>
      </div>
    </div>
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

const CUSTOM_PROVIDERS_KEY = 'integrations:custom_providers_v1'
const HIDDEN_PROVIDERS_KEY = 'integrations:hidden_providers_v1'
const CATEGORIAS = ['CRM', 'Automação', 'Notificações', 'ERP', 'E-commerce', 'Suporte', 'Marketing', 'Outro']
const CORES_PADRAO = ['#6366F1','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6','#F97316']

function NovaIntegracaoModal({ onConfirm, onClose }) {
  const [nome, setNome]           = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('Automação')
  const [cor, setCor]             = useState(CORES_PADRAO[0])

  function confirmar() {
    if (!nome.trim()) return
    const id = `custom_${Date.now()}`
    onConfirm({ id, name: nome.trim(), description: descricao.trim(), category: categoria, color: cor, custom: true, supabase: true, fields: [] })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:700, backdropFilter:'blur(3px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--surface)', borderRadius:14, width:440, boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' }}>
        <div style={{ padding:'20px 22px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>Nova integração</div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>Preencha os dados básicos e configure depois</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', padding:4, borderRadius:6, display:'flex' }}><X size={16}/></button>
        </div>
        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Nome <span style={{ color:'var(--red)' }}>*</span></label>
            <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Microsoft Forms, Typeform..." style={{ padding:'9px 12px', fontSize:13, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--font)', outline:'none' }}
              onKeyDown={e => e.key === 'Enter' && confirmar()}/>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Descrição</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="O que essa integração faz?" style={{ padding:'9px 12px', fontSize:13, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--font)', outline:'none' }}/>
          </div>
          <div style={{ display:'flex', gap:12 }}>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ padding:'9px 12px', fontSize:13, borderRadius:8, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text)', fontFamily:'var(--font)', outline:'none', cursor:'pointer' }}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'var(--text-muted)' }}>Cor</label>
              <div style={{ display:'flex', gap:5, flexWrap:'wrap', paddingTop:2 }}>
                {CORES_PADRAO.map(c => (
                  <button key={c} onClick={() => setCor(c)} style={{ width:24, height:24, borderRadius:'50%', background:c, border:`2.5px solid ${cor === c ? 'var(--text)' : 'transparent'}`, cursor:'pointer', flexShrink:0 }}/>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Cancelar</button>
          <button onClick={confirmar} disabled={!nome.trim()} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:ACCENT, color:'#fff', fontSize:13, fontWeight:700, cursor:nome.trim() ? 'pointer' : 'not-allowed', opacity:nome.trim() ? 1 : 0.5, fontFamily:'var(--font)' }}>Criar e configurar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Integracoes() {
  const [settings, setSettings]           = useLocalState(INTEGRATIONS_STORAGE_KEY, DEFAULT_SETTINGS)
  const [customProviders, setCustomProviders] = useLocalState(CUSTOM_PROVIDERS_KEY, [])
  const [hiddenIds, setHiddenIds]         = useLocalState(HIDDEN_PROVIDERS_KEY, [])
  const [search, setSearch]               = useState('')
  const [editando, setEditando]           = useState(null)
  const [addModal, setAddModal]           = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(null) // provider a excluir
  const toast = useToast()

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

  function handleNovaIntegracao(provider) {
    setCustomProviders(prev => [...prev, provider])
    setAddModal(false)
    setEditando(provider)
  }

  function handleExcluir(provider) {
    setConfirmExcluir(provider)
  }

  function confirmarExclusao() {
    if (!confirmExcluir) return
    if (confirmExcluir.custom) {
      setCustomProviders(prev => prev.filter(p => p.id !== confirmExcluir.id))
    } else {
      setHiddenIds(prev => [...prev.filter(id => id !== confirmExcluir.id), confirmExcluir.id])
    }
    setSettings(prev => prev.filter(s => s.provider_name !== confirmExcluir.id))
    toast.show(`Integração "${confirmExcluir.name}" removida.`, 'warning')
    setConfirmExcluir(null)
    if (editando?.id === confirmExcluir.id) setEditando(null)
  }

  const allBuiltin = useMemo(() => PROVIDERS.filter(p => !hiddenIds.includes(p.id)), [hiddenIds])

  const allProviders = useMemo(() => [...allBuiltin, ...customProviders].map(p => ({
    ...p,
    setting: getSetting(p.id),
    status: getSetting(p.id).status,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  })), [settings, allBuiltin, customProviders])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return allProviders.filter(p => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q))
  }, [search, allProviders])

  if (editando) {
    const provider = editando
    const setting  = getSetting(provider.id)
    const isWebhook = provider.id === 'webhook'
    const logCount  = (MOCK_LOGS[provider.id] || []).length

    if (provider.supabase) {
      return (
        <>
          <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
          <RdStationFullEdit provider={provider} onClose={() => setEditando(null)} toast={toast}/>
          <Toasts items={toast.toasts}/>
        </>
      )
    }

    return (
      <>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <FullPageEdit
          breadcrumb={[{ label: 'Integrações e APIs', onClick: () => setEditando(null) }]}
          title={provider.name}
          subtitle={provider.description}
          onSave={() => setEditando(null)}
          saveLabel="Fechar"
          onCancel={() => setEditando(null)}
        >
          {/* Status + icon summary */}
          <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)', marginBottom:8 }}>
            <ProviderIcon provider={provider} size={44}/>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:4 }}>{provider.name}</div>
              <StatusBadge status={setting.status}/>
            </div>
          </div>

          <FPESection title="Configuração">
            <ConfigTab provider={provider} setting={setting} onSave={handleSave} onDisconnect={handleDisconnect} toast={toast}/>
          </FPESection>

          {isWebhook && (
            <FPESection title="Mapeamento para Pipeline">
              <WebhookMapeamentoTab toast={toast}/>
            </FPESection>
          )}

          <FPESection title={`Logs de Eventos${logCount ? ` (${logCount})` : ''}`}>
            <LogsTab providerId={provider.id}/>
          </FPESection>
        </FullPageEdit>
        <Toasts items={toast.toasts}/>
      </>
    )
  }

  return (
    <>
      <SettingsLayout
        title="Integrações e APIs"
        description="Conecte o canal a ferramentas externas e monitore os eventos em tempo real."
        onNew={() => setAddModal(true)}
        newLabel="+ Nova integração"
        columns={[
          { key: 'name', label: 'Integração', render: (v, row) => (
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {row.logo_data
                ? <img src={row.logo_data} alt="logo" style={{ width:36, height:36, borderRadius:8, objectFit:'contain', border:'1px solid var(--border)', background:'#fff' }}/>
                : <ProviderIcon provider={row} size={36}/>
              }
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
                  {v}
                  {row.custom && <span style={{ fontSize:9, fontWeight:700, padding:'1px 5px', borderRadius:4, background:'var(--accent-glow)', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Custom</span>}
                </div>
                <div style={{ fontSize:11, color:'var(--text-muted)' }}>{row.description}</div>
              </div>
            </div>
          )},
          { key: 'category', label: 'Categoria', width: 130, render: (v) => (
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'var(--surface2)', color:'var(--text-muted)', border:'1px solid var(--border2)' }}>{v}</span>
          )},
          { key: 'status', label: 'Status', width: 130, render: (v) => <StatusBadge status={v}/> },
        ]}
        data={filtered}
        keyField="id"
        emptyLabel="Nenhuma integração encontrada."
        rowActions={[
          { label: 'Configurar', onClick: row => setEditando(allProviders.find(p => p.id === row.id)) },
          { label: 'Excluir', danger: true, onClick: row => handleExcluir(allProviders.find(p => p.id === row.id)) },
        ]}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Modal: nova integração */}
      {addModal && <NovaIntegracaoModal onConfirm={handleNovaIntegracao} onClose={() => setAddModal(false)}/>}

      {/* Modal: confirmar exclusão */}
      {confirmExcluir && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:700, backdropFilter:'blur(3px)' }}>
          <div style={{ background:'var(--surface)', borderRadius:14, width:400, boxShadow:'0 24px 64px rgba(0,0,0,0.22)', overflow:'hidden' }}>
            <div style={{ padding:'20px 22px' }}>
              <div style={{ fontSize:15, fontWeight:800, color:'var(--text)', marginBottom:8 }}>Excluir integração?</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', lineHeight:1.6 }}>
                A integração <strong>{confirmExcluir.name}</strong> será removida da lista. Esta ação não pode ser desfeita.
              </div>
            </div>
            <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmExcluir(null)} style={{ padding:'8px 16px', borderRadius:8, border:'1px solid var(--border)', background:'none', color:'var(--text)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Cancelar</button>
              <button onClick={confirmarExclusao} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'#EF4444', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      <Toasts items={toast.toasts}/>
    </>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
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
