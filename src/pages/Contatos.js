import { useState, useMemo, useRef } from 'react'
import { useContacts } from '../hooks/useContacts'
import { useAuditLog } from '../hooks/useAuditLog'
import { useCompanies } from '../hooks/useCompanies'
import { useOpportunities } from '../hooks/useOpportunities'
import { useCampanhas } from '../hooks/useCampanhas'
import { useProducts } from '../hooks/useProducts'
import Button from '../components/Button'
import EmpresaSearch from '../components/EmpresaSearch'
import SlideOver, { FormGrid, FormField, FormSection } from '../components/ui/SlideOver'
import BrowseLayout from '../components/BrowseLayout'
import { InlineTextarea, DeleteZone } from '../components/NotionDrawer'

const ACCENT = 'var(--accent)'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtData(d) {
  if (!d) return '—'
  const [y, m, dd] = d.split('-')
  return `${dd}/${m}/${y.slice(2)}`
}

function initials(nome) {
  const parts = (nome || '').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_PALETTE = [
  { bg:'#EDE9FE', color:'var(--accent)' },
  { bg:'#DBEAFE', color:'#1D4ED8' },
  { bg:'#D1FAE5', color:'#065F46' },
  { bg:'#FEF3C7', color:'#B45309' },
  { bg:'#FCE7F3', color:'#9D174D' },
  { bg:'#FEE2E2', color:'#991B1B' },
]
function avatarColor(nome) {
  let h = 0
  for (let i = 0; i < (nome || '').length; i++) h = (h * 31 + nome.charCodeAt(i)) & 0xffff
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length]
}

// ─── ContatoDetail ─────────────────────────────────────────────────────────────
const EMPTY = { nome:'', email:'', telefone:'', cargo:'', empresa_id:null, empresa_nome:'', notas:'', linkedin_url:'', whatsapp:'',
  status:'lead', em_nutricao:false, departamento:'', senioridade:'', poder_decisao:'' }

const STATUS_CFG = {
  cliente:  { label:'Cliente',  bg:'#D1FAE5', text:'#065F46' },
  lead:     { label:'Lead',     bg:'#FEF3C7', text:'#92400E' },
  prospect: { label:'Prospect', bg:'#DBEAFE', text:'#1E40AF' },
}
const SENIORIDADE_OPTIONS  = [{ value:'', label:'—' }, { value:'junior', label:'Júnior' }, { value:'pleno', label:'Pleno' }, { value:'senior', label:'Sênior' }, { value:'c_level', label:'C-Level / Diretoria' }]
const PODER_DECISAO_OPTIONS = [{ value:'', label:'—' }, { value:'decisor', label:'Decisor' }, { value:'influenciador', label:'Influenciador' }, { value:'usuario', label:'Usuário final' }]

function StatusBadge({ status, em_nutricao }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.lead
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:cfg.bg, color:cfg.text }}>{cfg.label}</span>
      {em_nutricao && <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#EDE9FE', color:'var(--accent)' }}>🌱 Em nutrição</span>}
    </div>
  )
}

const SIT_OPP = {
  em_andamento: { label: 'Em andamento', bg: '#FFFBEB', text: '#92400E' },
  ganha:        { label: 'Ganha',        bg: 'var(--green-bg)', text: 'var(--green-text)' },
  perdida:      { label: 'Perdida',      bg: '#FEF2F2', text: '#991B1B' },
}

function TabOportunidades({ opps = [] }) {
  const totalValor = opps.reduce((s, o) => s + (Number(o.valor) || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {opps.length > 0 && (
        <div style={{ display: 'flex', gap: 16, padding: '12px 20px', background: 'var(--surface)',
          borderRadius: 12, border: '1px solid var(--border2)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{opps.length}</span>
          </div>
          <div style={{ width: 1, background: 'var(--border2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valor total</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: ACCENT, fontFamily: 'var(--mono)' }}>
              R$ {totalValor.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border2)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: opps.length > 0 ? '1px solid var(--border2)' : 'none' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
            {opps.length} oportunidade{opps.length !== 1 ? 's' : ''}
          </span>
        </div>

        {opps.map((o, i) => {
          const sit = SIT_OPP[o.situacao] || SIT_OPP.em_andamento
          return (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
              borderBottom: i < opps.length - 1 ? '1px solid var(--border2)' : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{o.titulo}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  {o.empresa_nome && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.empresa_nome}</span>}
                  {o.origem && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>• {o.origem}</span>}
                  {o.prazo && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>Prazo: {o.prazo}</span>}
                </div>
              </div>
              <span style={{ padding: '2px 9px', borderRadius: 20, background: sit.bg, color: sit.text,
                fontSize: 11, fontWeight: 600, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                {sit.label}
              </span>
              {o.valor > 0 && (
                <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                  R$ {Number(o.valor).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
          )
        })}

        {opps.length === 0 && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhuma oportunidade vinculada a este contato
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Análise de Cliente Ideal (ICP de Contato) ────────────────────────────────
// Cruza Oportunidades GANHAS × itens (Produto/Categoria) × o Contato principal
// vinculado, e agrega o perfil (cargo/departamento/senioridade/poder de
// decisão) mais frequente entre quem já comprou cada Produto/Categoria.
function topN(lista, n = 3) {
  const contagem = {}
  for (const v of lista) { if (!v) continue; contagem[v] = (contagem[v] || 0) + 1 }
  const total = lista.filter(Boolean).length
  return Object.entries(contagem)
    .sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
}

function PerfilCard({ titulo, contatos }) {
  const cargos    = topN(contatos.map(c => c.cargo))
  const deptos     = topN(contatos.map(c => c.departamento))
  const senior     = topN(contatos.map(c => c.senioridade))
  const decisao    = topN(contatos.map(c => c.poder_decisao))
  const bloco = (label, itens) => itens.length > 0 && (
    <div>
      <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:6 }}>{label}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {itens.map(it => (
          <div key={it.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'var(--text)', flex:1 }}>{it.label}</span>
            <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--accent)', fontWeight:700 }}>{it.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
  return (
    <div style={{ background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)',
      boxShadow:'0 1px 3px rgba(0,0,0,0.06)', padding:'16px 18px', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{titulo}</span>
        <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>
          {contatos.length} contato{contatos.length !== 1 ? 's' : ''}
        </span>
      </div>
      {cargos.length === 0 && deptos.length === 0 && senior.length === 0 && decisao.length === 0 ? (
        <div style={{ fontSize:12, color:'var(--text-muted)', fontStyle:'italic' }}>
          Nenhum atributo de perfil preenchido nos contatos ainda.
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:16 }}>
          {bloco('Cargo', cargos)}
          {bloco('Departamento', deptos)}
          {bloco('Senioridade', senior)}
          {bloco('Poder de decisão', decisao)}
        </div>
      )}
    </div>
  )
}

function AnaliseICP({ opps, contatos, produtos }) {
  const { porProduto, porCategoria } = useMemo(() => {
    const produtosById = Object.fromEntries((produtos || []).map(p => [String(p.id), p]))
    const contatosById = Object.fromEntries((contatos || []).map(c => [c.id, c]))
    const ganhas = (opps || []).filter(o => o.situacao === 'ganha')
    const porProduto = {}
    const porCategoria = {}
    for (const o of ganhas) {
      const contato = contatosById[o.primary_contact_id]
      if (!contato) continue
      for (const item of (o.itens || [])) {
        const prod = produtosById[String(item.produto_id)]
        if (!prod) continue
        if (!porProduto[prod.id]) porProduto[prod.id] = { nome: prod.nome, contatos: [] }
        porProduto[prod.id].contatos.push(contato)
        if (prod.categoria) {
          if (!porCategoria[prod.categoria]) porCategoria[prod.categoria] = { nome: prod.categoria, contatos: [] }
          porCategoria[prod.categoria].contatos.push(contato)
        }
      }
    }
    return { porProduto, porCategoria }
  }, [opps, contatos, produtos])

  const gruposProduto   = Object.values(porProduto).sort((a, b) => b.contatos.length - a.contatos.length)
  const gruposCategoria = Object.values(porCategoria).sort((a, b) => b.contatos.length - a.contatos.length)

  if (gruposProduto.length === 0) {
    return (
      <div style={{ padding:'48px 20px', textAlign:'center', color:'var(--text-muted)', fontSize:13,
        background:'var(--surface)', borderRadius:12, border:'1px solid var(--border2)' }}>
        <div style={{ fontSize:28, marginBottom:8 }}>🧭</div>
        Nenhuma oportunidade ganha com produto e contato principal vinculados ainda — a análise aparece assim que houver dados suficientes.
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:10 }}>
          Por Produto
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:12 }}>
          {gruposProduto.map(g => <PerfilCard key={g.nome} titulo={g.nome} contatos={g.contatos} />)}
        </div>
      </div>
      {gruposCategoria.length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-muted)', marginBottom:10 }}>
            Por Categoria de Produto
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:12 }}>
            {gruposCategoria.map(g => <PerfilCard key={g.nome} titulo={g.nome} contatos={g.contatos} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function TabCampanhas({ opps = [], campanhas = [] }) {
  const vinculadas = useMemo(() => {
    const ids = new Set(opps.map(o => o.campanha_id).filter(Boolean))
    return campanhas.filter(c => ids.has(c.id)).map(c => ({
      ...c, opps: opps.filter(o => o.campanha_id === c.id),
    }))
  }, [opps, campanhas])

  if (vinculadas.length === 0) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13,
        background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border2)' }}>
        Nenhuma campanha de incentivo vinculada — via as oportunidades deste contato.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {vinculadas.map(c => (
        <div key={c.id} style={{ background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border2)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{c.nome}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
              {c.opps.length} oportunidade{c.opps.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {c.opps.map(o => (
              <span key={o.id} style={{ fontSize: 11, color: 'var(--text-soft)', padding: '2px 8px', borderRadius: 6, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                {o.titulo}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ContatoDetail({ item, onSave, onDelete, onClose, todos = [], opps = [], campanhas = [], tab = 'dados', saveRef }) {
  const isNew = !item?.id
  const [form, setForm] = useState(item ? { ...EMPTY, ...item } : { ...EMPTY })
  const [errs, setErrs] = useState({})
  const av = avatarColor(form.nome || '?')

  function patch(k, v) {
    const next = { ...form, [k]: v }
    setForm(next)
    if (errs[k]) setErrs(p => ({ ...p, [k]: '' }))
    if (!isNew) onSave({ ...next, id: item.id })
  }

  function handleCreate() {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório'
    if (form.email?.trim()) {
      const emailLow = form.email.trim().toLowerCase()
      const dup = todos.find(c => c.id !== item?.id && c.email?.toLowerCase() === emailLow)
      if (dup) e.email = `E-mail já cadastrado: ${dup.nome}`
    }
    if (Object.keys(e).length) { setErrs(e); return }
    onSave({ ...form, nome: form.nome.trim() })
    onClose()
  }

  if (saveRef) saveRef.current = isNew ? handleCreate : null

  if (!isNew && tab === 'oportunidades') {
    return <TabOportunidades opps={opps} />
  }
  if (!isNew && tab === 'campanhas') {
    return <TabCampanhas opps={opps} campanhas={campanhas} />
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Avatar + nome */}
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:52, height:52, borderRadius:'50%', background:av.bg, color:av.color,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:18, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
          border:`2px solid ${av.color}33` }}>
          {initials(form.nome)}
        </div>
        <div style={{ flex:1 }}>
          <input
            value={form.nome}
            onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); if (errs.nome) setErrs(p => ({ ...p, nome: '' })) }}
            onBlur={e => patch('nome', e.target.value)}
            placeholder="Nome completo…"
            style={{ width:'100%', boxSizing:'border-box', border:'none', outline:'none',
              background:'transparent', fontSize:22, fontWeight:700, color:'var(--text)',
              fontFamily:'var(--font)', padding:0,
              borderBottom:`2px solid ${errs.nome ? '#DC2626' : 'transparent'}`, transition:'border-color 0.15s' }}
            onFocus={e => { if (!errs.nome) e.target.style.borderBottomColor = 'var(--accent)' }}
            onBlurCapture={e => { if (!errs.nome) e.target.style.borderBottomColor = 'transparent' }}
          />
          {errs.nome && <span style={{ color:'#DC2626', fontSize:11, marginTop:2, display:'block' }}>{errs.nome}</span>}
          {form.empresa_nome && (
            <div style={{ fontSize:12, color:ACCENT, marginTop:2 }}>{form.empresa_nome}</div>
          )}
        </div>
      </div>

      {/* Campos principais */}
      <FormSection label="Dados">
        <FormGrid cols={2}>
          <FormField label="Cargo">
            <input className="so-field" value={form.cargo || ''}
              onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
              onBlur={e => patch('cargo', e.target.value)}
              placeholder="Ex: Diretor Comercial" />
          </FormField>
          <FormField label="Empresa">
            <EmpresaSearch
              value={form.empresa_id}
              label={form.empresa_nome}
              onChange={(id, nome) => {
                const next = { ...form, empresa_id: id, empresa_nome: nome || '' }
                setForm(next)
                if (!isNew) onSave({ ...next, id: item.id })
              }}
            />
          </FormField>
          <FormField label="E-mail" error={errs.email}>
            <input className="so-field" value={form.email || ''}
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); if (errs.email) setErrs(p => ({...p, email:''})) }}
              onBlur={e => patch('email', e.target.value)}
              placeholder="email@empresa.com"
              style={{ borderColor: errs.email ? '#DC2626' : '' }} />
          </FormField>
          <FormField label="Telefone">
            <input className="so-field" value={form.telefone || ''}
              onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
              onBlur={e => patch('telefone', e.target.value)}
              placeholder="(00) 00000-0000" />
          </FormField>
          <FormField label="WhatsApp">
            <div style={{ display:'flex', gap:6 }}>
              <input className="so-field" value={form.whatsapp || ''}
                onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                onBlur={e => patch('whatsapp', e.target.value)}
                placeholder="(00) 00000-0000" style={{ flex:1 }} />
              {form.whatsapp && (
                <a href={`https://wa.me/55${form.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36,
                    borderRadius:8, background:'#25D366', color:'#fff', textDecoration:'none',
                    fontSize:17, flexShrink:0 }}>
                  💬
                </a>
              )}
            </div>
          </FormField>
          <FormField label="LinkedIn" style={{ gridColumn:'span 2' }}>
            <div style={{ display:'flex', gap:6 }}>
              <input className="so-field" value={form.linkedin_url || ''}
                onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                onBlur={e => patch('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/nome" style={{ flex:1 }} />
              {form.linkedin_url && (
                <a href={form.linkedin_url} target="_blank" rel="noreferrer"
                  style={{ display:'flex', alignItems:'center', justifyContent:'center', width:36, height:36,
                    borderRadius:8, background:'#0A66C2', color:'#fff', textDecoration:'none',
                    fontSize:13, fontWeight:800, flexShrink:0 }}>
                  in
                </a>
              )}
            </div>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Status & Perfil (Análise de Cliente Ideal) */}
      <FormSection label="Status & Perfil">
        <FormGrid cols={2}>
          <FormField label="Status">
            <select className="so-field" value={form.status || 'lead'}
              onChange={e => patch('status', e.target.value)}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </FormField>
          <FormField label="Em nutrição">
            <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', padding:'8px 0' }}>
              <input type="checkbox" checked={!!form.em_nutricao}
                onChange={e => patch('em_nutricao', e.target.checked)}
                style={{ accentColor:'var(--accent)', cursor:'pointer', width:16, height:16 }} />
              <span style={{ fontSize:13, color:'var(--text)' }}>Contato está em fluxo de nutrição</span>
            </label>
          </FormField>
          <FormField label="Departamento">
            <input className="so-field" value={form.departamento || ''}
              onChange={e => setForm(f => ({ ...f, departamento: e.target.value }))}
              onBlur={e => patch('departamento', e.target.value)}
              placeholder="Ex: TI, Financeiro, Vendas" />
          </FormField>
          <FormField label="Senioridade">
            <select className="so-field" value={form.senioridade || ''}
              onChange={e => patch('senioridade', e.target.value)}>
              {SENIORIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
          <FormField label="Poder de decisão" style={{ gridColumn:'span 2' }}>
            <select className="so-field" value={form.poder_decisao || ''}
              onChange={e => patch('poder_decisao', e.target.value)}>
              {PODER_DECISAO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Notas */}
      <FormSection label="Notas">
        <InlineTextarea
          value={form.notas || ''}
          onChange={v => patch('notas', v)}
          placeholder="Observações, histórico, contexto sobre este contato…"
          minRows={4}
        />
      </FormSection>

      {!isNew && (
        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
          Cadastrado em {fmtData(item.criado_em)}
        </div>
      )}
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function Contatos() {
  const saveRef = useRef(null)
  const { contacts: contatos, save: salvarContatoBase, remove: deletarContatoBase } = useContacts()
  const { registrar: log } = useAuditLog()
  const { opps: opportunities } = useOpportunities()
  const { campanhas } = useCampanhas()
  const { produtos } = useProducts()
  const [view, setView] = useState('lista') // 'lista' | 'analise'
  function salvarContato(c) {
    const isNew = !contatos.find(x => x.id === c.id)
    salvarContatoBase(c)
    log(isNew ? 'criar' : 'editar', 'contato', c.id, { descricao: `Contato ${isNew ? 'criado' : 'editado'}: ${c.nome || c.email || ''}` })
  }
  function deletarContato(id) {
    const c = contatos.find(x => x.id === id)
    deletarContatoBase(id)
    log('excluir', 'contato', id, { descricao: `Contato excluído: ${c?.nome || c?.email || id}` })
  }
  const { companies } = useCompanies()
  const [modal, setModal] = useState(null)   // null | 'novo' | contato-obj
  const [soTab, setSoTab] = useState('dados')

  // ── COLUMNS para BrowseLayout ────────────────────────────────────────────────
  const COLUMNS = [
    { key: 'nome', label: 'Contato', render: (_, row) => {
      const display = row.nome || row.email || 'Sem nome'
      const av = avatarColor(display)
      const avatarText = row.nome ? initials(row.nome) : (row.email ? row.email[0].toUpperCase() : '?')
      return (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:av.bg, color:av.color,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:11, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0,
            border:`1px solid ${av.color}33` }}>
            {avatarText}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:600, fontSize:13, color: row.nome ? 'var(--text)' : 'var(--text-muted)', fontStyle: row.nome ? 'normal' : 'italic', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:180 }}>
              {display}
            </div>
            {row.nome && row.email && (
              <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:180 }}>
                {row.email}
              </div>
            )}
          </div>
        </div>
      )
    }},
    { key: 'cargo', label: 'Cargo', render: val => val
      ? <span style={{ fontSize:12, color:'var(--text-soft)', padding:'2px 8px',
          background:'var(--surface2)', borderRadius:6, border:'1px solid var(--border)' }}>{val}</span>
      : <span style={{ color:'var(--border2)', fontSize:11 }}>—</span>
    },
    { key: 'empresa_nome', label: 'Empresa', render: val => val
      ? <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:22, height:22, borderRadius:6, background:ACCENT+'18', color:ACCENT,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:8, fontWeight:800, fontFamily:'var(--mono)', border:`1px solid ${ACCENT}30` }}>
            {val.slice(0,2).toUpperCase()}
          </div>
          <span style={{ fontSize:12, color:'var(--text-soft)' }}>{val}</span>
        </div>
      : <span style={{ fontSize:11, color:'var(--border2)' }}>—</span>
    },
    { key: 'telefone', label: 'Telefone', render: val =>
      <span style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-soft)' }}>
        {val || <span style={{ color:'var(--border2)' }}>—</span>}
      </span>
    },
    { key: 'status', label: 'Status', render: (val, row) => <StatusBadge status={val} em_nutricao={row.em_nutricao} /> },
    { key: 'criado_em', label: 'Cadastro', render: val =>
      <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>{fmtData(val)}</span>
    },
  ]

  // ── FILTERS ──────────────────────────────────────────────────────────────────
  const empresasUnicas = useMemo(() => {
    const ids = new Set(contatos.map(c => String(c.empresa_id)).filter(Boolean))
    return companies.filter(e => ids.has(String(e.id)))
  }, [contatos, companies])

  const FILTERS = [
    { key: 'empresa_nome', label: 'Empresa',
      options: empresasUnicas.map(e => ({ value: e.fantasia || e.razao, label: e.fantasia || e.razao })) },
    { key: 'status', label: 'Status',
      options: Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label })) },
  ]

  const kpisNode = (data) => {
    const total      = data.length
    const comEmpresa = data.filter(c => c.empresa_id).length
    const semEmpresa = data.filter(c => !c.empresa_id).length
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'Total',       value:total,      color:'var(--text)' },
          { label:'Com empresa', value:comEmpresa, color:'var(--accent)' },
          { label:'Sem empresa', value:semEmpresa, color:'#6B7280'     },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--surface)', borderRadius:10, padding:'16px 18px',
            display:'flex', flexDirection:'column', gap:4, border:'1px solid var(--border2)',
            boxShadow:'var(--shadow)', borderTop:'3px solid var(--border)' }}>
            <span style={{ fontSize:22, fontWeight:700, color:k.color, letterSpacing:'-0.5px', lineHeight:1 }}>{k.value}</span>
            <span style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{k.label}</span>
          </div>
        ))}
      </div>
    )
  }

  const btnAnaliseICP = (
    <button type="button" onClick={() => setView(v => v === 'analise' ? 'lista' : 'analise')}
      style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8,
        border: `1px solid ${view === 'analise' ? 'var(--accent)' : 'var(--border)'}`,
        background: view === 'analise' ? 'var(--accent-glow)' : 'var(--surface)',
        color: view === 'analise' ? 'var(--accent)' : 'var(--text)',
        fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
      🧭 {view === 'analise' ? 'Voltar à lista' : 'Análise de Cliente Ideal'}
    </button>
  )

  if (view === 'analise') {
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:700, color:'var(--text)', margin:0 }}>Análise de Cliente Ideal</h1>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'4px 0 0' }}>
              Perfil dos contatos com oportunidades ganhas, por Produto e Categoria de Produto.
            </p>
          </div>
          {btnAnaliseICP}
        </div>
        <AnaliseICP opps={opportunities} contatos={contatos} produtos={produtos} />
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <BrowseLayout
        modulo="contatos"
        secondaryActions={btnAnaliseICP}
        data={contatos}
        columns={COLUMNS}
        filters={FILTERS}
        onRowClick={c => setModal(c)}
        onNew={() => setModal('novo')}
        newLabel="Novo contato"
        storageKey="contatos_browse"
        keyField="id"
        kpis={kpisNode}
        bulkEditFields={[
          { key: 'cargo', label: 'Cargo', type: 'text' },
          { key: 'status', label: 'Status', type: 'select', options: Object.entries(STATUS_CFG).map(([k, v]) => ({ value: k, label: v.label })) },
          { key: 'em_nutricao', label: 'Em nutrição', type: 'boolean' },
        ]}
        onBulkEdit={(ids, changes) =>
          ids.forEach(id => { const c = contatos.find(c => c.id === id); if (c) salvarContato({ ...c, ...changes }) })
        }
        renderCard={row => {
          const display = row.nome || row.email || 'Sem nome'
          const av = avatarColor(display)
          const avatarText = row.nome ? initials(row.nome) : (row.email ? row.email[0].toUpperCase() : '?')
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:av.bg, color:av.color,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:800, fontFamily:'var(--mono)', flexShrink:0, border:`1px solid ${av.color}33` }}>
                  {avatarText}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>{display}</div>
                  {row.nome && row.email && <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>{row.email}</div>}
                </div>
              </div>
              {row.cargo && <span style={{ fontSize:12, color:'var(--text-soft)', padding:'2px 8px', background:'var(--surface2)', borderRadius:6, border:'1px solid var(--border)', alignSelf:'flex-start' }}>{row.cargo}</span>}
              {row.empresa_nome && (
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--text-soft)' }}>
                  <div style={{ width:20, height:20, borderRadius:5, background:ACCENT+'18', color:ACCENT, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, fontFamily:'var(--mono)' }}>{row.empresa_nome.slice(0,2).toUpperCase()}</div>
                  {row.empresa_nome}
                </div>
              )}
              {row.telefone && <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>📞 {row.telefone}</div>}
            </div>
          )
        }}
      />

      {/* ── SlideOver ── */}
      <SlideOver
        open={!!modal}
        onClose={() => { setModal(null); setSoTab('dados') }}
        title={modal && modal !== 'novo' ? (modal.nome || 'Contato') : 'Novo contato'}
        subtitle={modal && modal !== 'novo' ? 'Editando contato' : 'Novo cadastro'}
        defaultWidth="50vw"
        tabs={modal && modal !== 'novo' ? [
          { key: 'dados',         label: 'Dados' },
          { key: 'oportunidades', label: 'Oportunidades' },
          { key: 'campanhas',     label: 'Campanhas' },
        ] : undefined}
        activeTab={soTab}
        onTabChange={setSoTab}
        onSave={modal === 'novo' ? () => saveRef.current?.() : undefined}
        saveLabel="Criar contato"
        onDelete={modal && modal !== 'novo' ? () => { deletarContato(modal.id); setModal(null) } : undefined}
        deleteConfirm="Excluir este contato? Esta ação não pode ser desfeita."
      >
        {modal && (
          <ContatoDetail
            item={modal === 'novo' ? null : modal}
            todos={contatos}
            opps={(opportunities || []).filter(o => o.primary_contact_id === modal?.id)}
            campanhas={campanhas || []}
            tab={soTab}
            onSave={salvarContato}
            onDelete={deletarContato}
            onClose={() => setModal(null)}
            saveRef={saveRef}
          />
        )}
      </SlideOver>
    </div>
  )
}
