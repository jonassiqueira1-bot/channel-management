import { useState, useMemo, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfile } from '../hooks/useProfile'
import { useLocalState } from '../hooks/useLocalState'
import { TIPOS_ACAO as TIPOS_ACAO_DEFAULT, STATUS_ACAO } from '../data/mockAcoes'
import { useActions } from '../hooks/useActions'
import { useAuditLog } from '../hooks/useAuditLog'
import { useBranches } from '../hooks/useBranches'
import { useParceiros } from '../hooks/useParceiros'
import { useTiposAcao } from '../hooks/useTiposAcao'
import { useTasks } from '../hooks/useTasks'
import { useUsuarios } from '../hooks/useUsuarios'
import { useSellers } from '../hooks/useSellers'
import { useAcaoMembros } from '../hooks/useAcaoMembros'
import { useAcaoModulos } from '../hooks/useAcaoModulos'
import { useDocuments } from '../hooks/useDocuments'
import SearchSelect from '../components/SearchSelect'
import { getVideoEmbedUrl } from '../lib/videoEmbed'
import { useCentrosCusto } from '../hooks/useCentrosCusto'
import CustosSection from '../components/CustosSection'
import { CATEGORIA_CFG } from '../data/mockDocumentos'
import { MultiSelect } from './Playbooks'
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField } from '../components/ui/SlideOver'
import Button from '../components/Button'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtData(d) {
  if (!d) return ''
  const [y, m, dia] = d.split('T')[0].split('-')
  return `${dia}/${m}/${y}`
}
function fmtPeriodo(inicio, fim) {
  if (!inicio) return '—'
  if (!fim || fim === inicio) return fmtData(inicio)
  return `${fmtData(inicio)} → ${fmtData(fim)}`
}
const MESES_ABREV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function fmtDataCurta(d) {
  if (!d) return ''
  const [y, m, dia] = d.split('T')[0].split('-')
  return `${parseInt(dia, 10)} ${MESES_ABREV[parseInt(m, 10) - 1]}`
}
// Datas curtas pro card, ex: "10 Jan" / "10–12 Jan" / "10 Jan → 12 Fev"
function fmtPeriodoCurto(inicio, fim) {
  if (!inicio) return '—'
  const i = inicio.split('T')[0]
  const f = fim ? fim.split('T')[0] : null
  if (!f || f === i) return fmtDataCurta(i)
  const [iy, im, id] = i.split('-')
  const [fy, fm, fd] = f.split('-')
  if (iy === fy && im === fm) return `${parseInt(id, 10)}–${parseInt(fd, 10)} ${MESES_ABREV[parseInt(im, 10) - 1]}`
  return `${fmtDataCurta(i)} → ${fmtDataCurta(f)}`
}
function novoId(lista) { return Math.max(0, ...lista.map(a => a.id)) + 1 }
function listToMap(lista) {
  return Object.fromEntries(lista.map(t => [t.slug || t.key || t.id, t]))
}
function initials(nome) {
  return (nome || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// "Última atualização" relativa (Hoje / Ontem / N dias atrás) — só pro
// dashboard de franquia, não é usado como registro de auditoria.
function fmtRelativo(d) {
  if (!d) return '—'
  const dia   = new Date(d.split('T')[0] + 'T00:00:00')
  const hoje  = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00')
  const diff  = Math.round((hoje - dia) / 86400000)
  if (diff <= 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  if (diff < 7)   return `${diff} dias atrás`
  return fmtData(d)
}

// Saúde da franquia — sintetiza atrasos/pendências/progresso num único selo,
// pra não obrigar o gestor a interpretar contadores um por um.
function calcSaudeFranquia({ atrasadas, pendentes, pct }) {
  if (atrasadas > 0 || (pct !== null && pct < 40)) {
    return { nivel:'critica',  label:'Crítica',  emoji:'🔴', color:'#EF4444' }
  }
  if (pendentes > 3 || (pct !== null && pct < 70)) {
    return { nivel:'atencao',  label:'Atenção',  emoji:'🟡', color:'#F59E0B' }
  }
  return { nivel:'saudavel', label:'Saudável', emoji:'🟢', color:'#10B981' }
}

// ─── Tarefa constants (espelhados de Tarefas.js) ─────────────────────────────
const T_STATUS = {
  pendente:     { label:'Pendente',     color:'#F59E0B', bg:'#FEF3C7', text:'#92400E' },
  em_andamento: { label:'Em andamento', color:'#3B82F6', bg:'#DBEAFE', text:'#1E3A5F' },
  concluida:    { label:'Concluída',    color:'#10B981', bg:'#D1FAE5', text:'#065F46' },
  cancelada:    { label:'Cancelada',    color:'#9CA3AF', bg:'#F3F4F6', text:'#6B7280' },
}
const T_PRIORIDADE = {
  baixa:   { label:'Baixa',   color:'#6B7280' },
  media:   { label:'Média',   color:'#3B82F6' },
  alta:    { label:'Alta',    color:'#F59E0B' },
  urgente: { label:'Urgente', color:'#EF4444' },
}
const EMPTY_TAREFA = {
  titulo:'', descricao:'', tipo:'', status:'pendente', prioridade:'media',
  data_inicio:'', prazo:'',
  responsavel_id:null, responsavel_nome:'',
  entidade_tipo:'acao', entidade_id:null, entidade_nome:'',
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIPOS_TAREFA_DEFAULT = [
  { slug:'ligacao',    icon:'📞', label:'Ligação'       },
  { slug:'email',      icon:'✉️',  label:'E-mail'        },
  { slug:'reuniao',    icon:'🤝', label:'Reunião'       },
  { slug:'proposta',   icon:'📄', label:'Proposta'      },
  { slug:'follow_up',  icon:'🔁', label:'Follow-up'     },
  { slug:'suporte',    icon:'🛠️', label:'Suporte'       },
  { slug:'treinamento',icon:'🎓', label:'Treinamento'   },
  { slug:'outro',      icon:'📌', label:'Outro'         },
]

const RESPONSAVEIS = [
  { id: 'u1', nome: 'Lucas Ferreira' },
  { id: 'u2', nome: 'Carla Menezes' },
  { id: 'u3', nome: 'Fernanda Rocha' },
  { id: 'u5', nome: 'Mariana Silva' },
]

const EMPTY_ACAO = {
  empresa_id: '', empresa_nome: '',
  franquias_adicionais_ids: [],
  tipo: 'treinamento',
  titulo: '', descricao: '',
  data_inicio: '', data_fim: '',
  responsavel_id: 'u1', responsavel_nome: 'Lucas Ferreira',
  local: '', vagas: '', inscritos: 0,
  status: 'agendado',
  tenant_id: 't1',
  custo_previsto: '',
  custos: [],
  centro_custo_id: '',
  documento_ids: [],
  anexos: [],
}

function fmtMoeda(v) {
  if (v === '' || v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Badges ───────────────────────────────────────────────────────────────────
// Discretos por padrão — texto colorido em vez de chip preenchido. `dense`
// (usado nos Cards) some com o ícone/rótulo textual e some com bordas, pra
// reduzir ainda mais o ruído visual quando espaço é curto.
function TipoBadge({ tipo, tiposMap }) {
  const cfg = (tiposMap || TIPOS_ACAO_DEFAULT)[tipo] || { icon: '◎', label: tipo, color: '#6B7280' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600,
      color:'var(--text-muted)', whiteSpace:'nowrap' }}>
      <span style={{ fontSize:12 }}>{cfg.icon}</span> {cfg.label}
    </span>
  )
}

function StatusBadge({ status, dense }) {
  const cfg = STATUS_ACAO[status] || { label: status, color:'#9A9590' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize: dense ? 11 : 11.5,
      fontWeight:600, color:cfg.color, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block', flexShrink:0 }} />
      {cfg.label}
    </span>
  )
}

function VagasBar({ vagas, inscritos = 0 }) {
  if (!vagas) return <span style={{ fontSize:11, color:'var(--text-muted)' }}>—</span>
  const pct = Math.min(100, Math.round((inscritos / vagas) * 100))
  const cor  = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981'
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3, minWidth:80 }}>
      <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
        {inscritos}/{vagas} ({pct}%)
      </div>
      <div style={{ height:4, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:cor, borderRadius:4, transition:'width 0.3s' }} />
      </div>
    </div>
  )
}

function AvatarCell({ nome }) {
  const ACCENT = 'var(--accent)'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
      <div style={{ width:24, height:24, borderRadius:'50%', background:`${ACCENT}18`,
        border:`1.5px solid ${ACCENT}44`, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:9, fontWeight:800, color:ACCENT, fontFamily:'var(--mono)', flexShrink:0 }}>
        {initials(nome)}
      </div>
      <span style={{ fontSize:12, color:'var(--text-soft)' }}>{nome?.split(' ')[0]}</span>
    </div>
  )
}

// ─── Mini form de tarefa dentro da ação ──────────────────────────────────────
function TarefaInlineForm({ acao, onSave, onCancel, tiposTarefa }) {
  const { usuarios: usuariosRaw } = useUsuarios()
  const usuarios = usuariosRaw.filter(u => u.status !== 'inativo')
  const [form, setForm] = useState({ ...EMPTY_TAREFA, entidade_id: acao?.id, entidade_nome: acao?.titulo || '' })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handleSave() {
    if (!form.titulo.trim()) return
    const u = usuarios.find(u => String(u.id) === String(form.responsavel_id))
    onSave({ ...form, responsavel_nome: u?.nome || '' })
  }

  const inp = { width:'100%', padding:'7px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, fontSize:13, color:'var(--text)', fontFamily:'var(--font)', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:4 }

  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:10, padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
      <div>
        <label style={lbl}>Título *</label>
        <input style={inp} placeholder="Título da tarefa…" value={form.titulo} onChange={e => set('titulo', e.target.value)} autoFocus />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <label style={lbl}>Tipo</label>
          <select style={inp} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            <option value="">— Selecione —</option>
            {tiposTarefa.map(t => <option key={t.slug||t.id} value={t.slug||t.id}>{t.icon} {t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Prioridade</label>
          <select style={inp} value={form.prioridade} onChange={e => set('prioridade', e.target.value)}>
            {Object.entries(T_PRIORIDADE).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Prazo</label>
          <input style={inp} type="date" value={form.prazo} onChange={e => set('prazo', e.target.value)} />
        </div>
        <div>
          <label style={lbl}>Responsável</label>
          <select style={inp} value={form.responsavel_id || ''} onChange={e => set('responsavel_id', e.target.value)}>
            <option value="">— Nenhum —</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={lbl}>Descrição</label>
        <textarea style={{ ...inp, resize:'vertical' }} rows={2} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Detalhes ou contexto…" />
      </div>
      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
        <button onClick={onCancel} style={{ padding:'6px 14px', background:'none', border:'1px solid var(--border)', borderRadius:7, fontSize:12, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)' }}>Cancelar</button>
        <button onClick={handleSave} disabled={!form.titulo.trim()} style={{ padding:'6px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)', opacity: form.titulo.trim() ? 1 : 0.5 }}>Salvar tarefa</button>
      </div>
    </div>
  )
}

// ─── Aba de tarefas da ação ───────────────────────────────────────────────────
function AcaoTarefasTab({ acao, tarefas, saveTarefa, deleteTarefa, tiposTarefa }) {
  const { usuarios: usuariosRaw } = useUsuarios()
  const usuarios = usuariosRaw.filter(u => u.status !== 'inativo')
  const [addingNew, setAddingNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm]   = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('todas')

  const minhasTarefas = useMemo(() =>
    tarefas.filter(t => String(t.entidade_id) === String(acao?.id) && t.entidade_tipo === 'acao'),
  [tarefas, acao])

  const tarefasVisiveis = useMemo(() =>
    filtroStatus === 'todas' ? minhasTarefas : minhasTarefas.filter(t => t.status === filtroStatus),
  [minhasTarefas, filtroStatus])

  async function handleAdd(form) {
    await saveTarefa({ ...form, entidade_tipo:'acao', entidade_id: String(acao.id), entidade_nome: acao.titulo })
    setAddingNew(false)
  }

  async function handleUpdate() {
    if (!editForm?.titulo?.trim()) return
    const u = usuarios.find(u => String(u.id) === String(editForm.responsavel_id))
    await saveTarefa({ ...editForm, responsavel_nome: u?.nome || editForm.responsavel_nome || '' })
    setEditingId(null); setEditForm(null)
  }

  async function toggleStatus(t) {
    const order = ['pendente', 'em_andamento', 'concluida']
    const idx = order.indexOf(t.status)
    const next = order[(idx + 1) % order.length]
    await saveTarefa({ ...t, status: next })
  }

  const inp = { width:'100%', padding:'7px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, fontSize:13, color:'var(--text)', fontFamily:'var(--font)', boxSizing:'border-box' }
  const lbl = { fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:.5, display:'block', marginBottom:4 }

  const total      = minhasTarefas.length
  const concluidas = minhasTarefas.filter(t => t.status === 'concluida').length
  const andamento  = minhasTarefas.filter(t => t.status === 'em_andamento').length
  const pendentes  = minhasTarefas.filter(t => t.status === 'pendente').length
  const pct        = total ? Math.round((concluidas / total) * 100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* ── Cabeçalho: progresso + pills de filtro ── */}
      {total > 0 && (
        <div style={{ background:'var(--surface2)', borderRadius:10, padding:'12px 16px', border:'1px solid var(--border2)', display:'flex', flexDirection:'column', gap:10 }}>
          {/* barra de progresso */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{concluidas} de {total} concluídas</span>
            <span style={{ fontSize:13, fontWeight:800, color: pct===100 ? '#10B981' : 'var(--accent)', fontFamily:'var(--mono)' }}>{pct}%</span>
          </div>
          <div style={{ height:7, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', borderRadius:99, background: pct===100 ? '#10B981' : 'var(--accent)', width:`${pct}%`, transition:'width .4s' }} />
          </div>
          {/* pills de status como filtro rápido */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[
              { key:'todas',       label:`Todas (${total})`,            color:'var(--text-muted)',  bg:'var(--border)' },
              { key:'pendente',    label:`Pendentes (${pendentes})`,    color:'#92400E', bg:'#FEF3C7' },
              { key:'em_andamento',label:`Em andamento (${andamento})`, color:'#1E3A5F', bg:'#DBEAFE' },
              { key:'concluida',   label:`Concluídas (${concluidas})`,  color:'#065F46', bg:'#D1FAE5' },
            ].map(p => (
              <button key={p.key} onClick={() => setFiltroStatus(p.key)}
                style={{ padding:'3px 10px', borderRadius:99, border: filtroStatus===p.key ? `2px solid ${p.color}` : '2px solid transparent',
                  background: filtroStatus===p.key ? p.bg : 'transparent', color: filtroStatus===p.key ? p.color : 'var(--text-muted)',
                  fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)', transition:'all .15s' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Lista de tarefas ── */}
      {tarefasVisiveis.length === 0 && total > 0 && (
        <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-muted)', fontSize:12 }}>Nenhuma tarefa neste status.</div>
      )}

      {tarefasVisiveis.map(t => {
        const stCfg = T_STATUS[t.status] || T_STATUS.pendente
        const prCfg = T_PRIORIDADE[t.prioridade] || T_PRIORIDADE.media
        const isEditing = editingId === t.id
        const vencida = t.prazo && t.status !== 'concluida' && t.prazo < new Date().toISOString().slice(0,10)

        if (isEditing && editForm) {
          return (
            <div key={t.id} style={{ background:'var(--surface2)', border:'2px solid var(--accent)', borderRadius:10, padding:16, display:'flex', flexDirection:'column', gap:12 }}>
              <div><label style={lbl}>Título</label><input style={inp} value={editForm.titulo} onChange={e => setEditForm(f=>({...f,titulo:e.target.value}))} autoFocus /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div><label style={lbl}>Status</label>
                  <select style={inp} value={editForm.status} onChange={e => setEditForm(f=>({...f,status:e.target.value}))}>
                    {Object.entries(T_STATUS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Prioridade</label>
                  <select style={inp} value={editForm.prioridade} onChange={e => setEditForm(f=>({...f,prioridade:e.target.value}))}>
                    {Object.entries(T_PRIORIDADE).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Prazo</label><input style={inp} type="date" value={editForm.prazo||''} onChange={e => setEditForm(f=>({...f,prazo:e.target.value}))} /></div>
                <div><label style={lbl}>Responsável</label>
                  <select style={inp} value={editForm.responsavel_id||''} onChange={e => setEditForm(f=>({...f,responsavel_id:e.target.value}))}>
                    <option value="">— Nenhum —</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={lbl}>Tipo</label>
                <select style={inp} value={editForm.tipo||''} onChange={e => setEditForm(f=>({...f,tipo:e.target.value}))}>
                  <option value="">— Selecione —</option>
                  {tiposTarefa.map(t => <option key={t.slug||t.id} value={t.slug||t.id}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Descrição</label><textarea style={{...inp,resize:'vertical'}} rows={2} value={editForm.descricao||''} onChange={e => setEditForm(f=>({...f,descricao:e.target.value}))} /></div>
              <div style={{ display:'flex', gap:8, justifyContent:'space-between', alignItems:'center' }}>
                <button onClick={() => { if(window.confirm('Excluir esta tarefa?')) { deleteTarefa(t.id); setEditingId(null) } }}
                  style={{ padding:'6px 12px', background:'none', border:'1px solid #FCA5A5', borderRadius:7, fontSize:12, color:'#DC2626', cursor:'pointer', fontFamily:'var(--font)' }}>🗑 Excluir</button>
                <div style={{ display:'flex', gap:6 }}>
                  <button onClick={() => { setEditingId(null); setEditForm(null) }} style={{ padding:'6px 14px', background:'none', border:'1px solid var(--border)', borderRadius:7, fontSize:12, color:'var(--text-muted)', cursor:'pointer', fontFamily:'var(--font)' }}>Cancelar</button>
                  <button onClick={handleUpdate} style={{ padding:'6px 14px', background:'var(--accent)', color:'#fff', border:'none', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'var(--font)' }}>Salvar</button>
                </div>
              </div>
            </div>
          )
        }

        return (
          <div key={t.id}
            style={{ background:'var(--surface)', border:`1px solid ${vencida ? '#FCA5A5' : 'var(--border2)'}`,
              borderLeft:`3px solid ${stCfg.color}`, borderRadius:10, padding:'11px 14px',
              display:'flex', alignItems:'flex-start', gap:10, transition:'border .15s' }}>
            {/* toggle status */}
            <button onClick={() => toggleStatus(t)} title={`Status: ${stCfg.label} — clique para avançar`}
              style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${stCfg.color}`,
                background: t.status==='concluida' ? stCfg.color : t.status==='em_andamento' ? stCfg.color+'33' : 'transparent',
                cursor:'pointer', flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
              {t.status === 'concluida'    && <span style={{ color:'#fff', fontSize:11, fontWeight:900, lineHeight:1 }}>✓</span>}
              {t.status === 'em_andamento' && <span style={{ fontSize:9, fontWeight:900, color:stCfg.color }}>▶</span>}
            </button>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text)',
                textDecoration: t.status==='concluida' ? 'line-through' : 'none',
                opacity: t.status==='concluida' ? 0.45 : 1, lineHeight:1.3 }}>
                {t.titulo}
                {vencida && <span style={{ marginLeft:6, fontSize:10, color:'#EF4444', fontWeight:700 }}>⚠ Vencida</span>}
              </div>
              {t.descricao && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, lineHeight:1.5 }}>{t.descricao}</div>}
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:7, alignItems:'center' }}>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:stCfg.bg, color:stCfg.text }}>{stCfg.label}</span>
                <span style={{ fontSize:10, fontWeight:600, color:prCfg.color }}>● {prCfg.label}</span>
                {t.tipo && (() => { const tp = tiposTarefa.find(x => (x.slug||x.id) === t.tipo); return tp ? <span style={{ fontSize:10, color:'var(--text-muted)' }}>{tp.icon} {tp.label}</span> : null })()}
                {t.prazo && <span style={{ fontSize:10, color: vencida ? '#EF4444' : 'var(--text-muted)', fontFamily:'var(--mono)', fontWeight: vencida ? 700 : 400 }}>📅 {t.prazo}</span>}
                {t.responsavel_nome && <span style={{ fontSize:10, color:'var(--text-muted)' }}>👤 {t.responsavel_nome}</span>}
              </div>
            </div>
            <button onClick={() => { setEditingId(t.id); setEditForm({...t}) }}
              style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, cursor:'pointer', color:'var(--text-muted)',
                fontSize:11, padding:'4px 8px', flexShrink:0, fontFamily:'var(--font)' }}>Editar</button>
          </div>
        )
      })}

      {/* ── Botão nova tarefa / form inline ── */}
      {addingNew
        ? <TarefaInlineForm acao={acao} onSave={handleAdd} onCancel={() => setAddingNew(false)} tiposTarefa={tiposTarefa} />
        : (
          <button onClick={() => { setAddingNew(true); setFiltroStatus('todas') }}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'none',
              border:'2px dashed var(--border)', borderRadius:10, cursor:'pointer', color:'var(--text-muted)',
              fontSize:13, fontFamily:'var(--font)', width:'100%' }}>
            <span style={{ fontSize:18, lineHeight:1 }}>+</span> Nova tarefa
          </button>
        )
      }
    </div>
  )
}

// ─── Aba Participantes (Contatos Canal) — bench: OppEquipeTab em Pipeline.js ──
const PAPEL_PARTICIPANTE = [
  { value: 'participante', label: 'Participante' },
  { value: 'responsavel',  label: 'Responsável'  },
]

function AcaoParticipantesTab({ acaoId, franquiaIds = [], progressoTreinamento = null }) {
  const { membros, add: addMembro, remove: removeMembro } = useAcaoMembros()
  const { sellers }  = useSellers()
  const { parceiros } = useParceiros()
  const [busca, setBusca] = useState('')
  const [selUser, setSelUser] = useState(null)
  const [papel, setPapel] = useState('participante')
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  const franquiasMap = useMemo(
    () => Object.fromEntries((parceiros || []).map(p => [String(p.id), p])),
    [parceiros]
  )

  // Pool completo: TODOS os Contatos Canais cadastrados (/vendedores), com ou
  // sem login na plataforma — não só os que têm profiles.role='contato_canal'
  // (essa exigência deixava o pool vazio sempre que o vendedor era só
  // cadastro, sem convite aceito). Usado pra resolver quem já foi adicionado,
  // mesmo que a franquia dele tenha sido removida da Ação depois.
  const poolCompleto = useMemo(() =>
    sellers
      .filter(s => s.status !== 'inativo')
      .map(s => ({
        id: s.id, nome: s.nome, cargo: s.cargo || s.role || '',
        email: s.email || '', franquia: franquiasMap[String(s.franquia_id)]?.nome || '',
        franquia_id: String(s.franquia_id || ''),
      })),
  [sellers, franquiasMap])

  const franquiaIdsSet = useMemo(() => new Set(franquiaIds.map(String)), [franquiaIds])

  // Pool pra adicionar: só Contatos Canais da(s) unidade(s)/franquia(s)
  // envolvida(s) nesta Ação (Unidade/Franquia + Outras unidades envolvidas).
  const poolParaAdicionar = useMemo(() =>
    franquiaIdsSet.size === 0 ? poolCompleto : poolCompleto.filter(u => franquiaIdsSet.has(u.franquia_id)),
  [poolCompleto, franquiaIdsSet])

  const participantes = useMemo(() =>
    membros.filter(m => m.acao_id === acaoId)
      .map(m => ({ ...m, usuario: poolCompleto.find(u => u.id === m.user_id) }))
      .filter(m => m.usuario),
  [membros, acaoId, poolCompleto])

  const jaAdicionados = useMemo(() => new Set(participantes.map(m => m.user_id)), [participantes])

  const sugestoes = useMemo(() => {
    const q = busca.toLowerCase()
    return poolParaAdicionar.filter(u =>
      !jaAdicionados.has(u.id) &&
      ((u.nome || '').toLowerCase().includes(q) || (u.cargo || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    ).slice(0, 8)
  }, [busca, jaAdicionados, poolParaAdicionar])

  async function handleAdd() {
    if (!selUser) return
    await addMembro({ acao_id: acaoId, user_id: selUser.id, papel })
    setSelUser(null); setBusca(''); setPapel('participante'); setDropOpen(false)
  }

  const lbl = { fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:4 }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, paddingTop:8 }}>
      <div style={{ fontSize:12, color:'var(--text-muted)' }}>
        Contatos Canal (vendedores) que participaram desta Ação — usado também no cálculo de maturidade.
        {franquiaIdsSet.size > 0 && ' Só aparecem contatos das unidades/franquias envolvidas nesta Ação.'}
      </div>

      {/* ── Form de adicionar ── */}
      <div style={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, padding:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 160px auto', gap:8, alignItems:'flex-end' }}>
          <div ref={dropRef} style={{ position:'relative' }}>
            <label style={lbl}>Contato Canal</label>
            {selUser ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
                background:'var(--surface)', border:'1px solid var(--accent)', borderRadius:6 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--accent-glow)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:10,
                  fontWeight:800, color:'var(--accent)', fontFamily:'var(--mono)', flexShrink:0 }}>
                  {(selUser.nome || '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{selUser.nome}</div>
                  {selUser.franquia && <div style={{ fontSize:10, color:'var(--text-muted)' }}>{selUser.franquia}</div>}
                </div>
                <button type="button" onClick={() => { setSelUser(null); setBusca('') }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'0 2px' }}>✕</button>
              </div>
            ) : (
              <input className="so-field" placeholder="Nome, cargo ou e-mail…" value={busca} style={{ width:'100%', boxSizing:'border-box' }}
                onChange={e => { setBusca(e.target.value); setDropOpen(true) }}
                onFocus={() => setDropOpen(true)} />
            )}
            {!selUser && dropOpen && sugestoes.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:4,
                background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
                boxShadow:'0 8px 24px rgba(0,0,0,.12)', zIndex:300, maxHeight:220, overflowY:'auto' }}>
                {sugestoes.map(u => (
                  <div key={u.id} onMouseDown={() => { setSelUser(u); setBusca(''); setDropOpen(false) }}
                    style={{ padding:'8px 12px', cursor:'pointer', fontSize:13, color:'var(--text)' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background='none'}>
                    <div style={{ fontWeight:600 }}>{u.nome}</div>
                    {(u.cargo || u.franquia) && (
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{[u.cargo, u.franquia].filter(Boolean).join(' · ')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label style={lbl}>Função</label>
            <select className="so-field" value={papel} onChange={e => setPapel(e.target.value)}>
              {PAPEL_PARTICIPANTE.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <button onClick={handleAdd} disabled={!selUser}
            style={{ height:36, padding:'0 16px', borderRadius:7, border:'none',
              background: selUser ? 'var(--accent)' : 'var(--border)', color:'#fff', fontWeight:700, fontSize:12,
              cursor: selUser ? 'pointer' : 'not-allowed', fontFamily:'var(--font)' }}>
            + Adicionar
          </button>
        </div>
      </div>

      {/* ── Lista ── */}
      {participantes.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
          Nenhum Contato Canal adicionado a esta Ação ainda.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {participantes.map(mb => {
            const u = mb.usuario
            const cfg = PAPEL_PARTICIPANTE.find(p => p.value === mb.papel) || PAPEL_PARTICIPANTE[0]
            // Progresso individual de treinamento — só quando a Ação é do
            // Tipo Treinamento (progressoTreinamento vem null nos demais casos).
            let progressoPct = null, progressoTexto = ''
            if (progressoTreinamento) {
              const total = progressoTreinamento.itens.length
              const concluidos = progressoTreinamento.progresso.filter(p => p.seller_id === mb.user_id && p.concluido).length
              progressoPct = total ? Math.round((concluidos / total) * 100) : 0
              progressoTexto = `${concluidos} de ${total} itens concluídos`
            }
            return (
              <div key={mb.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                border:'1px solid var(--border2)', borderRadius:8 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:'var(--accent-glow)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:11,
                  fontWeight:800, color:'var(--accent)', fontFamily:'var(--mono)' }}>
                  {(u.nome || '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{u.nome}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {[u.cargo, u.franquia].filter(Boolean).join(' · ')}
                  </div>
                  {progressoPct !== null && (
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                      <div style={{ width:70, height:5, background:'var(--border)', borderRadius:99, overflow:'hidden', flexShrink:0 }}>
                        <div style={{ height:'100%', borderRadius:99, background: progressoPct===100 ? '#10B981' : 'var(--accent)', width:`${progressoPct}%`, transition:'width .3s' }} />
                      </div>
                      <span style={{ fontSize:10, color:'var(--text-muted)' }}>{progressoTexto}</span>
                    </div>
                  )}
                </div>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                  background:'var(--surface2)', color:'var(--text-muted)', fontFamily:'var(--mono)' }}>
                  {cfg.label}
                </span>
                <button onClick={() => removeMembro(mb.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'0 4px' }}
                  onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Aba Módulos (só Ações do Tipo Treinamento) ──────────────────────────────
// Convive com Tarefas — não substitui o checklist operacional. Cada módulo
// tem itens que referenciam Documentos já cadastrados (nunca duplica
// upload), e o progresso é individual por participante via
// acao_modulo_progresso (marcação feita pelo próprio parceiro, quando ele é
// quem está olhando, ou por um admin ISV em nome de alguém).
function AcaoModulosTab({ acaoModulos, allDocs, responsaveisOpts, participantes, souParceiro, meuSellerId }) {
  const { modulos, itens, progresso, addModulo, updateModulo, removeModulo, addItem, removeItem, setConcluido } = acaoModulos
  const [novoTitulo, setNovoTitulo] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [addingDocFor, setAddingDocFor] = useState(null)
  const [videoAberto, setVideoAberto] = useState(null) // id do item com player aberto

  const itensPorModulo = useCallback(id => itens.filter(i => i.modulo_id === id).sort((a, b) => a.ordem - b.ordem), [itens])
  const docById = useCallback(id => allDocs.find(d => d.id === id), [allDocs])

  async function handleAddModulo() {
    if (!novoTitulo.trim()) return
    const res = await addModulo(novoTitulo.trim())
    if (res.ok) { setNovoTitulo(''); setExpandido(res.data.id) }
  }

  function concluidoPor(itemId, sellerId) {
    return progresso.some(p => p.modulo_item_id === itemId && p.seller_id === sellerId && p.concluido)
  }

  const lbl = { fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:4 }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, paddingTop:8 }}>
      <div style={{ fontSize:12, color:'var(--text-muted)' }}>
        {souParceiro
          ? 'Marque os itens conforme for concluindo o treinamento.'
          : 'Estrutura do treinamento — cada item referencia um Documento já cadastrado (não faz upload novo).'}
      </div>

      {!souParceiro && (
        <div style={{ display:'flex', gap:8 }}>
          <input className="so-field" style={{ flex:1 }} placeholder="Nome do módulo (ex: Fundamentos do produto)"
            value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddModulo() }} />
          <button onClick={handleAddModulo} disabled={!novoTitulo.trim()}
            style={{ height:36, padding:'0 16px', borderRadius:7, border:'none', whiteSpace:'nowrap',
              background: novoTitulo.trim() ? 'var(--accent)' : 'var(--border)', color:'#fff', fontWeight:700, fontSize:12,
              cursor: novoTitulo.trim() ? 'pointer' : 'not-allowed', fontFamily:'var(--font)' }}>
            + Módulo
          </button>
        </div>
      )}

      {modulos.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>
          Nenhum módulo criado ainda.
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[...modulos].sort((a, b) => a.ordem - b.ordem).map(mod => {
            const seusItens = itensPorModulo(mod.id)
            const instrutor = responsaveisOpts.find(r => r.id === mod.instrutor_responsavel_id)
            const aberto = expandido === mod.id
            const concluidosDoMeu = souParceiro && meuSellerId
              ? seusItens.filter(it => concluidoPor(it.id, meuSellerId)).length
              : null
            return (
              <div key={mod.id} style={{ border:'1px solid var(--border2)', borderRadius:8, overflow:'hidden' }}>
                <div onClick={() => setExpandido(aberto ? null : mod.id)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', cursor:'pointer', background:'var(--surface2)' }}>
                  <span style={{ fontSize:11, color:'var(--text-muted)', transform: aberto ? 'rotate(90deg)' : 'none', transition:'transform .15s' }}>▸</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{mod.titulo}</div>
                    <div style={{ fontSize:10.5, color:'var(--text-muted)' }}>
                      {seusItens.length} item{seusItens.length !== 1 ? 's' : ''}
                      {instrutor && ` · Instrutor: ${instrutor.nome}`}
                      {concluidosDoMeu !== null && ` · ${concluidosDoMeu} de ${seusItens.length} concluídos`}
                    </div>
                  </div>
                  {!souParceiro && (
                    <button onClick={e => { e.stopPropagation(); if (window.confirm('Remover este módulo e todos os itens?')) removeModulo(mod.id) }}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'0 4px' }}
                      onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>✕</button>
                  )}
                </div>

                {aberto && (
                  <div style={{ padding:'12px', display:'flex', flexDirection:'column', gap:10, borderTop:'1px solid var(--border2)' }}>
                    {!souParceiro && (
                      <div>
                        <label style={lbl}>Instrutor responsável</label>
                        <select className="so-field" value={mod.instrutor_responsavel_id || ''}
                          onChange={e => updateModulo(mod.id, { instrutor_responsavel_id: e.target.value || null })}>
                          <option value="">— Selecione —</option>
                          {responsaveisOpts.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                        </select>
                      </div>
                    )}

                    {seusItens.length === 0 ? (
                      <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:'8px 0' }}>
                        Nenhum item neste módulo ainda.
                      </div>
                    ) : (
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {seusItens.map(item => {
                          const doc = docById(item.documento_id)
                          const cfgCat = doc ? (CATEGORIA_CFG[doc.categoria] || CATEGORIA_CFG.outro) : null
                          const link = doc?.file_url || doc?.link_externo
                          const embedUrl = getVideoEmbedUrl(link)
                          const concluidoPeloUsuario = souParceiro && meuSellerId && concluidoPor(item.id, meuSellerId)
                          const totalConcluido = participantes.filter(p => concluidoPor(item.id, p.user_id)).length
                          const playerAberto = videoAberto === item.id
                          return (
                            <div key={item.id} style={{ border:'1px solid var(--border2)', borderRadius:7, overflow:'hidden' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px' }}>
                                {souParceiro && meuSellerId && (
                                  <input type="checkbox" checked={concluidoPeloUsuario}
                                    onChange={e => setConcluido(item.id, meuSellerId, e.target.checked)}
                                    style={{ width:16, height:16, flexShrink:0, cursor:'pointer' }} />
                                )}
                                {cfgCat && <span style={{ fontSize:14, flexShrink:0 }}>{cfgCat.icon}</span>}
                                <div style={{ flex:1, minWidth:0 }}>
                                  <div style={{ fontSize:12.5, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                    {doc?.title || '(documento removido)'}
                                  </div>
                                  {!souParceiro && participantes.length > 0 && (
                                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{totalConcluido} de {participantes.length} participantes concluíram</div>
                                  )}
                                </div>
                                {embedUrl ? (
                                  <button onClick={() => setVideoAberto(playerAberto ? null : item.id)}
                                    style={{ padding:'4px 9px', borderRadius:6, border:'1px solid var(--border)', fontSize:10.5,
                                      color: playerAberto ? '#fff' : 'var(--accent)', background: playerAberto ? 'var(--accent)' : 'none',
                                      cursor:'pointer', whiteSpace:'nowrap', fontFamily:'var(--font)', flexShrink:0 }}>
                                    {playerAberto ? '✕ Fechar' : '▶ Assistir'}
                                  </button>
                                ) : link && (
                                  <a href={link} target="_blank" rel="noopener noreferrer"
                                    style={{ padding:'4px 9px', borderRadius:6, border:'1px solid var(--border)', fontSize:10.5, color:'var(--accent)', textDecoration:'none', whiteSpace:'nowrap', fontFamily:'var(--font)', flexShrink:0 }}>
                                    ↗ Abrir
                                  </a>
                                )}
                                {!souParceiro && (
                                  <button onClick={() => removeItem(item.id)}
                                    style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:14, padding:'0 4px', flexShrink:0 }}
                                    onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                                    onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}>✕</button>
                                )}
                              </div>
                              {playerAberto && embedUrl && (
                                <div style={{ position:'relative', paddingTop:'56.25%', background:'#000' }}>
                                  <iframe src={embedUrl} title={doc?.title || 'Vídeo'}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', border:'none' }} />
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {!souParceiro && (
                      addingDocFor === mod.id ? (
                        <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                          <div style={{ flex:1 }}>
                            <SearchSelect
                              options={allDocs.filter(d => !seusItens.some(i => i.documento_id === d.id)).map(d => ({ id: d.id, label: d.title }))}
                              value={null}
                              placeholder="Buscar documento cadastrado…"
                              onChange={async (id) => { if (id) { await addItem(mod.id, id); setAddingDocFor(null) } }}
                            />
                          </div>
                          <button onClick={() => setAddingDocFor(null)}
                            style={{ height:36, padding:'0 10px', borderRadius:7, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:12 }}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setAddingDocFor(mod.id)}
                          style={{ alignSelf:'flex-start', padding:'6px 12px', borderRadius:7, border:'1px dashed var(--border)',
                            background:'none', color:'var(--accent)', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>
                          + Adicionar item
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Bloco (card independente dentro da aba Dados) ───────────────────────────
function Bloco({ title, children }) {
  return (
    <div style={{ background:'var(--surface2)', border:'1px solid var(--border2)', borderRadius:10, padding:16, marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ─── SlideOver de cadastro ────────────────────────────────────────────────────
function AcaoSlideOver({ open, initial, onSave, onClose, onDelete, onDuplicate, tiposMap, empresasOpts, responsaveisOpts, tarefas, saveTarefa, deleteTarefa, tiposTarefa }) {
  const isNew = !initial?.id
  const [tab, setTab] = useState('dados')
  // Custos sempre vêm recolhidos ao abrir a Ação, independente do que estava
  // salvo (_open é só estado visual de UI, não deveria persistir aberto/fechado).
  const [form, setForm]   = useState(initial
    ? { ...EMPTY_ACAO, ...initial, custos: (initial.custos || []).map(c => ({ ...c, _open: false })) }
    : { ...EMPTY_ACAO })
  const [saving, setSaving] = useState(false)
  const [errs, setErrs] = useState({})
  const [uploadingAnexo, setUploadingAnexo] = useState(false)
  const { profile, isAdmin } = useProfile()
  const { docs: allDocs } = useDocuments()
  const { centros: centrosCusto } = useCentrosCusto()
  const { membros: membrosDaAcao } = useAcaoMembros()
  const acaoModulos = useAcaoModulos(!isNew ? initial.id : null)

  // 'parceiro'/'contato_canal' = vendedor externo logado no portal, marcando
  // o próprio progresso; qualquer outro papel é equipe ISV gerenciando o
  // conteúdo do treinamento.
  const souParceiro = profile?.papel === 'parceiro' || profile?.papel === 'contato_canal'
  const meuSellerId = profile?.contact_id || null

  useMemo(() => {
    setForm(initial
      ? { ...EMPTY_ACAO, ...initial, vagas: initial.vagas || '', empresa_id: initial.empresa_id || '',
          custos: (initial.custos || []).map(c => ({ ...c, _open: false })) }
      : { ...EMPTY_ACAO })
    setErrs({})
    setTab('dados')
  }, [initial])

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); if (errs[k]) setErrs(p => ({ ...p, [k]: '' })) }

  const tarefasDaAcao = useMemo(() =>
    tarefas.filter(t => String(t.entidade_id) === String(initial?.id) && t.entidade_tipo === 'acao'),
  [tarefas, initial])

  const tarefasBadge = tarefasDaAcao.length || undefined

  function handleSave() {
    const e = {}
    if (!form.titulo.trim()) e.titulo = 'Título é obrigatório'
    if (!form.empresa_id)    e.empresa_id = 'Selecione a unidade/franquia'
    if (!form.data_inicio)   e.data_inicio = 'Data de início é obrigatória'
    if (Object.keys(e).length) { setErrs(e); setTab('dados'); return }
    const emp  = empresasOpts.find(e => String(e.id) === String(form.empresa_id))
    const resp = responsaveisOpts.find(r => r.id === form.responsavel_id)
    setSaving(true)
    onSave({
      ...form,
      empresa_nome:     emp?.nome || '',
      responsavel_nome: resp?.nome || '',
      vagas:            form.vagas ? Number(form.vagas) : null,
      criado_em:        initial?.criado_em || new Date().toISOString(),
    })
    setSaving(false)
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const anexosBadge = (form.anexos || []).length || undefined
  const custosBadge = (form.custos || []).length || undefined

  const docsBadge = (form.documento_ids || []).length || undefined

  // Feature aditiva: só existe quando o Tipo de Ação é Treinamento — nenhuma
  // outra Ação ganha aba/campo novo.
  const ehTreinamento = form.tipo === 'treinamento'
  const modulosBadge = acaoModulos.modulos.length || undefined

  const tabs = [
    { key:'dados',      label:'Dados' },
    { key:'tarefas',    label:'Tarefas',    badge: tarefasBadge },
    { key:'participantes', label:'Participantes' },
    ...(ehTreinamento ? [{ key:'modulos', label:'Módulos', badge: modulosBadge }] : []),
    { key:'custos',     label:'Custos',     badge: custosBadge },
    { key:'documentos', label:'Documentos', badge: docsBadge },
    { key:'anexos',     label:'Anexos',     badge: anexosBadge },
  ]

  async function handleUploadAnexo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAnexo(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `acoes/${initial?.id || 'novo'}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('action-attachments').upload(path, file, { upsert: true })
      if (error) { alert('Erro no upload: ' + error.message); return }
      const { data: { publicUrl } } = supabase.storage.from('action-attachments').getPublicUrl(path)
      const novo = { nome: file.name, url: publicUrl, tipo: file.type, tamanho: file.size, em: new Date().toISOString() }
      set('anexos', [...(form.anexos || []), novo])
    } finally {
      setUploadingAnexo(false)
      e.target.value = ''
    }
  }

  function removeAnexo(idx) {
    set('anexos', (form.anexos || []).filter((_, i) => i !== idx))
  }

  // ── Progresso de tarefas (mostrado no topo, no headerExtra) ────────────────
  const totalTarefas     = tarefasDaAcao.length
  const concluidasTarefas = tarefasDaAcao.filter(t => t.status === 'concluida').length
  const pctTarefas        = totalTarefas ? Math.round((concluidasTarefas / totalTarefas) * 100) : null

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      onSave={handleSave}
      onDelete={!isNew ? () => onDelete(initial.id) : undefined}
      deleteConfirm="Excluir esta ação? Esta ação não pode ser desfeita."
      saving={saving}
      title={isNew ? 'Nova Ação' : form.titulo || 'Editar Ação'}
      subtitle={isNew ? 'Atividade operacional com unidade de franquia' : form.empresa_nome}
      saveLabel={isNew ? 'Criar Ação' : 'Salvar alterações'}
      columns={1}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      headerActions={!isNew && (
        <button type="button" onClick={onDuplicate} title="Duplicar ação"
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7,
            border:'1px solid var(--border)', background:'none', color:'var(--text-muted)',
            fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
          📋 Duplicar
        </button>
      )}
      headerExtra={!isNew && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {/* Resumo rápido — tipo/status/franquia/responsável/período/criado/atualizado */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'4px 14px', fontSize:11.5, color:'var(--text-muted)' }}>
            <span><TipoBadge tipo={form.tipo} tiposMap={tiposMap} /></span>
            <span><StatusBadge status={form.status} /></span>
            <span>👤 {form.responsavel_nome || '—'}</span>
            <span>🗓 {fmtPeriodo(form.data_inicio, form.data_fim)}</span>
            {initial.criado_em && <span>Criado em {new Date(initial.criado_em).toLocaleDateString('pt-BR')}</span>}
            {initial.updated_at && <span>Atualizado em {new Date(initial.updated_at).toLocaleDateString('pt-BR')}</span>}
          </div>
          {/* Progresso de tarefas */}
          {pctTarefas !== null && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>{concluidasTarefas} de {totalTarefas} tarefas concluídas</span>
                <span style={{ fontSize:12, fontWeight:800, color: pctTarefas===100 ? '#10B981' : 'var(--accent)', fontFamily:'var(--mono)' }}>{pctTarefas}%</span>
              </div>
              <div style={{ height:6, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background: pctTarefas===100 ? '#10B981' : 'var(--accent)', width:`${pctTarefas}%`, transition:'width .4s' }} />
              </div>
            </div>
          )}
        </div>
      )}
    >
      {/* ── Aba Dados ── */}
      {tab === 'dados' && (() => {
        // Campos condicionais por tipo — só quando o tipo configurado sinaliza
        // uma modalidade (via ícone/slug); sem inventar colunas novas no banco,
        // reaproveita "Local" com um rótulo/placeholder contextual.
        const tipoAtualLabel = (tiposMap[form.tipo]?.label || '').toLowerCase()
        const ehOnline = /webinar|online|virtual|live/.test(tipoAtualLabel)
        const localLabel = ehOnline ? 'Link / Plataforma' : 'Local'
        const localPlaceholder = ehOnline ? 'Ex: Zoom, Teams, link da sala…' : 'Ex: Online / São Paulo'

        return (
          <>
            <Bloco title="Informações gerais">
              <FormGrid cols={2}>
                <FormField label="Tipo de ação" required>
                  <select className="so-field" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                    {Object.entries(tiposMap).map(([k, c]) => (
                      <option key={k} value={k}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Status">
                  <select className="so-field" value={form.status} onChange={e => set('status', e.target.value)}>
                    {Object.entries(STATUS_ACAO).map(([k, c]) => (
                      <option key={k} value={k}>{c.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Título" required error={errs.titulo} style={{ gridColumn: 'span 2' }}>
                  <input className="so-field" value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex: Treinamento Técnico Plataforma v3"
                    style={{ borderColor: errs.titulo ? '#DC2626' : '' }} />
                </FormField>

                <FormField label="Unidade / Franquia" required error={errs.empresa_id} style={{ gridColumn: 'span 2' }}>
                  <select className="so-field" value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}
                    style={{ borderColor: errs.empresa_id ? '#DC2626' : '' }}>
                    <option value="">— Selecione —</option>
                    {empresasOpts.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </FormField>

                <FormField label="Outras unidades/franquias envolvidas (opcional)" style={{ gridColumn: 'span 2' }}>
                  <MultiSelect
                    options={empresasOpts.filter(e => String(e.id) !== String(form.empresa_id)).map(e => ({ value: e.id, label: e.nome }))}
                    value={form.franquias_adicionais_ids || []}
                    onChange={v => set('franquias_adicionais_ids', v)}
                    placeholder="Selecionar unidades adicionais…"
                  />
                </FormField>

                <FormField label="Responsável (ISV)" style={{ gridColumn: 'span 2' }}>
                  <select className="so-field" value={form.responsavel_id} onChange={e => set('responsavel_id', e.target.value)}>
                    <option value="">— Selecione —</option>
                    {responsaveisOpts.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                </FormField>

                <FormField label="Descrição / Objetivos" style={{ gridColumn: 'span 2' }}>
                  <textarea className="so-field" rows={3} style={{ resize:'vertical' }} value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} placeholder="Objetivos, conteúdo programático, observações…" />
                </FormField>
              </FormGrid>
            </Bloco>

            <Bloco title="Agenda">
              <FormGrid cols={2}>
                <FormField label="Data e hora de início" required error={errs.data_inicio}>
                  <input className="so-field" type="datetime-local" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)}
                    style={{ borderColor: errs.data_inicio ? '#DC2626' : '' }} />
                </FormField>

                <FormField label="Data e hora de fim">
                  <input className="so-field" type="datetime-local" value={form.data_fim || ''} onChange={e => set('data_fim', e.target.value)} />
                </FormField>

                <FormField label={localLabel}>
                  <input className="so-field" value={form.local || ''} onChange={e => set('local', e.target.value)} placeholder={localPlaceholder} />
                </FormField>

                <FormField label="Vagas">
                  <input className="so-field" type="number" min="0" value={form.vagas} onChange={e => set('vagas', e.target.value)} placeholder="Deixe vazio para ilimitado" />
                </FormField>
              </FormGrid>
            </Bloco>

            <Bloco title="Financeiro">
              <FormGrid cols={2}>
                <FormField label="Custo previsto (R$)">
                  <input className="so-field" type="number" min="0" step="0.01" value={form.custo_previsto || ''} onChange={e => set('custo_previsto', e.target.value)} placeholder="0,00" />
                </FormField>

                <FormField label="Custo realizado (R$)">
                  <div className="so-field" style={{ background:'var(--surface)', color:'var(--text-muted)', cursor:'default', display:'flex', alignItems:'center' }}>
                    {fmtMoeda((form.custos || []).reduce((s, c) => s + (c.executado ? (Number(c.valor_realizado) || 0) : 0), 0))}
                  </div>
                </FormField>

                <FormField label="Centro de Custo" hint="Governança financeira — alimenta o Orçamento">
                  <select className="so-field" value={form.centro_custo_id || ''} onChange={e => set('centro_custo_id', e.target.value)}>
                    <option value="">— Nenhum —</option>
                    {(centrosCusto || []).filter(c => c.status === 'ativo').map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </FormField>
              </FormGrid>
            </Bloco>
          </>
        )
      })()}

      {/* ── Aba Custos ── */}
      {tab === 'custos' && (
        <div style={{ padding: '16px 20px' }}>
          <CustosSection
            items={form.custos || []}
            // Aprovar/Rejeitar custo é restrito a Admin, Financeiro, ou o
            // responsável (dono) do Centro de Custo vinculado à Ação.
            podeAprovar={isAdmin || profile?.papel === 'financeiro'
              || (!!form.centro_custo_id && (centrosCusto || []).find(c => c.id === form.centro_custo_id)?.responsavel_id === profile?.id)}
            nomeUsuario={profile?.full_name || profile?.email || 'Usuário'}
            onAdd={() => set('custos', [...(form.custos || []), { id: crypto.randomUUID(), descricao: '', valor_previsto: '', valor_realizado: '', executado: false, aprovacoes: [] }])}
            onUpdate={(id, patch) => set('custos', (form.custos || []).map(c => c.id === id ? { ...c, ...patch } : c))}
            onRemove={id => set('custos', (form.custos || []).filter(c => c.id !== id))}
          />
        </div>
      )}

      {/* ── Aba Documentos ── */}
      {/* Vincula registros reais do módulo Documentos (não é mais uma lista
          de links soltos própria da Ação) — igual ao padrão usado em
          Oportunidades pra Playbook/Questionário: a Ação guarda só os ids,
          o conteúdo (título, categoria, arquivo/link) vem do módulo. */}
      {tab === 'documentos' && (() => {
        const documentoIds = form.documento_ids || []
        const vinculados = allDocs.filter(d => documentoIds.includes(d.id))
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:6 }}>
                Documentos do módulo
              </label>
              <MultiSelect
                options={allDocs.map(d => ({ value: d.id, label: d.title }))}
                value={documentoIds}
                onChange={v => set('documento_ids', v)}
                placeholder="Selecionar documentos cadastrados…"
              />
              <span style={{ fontSize:11, color:'var(--text-muted)', marginTop:4, display:'block' }}>
                Não encontrou o documento? Cadastre em{' '}
                <Link to="/documentos" style={{ color:'var(--accent)', fontWeight:600 }}>Documentos</Link> e volte pra vinculá-lo aqui.
              </span>
            </div>

            {vinculados.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:'20px 0' }}>
                Nenhum documento vinculado ainda.
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {vinculados.map(d => {
                  const cfgCat = CATEGORIA_CFG[d.categoria] || CATEGORIA_CFG.outro
                  const link = d.file_url || d.link_externo
                  return (
                    <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                      border:'1px solid var(--border)', borderRadius:8, background:'var(--surface2)' }}>
                      <span style={{ fontSize:15, flexShrink:0 }}>{cfgCat.icon}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.title}</div>
                        <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20, background:cfgCat.bg, color:cfgCat.color }}>{cfgCat.label}</span>
                      </div>
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer"
                          style={{ padding:'5px 10px', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--accent)', textDecoration:'none', whiteSpace:'nowrap', fontFamily:'var(--font)', flexShrink:0 }}>
                          ↗ Abrir
                        </a>
                      )}
                      <button onClick={() => set('documento_ids', documentoIds.filter(id => id !== d.id))}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, padding:'0 4px', lineHeight:1, flexShrink:0 }}>×</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Aba Anexos ── */}
      {tab === 'anexos' && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {/* Área de upload */}
          <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'28px 16px', border:'2px dashed var(--border)', borderRadius:10, background:'var(--surface2)', cursor: uploadingAnexo ? 'wait' : 'pointer', opacity: uploadingAnexo ? 0.6 : 1 }}>
            <span style={{ fontSize:28 }}>📎</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{uploadingAnexo ? 'Enviando…' : 'Clique para anexar arquivo'}</span>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>PDF, imagens, planilhas, documentos</span>
            <input type="file" style={{ display:'none' }} disabled={uploadingAnexo || isNew} onChange={handleUploadAnexo} />
          </label>
          {isNew && <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center', margin:0 }}>Salve a ação primeiro para poder adicionar anexos.</p>}

          {/* Lista de anexos */}
          {(form.anexos || []).length === 0
            ? <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:'16px 0' }}>Nenhum anexo ainda.</div>
            : (form.anexos || []).map((a, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8 }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{a.tipo?.startsWith('image') ? '🖼️' : a.tipo?.includes('pdf') ? '📄' : '📎'}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, fontWeight:600, color:'var(--accent)', textDecoration:'none', display:'block', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{a.nome}</a>
                  <span style={{ fontSize:10, color:'var(--text-muted)' }}>{a.em ? new Date(a.em).toLocaleDateString('pt-BR') : ''} · {a.tamanho ? (a.tamanho / 1024).toFixed(0) + ' KB' : ''}</span>
                </div>
                <button onClick={() => removeAnexo(i)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, padding:'2px 4px', flexShrink:0 }}>×</button>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Aba Tarefas ── */}
      {tab === 'tarefas' && !isNew && (
        <AcaoTarefasTab
          acao={initial}
          tarefas={tarefas}
          saveTarefa={saveTarefa}
          deleteTarefa={deleteTarefa}
          tiposTarefa={tiposTarefa}
        />
      )}
      {tab === 'tarefas' && isNew && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>💡</div>
          <div style={{ fontSize:13 }}>Salve a ação primeiro para poder adicionar tarefas.</div>
        </div>
      )}

      {/* ── Aba Participantes ── */}
      {tab === 'participantes' && !isNew && (
        <AcaoParticipantesTab acaoId={initial.id}
          franquiaIds={[String(initial.empresa_id), ...(initial.franquias_adicionais_ids || []).map(String)].filter(Boolean)}
          progressoTreinamento={ehTreinamento ? { itens: acaoModulos.itens, progresso: acaoModulos.progresso } : null} />
      )}
      {tab === 'participantes' && isNew && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>💡</div>
          <div style={{ fontSize:13 }}>Salve a ação primeiro para poder adicionar participantes.</div>
        </div>
      )}

      {/* ── Aba Módulos (só Treinamento) ── */}
      {tab === 'modulos' && !isNew && ehTreinamento && (
        <AcaoModulosTab
          acaoModulos={acaoModulos}
          allDocs={allDocs}
          responsaveisOpts={responsaveisOpts}
          participantes={membrosDaAcao.filter(m => m.acao_id === initial.id)}
          souParceiro={souParceiro}
          meuSellerId={meuSellerId}
        />
      )}
      {tab === 'modulos' && isNew && ehTreinamento && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>💡</div>
          <div style={{ fontSize:13 }}>Salve a ação primeiro para poder adicionar módulos.</div>
        </div>
      )}
    </SlideOver>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Acoes() {
  const { acoes, save: saveAcao, remove: deleteAcao } = useActions()
  const { tarefas, save: saveTarefa, remove: deleteTarefa } = useTasks()
  const { registrar: log } = useAuditLog()
  const { parceiros: franquiasCad } = useParceiros()
  const { branches }   = useBranches()
  const [usuariosCad]  = useLocalState('settings:perfis_v2', [])
  const { tipos: tiposLista } = useTiposAcao()
  const tiposMap = useMemo(() => {
    const base = tiposLista.length ? tiposLista : Object.entries(TIPOS_ACAO_DEFAULT).map(([k, v]) => ({ ...v, slug: k, uso: 'acao' }))
    const filtrados = base.filter(t => t.ativo !== false && (!t.uso || t.uso === 'acao' || t.uso === 'ambos'))
    return filtrados.length ? listToMap(filtrados) : TIPOS_ACAO_DEFAULT
  }, [tiposLista])
  const tiposTarefa = useMemo(() => {
    const lista = tiposLista.filter(t => t.ativo !== false && (t.uso === 'tarefa' || t.uso === 'ambos'))
    return lista.length ? lista : TIPOS_TAREFA_DEFAULT
  }, [tiposLista])

  const [slideOpen, setSlideOpen] = useState(false)
  const [editando,  setEditando]  = useState(null)
  const [visao,     setVisao]     = useLocalState('acoes:visao', 'lista') // 'lista' | 'franquias'

  const [search,        setSearch]        = useLocalState('browse:acoes:search', '')
  const [activeFilters, setActiveFilters] = useLocalState('browse:acoes:filters', {})
  // Agrupar por — só tem efeito na visão em Lista (o card view não agrupa)
  const [groupByKey, setGroupByKey] = useLocalState('acoes:groupBy', 'none')
  // franquias com a lista de ações expandida (por padrão só mostra as 3 primeiras)
  const [franquiasExpandidas, setFranquiasExpandidas] = useState(new Set())

  const empresasOpts = useMemo(() => {
    if (franquiasCad.length > 0)
      return franquiasCad.filter(f => f.situacao !== 'inativo')
        .map(f => ({ id: String(f.id), nome: f.codigo ? `[${f.codigo}] ${f.nome}` : f.nome }))
    return branches.map(b => ({ id: b.id, nome: b.name }))
  }, [franquiasCad, branches])

  const responsaveisOpts = useMemo(() => {
    const lista = usuariosCad.length > 0 ? usuariosCad : RESPONSAVEIS
    return lista.filter(u => u.status !== 'inativo').map(u => ({ id: u.id, nome: u.nome }))
  }, [usuariosCad])

  // ── filtros ──────────────────────────────────────────────────────────────
  const lista = useMemo(() => {
    const q    = search.toLowerCase()
    const tipo = activeFilters.tipo       || []
    const stat = activeFilters.status     || []
    const emp  = activeFilters.empresa    || []
    const resp = activeFilters.responsavel || []
    const per  = activeFilters.periodo    || []

    const hoje     = new Date().toISOString().slice(0, 10)
    const em7      = new Date(); em7.setDate(em7.getDate() + 7)
    const em7Str   = em7.toISOString().slice(0, 10)
    const em30     = new Date(); em30.setDate(em30.getDate() + 30)
    const em30Str  = em30.toISOString().slice(0, 10)

    function matchPeriodo(a) {
      if (!per.length) return true
      const d = (a.data_inicio || '').slice(0, 10)
      return per.some(p => {
        if (p === 'atrasadas')      return a.status === 'agendado' && d && d < hoje
        if (p === 'esta_semana')    return d >= hoje && d <= em7Str
        if (p === 'proximos_30')    return d >= hoje && d <= em30Str
        if (p === 'passadas')       return d && d < hoje
        return true
      })
    }

    return acoes.filter(a =>
      (!tipo.length   || tipo.includes(a.tipo)) &&
      (!stat.length   || stat.includes(a.status)) &&
      (!emp.length    || emp.includes(String(a.empresa_id))) &&
      (!resp.length   || resp.includes(String(a.responsavel_id))) &&
      matchPeriodo(a) &&
      (!q || a.titulo.toLowerCase().includes(q) ||
             (a.empresa_nome || '').toLowerCase().includes(q) ||
             (a.responsavel_nome || '').toLowerCase().includes(q))
    ).sort((a, b) => (a.data_inicio < b.data_inicio ? 1 : -1))
  }, [acoes, search, activeFilters])

  // ── Agrupamento por franquia ──────────────────────────────────────────────
  const porFranquia = useMemo(() => {
    const map = {}
    lista.forEach(a => {
      const key  = String(a.empresa_id || '')
      const nome = a.empresa_nome || 'Sem franquia'
      if (!map[key]) map[key] = { id: key, nome, acoes: [] }
      map[key].acoes.push(a)
    })
    return Object.values(map).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [lista])

  // ── KPIs — dobram como filtro rápido: clicar filtra a listagem pelo status,
  // clicar de novo no que já está ativo limpa o filtro. ──────────────────────
  function toggleStatusFilter(status) {
    setActiveFilters(prev => {
      const atual = prev.status || []
      const ativo = atual.length === 1 && atual[0] === status
      const { status: _drop, ...rest } = prev
      return ativo ? rest : { ...rest, status: [status] }
    })
  }

  const kpis = (data) => {
    const totalPrev = data.reduce((s, a) => s + (a.custos || []).reduce((ss, c) => ss + (Number(c.valor_previsto) || 0), 0), 0)
    const totalReal = data.reduce((s, a) => s + (a.custos || []).reduce((ss, c) => ss + (Number(c.valor_realizado) || 0), 0), 0)
    const overBudget = totalReal > totalPrev && totalPrev > 0
    const statusAtivo = (activeFilters.status || [])[0]
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr) 1.6fr', gap:12 }}>
        {[
          { label:'Total',        value: data.length,                                        color:'var(--text-muted)' },
          { key:'agendado',       label:'Agendadas',    value: data.filter(a => a.status==='agendado').length,     color:'#F59E0B' },
          { key:'em_andamento',   label:'Em andamento', value: data.filter(a => a.status==='em_andamento').length, color:'#3B82F6' },
          { key:'realizado',      label:'Realizadas',   value: data.filter(a => a.status==='realizado').length,    color:'#10B981' },
          { key:'cancelado',      label:'Canceladas',   value: data.filter(a => a.status==='cancelado').length,    color:'#EF4444' },
        ].map(k => (
          <div key={k.label} onClick={k.key ? () => toggleStatusFilter(k.key) : undefined}
            style={{ background: statusAtivo===k.key ? `${k.color}0F` : 'var(--surface)',
              border:`1px solid ${statusAtivo===k.key ? k.color : 'var(--border2)'}`,
              borderRadius:10, padding:'14px 18px', display:'flex', flexDirection:'column', gap:4,
              boxShadow:'var(--shadow)', borderTop:`3px solid ${k.color}`,
              cursor: k.key ? 'pointer' : 'default', transition:'all .12s' }}>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)' }}>{k.value}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
          </div>
        ))}
        {/* Card de custos — 5º card na mesma linha */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border2)',
          borderRadius:10, padding:'14px 18px', boxShadow:'var(--shadow)', borderTop:`3px solid ${overBudget ? '#EF4444' : '#6366F1'}` }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
            Custos {overBudget && <span style={{ color:'#EF4444', marginLeft:4 }}>▲</span>}
          </div>
          <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmtMoeda(totalPrev)}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>Previsto</div>
            </div>
            <div style={{ width:1, height:32, background:'var(--border)' }} />
            <div>
              <div style={{ fontSize:16, fontWeight:800, color: overBudget ? '#EF4444' : 'var(--text)', fontFamily:'var(--mono)' }}>{fmtMoeda(totalReal)}</div>
              <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>Realizado</div>
            </div>
            {totalPrev > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, minWidth:80 }}>
                <div style={{ flex:1, height:5, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.min(100, (totalReal/totalPrev)*100).toFixed(1)}%`, background: overBudget ? '#EF4444' : '#6366F1', borderRadius:99 }} />
                </div>
                <span style={{ fontSize:11, fontWeight:700, color: overBudget ? '#EF4444' : 'var(--text-muted)', flexShrink:0 }}>
                  {((totalReal/totalPrev)*100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      key: 'titulo',
      label: 'Ação',
      render: (val, row) => (
        <div>
          <div style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{val}</div>
          {row.local && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>📍 {row.local}</div>}
        </div>
      ),
    },
    {
      key: 'empresa_nome',
      label: 'Unidade / Franquia',
      render: val => <span style={{ fontSize:13, color:'var(--text-soft)' }}>{val || '—'}</span>,
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: val => <TipoBadge tipo={val} tiposMap={tiposMap} />,
    },
    {
      key: 'data_inicio',
      label: 'Data / Período',
      render: (val, row) => {
        const hoje     = new Date().toISOString().slice(0, 10)
        const atrasado = row.status === 'agendado' && val < hoje
        return (
          <span style={{ fontFamily:'var(--mono)', fontSize:12, color: atrasado ? 'var(--red)' : 'var(--text-soft)', whiteSpace:'nowrap' }}>
            {atrasado && '⚠ '}{fmtPeriodo(val, row.data_fim)}
          </span>
        )
      },
    },
    {
      key: 'responsavel_nome',
      label: 'Responsável',
      render: val => <AvatarCell nome={val} />,
    },
    {
      key: 'vagas',
      label: 'Vagas',
      render: (val, row) => <VagasBar vagas={val} inscritos={row.inscritos} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: val => <StatusBadge status={val} />,
    },
  ]

  // ── filters ───────────────────────────────────────────────────────────────
  const filters = [
    {
      key: 'tipo',
      label: 'Tipo',
      options: Object.entries(tiposMap).map(([k, v]) => ({ value: k, label: `${v.icon} ${v.label}` })),
    },
    {
      key: 'status',
      label: 'Status',
      options: Object.entries(STATUS_ACAO).map(([k, v]) => ({ value: k, label: v.label })),
    },
    {
      key: 'empresa',
      label: 'Unidade',
      options: empresasOpts.map(e => ({ value: String(e.id), label: e.nome })),
    },
    {
      key: 'responsavel',
      label: 'Responsável',
      options: responsaveisOpts.map(r => ({ value: String(r.id), label: r.nome })),
    },
    {
      key: 'periodo',
      label: 'Período',
      options: [
        { value: 'atrasadas',    label: 'Atrasadas' },
        { value: 'esta_semana',  label: 'Esta semana' },
        { value: 'proximos_30',  label: 'Próximos 30 dias' },
        { value: 'passadas',     label: 'Já ocorreram' },
      ],
    },
  ]

  // ── card render ───────────────────────────────────────────────────────────
  // Conteúdo "puro" — sem borda/sombra/onClick próprios. Quem usa decide o
  // wrapper: o card view nativo do BrowseLayout já embrulha isso num
  // container clicável com borda; a visão "Por Franquia" (viewFranquias)
  // embrulha explicitamente logo abaixo. Evita chrome duplicado (borda
  // dupla) e mantém "o card inteiro é clicável" garantido num único lugar.
  // `hideFranquia` esconde a linha da franquia quando o card já está dentro
  // de um grupo cujo cabeçalho mostra o nome da franquia — ela nunca
  // aparece duas vezes.
  function renderCard(acao, { hideFranquia } = {}) {
    const hoje     = new Date().toISOString().slice(0, 10)
    const atrasado = acao.status === 'agendado' && acao.data_inicio < hoje

    const proximaTarefa = tarefas
      .filter(t => String(t.entidade_id) === String(acao.id) && t.entidade_tipo === 'acao'
        && t.status !== 'concluida' && t.status !== 'cancelada')
      .sort((a, b) => (a.prazo || '9999-99-99').localeCompare(b.prazo || '9999-99-99'))[0]

    const ts   = tarefas.filter(t => String(t.entidade_id) === String(acao.id) && t.entidade_tipo === 'acao')
    const done = ts.filter(t => t.status === 'concluida').length
    const pct  = ts.length ? Math.round((done / ts.length) * 100) : null

    return (
      <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {/* Título — maior destaque, único elemento em negrito forte */}
        <div style={{ fontSize:14.5, fontWeight:700, color:'var(--text)', lineHeight:1.35 }}>
          {acao.titulo}
        </div>

        {/* Tipo + Franquia (uma única vez) — texto discreto, sem chips */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', fontSize:11.5, color:'var(--text-muted)' }}>
          <TipoBadge tipo={acao.tipo} tiposMap={tiposMap} />
          {!hideFranquia && acao.empresa_nome && (
            <>
              <span style={{ color:'var(--border)' }}>·</span>
              <span>{acao.empresa_nome}</span>
            </>
          )}
        </div>

        {/* Status + período + responsável — uma linha só, discreta */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginTop:2 }}>
          <StatusBadge status={acao.status} dense />
          <span style={{ fontSize:11.5, fontWeight:600, color: atrasado ? 'var(--red)' : 'var(--text-muted)' }}>
            {atrasado && '⚠ '}{fmtPeriodoCurto(acao.data_inicio, acao.data_fim)}
          </span>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:8, borderTop:'1px solid var(--border2)' }}>
          <AvatarCell nome={acao.responsavel_nome} />
          {pct !== null && (
            <span style={{ fontSize:11, fontWeight:700, color: pct===100 ? '#10B981' : 'var(--text-muted)' }}>
              {pct}% · {done}/{ts.length}
            </span>
          )}
        </div>

        {pct !== null && (
          <div style={{ height:4, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', background: pct===100 ? '#10B981' : 'var(--accent)', borderRadius:99, width:`${pct}%`, transition:'width .3s' }} />
          </div>
        )}

        {/* Próxima tarefa — só quando existir, sinaliza atraso em vermelho */}
        {proximaTarefa && (() => {
          const tarefaAtrasada = proximaTarefa.prazo && proximaTarefa.prazo < hoje
          return (
            <div style={{ fontSize:11, color: tarefaAtrasada ? 'var(--red)' : 'var(--text-muted)', display:'flex', gap:5, alignItems:'center' }}>
              <span style={{ opacity:0.7 }}>Próxima:</span>
              <span style={{ fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{proximaTarefa.titulo}</span>
              {proximaTarefa.prazo && <span style={{ flexShrink:0 }}>· {fmtDataCurta(proximaTarefa.prazo)}</span>}
            </div>
          )
        })()}
      </div>
    )
  }

  // ── linha compacta de ação — usada só na visão Por Franquia, pra não virar
  // um card enorme dentro de outro card. Título / status / período /
  // responsável / progresso / próxima tarefa, tudo numa linha só.
  function renderAcaoCompacta(acao) {
    const hoje = new Date().toISOString().slice(0, 10)
    const atrasado = acao.status === 'agendado' && acao.data_inicio < hoje
    const ts   = tarefas.filter(t => String(t.entidade_id) === String(acao.id) && t.entidade_tipo === 'acao')
    const done = ts.filter(t => t.status === 'concluida').length
    const pct  = ts.length ? Math.round((done / ts.length) * 100) : null
    const proximaTarefa = ts
      .filter(t => t.status !== 'concluida' && t.status !== 'cancelada')
      .sort((a, b) => (a.prazo || '9999-99-99').localeCompare(b.prazo || '9999-99-99'))[0]

    return (
      <div key={acao.id} onClick={() => { setEditando(acao); setSlideOpen(true) }}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'9px 14px', cursor:'pointer',
          borderRadius:8, border:'1px solid var(--border2)', background:'var(--surface)' }}>
        <StatusBadge status={acao.status} dense />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {acao.titulo}
          </div>
          {proximaTarefa && (
            <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              Próxima: {proximaTarefa.titulo}
            </div>
          )}
        </div>
        <span style={{ fontSize:11, fontWeight:600, color: atrasado ? 'var(--red)' : 'var(--text-muted)', flexShrink:0, whiteSpace:'nowrap' }}>
          {atrasado && '⚠ '}{fmtPeriodoCurto(acao.data_inicio, acao.data_fim)}
        </span>
        <span style={{ flexShrink:0 }}><AvatarCell nome={acao.responsavel_nome} /></span>
        {pct !== null && (
          <span style={{ fontSize:11, fontWeight:700, color: pct===100 ? '#10B981' : 'var(--text-muted)', flexShrink:0, width:36, textAlign:'right' }}>
            {pct}%
          </span>
        )}
      </div>
    )
  }

  async function handleSave(form) {
    const isNew = !editando?.id
    const saved = { ...form, id: editando?.id || novoId(acoes) }
    const res = await saveAcao(saved)
    if (res && res.ok === false) { alert('Erro ao salvar ação: ' + (res.message || 'tente novamente')); return }
    log(isNew ? 'criar' : 'editar', 'acao', saved.id, { descricao: `Ação ${isNew ? 'criada' : 'editada'}: ${form.titulo || form.tipo || ''}` })
    setSlideOpen(false)
    setEditando(null)
  }

  function handleDelete(id) {
    const a = acoes.find(x => x.id === id)
    deleteAcao(id)
    log('excluir', 'acao', id, { descricao: `Ação excluída: ${a?.titulo || a?.tipo || id}` })
    setSlideOpen(false)
    setEditando(null)
  }

  async function handleDuplicate() {
    if (!editando) return
    const { id: _oldId, criado_em: _c, custos, ...rest } = editando
    const copia = {
      ...rest,
      id: novoId(acoes),
      titulo: `${editando.titulo} (cópia)`,
      status: 'agendado',
      custos: (custos || []).map(c => ({ ...c, aprovacoes: [] })),
      criado_em: new Date().toISOString(),
    }
    const res = await saveAcao(copia)
    if (res && res.ok === false) { alert('Erro ao duplicar: ' + (res.message || 'tente novamente')); return }
    log('duplicar', 'acao', copia.id, { descricao: `Ação duplicada a partir de "${editando.titulo}"` })
    setEditando(copia)
  }

  // ── View por Franquias ────────────────────────────────────────────────────
  const viewFranquias = (
    <div style={{ padding:'0 28px 24px', display:'flex', flexDirection:'column', gap:20 }}>
      {/* KPIs */}
      <div style={{ paddingTop:20 }}>{kpis}</div>

      {/* Barra de busca + toggle + botão */}
      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
        <div style={{ flex:1, position:'relative' }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'var(--text-muted)', pointerEvents:'none' }}>⌕</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ação ou franquia…"
            style={{ width:'100%', boxSizing:'border-box', paddingLeft:32, paddingRight:12, height:36, borderRadius:8,
              border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:13,
              fontFamily:'var(--font)', outline:'none' }} />
        </div>
        <div style={{ display:'flex', gap:2, background:'var(--surface2)', borderRadius:9, padding:3, border:'1px solid var(--border)', flexShrink:0 }}>
          {[{ id:'lista', label:'Lista' }, { id:'franquias', label:'🏢 Por Parceiro' }].map(t => (
            <button key={t.id} type="button" onClick={() => setVisao(t.id)}
              style={{ padding:'5px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12,
                fontWeight: visao === t.id ? 700 : 500, fontFamily:'var(--font)',
                background: visao === t.id ? 'var(--surface)' : 'none',
                color: visao === t.id ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: visao === t.id ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                transition:'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>
        <Button onClick={() => { setEditando(null); setSlideOpen(true) }}>+ Nova Ação</Button>
      </div>

      {porFranquia.length === 0 && (
        <div style={{ textAlign:'center', padding:'56px 0', color:'var(--text-muted)' }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🏢</div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Nenhuma ação encontrada</div>
        </div>
      )}

      {/* Grid com espaçamento generoso — cada franquia é um bloco claramente
          independente, e todas compartilham exatamente a mesma estrutura pra
          permitir comparação visual direta. */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(420px, 1fr))', gap:28 }}>
      {porFranquia.map(grupo => {
        const hoje = new Date().toISOString().slice(0, 10)

        const agendadas    = grupo.acoes.filter(a => a.status === 'agendado').length
        const emAndamento  = grupo.acoes.filter(a => a.status === 'em_andamento').length
        const realizadas   = grupo.acoes.filter(a => a.status === 'realizado').length
        const canceladas   = grupo.acoes.filter(a => a.status === 'cancelado').length
        const atrasadas    = grupo.acoes.filter(a => a.status === 'agendado' && a.data_inicio && a.data_inicio.slice(0,10) < hoje).length

        // tarefas de todas as ações deste grupo
        const idsAcoes      = new Set(grupo.acoes.map(a => String(a.id)))
        const tarefasGrupo  = tarefas.filter(t => t.entidade_tipo === 'acao' && idsAcoes.has(String(t.entidade_id)))
        const tPendentes    = tarefasGrupo.filter(t => t.status === 'pendente').length
        const tConcluidas   = tarefasGrupo.filter(t => t.status === 'concluida').length
        const pctExecucao   = tarefasGrupo.length ? Math.round((tConcluidas / tarefasGrupo.length) * 100) : null

        const saude = calcSaudeFranquia({ atrasadas, pendentes: tPendentes, pct: pctExecucao })

        // Próxima entrega = data de início mais próxima entre as ações ainda
        // não realizadas/canceladas.
        const proximaEntrega = grupo.acoes
          .filter(a => a.status !== 'realizado' && a.status !== 'cancelado' && a.data_inicio)
          .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))[0]

        // Última atualização = a mais recente entre criado_em das ações do grupo
        const ultimaAtualizacao = grupo.acoes
          .map(a => a.updated_at || a.criado_em)
          .filter(Boolean)
          .sort()
          .reverse()[0]

        const expandido = franquiasExpandidas.has(grupo.id)
        const acoesVisiveis = expandido ? grupo.acoes : grupo.acoes.slice(0, 3)
        const restantes = grupo.acoes.length - acoesVisiveis.length

        return (
          <div key={grupo.id} style={{ border:'1px solid var(--border)', borderRadius:12,
            background:'var(--surface)', boxShadow:'var(--shadow)', overflow:'hidden', display:'flex', flexDirection:'column' }}>

            {/* ── 1. Franquia + 3. Saúde + alertas ── */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border2)', background:'var(--surface2)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
                  <span style={{ fontSize:16, flexShrink:0 }}>🏢</span>
                  <span style={{ fontSize:15, fontWeight:800, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {grupo.nome}
                  </span>
                </div>
                <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:700, color:saude.color, flexShrink:0, whiteSpace:'nowrap' }}>
                  {saude.emoji} {saude.label}
                </span>
              </div>

              {/* Alertas discretos — só aparecem quando há algo relevante */}
              {(atrasadas > 0 || tPendentes > 0) && (
                <div style={{ display:'flex', gap:12, marginTop:6, fontSize:11.5, fontWeight:600 }}>
                  {atrasadas > 0 && <span style={{ color:'#EF4444' }}>🔴 {atrasadas} atrasada{atrasadas!==1?'s':''}</span>}
                  {tPendentes > 0 && <span style={{ color:'#F59E0B' }}>🟡 {tPendentes} pendente{tPendentes!==1?'s':''}</span>}
                </div>
              )}
            </div>

            {/* ── 2. Indicadores da franquia — KPIs pequenos, sem caixas coloridas ── */}
            <div style={{ display:'flex', gap:16, padding:'12px 20px', borderBottom:'1px solid var(--border2)', flexWrap:'wrap' }}>
              {[
                { dot:'#F59E0B', val:agendadas,   label:'Agendadas'    },
                { dot:'#3B82F6', val:emAndamento, label:'Em andamento' },
                { dot:'#10B981', val:realizadas,  label:'Realizadas'   },
                { dot:'#9CA3AF', val:canceladas,  label:'Canceladas'   },
              ].map(k => (
                <div key={k.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:k.dot, flexShrink:0 }} />
                  <span style={{ fontSize:12.5, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{k.val}</span>
                  <span style={{ fontSize:10.5, color:'var(--text-muted)' }}>{k.label}</span>
                </div>
              ))}
            </div>

            {/* ── Resumo executivo: volume + progresso + score de execução ── */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border2)', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>
                  {grupo.acoes.length} ação{grupo.acoes.length!==1?'ões':''} · {tarefasGrupo.length} tarefa{tarefasGrupo.length!==1?'s':''}
                </span>
                {pctExecucao !== null && (
                  <span style={{ fontSize:13, fontWeight:800, fontFamily:'var(--mono)', color:saude.color }}>
                    Execução: {pctExecucao}%
                  </span>
                )}
              </div>
              {pctExecucao !== null && (
                <div style={{ height:6, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, background:saude.color, width:`${pctExecucao}%`, transition:'width .4s' }} />
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', gap:10, fontSize:10.5, color:'var(--text-muted)', flexWrap:'wrap' }}>
                <span>Próxima entrega: <b style={{ color:'var(--text-soft)' }}>{proximaEntrega ? fmtDataCurta(proximaEntrega.data_inicio) : '—'}</b></span>
                <span>Última atualização: <b style={{ color:'var(--text-soft)' }}>{fmtRelativo(ultimaAtualizacao)}</b></span>
              </div>
            </div>

            {/* ── 4. Lista de ações — compacta, só as 3 primeiras por padrão ── */}
            <div style={{ padding:'12px 20px 16px', display:'flex', flexDirection:'column', gap:6 }}>
              {acoesVisiveis.map(acao => renderAcaoCompacta(acao))}
              {restantes > 0 && (
                <button onClick={() => setFranquiasExpandidas(prev => new Set(prev).add(grupo.id))}
                  style={{ padding:'7px 0', background:'none', border:'none', cursor:'pointer',
                    fontSize:12, fontWeight:700, color:'var(--accent)', fontFamily:'var(--font)', textAlign:'left' }}>
                  + {restantes} ação{restantes!==1?'ões':''}
                </button>
              )}
              {expandido && grupo.acoes.length > 3 && (
                <button onClick={() => setFranquiasExpandidas(prev => { const n=new Set(prev); n.delete(grupo.id); return n })}
                  style={{ padding:'7px 0', background:'none', border:'none', cursor:'pointer',
                    fontSize:12, fontWeight:600, color:'var(--text-muted)', fontFamily:'var(--font)', textAlign:'left' }}>
                  Mostrar menos
                </button>
              )}
              {grupo.acoes.length === 0 && (
                <div style={{ textAlign:'center', padding:'10px 0', fontSize:12, color:'var(--text-muted)' }}>Sem ações no período.</div>
              )}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )

  const toggleVisao = (
    <>
      {/* "Agrupar por" — só afeta a visão em Lista (tabela); Cards e Por
          Franquia já têm seu próprio agrupamento fixo. */}
      {visao === 'lista' && (
        <select value={groupByKey} onChange={e => setGroupByKey(e.target.value)}
          style={{ height:36, padding:'0 10px', borderRadius:8, border:'1px solid var(--border)',
            background:'var(--surface)', color:'var(--text-soft)', fontSize:12, fontWeight:600,
            fontFamily:'var(--font)', cursor:'pointer' }}>
          <option value="none">Agrupar: Nenhum</option>
          <option value="empresa_nome">Agrupar: Franquia</option>
          <option value="responsavel_nome">Agrupar: Responsável</option>
          <option value="status">Agrupar: Status</option>
        </select>
      )}
      <div style={{ display:'flex', gap:2, background:'var(--surface2)', borderRadius:9,
        padding:3, border:'1px solid var(--border)' }}>
        {[{ id:'lista', label:'Lista' }, { id:'franquias', label:'🏢 Por Parceiro' }].map(t => (
          <button key={t.id} type="button" onClick={() => setVisao(t.id)}
            style={{ padding:'5px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12,
              fontWeight: visao === t.id ? 700 : 500, fontFamily:'var(--font)',
              background: visao === t.id ? 'var(--surface)' : 'none',
              color: visao === t.id ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: visao === t.id ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              transition:'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>
    </>
  )

  return (
    <>
      {visao === 'franquias' ? viewFranquias : (
        <BrowseLayout
          modulo="acoes"
          storageKey="acoes"
          kpis={kpis}
          kpisLabel="Indicadores"
          columns={columns}
          data={lista}
          keyField="id"
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          onNew={() => { setEditando(null); setSlideOpen(true) }}
          newLabel="Nova Ação"
          onRowClick={row => { setEditando(row); setSlideOpen(true) }}
          bulkEditFields={[
            { key: 'status', label: 'Status', type: 'select',
              options: Object.entries(STATUS_ACAO).map(([k, v]) => ({ value: k, label: v.label })) },
            { key: 'data_inicio', label: 'Data de início', type: 'date' },
          ]}
          onBulkEdit={(ids, changes) =>
            ids.forEach(id => { const a = acoes.find(a => a.id === id); if (a) saveAcao({ ...a, ...changes }) })
          }
          renderCard={renderCard}
          groupBy={groupByKey === 'none' ? undefined : (row => groupByKey === 'status'
            ? (STATUS_ACAO[row.status]?.label || row.status)
            : (row[groupByKey] || '—'))}
          secondaryActions={toggleVisao}
          emptyState={
            <div style={{ textAlign:'center', padding:'56px 0', color:'var(--text-muted)' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>🗓</div>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Nenhuma ação encontrada</div>
              <div style={{ fontSize:12, opacity:0.7 }}>Crie a primeira ação clicando em "+ Nova Ação"</div>
            </div>
          }
        />
      )}

      <AcaoSlideOver
        open={slideOpen}
        initial={editando}
        onSave={handleSave}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onClose={() => { setSlideOpen(false); setEditando(null) }}
        tiposMap={tiposMap}
        empresasOpts={empresasOpts}
        responsaveisOpts={responsaveisOpts}
        tarefas={tarefas}
        saveTarefa={saveTarefa}
        deleteTarefa={deleteTarefa}
        tiposTarefa={tiposTarefa}
      />
    </>
  )
}
