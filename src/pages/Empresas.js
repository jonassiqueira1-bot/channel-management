import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import Button from '../components/Button'
import { useLocalState } from '../hooks/useLocalState'
import { useCompanies } from '../hooks/useCompanies'
import { InlineTextarea, DeleteZone } from '../components/NotionDrawer'
import SlideOver from '../components/ui/SlideOver'
import BrowseLayout from '../components/BrowseLayout'
import { MOCK_USUARIOS } from '../data/mockUsuarios'
import { useFormLayout } from '../hooks/useFormLayout'
import DynamicFormLayout from '../components/DynamicFormLayout'
import { useContacts } from '../hooks/useContacts'
import { useOpportunities } from '../hooks/useOpportunities'
import { useContracts } from '../hooks/useContracts'
import { useProjects } from '../hooks/useProjects'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCNPJ(v) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}
function fmtCEP(v) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0,5)}-${d.slice(5)}`
}
function fmtPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}
function fmtCNAE(code) {
  // 6201500 → 6201-5/00
  const s = String(code).replace(/\D/g, '')
  if (s.length < 7) return s
  return `${s.slice(0,4)}-${s.slice(4,5)}/${s.slice(5,7)}`
}

// Mapa CNAE simplificado → segmento
const CNAE_MAP = [
  { re: /^(01|02|03)/, seg: 'Agro' },
  { re: /^(05|06|07|08|09)/, seg: 'Mineração' },
  { re: /^(1[0-9]|2[0-9]|3[0-3])/, seg: 'Indústria' },
  { re: /^(35)/, seg: 'Energia' },
  { re: /^(41|42|43)/, seg: 'Construção' },
  { re: /^(45|46|47)/, seg: 'Distribuição' },
  { re: /^(49|50|51|52|53)/, seg: 'Logística' },
  { re: /^(55|56)/, seg: 'Turismo' },
  { re: /^(58|59|60|61|62|63)/, seg: 'Tecnologia' },
  { re: /^(64|65|66)/, seg: 'Financeiro' },
  { re: /^(86|87|88)/, seg: 'Saúde' },
  { re: /^(85)/, seg: 'Educação' },
]
function cnaeToSegmento(cnae) {
  const code = String(cnae).replace(/\D/g, '')
  const match = CNAE_MAP.find(m => m.re.test(code))
  return match?.seg || ''
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIPOS = [
  { value: 'rascunho',      label: 'Rascunho',         color: '#94A3B8', bg: '#F8FAFC', text: '#64748B', draft: true },
  { value: 'franquia',      label: 'Franquia',         color: '#7C3AED', bg: '#F5F3FF', text: '#6D28D9' },
  { value: 'unidade',       label: 'Unidade',          color: '#1D4ED8', bg: '#EFF6FF', text: '#1E40AF' },
  { value: 'cliente_final', label: 'Cliente Final',    color: '#0891B2', bg: '#ECFEFF', text: '#0E7490' },
  { value: 'parceiro',      label: 'Parceiro',         color: '#059669', bg: '#F0FDF4', text: '#065F46' },
  { value: 'gratuito',      label: 'Gratuito',         color: '#94A3B8', bg: '#F1F5F9', text: '#475569' },
  { value: 'suspenso',      label: 'Suspenso',         color: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
  { value: 'cancelado',     label: 'Cancelado',        color: '#EF4444', bg: '#FEF2F2', text: '#991B1B' },
]

const STATUS_MAP = {
  ativo:      { label: 'Ativo',      color: 'var(--green)',  bg: 'var(--green-bg)',  text: 'var(--green-text)' },
  negociacao: { label: 'Negociação', color: 'var(--yellow)', bg: 'var(--yellow-bg)', text: 'var(--yellow-text)' },
  inativo:    { label: 'Inativo',    color: '#9A9590',       bg: 'var(--surface3)',  text: 'var(--text-muted)' },
}

const SEGMENTOS = ['Agro','Construção','Distribuição','Educação','Energia','Financeiro','Indústria','Logística','Mineração','Saúde','Tecnologia','Turismo']
const ORIGENS   = ['Inbound','Outbound','Canal','Indicação','Evento','Prospecção']

const EMPTY_FORM = {
  razao: '', fantasia: '', cnpj: '', tipo: 'cliente_final', segmento: '',
  cnae_codigo: '', cnae_descricao: '', inscricao_estadual: '',
  cep: '', logradouro: '', bairro: '', cidade: '', uf: '', numero: '', complemento: '',
  status: 'negociacao', origem: '', responsavel: '', site: '', telefone: '', email: '',
  franquia_ar_id: null, franquia_ar_nome: '',
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.inativo
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function TipoBadge({ tipo }) {
  const cfg = TIPOS.find(t => t.value === tipo) || TIPOS[0]
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px', borderRadius:20,
      background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap',
      ...(cfg.draft ? { border:'1px dashed #CBD5E1' } : {}) }}>
      {cfg.draft && <span style={{ fontSize:10 }}>✏️</span>}
      {cfg.label}
    </span>
  )
}

// ─── Lookup feedback ──────────────────────────────────────────────────────────
function LookupStatus({ state }) {
  if (!state) return null
  const cfg = {
    loading: { color:'var(--text-muted)', icon:'⟳', text:'Consultando…' },
    success: { color:'var(--green-text)', icon:'✓', text:'Dados preenchidos automaticamente' },
    error:   { color:'var(--red)',        icon:'✕', text: state.msg || 'Não encontrado' },
  }[state.type]
  if (!cfg) return null
  return (
    <span style={{ fontSize:11, color:cfg.color, display:'flex', alignItems:'center', gap:4, fontFamily:'var(--mono)', marginTop:4 }}>
      {cfg.icon} {cfg.text}
    </span>
  )
}

// ─── Franquia AR search ───────────────────────────────────────────────────────
function FranquiaARSearch({ value, label, onChange, empresas, excludeId, filterTipo }) {
  const [query, setQuery]   = useState(label || '')
  const [open, setOpen]     = useState(false)
  const ref                 = useRef(null)

  useEffect(() => { setQuery(label || '') }, [label])

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const options = useMemo(() => {
    const q = query.toLowerCase()
    return empresas
      .filter(e =>
        e.id !== excludeId &&
        (!filterTipo || e.tipo === filterTipo) &&
        (e.fantasia || e.razao || '').toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [query, empresas, excludeId, filterTipo])

  const placeholder = filterTipo === 'franquia' ? 'Buscar franquia…' : 'Buscar empresa…'
  const emptyMsg    = filterTipo === 'franquia' ? 'Nenhuma franquia encontrada' : 'Nenhuma empresa encontrada'

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ position:'relative' }}>
        <input
          style={{ ...m.input, paddingRight: value ? 28 : 12 }}
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null, '') }}
          onFocus={() => setOpen(true)}
        />
        {value && (
          <button type="button" onClick={() => { onChange(null, ''); setQuery('') }}
            style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:14, padding:0 }}>
            ✕
          </button>
        )}
      </div>
      {open && options.length > 0 && (
        <div style={ar.dropdown}>
          {options.map(e => (
            <button type="button" key={e.id} style={ar.option}
              onMouseDown={() => { onChange(e.id, e.fantasia || e.razao); setQuery(e.fantasia || e.razao); setOpen(false) }}>
              <span style={ar.optAvatar}>{(e.fantasia || e.razao || '?').slice(0,2).toUpperCase()}</span>
              <span>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{e.fantasia || e.razao}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{e.cnpj} · {e.cidade}/{e.uf}</div>
              </span>
            </button>
          ))}
        </div>
      )}
      {open && query.length > 1 && options.length === 0 && (
        <div style={{ ...ar.dropdown, padding:'12px 14px', color:'var(--text-muted)', fontSize:13 }}>{emptyMsg}</div>
      )}
    </div>
  )
}

const ar = {
  dropdown: { position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow-md)', zIndex:100, overflow:'hidden', maxHeight:240, overflowY:'auto' },
  option:   { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', background:'none', border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.1s' },
  optAvatar:{ width:28, height:28, borderRadius:6, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0, border:'1px solid rgba(30,58,95,0.12)' },
}

// ─── Modal de cadastro ────────────────────────────────────────────────────────
const ACCENT = '#6366F1'

function EmpresaDetail({ onClose, onSave, onDelete, item, empresas, tab = 'dados' }) {
  const isNew = !item?.id
  const [form, setForm]             = useState(item || EMPTY_FORM)
  const [cnpjStatus, setCnpjStatus] = useState(null)
  const [cepStatus,  setCepStatus]  = useState(null)
  const { sections, fieldById } = useFormLayout('companies')

  // ── Relacionamentos via hooks reais ──────────────────────────────────────
  const { contacts: allContacts, save: saveContact, remove: removeContact } = useContacts()
  const { opps: allOpps,         save: saveOpp,     remove: removeOpp }     = useOpportunities()
  const { contratos: allContratos, save: saveContrato, remove: removeContrato } = useContracts()
  const { projetos: allProjetos, save: saveProjeto } = useProjects()
  const [franquias] = useLocalState('settings:franquias_v2', [])
  const [canal, setCanal] = useLocalState('empresa:canal:' + item?.id, {
    resp_ar: '', codigo_canal: '', data_credenciamento: '', nivel_parceria: ''
  })

  const contatos  = useMemo(() => allContacts.filter(c  => String(c.empresa_id)  === String(item?.id)), [allContacts,  item?.id])
  const opps      = useMemo(() => allOpps.filter(o      => String(o.empresa_id)  === String(item?.id)), [allOpps,      item?.id])
  const contratos = useMemo(() => allContratos.filter(c => String(c.empresa_id)  === String(item?.id)), [allContratos, item?.id])
  const projetos  = useMemo(() => allProjetos.filter(p  => String(p.company_id)  === String(item?.id)), [allProjetos,  item?.id])

  function set(field, val) { setForm(f => ({ ...f, [field]: val })) }
  function patch(field, val) {
    const next = { ...form, [field]: val }
    setForm(next)
    if (!isNew) onSave({ ...next, id: item.id }, true)
  }

  function checkDuplicateCNPJ(cnpj) {
    const raw = cnpj.replace(/\D/g, '')
    if (raw.length !== 14) return false
    return empresas.some(e => e.id !== item?.id && e.cnpj.replace(/\D/g, '') === raw)
  }

  async function lookupCNPJ() {
    const raw = form.cnpj.replace(/\D/g, '')
    if (raw.length !== 14) return

    // checar duplicata antes de consultar a Receita
    if (checkDuplicateCNPJ(form.cnpj)) {
      const dup = empresas.find(e => e.id !== item?.id && e.cnpj.replace(/\D/g, '') === raw)
      setCnpjStatus({ type:'error', msg: `CNPJ já cadastrado: ${dup.fantasia || dup.razao}` })
      return
    }

    setCnpjStatus({ type:'loading' })
    try {
      const res  = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`)
      if (!res.ok) throw new Error()
      const data = await res.json()

      const situacao   = data.descricao_situacao_cadastral?.toLowerCase() || ''
      const novoStatus = situacao.includes('ativa') ? 'ativo' : situacao.includes('baixada') ? 'inativo' : form.status
      const cnaeCode   = data.cnae_fiscal?.toString() || ''
      const cnaeDesc   = data.cnae_fiscal_descricao  || ''
      const segAuto    = cnaeToSegmento(cnaeCode) || form.segmento
      const tel        = data.ddd_telefone_1 ? fmtPhone(data.ddd_telefone_1.replace(/\D/g,'')) : form.telefone

      setForm(f => ({
        ...f,
        razao:          data.razao_social        || f.razao,
        fantasia:       data.nome_fantasia        || f.fantasia,
        cep:            fmtCEP(data.cep?.replace(/\D/g,'') || '') || f.cep,
        logradouro:     data.logradouro           || f.logradouro,
        bairro:         data.bairro               || f.bairro,
        cidade:         data.municipio            || f.cidade,
        uf:             data.uf                   || f.uf,
        numero:         data.numero               || f.numero,
        complemento:    data.complemento          || f.complemento,
        email:          data.email?.toLowerCase() || f.email,
        telefone:       tel,
        segmento:       segAuto,
        status:         novoStatus,
        cnae_codigo:    cnaeCode ? fmtCNAE(cnaeCode) : f.cnae_codigo,
        cnae_descricao: cnaeDesc || f.cnae_descricao,
      }))
      setCnpjStatus({ type:'success' })
    } catch {
      setCnpjStatus({ type:'error', msg:'CNPJ não encontrado na Receita Federal' })
    }
  }

  async function lookupCEP() {
    const raw = form.cep.replace(/\D/g, '')
    if (raw.length !== 8) return
    setCepStatus({ type:'loading' })
    try {
      const res  = await fetch(`https://brasilapi.com.br/api/cep/v1/${raw}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setForm(f => ({ ...f, logradouro: data.street || f.logradouro, bairro: data.neighborhood || f.bairro, cidade: data.city || f.cidade, uf: data.state || f.uf }))
      setCepStatus({ type:'success' })
    } catch {
      setCepStatus({ type:'error', msg:'CEP não encontrado' })
    }
  }

  const inpStyle = { padding:'9px 12px', border:'1px solid var(--border)', borderRadius:8,
    background:'var(--surface)', color:'var(--text)', fontSize:13,
    fontFamily:'var(--font)', outline:'none', width:'100%', boxSizing:'border-box' }

  const lbl = { fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em',
    color:'var(--text-muted)', display:'block', marginBottom:5 }

  const tipoOptions   = TIPOS.map(t => ({ value: t.value, label: t.label }))
  const segOptions    = [{ value:'', label:'Selecionar…' }, ...SEGMENTOS.map(s => ({ value:s, label:s }))]
  const statusOptions = [{ value:'ativo', label:'Ativo' }, { value:'negociacao', label:'Em Negociação' }, { value:'inativo', label:'Inativo' }]
  const origemOptions = [{ value:'', label:'—' }, ...ORIGENS.map(o => ({ value:o, label:o }))]
  const nivelOptions  = [{ value:'', label:'Selecionar…' }, ...['Platinum','Ouro','Prata','Bronze'].map(n => ({ value:n, label:n }))]

  // ── renderField: mapeamento campo → input (sem label, DynamicFormLayout adiciona) ──
  function renderField(key) {
    switch (key) {
      case 'razao':
        return <input style={{ ...inpStyle, fontSize:15, fontWeight:700 }} value={form.razao}
          onChange={e => setForm(f => ({ ...f, razao: e.target.value }))}
          onBlur={e => patch('razao', e.target.value)} placeholder="Razão Social da empresa…" />
      case 'fantasia':
        return <input style={inpStyle} value={form.fantasia || ''}
          onChange={e => setForm(f => ({ ...f, fantasia: e.target.value }))}
          onBlur={e => patch('fantasia', e.target.value)} placeholder="Nome fantasia (se diferente)" />
      case 'cnpj':
        return (
          <>
            <div style={{ position:'relative' }}>
              <input style={{ ...inpStyle, paddingRight:90,
                ...(cnpjStatus?.type === 'error' ? { border:'1px solid var(--red)', background:'rgba(220,38,38,0.05)' } : {}) }}
                value={form.cnpj}
                onChange={e => { set('cnpj', fmtCNPJ(e.target.value)); setCnpjStatus(null) }}
                onBlur={lookupCNPJ}
                placeholder="00.000.000/0001-00" />
              <button type="button" onClick={lookupCNPJ}
                style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)',
                  padding:'4px 10px', background:'var(--surface2)', border:'1px solid var(--border)',
                  borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'var(--font)', color:'var(--text-soft)' }}>
                {cnpjStatus?.type === 'loading' ? '…' : '🔍 Buscar'}
              </button>
            </div>
            <LookupStatus state={cnpjStatus} />
          </>
        )
      case 'inscricao_estadual':
        return <input style={inpStyle} value={form.inscricao_estadual || ''}
          onChange={e => setForm(f => ({ ...f, inscricao_estadual: e.target.value }))}
          onBlur={e => patch('inscricao_estadual', e.target.value)} placeholder="Inscrição Estadual" />
      case 'tipo':
        return <select style={inpStyle} value={form.tipo} onChange={e => patch('tipo', e.target.value)}>
          {tipoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      case 'status':
        return <select style={inpStyle} value={form.status} onChange={e => patch('status', e.target.value)}>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      case 'segmento':
        return <select style={inpStyle} value={form.segmento || ''} onChange={e => patch('segmento', e.target.value)}>
          {segOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      case 'cnae_codigo':
        return <input style={{ ...inpStyle, fontFamily:'var(--mono)' }} value={form.cnae_codigo || ''}
          onChange={e => setForm(f => ({ ...f, cnae_codigo: e.target.value }))}
          onBlur={e => patch('cnae_codigo', e.target.value)} placeholder="0000-0/00" />
      case 'email':
        return <input style={inpStyle} type="email" value={form.email || ''}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          onBlur={e => patch('email', e.target.value)} placeholder="contato@empresa.com" />
      case 'telefone':
        return <input style={inpStyle} value={form.telefone || ''}
          onChange={e => setForm(f => ({ ...f, telefone: fmtPhone(e.target.value) }))}
          onBlur={e => patch('telefone', e.target.value)} placeholder="(00) 00000-0000" />
      case 'site':
        return <input style={inpStyle} value={form.site || ''}
          onChange={e => setForm(f => ({ ...f, site: e.target.value }))}
          onBlur={e => patch('site', e.target.value)} placeholder="https://empresa.com.br" />
      case 'origem':
        return <select style={inpStyle} value={form.origem || ''} onChange={e => patch('origem', e.target.value)}>
          {origemOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      case 'responsavel':
        return <input style={inpStyle} value={form.responsavel || ''}
          onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
          onBlur={e => patch('responsavel', e.target.value)} placeholder="Nome do responsável" />
      case 'cep':
        return (
          <>
            <div style={{ position:'relative' }}>
              <input style={{ ...inpStyle, paddingRight:46 }}
                value={form.cep}
                onChange={e => { set('cep', fmtCEP(e.target.value)); setCepStatus(null) }}
                onBlur={lookupCEP} placeholder="00000-000" />
              <button type="button" onClick={lookupCEP}
                style={{ position:'absolute', right:5, top:'50%', transform:'translateY(-50%)',
                  padding:'3px 8px', background:'none', border:'1px solid var(--border)',
                  borderRadius:5, fontSize:11, cursor:'pointer', fontFamily:'var(--font)', color:'var(--text-soft)' }}>
                {cepStatus?.type === 'loading' ? '…' : '↗'}
              </button>
            </div>
            <LookupStatus state={cepStatus} />
          </>
        )
      case 'logradouro':
        return <input style={inpStyle} value={form.logradouro || ''}
          onChange={e => setForm(f => ({ ...f, logradouro: e.target.value }))}
          onBlur={e => patch('logradouro', e.target.value)} placeholder="Logradouro" />
      case 'numero':
        return <input style={inpStyle} value={form.numero || ''}
          onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
          onBlur={e => patch('numero', e.target.value)} placeholder="Nº" />
      case 'complemento':
        return <input style={inpStyle} value={form.complemento || ''}
          onChange={e => setForm(f => ({ ...f, complemento: e.target.value }))}
          onBlur={e => patch('complemento', e.target.value)} placeholder="Apto, bloco, sala…" />
      case 'bairro':
        return <input style={inpStyle} value={form.bairro || ''}
          onChange={e => setForm(f => ({ ...f, bairro: e.target.value }))}
          onBlur={e => patch('bairro', e.target.value)} placeholder="Bairro" />
      case 'cidade':
        return <input style={inpStyle} value={form.cidade || ''}
          onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
          onBlur={e => patch('cidade', e.target.value)} placeholder="Cidade" />
      case 'uf':
        return <input style={{ ...inpStyle, fontFamily:'var(--mono)', textTransform:'uppercase' }}
          value={form.uf || ''} maxLength={2}
          onChange={e => setForm(f => ({ ...f, uf: e.target.value.slice(0,2) }))}
          onBlur={e => patch('uf', e.target.value)} placeholder="UF" />
      case 'observacoes':
        return <InlineTextarea value={form.observacoes || ''} onChange={v => patch('observacoes', v)}
          placeholder="Observações internas, contexto comercial, histórico…" minRows={4} />
      default: {
        // Campo customizado — renderiza input genérico conectado ao form
        if (!key) return null
        const val = form[key] ?? ''
        const fieldDef = fieldById[Object.keys(fieldById).find(id => fieldById[id].field_key === key)]
        const ft = fieldDef?.field_type || 'text'
        const opts = fieldDef?.options || []
        if (ft === 'textarea')
          return <InlineTextarea value={String(val)} onChange={v => patch(key, v)} minRows={3}
            placeholder={fieldDef?.label || '—'} />
        if (ft === 'boolean')
          return (
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer',
              padding:'8px 12px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)' }}>
              <input type="checkbox" checked={!!val} onChange={e => patch(key, e.target.checked)}
                style={{ width:15, height:15, accentColor:'var(--accent)', cursor:'pointer' }} />
              <span style={{ fontSize:13, color:'var(--text)' }}>{fieldDef?.label || key}</span>
            </label>
          )
        if (ft === 'date')
          return <input style={inpStyle} type="date" value={val}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            onBlur={e => patch(key, e.target.value)} />
        if (ft === 'number')
          return <input style={inpStyle} type="number" value={val}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            onBlur={e => patch(key, e.target.value)} />
        if (ft === 'select' && opts.length)
          return (
            <select style={inpStyle} value={val} onChange={e => patch(key, e.target.value)}>
              <option value="">— Selecione —</option>
              {opts.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          )
        return <input style={inpStyle} type="text" value={val}
          placeholder={fieldDef?.label || '—'}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          onBlur={e => patch(key, e.target.value)} />
      }
    }
  }

  // ── Conteúdo das abas ───────────────────────────────────────────────────

  function TabDados() {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <DynamicFormLayout
          sections={sections}
          fieldById={fieldById}
          renderField={renderField}
          sectionStyle={{ background:'var(--surface)', borderRadius:12, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', border:'1px solid var(--border2)' }}
          labelStyle={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', display:'block', marginBottom:5 }}
        />
        {isNew && (
          <Button onClick={() => {
            if (!form.razao.trim()) return alert('Razão social é obrigatória')
            const isDraft = form.tipo === 'rascunho'
            const cnpjRaw = (form.cnpj || '').replace(/\D/g, '')
            if (!isDraft && !cnpjRaw) return alert('CNPJ é obrigatório para este tipo de empresa')
            onSave(form)
          }}
            style={{ alignSelf:'flex-start' }}>
            Cadastrar empresa
          </Button>
        )}
      </div>
    )
  }

  function TabContatos() {
    const [novoContato, setNovoContato] = useState({ nome:'', cargo:'', email:'', telefone:'' })
    const [adicionando, setAdicionando] = useState(false)

    async function salvarContato() {
      if (!novoContato.nome.trim()) return
      await saveContact({ ...novoContato, empresa_id: item?.id })
      setNovoContato({ nome:'', cargo:'', email:'', telefone:'' })
      setAdicionando(false)
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 20px', borderBottom: contatos.length > 0 || adicionando ? '1px solid var(--border2)' : 'none' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>
              {contatos.length} contato{contatos.length !== 1 ? 's' : ''}
            </span>
            <Button size="sm" onClick={() => setAdicionando(true)}>+ Adicionar contato</Button>
          </div>

          {adicionando && (
            <div style={{ padding:'16px 20px', background:'var(--surface2)', borderBottom:'1px solid var(--border2)',
              display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={lbl}>Nome</label>
                  <input style={inpStyle} value={novoContato.nome}
                    onChange={e => setNovoContato(p => ({ ...p, nome:e.target.value }))}
                    placeholder="Nome completo" />
                </div>
                <div>
                  <label style={lbl}>Cargo</label>
                  <input style={inpStyle} value={novoContato.cargo}
                    onChange={e => setNovoContato(p => ({ ...p, cargo:e.target.value }))}
                    placeholder="Ex: Diretor Comercial" />
                </div>
                <div>
                  <label style={lbl}>E-mail</label>
                  <input style={inpStyle} value={novoContato.email}
                    onChange={e => setNovoContato(p => ({ ...p, email:e.target.value }))}
                    placeholder="email@empresa.com" />
                </div>
                <div>
                  <label style={lbl}>Telefone</label>
                  <input style={inpStyle} value={novoContato.telefone}
                    onChange={e => setNovoContato(p => ({ ...p, telefone:fmtPhone(e.target.value) }))}
                    placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
                <Button variant="secondary" size="sm" onClick={() => setAdicionando(false)}>Cancelar</Button>
                <Button size="sm" onClick={salvarContato}>Salvar</Button>
              </div>
            </div>
          )}

          {contatos.map((c, i) => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px',
              borderBottom: i < contatos.length - 1 ? '1px solid var(--border2)' : 'none',
              transition:'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div style={{ width:34, height:34, borderRadius:8, background:'var(--accent-glow)', color:ACCENT,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700,
                fontFamily:'var(--mono)', flexShrink:0 }}>
                {(c.nome || '?').slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{c.nome}</div>
                {c.cargo && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{c.cargo}</div>}
              </div>
              <div style={{ display:'flex', gap:16, flexShrink:0 }}>
                {c.email && <span style={{ fontSize:12, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>{c.email}</span>}
                {c.telefone && <span style={{ fontSize:12, color:'var(--text-soft)', fontFamily:'var(--mono)' }}>{c.telefone}</span>}
              </div>
              <button onClick={() => removeContact(c.id)}
                style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer',
                  fontSize:13, padding:'2px 6px', borderRadius:4, lineHeight:1 }}
                title="Remover contato">✕</button>
            </div>
          ))}

          {contatos.length === 0 && !adicionando && (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              Nenhum contato vinculado a esta empresa
            </div>
          )}
        </div>
      </div>
    )
  }

  function TabOportunidades() {
    const totalValor = opps.reduce((s, o) => s + (Number(o.valor) || 0), 0)
    const [adicionando, setAdicionando] = useState(false)
    const [novaOpp, setNovaOpp] = useState({ titulo:'', situacao:'em_andamento', valor:'', data:'' })

    async function salvarOpp() {
      if (!novaOpp.titulo.trim()) return
      await saveOpp({
        titulo: novaOpp.titulo, situacao: novaOpp.situacao,
        valor: Number(novaOpp.valor) || 0, prazo: novaOpp.data || null,
        empresa_id: item?.id, empresa_nome: form.fantasia || form.razao || '',
      })
      setNovaOpp({ titulo:'', situacao:'em_andamento', valor:'', data:'' })
      setAdicionando(false)
    }

    const SIT = { em_andamento:{ label:'Em andamento', bg:'#FFFBEB', text:'#92400E' }, ganha:{ label:'Ganha', bg:'var(--green-bg)', text:'var(--green-text)' }, perdida:{ label:'Perdida', bg:'#FEF2F2', text:'#991B1B' } }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {opps.length > 0 && (
          <div style={{ display:'flex', gap:16, padding:'12px 20px', background:'var(--surface)',
            borderRadius:12, border:'1px solid var(--border2)', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Total</span>
              <span style={{ fontSize:20, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{opps.length}</span>
            </div>
            <div style={{ width:1, background:'var(--border2)' }} />
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Valor total</span>
              <span style={{ fontSize:20, fontWeight:700, color:ACCENT, fontFamily:'var(--mono)' }}>
                R$ {totalValor.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 20px', borderBottom: opps.length > 0 || adicionando ? '1px solid var(--border2)' : 'none' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>
              {opps.length} oportunidade{opps.length !== 1 ? 's' : ''}
            </span>
            <Button size="sm" onClick={() => setAdicionando(true)}>+ Nova oportunidade</Button>
          </div>

          {adicionando && (
            <div style={{ padding:'16px 20px', background:'var(--surface2)', borderBottom:'1px solid var(--border2)',
              display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={lbl}>Título</label>
                  <input style={inpStyle} value={novaOpp.titulo}
                    onChange={e => setNovaOpp(p => ({ ...p, titulo:e.target.value }))}
                    placeholder="Ex: Renovação contrato 2025" />
                </div>
                <div>
                  <label style={lbl}>Situação</label>
                  <select style={inpStyle} value={novaOpp.situacao}
                    onChange={e => setNovaOpp(p => ({ ...p, situacao:e.target.value }))}>
                    <option value="em_andamento">Em andamento</option>
                    <option value="ganha">Ganha</option>
                    <option value="perdida">Perdida</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Valor (R$)</label>
                  <input style={inpStyle} type="number" min="0" value={novaOpp.valor}
                    onChange={e => setNovaOpp(p => ({ ...p, valor:e.target.value }))}
                    placeholder="0" />
                </div>
                <div>
                  <label style={lbl}>Prazo</label>
                  <input style={inpStyle} type="date" value={novaOpp.data}
                    onChange={e => setNovaOpp(p => ({ ...p, data:e.target.value }))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
                <Button variant="secondary" size="sm" onClick={() => setAdicionando(false)}>Cancelar</Button>
                <Button size="sm" onClick={salvarOpp}>Salvar</Button>
              </div>
            </div>
          )}

          {opps.map((o, i) => {
            const sit = SIT[o.situacao] || SIT.em_andamento
            return (
              <div key={o.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px',
                borderBottom: i < opps.length - 1 ? '1px solid var(--border2)' : 'none',
                transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{o.titulo}</div>
                  {o.prazo && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, fontFamily:'var(--mono)' }}>Prazo: {o.prazo}</div>}
                </div>
                <span style={{ padding:'2px 9px', borderRadius:20, background:sit.bg, color:sit.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                  {sit.label}
                </span>
                {o.valor > 0 && (
                  <span style={{ fontSize:13, fontWeight:700, color:ACCENT, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                    R$ {Number(o.valor).toLocaleString('pt-BR')}
                  </span>
                )}
                <button onClick={() => removeOpp(o.id)}
                  style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer',
                    fontSize:13, padding:'2px 6px', borderRadius:4, lineHeight:1 }}
                  title="Remover">✕</button>
              </div>
            )
          })}

          {opps.length === 0 && !adicionando && (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              Nenhuma oportunidade vinculada a esta empresa
            </div>
          )}
        </div>
      </div>
    )
  }

  function TabContratos() {
    const [adicionando, setAdicionando] = useState(false)
    const [novoContrato, setNovoContrato] = useState({ numero:'', tipo:'', status:'ativo', valor:'', validade:'' })

    async function salvarContrato() {
      if (!novoContrato.numero.trim()) return
      await saveContrato({
        numero: novoContrato.numero, status: novoContrato.status,
        valor_mrr: Number(novoContrato.valor) || 0,
        vigencia_fim: novoContrato.validade || null,
        empresa_id: item?.id, empresa_nome: form.fantasia || form.razao || '',
        produto_mrr_nome: novoContrato.tipo,
      })
      setNovoContrato({ numero:'', tipo:'', status:'ativo', valor:'', validade:'' })
      setAdicionando(false)
    }

    const STATUS_CONTRATO = {
      ativo:    { label:'Ativo',      bg:'var(--green-bg)',  text:'var(--green-text)' },
      encerrado:{ label:'Encerrado',  bg:'var(--surface3)',  text:'var(--text-muted)' },
      renovacao:{ label:'Renovação',  bg:'#FFFBEB',          text:'#92400E' },
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 20px', borderBottom: contratos.length > 0 || adicionando ? '1px solid var(--border2)' : 'none' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>
              {contratos.length} contrato{contratos.length !== 1 ? 's' : ''}
            </span>
            <Button size="sm" onClick={() => setAdicionando(true)}>+ Novo contrato</Button>
          </div>

          {adicionando && (
            <div style={{ padding:'16px 20px', background:'var(--surface2)', borderBottom:'1px solid var(--border2)',
              display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={lbl}>Número</label>
                  <input style={inpStyle} value={novoContrato.numero}
                    onChange={e => setNovoContrato(p => ({ ...p, numero:e.target.value }))}
                    placeholder="Ex: CT-2025-001" />
                </div>
                <div>
                  <label style={lbl}>Tipo / Produto</label>
                  <input style={inpStyle} value={novoContrato.tipo}
                    onChange={e => setNovoContrato(p => ({ ...p, tipo:e.target.value }))}
                    placeholder="Ex: Licença, Serviço…" />
                </div>
                <div>
                  <label style={lbl}>Status</label>
                  <select style={inpStyle} value={novoContrato.status}
                    onChange={e => setNovoContrato(p => ({ ...p, status:e.target.value }))}>
                    <option value="ativo">Ativo</option>
                    <option value="encerrado">Encerrado</option>
                    <option value="renovacao">Em Renovação</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Valor MRR (R$)</label>
                  <input style={inpStyle} type="number" min="0" value={novoContrato.valor}
                    onChange={e => setNovoContrato(p => ({ ...p, valor:e.target.value }))}
                    placeholder="0" />
                </div>
                <div>
                  <label style={lbl}>Validade</label>
                  <input style={inpStyle} type="date" value={novoContrato.validade}
                    onChange={e => setNovoContrato(p => ({ ...p, validade:e.target.value }))} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
                <Button variant="secondary" size="sm" onClick={() => setAdicionando(false)}>Cancelar</Button>
                <Button size="sm" onClick={salvarContrato}>Salvar</Button>
              </div>
            </div>
          )}

          {contratos.map((c, i) => {
            const sc = STATUS_CONTRATO[c.status] || STATUS_CONTRATO.ativo
            const valor = c.valor_mrr || c.valor || 0
            return (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px',
                borderBottom: i < contratos.length - 1 ? '1px solid var(--border2)' : 'none',
                transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{c.numero}</span>
                    {c.produto_mrr_nome && <span style={{ fontSize:11, color:'var(--text-muted)' }}>{c.produto_mrr_nome}</span>}
                  </div>
                  {c.vigencia_fim && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, fontFamily:'var(--mono)' }}>Validade: {c.vigencia_fim}</div>}
                </div>
                <span style={{ padding:'2px 9px', borderRadius:20, background:sc.bg, color:sc.text, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                  {sc.label}
                </span>
                {valor > 0 && (
                  <span style={{ fontSize:13, fontWeight:700, color:ACCENT, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                    R$ {Number(valor).toLocaleString('pt-BR')}
                  </span>
                )}
                <button onClick={() => removeContrato(c.id)}
                  style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer',
                    fontSize:13, padding:'2px 6px', borderRadius:4, lineHeight:1 }}
                  title="Remover">✕</button>
              </div>
            )
          })}

          {contratos.length === 0 && !adicionando && (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              Nenhum contrato vinculado a esta empresa
            </div>
          )}
        </div>
      </div>
    )
  }

  function TabProjetos() {
    const [adicionando, setAdicionando] = useState(false)
    const [novoPrj, setNovoPrj] = useState({ name:'', status:'em_andamento', phase:'iniciacao' })

    const FASES = [
      { value:'iniciacao',   label:'Iniciação'   },
      { value:'diagnostico', label:'Diagnóstico'  },
      { value:'planejamento',label:'Planejamento' },
      { value:'execucao',    label:'Execução'     },
      { value:'validacao',   label:'Validação'    },
      { value:'encerramento',label:'Encerramento' },
    ]
    const STATUS = {
      em_andamento: { label:'Em andamento', bg:'#FFFBEB', text:'#92400E' },
      concluido:    { label:'Concluído',    bg:'#D1FAE5', text:'#065F46' },
      pausado:      { label:'Pausado',      bg:'#F3F4F6', text:'#374151' },
      cancelado:    { label:'Cancelado',    bg:'#FEF2F2', text:'#991B1B' },
    }

    async function salvarProjeto() {
      if (!novoPrj.name.trim()) return
      await saveProjeto({
        name: novoPrj.name.trim(),
        status: novoPrj.status,
        phase: novoPrj.phase,
        current_phase_index: FASES.findIndex(f => f.value === novoPrj.phase) + 1 || 1,
        company_id: item?.id,
        company_nome: form.fantasia || form.razao || '',
        total_hours_estimated: 0,
        total_hours_executed: 0,
      })
      setNovoPrj({ name:'', status:'em_andamento', phase:'iniciacao' })
      setAdicionando(false)
    }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'14px 20px', borderBottom: projetos.length > 0 || adicionando ? '1px solid var(--border2)' : 'none' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>
              {projetos.length} projeto{projetos.length !== 1 ? 's' : ''}
            </span>
            <Button size="sm" onClick={() => setAdicionando(true)}>+ Novo projeto</Button>
          </div>

          {adicionando && (
            <div style={{ padding:'16px 20px', background:'var(--surface2)', borderBottom:'1px solid var(--border2)',
              display:'flex', flexDirection:'column', gap:8 }}>
              <div>
                <label style={lbl}>Nome do projeto</label>
                <input style={inpStyle} value={novoPrj.name} autoFocus
                  onChange={e => setNovoPrj(p => ({ ...p, name:e.target.value }))}
                  placeholder="Ex: Implantação ERP" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={lbl}>Fase MIT</label>
                  <select style={inpStyle} value={novoPrj.phase}
                    onChange={e => setNovoPrj(p => ({ ...p, phase:e.target.value }))}>
                    {FASES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Status</label>
                  <select style={inpStyle} value={novoPrj.status}
                    onChange={e => setNovoPrj(p => ({ ...p, status:e.target.value }))}>
                    {Object.entries(STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
                <Button variant="secondary" size="sm" onClick={() => setAdicionando(false)}>Cancelar</Button>
                <Button size="sm" onClick={salvarProjeto}>Salvar</Button>
              </div>
            </div>
          )}

          {projetos.map((p, i) => {
            const sit = STATUS[p.status] || STATUS.em_andamento
            const fase = FASES.find(f => f.value === p.phase) || FASES[0]
            return (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px',
                borderBottom: i < projetos.length - 1 ? '1px solid var(--border2)' : 'none',
                transition:'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2, fontFamily:'var(--mono)' }}>
                    {fase.label}
                    {p.end_date_estimated ? ` · até ${p.end_date_estimated}` : ''}
                  </div>
                </div>
                <span style={{ padding:'2px 9px', borderRadius:20, background:sit.bg, color:sit.text,
                  fontSize:11, fontWeight:600, fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                  {sit.label}
                </span>
                {(Number(p.total_hours_estimated) > 0) && (
                  <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                    {Number(p.total_hours_executed).toFixed(0)}h/{Number(p.total_hours_estimated)}h
                  </span>
                )}
              </div>
            )
          })}

          {projetos.length === 0 && !adicionando && (
            <div style={{ padding:'32px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              Nenhum projeto vinculado a esta empresa
            </div>
          )}
        </div>
      </div>
    )
  }

  function TabCanal() {
    const franquiaAtual = franquias.find(f => String(f.id) === String(form.franquia_ar_id))

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {/* Franquia vinculada */}
        <div style={{ background:'var(--surface)', borderRadius:12, padding:'20px 24px',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)', border:'1px solid var(--border2)',
          display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', borderBottom:'1px solid var(--border)', paddingBottom:8, marginBottom:4 }}>
            Franquia (AR)
          </div>
          <div>
            <label style={lbl}>Franquia vinculada</label>
            <select style={inpStyle}
              value={form.franquia_ar_id || ''}
              onChange={e => {
                const f = franquias.find(x => String(x.id) === e.target.value)
                patch('franquia_ar_id',   f?.id   || null)
                patch('franquia_ar_nome', f?.nome || '')
              }}>
              <option value="">— Nenhuma —</option>
              {franquias.filter(f => f.situacao !== 'inativo').map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          {franquiaAtual && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
              background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
              <span style={{ width:8, height:8, borderRadius:'50%',
                background: franquiaAtual.situacao === 'ativo' ? 'var(--green)' : '#9CA3AF', flexShrink:0 }} />
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{franquiaAtual.nome}</span>
              <span style={{ fontSize:11, color:'var(--text-muted)', marginLeft:'auto', fontFamily:'var(--mono)' }}>
                ID: {franquiaAtual.id}
              </span>
            </div>
          )}
        </div>

        {/* Dados de canal */}
        <div style={{ background:'var(--surface)', borderRadius:12, padding:'20px 24px',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)', border:'1px solid var(--border2)',
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div style={{ gridColumn:'1 / -1', fontSize:12, fontWeight:700, color:'var(--text)', borderBottom:'1px solid var(--border)', paddingBottom:8, marginBottom:4 }}>
            Dados do Canal
          </div>
          <div>
            <label style={lbl}>Responsável AR</label>
            <input style={inpStyle} value={canal.resp_ar || ''}
              onChange={e => setCanal(p => ({ ...p, resp_ar:e.target.value }))}
              placeholder="Nome do responsável" />
          </div>
          <div>
            <label style={lbl}>Código do Canal</label>
            <input style={{ ...inpStyle, fontFamily:'var(--mono)' }} value={canal.codigo_canal || ''}
              onChange={e => setCanal(p => ({ ...p, codigo_canal:e.target.value }))}
              placeholder="Ex: CH-001" />
          </div>
          <div>
            <label style={lbl}>Data de Credenciamento</label>
            <input style={inpStyle} type="date" value={canal.data_credenciamento || ''}
              onChange={e => setCanal(p => ({ ...p, data_credenciamento:e.target.value }))} />
          </div>
          <div>
            <label style={lbl}>Nível de Parceria</label>
            <select style={inpStyle} value={canal.nivel_parceria || ''}
              onChange={e => setCanal(p => ({ ...p, nivel_parceria:e.target.value }))}>
              {nivelOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', background:'#F8FAFC', minWidth:0 }}>
        <div style={{ display: tab === 'dados'     ? 'contents' : 'none' }}>{TabDados()}</div>
        <div style={{ display: tab === 'contatos'  ? 'contents' : 'none' }}>{TabContatos()}</div>
        <div style={{ display: tab === 'opps'      ? 'contents' : 'none' }}>{TabOportunidades()}</div>
        <div style={{ display: tab === 'contratos' ? 'contents' : 'none' }}>{TabContratos()}</div>
        <div style={{ display: tab === 'projetos'  ? 'contents' : 'none' }}>{TabProjetos()}</div>
        <div style={{ display: tab === 'canal'     ? 'contents' : 'none' }}>{TabCanal()}</div>
      </div>
      {!isNew && (
        <div style={{ padding:'12px 24px', borderTop:'1px solid var(--border2)', background:'var(--surface)', flexShrink:0 }}>
          <DeleteZone label="Excluir cadastro" onDelete={() => { onDelete(item.id); onClose() }} />
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em', fontFamily:'var(--mono)', margin:'16px 0 8px', paddingTop:4 }}>{children}</div>
}
function Field({ label, children, style }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, ...style }}>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Ícone Olho ───────────────────────────────────────────────────────────────

// ─── Dropdown Ações ────────────────────────────────────────────────────────────
function AcoesDropdown({ onImport, onExport, onClose, anchorRef }) {
  const ref = useRef(null)
  useEffect(() => {
    function h(e) {
      if (ref.current && !ref.current.contains(e.target) &&
          anchorRef.current && !anchorRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose, anchorRef])
  const item = { display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 14px',
    background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
    color:'var(--text)', fontFamily:'var(--font)', textAlign:'left', borderRadius:7, transition:'background 0.12s' }
  return (
    <div ref={ref} style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:600,
      width:210, background:'var(--surface)', borderRadius:10,
      border:'1px solid var(--border)', boxShadow:'0 8px 28px rgba(0,0,0,0.13)', padding:6 }}>
      <button style={item}
        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background='none'}
        onClick={onImport}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 11V4M3 7l3-3 3 3M1 2h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Importar dados
      </button>
      <button style={item}
        onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background='none'}
        onClick={onExport}>
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Exportar dados
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Empresas() {
  // ── estado persistido em localStorage ───────────────────────────────────
  const [search, setSearch]             = useLocalState('empresas:search', '')
  const [filterStatus, setFilterStatus] = useLocalState('empresas:filterStatus', '')
  const [filterTipo, setFilterTipo]     = useLocalState('empresas:filterTipo', '')
  const [filterSeg, setFilterSeg]       = useLocalState('empresas:filterSeg', '')
  const [sortBy, setSortBy]             = useLocalState('empresas:sortBy', 'razao')
  // ── dados via Supabase (com fallback mock automático) ────────────────────
  const { companies: empresas, add: addEmpresa, update: updateEmpresa, remove: removeEmpresa, removeMany, bulkSetStatus, importMany } = useCompanies()
  const [modal, setModal]               = useState(null)
  const [soTab, setSoTab]               = useState('dados')
  const [importModal, setImportModal]   = useState(false)
  const [importLogs, setImportLogs]     = useState([])
  const [showLog, setShowLog]           = useState(false)
  const [exportLogs, setExportLogs]     = useState([])
  const [showExportTray, setShowExportTray] = useState(false)
  const exportTrayRef                   = useRef(null)
  const [showMetrics, setShowMetrics]   = useLocalState('empresas:showMetrics', true)
  const [acoesOpen, setAcoesOpen]       = useState(false)
  const acoesRef                        = useRef(null)

  const filtered = useMemo(() => {
    let list = empresas
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(e =>
        (e.razao  || '').toLowerCase().includes(q) ||
        (e.fantasia || '').toLowerCase().includes(q) ||
        (e.cnpj   || '').includes(q) ||
        (e.cidade || '').toLowerCase().includes(q)
      )
    }
    if (filterStatus) list = list.filter(e => e.status   === filterStatus)
    if (filterTipo)   list = list.filter(e => e.tipo     === filterTipo)
    if (filterSeg)    list = list.filter(e => e.segmento === filterSeg)
    return [...list].sort((a, b) => {
      if (sortBy === 'mrr_desc') return b.mrr - a.mrr
      if (sortBy === 'mrr_asc')  return a.mrr - b.mrr
      if (sortBy === 'criado')   return new Date(b.criado) - new Date(a.criado)
      if (sortBy === 'razao_z')  return b.razao?.localeCompare?.(a.razao) ?? 0
      return a.razao?.localeCompare?.(b.razao) ?? 0
    })
  }, [empresas, search, filterStatus, filterTipo, filterSeg, sortBy])


  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const scope = (search || filterStatus || filterTipo || filterSeg) ? 'filtrados' : 'todos'
    const rows  = filtered
    const headers = ['razao','fantasia','cnpj','tipo','segmento','cnae_codigo','cnae_descricao','cep','logradouro','numero','complemento','bairro','cidade','uf','email','telefone','site','origem','responsavel','status','mrr','contratos']
    const fileName = `empresas_${new Date().toISOString().slice(0,10)}.csv`

    // gravar log com status "gerando"
    const logEntry = {
      id: Date.now(),
      fileName,
      date: new Date().toLocaleString('pt-BR'),
      total: rows.length,
      scope,
      status: 'concluido',
      filters: { search, filterStatus, filterTipo, filterSeg, sortBy },
    }

    const csv = [
      headers.join(';'),
      ...rows.map(e => headers.map(h => {
        const v = e[h] ?? ''
        return typeof v === 'string' && v.includes(';') ? `"${v}"` : v
      }).join(';'))
    ].join('\n')
    const bom  = '﻿'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = fileName
    a.click(); URL.revokeObjectURL(url)

    setExportLogs(prev => [logEntry, ...prev])
    setShowExportTray(true)
  }

  function handleDownloadTemplate() {
    const headers = ['razao','fantasia','cnpj','tipo','segmento','cnae_codigo','cnae_descricao','cep','logradouro','numero','complemento','bairro','cidade','uf','email','telefone','site','origem','responsavel','status']
    const example = [
      'Empresa Exemplo Ltda','Exemplo','11.222.333/0001-44','cliente_final','Tecnologia','6201-5/00','Desenvolvimento de programas de computador','01310-100','Av. Paulista','1000','Sala 5','Bela Vista','São Paulo','SP','contato@exemplo.com','(11) 99999-0000','https://exemplo.com','Inbound','João Silva','negociacao',
    ]
    const csv = [headers.join(';'), example.join(';')].join('\n')
    const bom  = '﻿'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'template_empresas.csv'
    a.click(); URL.revokeObjectURL(url)
  }

  function handleSave(form, keepOpen = false) {
    if (modal?.editing) {
      updateEmpresa(modal.editing.id, form)
    } else {
      addEmpresa(form)
    }
    if (!keepOpen) setModal(null)
  }

  function handleDelete(id) {
    removeEmpresa(id)
    setModal(null)
  }

  // Reset soTab ao abrir modal
  useEffect(() => { if (modal) setSoTab('dados') }, [!!modal])

  const totalMRR   = empresas.filter(e => e.status === 'ativo').reduce((s, e) => s + (e.mrr || 0), 0)
  const totalAtivo = empresas.filter(e => e.status === 'ativo').length
  const totalNegoc = empresas.filter(e => e.status === 'negociacao').length

  function handleSaveAndClose() {
    // salva o form atual via EmpresaDetail — não temos ref, então só fecha se edição inline já salvou
    setModal(null)
  }

  const COLUMNS = [
    { key: 'razao',    label: 'Empresa',   render: (e) => {
      const nome = e.fantasia || e.razao
      const sub  = nome && e.fantasia && e.fantasia !== e.razao ? e.razao : (e.cnpj || e.email || null)
      const avatarLetters = nome ? nome.slice(0,2).toUpperCase() : (e.cnpj ? e.cnpj.replace(/\D/g,'').slice(0,2) : '?')
      return (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={p.avatar}>{avatarLetters}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13, color: nome ? 'var(--text)' : 'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:180, fontStyle: nome ? 'normal' : 'italic' }}>
              {nome || 'Sem nome'}
            </div>
            {sub && (
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:180 }}>
                {sub}
              </div>
            )}
          </div>
        </div>
      )
    }},
    { key: 'tipo',     label: 'Tipo',      render: (e) => <TipoBadge tipo={e.tipo} /> },
    { key: 'status',   label: 'Status',    render: (e) => <StatusBadge status={e.status} /> },
    { key: 'segmento', label: 'Segmento' },
    { key: 'cidade',   label: 'Cidade/UF', render: (e) => e.cidade ? `${e.cidade}/${e.uf}` : '—' },
    { key: 'mrr',      label: 'MRR',       render: (e) => e.mrr ? `R$ ${e.mrr.toLocaleString('pt-BR')}` : '—' },
  ]

  const FILTERS = [
    { key: 'tipo',   label: 'Tipo',    options: TIPOS.map(t => ({ value: t.value, label: t.label })) },
    { key: 'status', label: 'Status',  options: [{value:'ativo',label:'Ativo'},{value:'negociacao',label:'Negociação'},{value:'inativo',label:'Inativo'}] },
    { key: 'seg',    label: 'Segmento', options: SEGMENTOS.map(s => ({ value: s, label: s })) },
  ]

  const browseActiveFilters = {
    tipo:   filterTipo   ? [filterTipo]   : [],
    status: filterStatus ? [filterStatus] : [],
    seg:    filterSeg    ? [filterSeg]    : [],
  }

  function handleBrowseFilterChange(newFilters) {
    setFilterTipo(  (newFilters.tipo   || [])[0] || '')
    setFilterStatus((newFilters.status || [])[0] || '')
    setFilterSeg(   (newFilters.seg    || [])[0] || '')
  }

  return (
    <div style={p.page}>
      <div style={p.pageHeader}>
        <div>
          <div style={p.breadcrumb}><span>Clientes</span><span style={p.sep}>›</span><span>Empresas</span></div>
          <h1 style={p.title}>Empresas</h1>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button
            onClick={() => setShowMetrics(v => !v)}
            title={showMetrics ? 'Ocultar métricas' : 'Exibir métricas'}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28,
              borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)',
              color:'var(--text-muted)', cursor:'pointer', flexShrink:0, marginTop:18 }}>
            {showMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <div ref={acoesRef} style={{ position:'relative' }}>
            <button style={{ ...p.ghostBtn, ...(acoesOpen ? { borderColor:'var(--accent)', color:'var(--accent)' } : {}) }}
              onClick={() => setAcoesOpen(v => !v)}>
              Ações <span style={{ fontSize:10 }}>▾</span>
            </button>
            {acoesOpen && (
              <AcoesDropdown
                onImport={() => { setImportModal(true); setAcoesOpen(false) }}
                onExport={() => { handleExport(); setAcoesOpen(false) }}
                onClose={() => setAcoesOpen(false)}
                anchorRef={acoesRef}
              />
            )}
          </div>
          <Button onClick={() => setModal('new')}>+ Nova empresa</Button>
        </div>
      </div>

      {/* ── KPIs collapsíveis ── */}
      <div style={{ display:'grid', gridTemplateRows: showMetrics ? '1fr' : '0fr', transition:'grid-template-rows 0.22s ease', overflow:'hidden' }}>
        <div style={{ minHeight:0, overflow:'hidden' }}>
          <div style={p.kpis}>
            <KpiCard label="Total de empresas" value={empresas.length} />
            <KpiCard label="Clientes ativos"   value={totalAtivo} accent />
            <KpiCard label="Em negociação"     value={totalNegoc} />
            <KpiCard label="MRR total"         value={`R$ ${totalMRR.toLocaleString('pt-BR')}`} mono />
          </div>
        </div>
      </div>

      <BrowseLayout
        data={filtered}
        columns={COLUMNS}
        filters={FILTERS}
        activeFilters={browseActiveFilters}
        search={search}
        onSearchChange={setSearch}
        onFilterChange={handleBrowseFilterChange}
        onRowClick={e => setModal({ editing: e })}
        emptyState={<div style={{ textAlign:'center', color:'var(--text-muted)', padding:'40px 0', fontSize:13 }}>Nenhuma empresa encontrada</div>}
        onNew={() => setModal('new')}
        newLabel="+ Nova empresa"
        storageKey="empresas_browse"
        bulkActions={[
          { label: '→ Ativo',      onClick: (ids) => { bulkSetStatus(ids, 'ativo') } },
          { label: '→ Negociação', onClick: (ids) => { bulkSetStatus(ids, 'negociacao') } },
          { label: '→ Inativo',    onClick: (ids) => { bulkSetStatus(ids, 'inativo') } },
          { label: 'Excluir',      variant: 'danger', onClick: (ids) => { if (window.confirm(`Excluir ${ids.length} empresa(s)?`)) removeMany(ids) } },
        ]}
      />

      <SlideOver
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.editing ? (modal.editing.fantasia || modal.editing.razao || 'Empresa') : 'Nova empresa'}
        subtitle={modal?.editing ? 'Editando empresa' : 'Novo cadastro'}
        initialSize="default"
        defaultWidth={720}
        tabs={modal?.editing ? [
          { key: 'dados',      label: 'Dados' },
          { key: 'contatos',   label: 'Contatos' },
          { key: 'opps',       label: 'Oportunidades' },
          { key: 'contratos',  label: 'Contratos' },
          { key: 'projetos',   label: 'Projetos' },
          { key: 'canal',      label: 'Canal' },
        ] : undefined}
        activeTab={soTab}
        onTabChange={setSoTab}
        showFooter={!!modal?.editing}
        onSave={modal?.editing ? () => setModal(null) : undefined}
        saveLabel="Salvar alterações"
        cancelLabel="Cancelar"
      >
        {modal && (
          <EmpresaDetail
            item={modal === 'new' ? null : (modal?.editing || null)}
            onClose={() => setModal(null)}
            onSave={handleSave}
            onDelete={handleDelete}
            empresas={empresas}
            tab={soTab}
          />
        )}
      </SlideOver>

      {importModal && (
        <ImportModal
          onClose={() => setImportModal(false)}
          onDownloadTemplate={handleDownloadTemplate}
          existingEmpresas={empresas}
          onImport={(rows, log) => {
            importMany(rows)
            setImportLogs(prev => [log, ...prev])
            setImportModal(false)
          }}
        />
      )}

      {showLog && (
        <ImportLogModal logs={importLogs} onClose={() => setShowLog(false)} />
      )}
    </div>
  )
}

// ─── Export Tray ─────────────────────────────────────────────────────────────
const SCOPE_LABEL = { todos:'Todos os registros', filtrados:'Registros filtrados', selecionados:'Selecionados' }
const STATUS_ICON = { concluido:'✓', erro:'✕', gerando:'⟳' }
const STATUS_COLOR= { concluido:'var(--green-text)', erro:'var(--red)', gerando:'var(--text-muted)' }

function ExportTray({ logs, onClose, onClear }) {
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} style={et.tray}>
      <div style={et.trayHeader}>
        <span style={et.trayTitle}>Histórico de exportações</span>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {logs.length > 0 && (
            <button style={et.clearBtn} onClick={onClear}>Limpar</button>
          )}
          <button style={et.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div style={et.empty}>
          <span style={{ fontSize:24 }}>📭</span>
          <span style={{ fontSize:13, color:'var(--text-muted)' }}>Nenhuma exportação ainda</span>
        </div>
      ) : (
        <div style={et.list}>
          {logs.map(log => (
            <div key={log.id} style={et.item}>
              <div style={et.itemIconWrap}>
                <span style={{ fontSize:14, color: STATUS_COLOR[log.status] }}>
                  {STATUS_ICON[log.status]}
                </span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={et.itemFile}>{log.fileName}</div>
                <div style={et.itemMeta}>
                  <span style={et.metaTag}>{SCOPE_LABEL[log.scope] || log.scope}</span>
                  <span style={et.metaDot}>·</span>
                  <span style={et.metaVal}>{log.total} registro{log.total !== 1 ? 's' : ''}</span>
                  <span style={et.metaDot}>·</span>
                  <span style={{ ...et.metaVal, color: STATUS_COLOR[log.status], fontWeight:600 }}>
                    {log.status === 'concluido' ? 'Concluído' : log.status === 'gerando' ? 'Gerando…' : 'Erro'}
                  </span>
                </div>
                {log.filters && (log.filters.search || log.filters.filterStatus || log.filters.filterTipo || log.filters.filterSeg) && (
                  <div style={et.filterRow}>
                    {log.filters.search && <span style={et.filterTag}>busca: "{log.filters.search}"</span>}
                    {log.filters.filterStatus && <span style={et.filterTag}>status: {log.filters.filterStatus}</span>}
                    {log.filters.filterTipo && <span style={et.filterTag}>tipo: {log.filters.filterTipo}</span>}
                    {log.filters.filterSeg && <span style={et.filterTag}>seg: {log.filters.filterSeg}</span>}
                  </div>
                )}
                <div style={et.itemDate}>{log.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={et.trayFooter}>
        <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
          {logs.length} exportação{logs.length !== 1 ? 'ões' : ''} · sessão atual
        </span>
      </div>
    </div>
  )
}

const et = {
  tray:       { position:'absolute', top:'calc(100% + 8px)', right:0, width:360, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', zIndex:200, overflow:'hidden' },
  trayHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' },
  trayTitle:  { fontSize:13, fontWeight:700, color:'var(--text)' },
  clearBtn:   { fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' },
  closeBtn:   { fontSize:13, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' },
  empty:      { display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'32px 0' },
  list:       { maxHeight:340, overflowY:'auto' },
  item:       { display:'flex', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border2)' },
  itemIconWrap:{ width:28, height:28, borderRadius:7, background:'var(--surface2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 },
  itemFile:   { fontSize:12, fontWeight:600, color:'var(--text)', fontFamily:'var(--mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  itemMeta:   { display:'flex', alignItems:'center', gap:5, marginTop:2, flexWrap:'wrap' },
  metaTag:    { fontSize:10, fontFamily:'var(--mono)', color:'var(--text-muted)' },
  metaDot:    { fontSize:10, color:'var(--border)', fontFamily:'var(--mono)' },
  metaVal:    { fontSize:10, fontFamily:'var(--mono)', color:'var(--text-soft)' },
  filterRow:  { display:'flex', gap:4, marginTop:4, flexWrap:'wrap' },
  filterTag:  { fontSize:10, padding:'1px 6px', background:'var(--accent-glow)', color:'var(--accent)', borderRadius:3, fontFamily:'var(--mono)', border:'1px solid rgba(30,58,95,0.12)' },
  itemDate:   { fontSize:10, color:'var(--text-muted)', marginTop:3, fontFamily:'var(--mono)' },
  trayFooter: { padding:'8px 14px', borderTop:'1px solid var(--border2)', background:'var(--surface2)' },
}

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  if (lines.length < 2) return { headers: [], rows: [] }
  const sep = lines[0].includes(';') ? ';' : ','
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map(line => {
    const cells = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === sep && !inQ) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']))
  })
  return { headers, rows }
}

const IMPORT_COLS = ['razao','fantasia','cnpj','tipo','segmento','cnae_codigo','cnae_descricao','cep','logradouro','numero','complemento','bairro','cidade','uf','email','telefone','site','origem','responsavel','status']
const TIPOS_VALUES = TIPOS.map(t => t.value)

function validateImportRow(row, idx, existingEmpresas, imported) {
  const errors = []
  if (!row.razao?.trim()) errors.push('Razão Social é obrigatória')
  const cnpjRaw = (row.cnpj || '').replace(/\D/g, '')
  const isDraft = row.tipo === 'rascunho'
  if (!isDraft) {
    if (!cnpjRaw) errors.push('CNPJ é obrigatório (use tipo "rascunho" para dispensar)')
    else if (cnpjRaw.length !== 14) errors.push('CNPJ inválido (precisa de 14 dígitos)')
  } else if (cnpjRaw && cnpjRaw.length !== 14) {
    errors.push('CNPJ informado é inválido (precisa de 14 dígitos)')
  }
  else {
    if (existingEmpresas.some(e => e.cnpj.replace(/\D/g,'') === cnpjRaw))
      errors.push(`CNPJ já cadastrado: ${existingEmpresas.find(e => e.cnpj.replace(/\D/g,'') === cnpjRaw).fantasia || existingEmpresas.find(e => e.cnpj.replace(/\D/g,'') === cnpjRaw).razao}`)
    if (imported.some(r => r.cnpj.replace(/\D/g,'') === cnpjRaw))
      errors.push('CNPJ duplicado no arquivo')
  }
  if (row.tipo && !TIPOS_VALUES.includes(row.tipo))
    errors.push(`Tipo inválido: "${row.tipo}". Use: ${TIPOS_VALUES.join(', ')}`)
  if (row.status && !['ativo','negociacao','inativo'].includes(row.status))
    errors.push(`Status inválido: "${row.status}". Use: ativo, negociacao, inativo`)
  return errors
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onDownloadTemplate, existingEmpresas, onImport }) {
  const [step, setStep]         = useState('upload') // 'upload' | 'preview' | 'done'
  const [parsed, setParsed]     = useState(null)     // { headers, rows, validated }
  const [dragging, setDragging] = useState(false)
  const fileRef                 = useRef(null)

  function processFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { headers, rows } = parseCSV(e.target.result)
      const validatedRows = []
      const rowResults = rows.map((row, i) => {
        const errors = validateImportRow(row, i, existingEmpresas, validatedRows)
        const ok = errors.length === 0
        if (ok) validatedRows.push({ ...row, cnpj: fmtCNPJ(row.cnpj || '') })
        return { row, errors, ok, line: i + 2 }
      })
      setParsed({ fileName: file.name, fileSize: file.size, headers, rowResults })
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  function handleConfirmImport() {
    const okRows = parsed.rowResults.filter(r => r.ok).map(r => ({
      ...EMPTY_FORM, ...r.row,
      cnpj: fmtCNPJ(r.row.cnpj || ''),
      id: Date.now() + Math.random(),
      mrr: 0, contratos: 0, contatos: 0,
      criado: new Date().toISOString().slice(0,10),
      tipo: r.row.tipo || 'cliente_final',
      status: r.row.status || 'negociacao',
    }))
    const log = {
      id: Date.now(),
      fileName: parsed.fileName,
      date: new Date().toLocaleString('pt-BR'),
      total: parsed.rowResults.length,
      imported: okRows.length,
      errors: parsed.rowResults.filter(r => !r.ok).length,
      rows: parsed.rowResults,
    }
    onImport(okRows, log)
  }

  const okCount  = parsed?.rowResults.filter(r => r.ok).length ?? 0
  const errCount = parsed?.rowResults.filter(r => !r.ok).length ?? 0

  return (
    <div style={m.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth:700 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Importar empresas</div>
            <div style={m.subtitle}>Arquivo CSV com separador ponto-e-vírgula (;) — UTF-8</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        {step === 'upload' && (
          <div style={{ padding:'24px' }}>
            {/* Template download */}
            <div style={imp.templateBox}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Template CSV</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  {IMPORT_COLS.length} colunas — inclui linha de exemplo
                </div>
              </div>
              <Button size="sm" onClick={onDownloadTemplate}>↓ Baixar template</Button>
            </div>

            {/* Drop zone */}
            <div
              style={{ ...imp.dropzone, ...(dragging ? imp.dropzoneActive : {}) }}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <span style={{ fontSize:28 }}>📂</span>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text)' }}>
                Arraste o arquivo aqui ou clique para selecionar
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Apenas arquivos .csv</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display:'none' }}
                onChange={e => processFile(e.target.files[0])} />
            </div>

            {/* Columns reference */}
            <div style={imp.colsBox}>
              <div style={imp.colsLabel}>Colunas esperadas</div>
              <div style={imp.colsList}>
                {IMPORT_COLS.map(c => <span key={c} style={imp.colTag}>{c}</span>)}
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && parsed && (
          <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
            {/* Summary */}
            <div style={imp.summary}>
              <div style={imp.summaryItem}>
                <span style={imp.summaryVal}>{parsed.rowResults.length}</span>
                <span style={imp.summaryLbl}>linhas</span>
              </div>
              <div style={{ ...imp.summaryItem, color:'var(--green-text)' }}>
                <span style={{ ...imp.summaryVal, color:'var(--green)' }}>{okCount}</span>
                <span style={imp.summaryLbl}>prontas</span>
              </div>
              <div style={{ ...imp.summaryItem }}>
                <span style={{ ...imp.summaryVal, color: errCount > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{errCount}</span>
                <span style={imp.summaryLbl}>com erro</span>
              </div>
              <div style={{ marginLeft:'auto', fontSize:12, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                {parsed.fileName}
              </div>
            </div>

            {/* Rows preview */}
            <div style={{ overflowY:'auto', flex:1, padding:'0 24px' }}>
              <table style={{ ...p.table, marginBottom:0 }}>
                <thead>
                  <tr>
                    <th style={p.th}>Linha</th>
                    <th style={p.th}>Razão Social</th>
                    <th style={p.th}>CNPJ</th>
                    <th style={p.th}>Tipo</th>
                    <th style={p.th}>Status</th>
                    <th style={p.th}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rowResults.map(({ row, errors, ok, line }) => (
                    <tr key={line} style={{ ...p.tr, background: ok ? undefined : 'rgba(220,38,38,0.03)' }}>
                      <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:11, color:'var(--text-muted)', width:50 }}>{line}</td>
                      <td style={{ ...p.td, fontSize:12 }}>{row.razao || <span style={{ color:'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:11 }}>{fmtCNPJ(row.cnpj || '')}</td>
                      <td style={{ ...p.td, fontSize:11 }}>{row.tipo || '—'}</td>
                      <td style={{ ...p.td, fontSize:11 }}>{row.status || '—'}</td>
                      <td style={p.td}>
                        {ok
                          ? <span style={{ color:'var(--green)', fontSize:11, fontWeight:600 }}>✓ OK</span>
                          : <div>{errors.map((e,i) => <div key={i} style={{ color:'var(--red)', fontSize:11 }}>✕ {e}</div>)}</div>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ ...m.footer, padding:'14px 24px', borderTop:'1px solid var(--border2)' }}>
              <Button variant="secondary" onClick={() => setStep('upload')}>← Voltar</Button>
              <div style={{ flex:1 }} />
              {errCount > 0 && okCount === 0 && (
                <span style={{ fontSize:12, color:'var(--red)' }}>Nenhuma linha válida para importar</span>
              )}
              {errCount > 0 && okCount > 0 && (
                <span style={{ fontSize:12, color:'var(--yellow-text)' }}>
                  {errCount} linha{errCount>1?'s':''} serão ignoradas
                </span>
              )}
              <Button disabled={okCount === 0} onClick={handleConfirmImport}>
                Importar {okCount} empresa{okCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Import Log Modal ─────────────────────────────────────────────────────────
function ImportLogModal({ logs, onClose }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div style={m.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...m.modal, maxWidth:720 }}>
        <div style={m.header}>
          <div>
            <div style={m.title}>Log de importações</div>
            <div style={m.subtitle}>{logs.length} operação{logs.length !== 1 ? 'ões' : ''} registrada{logs.length !== 1 ? 's' : ''}</div>
          </div>
          <button style={m.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'16px 24px', display:'flex', flexDirection:'column', gap:10 }}>
          {logs.map(log => (
            <div key={log.id} style={imp.logEntry}>
              <div style={imp.logHeader} onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flex:1 }}>
                  <span style={{ fontSize:14 }}>📄</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', fontFamily:'var(--mono)' }}>{log.fileName}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>{log.date}</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <span style={imp.logPill}>{log.total} total</span>
                  <span style={{ ...imp.logPill, background:'var(--green-bg)', color:'var(--green-text)' }}>✓ {log.imported}</span>
                  {log.errors > 0 && <span style={{ ...imp.logPill, background:'var(--red-bg)', color:'var(--red-text)' }}>✕ {log.errors}</span>}
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>{expanded === log.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === log.id && (
                <div style={{ borderTop:'1px solid var(--border2)', overflowX:'auto' }}>
                  <table style={{ ...p.table, fontSize:11 }}>
                    <thead>
                      <tr>
                        <th style={p.th}>Linha</th>
                        <th style={p.th}>Razão Social</th>
                        <th style={p.th}>CNPJ</th>
                        <th style={p.th}>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.rows.map(({ row, errors, ok, line }) => (
                        <tr key={line} style={p.tr}>
                          <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:10, color:'var(--text-muted)' }}>{line}</td>
                          <td style={{ ...p.td, fontSize:11 }}>{row.razao || '—'}</td>
                          <td style={{ ...p.td, fontFamily:'var(--mono)', fontSize:10 }}>{fmtCNPJ(row.cnpj || '')}</td>
                          <td style={p.td}>
                            {ok
                              ? <span style={{ color:'var(--green)', fontSize:10, fontWeight:600 }}>✓ Importado</span>
                              : <div>{errors.map((e,i) => <div key={i} style={{ color:'var(--red)', fontSize:10 }}>✕ {e}</div>)}</div>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border2)' }}>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Import styles ────────────────────────────────────────────────────────────
const imp = {
  templateBox:   { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)', marginBottom:16 },
  templateBtn:   { padding:'7px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  dropzone:      { border:'2px dashed var(--border)', borderRadius:10, padding:'40px 24px', textAlign:'center', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginBottom:16, transition:'all 0.15s', background:'var(--surface2)' },
  dropzoneActive:{ borderColor:'var(--accent)', background:'var(--accent-glow)' },
  colsBox:       { background:'var(--surface2)', borderRadius:8, padding:'12px 14px', border:'1px solid var(--border)' },
  colsLabel:     { fontSize:11, fontWeight:600, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 },
  colsList:      { display:'flex', flexWrap:'wrap', gap:5 },
  colTag:        { padding:'2px 8px', background:'var(--surface3)', border:'1px solid var(--border)', borderRadius:4, fontSize:11, fontFamily:'var(--mono)', color:'var(--text-soft)' },
  summary:       { display:'flex', alignItems:'center', gap:20, padding:'12px 24px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' },
  summaryItem:   { display:'flex', flexDirection:'column', alignItems:'center', gap:2 },
  summaryVal:    { fontSize:22, fontWeight:700, fontFamily:'var(--mono)', lineHeight:1 },
  summaryLbl:    { fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' },
  logEntry:      { border:'1px solid var(--border2)', borderRadius:8, overflow:'hidden' },
  logHeader:     { display:'flex', alignItems:'center', gap:12, padding:'12px 14px', cursor:'pointer', background:'var(--surface2)' },
  logPill:       { padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600, fontFamily:'var(--mono)', background:'var(--surface3)', color:'var(--text-muted)' },
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, accent, mono }) {
  return (
    <div style={{ ...p.kpi, ...(accent ? { borderTopColor:'var(--accent)' } : {}) }}>
      <span style={{ ...p.kpiVal, fontFamily: mono ? 'var(--mono)' : 'var(--font)' }}>{value}</span>
      <span style={p.kpiLbl}>{label}</span>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const p = {
  page:       { display:'flex', flexDirection:'column', gap:16, maxWidth:1200 },
  pageHeader: { display:'flex', alignItems:'flex-start', justifyContent:'space-between' },
  breadcrumb: { display:'flex', alignItems:'center', gap:4, fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)', marginBottom:4 },
  sep:        { color:'var(--border)' },
  title:      { margin:0, fontSize:22, fontWeight:700, color:'var(--text)', letterSpacing:'-0.4px' },
  newBtn:     { padding:'8px 16px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  iconBtn:    { width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text-muted)', cursor:'pointer' },
  iconBtnActive: { borderColor:'var(--accent)', color:'var(--accent)', background:'var(--accent-glow)' },
  ghostBtn:   { height:36, padding:'0 14px', fontSize:13, border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text-soft)', fontFamily:'var(--font)', cursor:'pointer', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 },
  kpis:       { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, paddingBottom:4 },
  kpi:        { background:'var(--surface)', borderRadius:10, padding:'16px 18px', display:'flex', flexDirection:'column', gap:4, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', borderTop:'3px solid var(--border)' },
  kpiVal:     { fontSize:26, fontWeight:700, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1 },
  kpiLbl:     { fontSize:12, color:'var(--text-muted)', marginTop:2 },
  toolbar:    { background:'var(--surface)', borderRadius:10, padding:'10px 14px', border:'1px solid var(--border2)', boxShadow:'var(--shadow)', display:'flex', alignItems:'center', gap:8 },
  tbLeft:     { display:'flex', alignItems:'center', gap:8, flex:1, flexShrink:1, minWidth:0 },
  tbDivider:  { width:1, height:24, background:'var(--border)', flexShrink:0 },
  tbRight:    { display:'flex', alignItems:'center', gap:8, flexShrink:0 },
  searchWrap: { position:'relative', flexShrink:0 },
  searchIcon: { position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:15, pointerEvents:'none' },
  searchInput:{ height:36, padding:'0 12px 0 30px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:13, outline:'none', fontFamily:'var(--font)', width:220, boxSizing:'border-box' },
  select:     { height:36, padding:'0 8px', border:'1px solid var(--border)', borderRadius:7, background:'var(--surface2)', color:'var(--text)', fontSize:12, outline:'none', cursor:'pointer', fontFamily:'var(--font)' },
  viewToggle: { display:'flex', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', padding:3, gap:2 },
  viewBtn:    { width:34, height:32, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', borderRadius:6, fontSize:14, transition:'all 0.15s' },
  viewBtnOn:  { background:'var(--accent)', color:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.18)' },
  exportBtn:  { padding:'7px 12px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--mono)', fontWeight:500 },
  resultRow:  { display:'flex', alignItems:'center', gap:12 },
  clearBtn:   { fontSize:12, color:'var(--accent2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textDecoration:'underline' },
  tableWrap:  { background:'var(--surface)', borderRadius:10, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', overflow:'hidden' },
  table:      { width:'100%', borderCollapse:'collapse' },
  th:         { padding:'8px 12px', textAlign:'left', fontSize:10.5, fontWeight:600, color:'var(--text-muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.06em', background:'var(--surface2)', borderBottom:'1px solid var(--border)' },
  tr:         { borderBottom:'1px solid var(--border2)' },
  trSelected: { backgroundColor:'rgba(30,58,95,0.05)' },
  td:         { padding:'9px 12px', fontSize:12.5, verticalAlign:'middle' },
  editBtn:    { padding:'3px 9px', border:'1px solid var(--border)', borderRadius:5, background:'none', color:'var(--text-soft)', fontSize:11.5, cursor:'pointer', fontFamily:'var(--font)' },
  avatar:     { width:32, height:32, borderRadius:8, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0, border:'1px solid rgba(30,58,95,0.10)' },
  cardGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 },
  card:       { background:'var(--surface)', borderRadius:10, padding:16, border:'1px solid var(--border2)', boxShadow:'var(--shadow)', display:'flex', flexDirection:'column', gap:12 },
  cardSelected:{ borderColor:'rgba(30,58,95,0.35)', boxShadow:'0 0 0 2px rgba(30,58,95,0.12)' },
  cardTop:    { display:'flex', alignItems:'flex-start', gap:10 },
  cardAvatar: { width:38, height:38, borderRadius:9, background:'var(--accent-glow)', color:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, fontFamily:'var(--mono)', flexShrink:0, border:'1px solid rgba(30,58,95,0.12)' },
  cardName:   { fontSize:14, fontWeight:600, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' },
  cardSub:    { fontSize:11, color:'var(--text-muted)', marginTop:2 },
  cardMeta:   { display:'flex', gap:16, padding:'10px 0', borderTop:'1px solid var(--border2)', borderBottom:'1px solid var(--border2)' },
  cardFooter: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  cardResp:   { fontSize:12, color:'var(--text-soft)' },

  // export tray trigger
  trayBtn:     { display:'flex', alignItems:'center', gap:6, padding:'7px 12px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', position:'relative' },
  trayBtnActive:{ background:'var(--accent-glow)', borderColor:'rgba(30,58,95,0.2)', color:'var(--accent)' },
  trayBadge:   { position:'absolute', top:-5, right:-5, background:'var(--accent)', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--mono)' },

  // bulk action bar
  bulkBar:     { display:'flex', alignItems:'center', gap:12, padding:'10px 16px', background:'var(--accent)', borderRadius:10, flexWrap:'wrap' },
  bulkCount:   { display:'flex', alignItems:'center', gap:6, color:'#fff', fontSize:13, fontWeight:600, fontFamily:'var(--mono)' },
  bulkDot:     { width:8, height:8, borderRadius:'50%', background:'rgba(255,255,255,0.7)' },
  bulkActions: { display:'flex', alignItems:'center', gap:6, flex:1, flexWrap:'wrap' },
  bulkBtn:     { padding:'4px 10px', border:'1px solid rgba(255,255,255,0.3)', borderRadius:6, background:'rgba(255,255,255,0.12)', color:'#fff', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' },
  bulkClear:   { fontSize:12, color:'rgba(255,255,255,0.6)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', marginLeft:'auto' },
}

const m = {
  overlay:   { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:24 },
  modal:     { background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:680, boxShadow:'0 20px 60px rgba(0,0,0,0.18)', display:'flex', flexDirection:'column', maxHeight:'90vh' },
  header:    { display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid var(--border2)' },
  title:     { fontSize:16, fontWeight:700, color:'var(--text)', margin:0 },
  subtitle:  { fontSize:13, color:'var(--text-muted)', marginTop:3 },
  closeBtn:  { background:'none', border:'none', color:'var(--text-muted)', fontSize:16, cursor:'pointer', padding:4, lineHeight:1 },
  body:      { padding:'4px 24px 16px', overflowY:'auto', flex:1 },
  grid2:     { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  grid3:     { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 },
  input:     { padding:'6px 10px', border:'1px solid var(--border)', borderRadius:6, background:'var(--surface2)', color:'var(--text)', fontSize:12.5, outline:'none', fontFamily:'var(--font)', width:'100%', boxSizing:'border-box' },
  lookupBtn: { position:'absolute', right:4, top:'50%', transform:'translateY(-50%)', padding:'3px 8px', background:'var(--accent-glow)', border:'1px solid rgba(30,58,95,0.15)', borderRadius:5, color:'var(--accent)', fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--mono)', whiteSpace:'nowrap' },
  footer:           { display:'flex', alignItems:'center', gap:10, padding:'14px 24px', borderTop:'1px solid var(--border2)', flexShrink:0 },
  cancelBtn:        { padding:'8px 16px', border:'1px solid var(--border)', borderRadius:7, background:'none', color:'var(--text-soft)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' },
  saveBtn:          { padding:'8px 18px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  deleteBtn:        { padding:'7px 14px', border:'1px solid rgba(220,38,38,0.3)', borderRadius:7, background:'none', color:'var(--red)', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' },
  deleteConfirm:    { display:'flex', alignItems:'center', gap:8 },
  deleteConfirmText:{ fontSize:13, color:'var(--red)', fontWeight:600 },
  deleteConfirmYes: { padding:'6px 12px', background:'var(--red)', color:'#fff', border:'none', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' },
  deleteConfirmNo:  { padding:'6px 12px', border:'1px solid var(--border)', borderRadius:6, background:'none', color:'var(--text-soft)', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' },
}
