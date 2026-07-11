import { useState, useMemo, useCallback, useRef } from 'react'
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
import BrowseLayout from '../components/BrowseLayout'
import SlideOver, { FormGrid, FormField } from '../components/ui/SlideOver'
import Button from '../components/Button'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtData(d) {
  if (!d) return ''
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}
function fmtPeriodo(inicio, fim) {
  if (!inicio) return '—'
  if (!fim || fim === inicio) return fmtData(inicio)
  return `${fmtData(inicio)} → ${fmtData(fim)}`
}
function novoId(lista) { return Math.max(0, ...lista.map(a => a.id)) + 1 }
function listToMap(lista) {
  return Object.fromEntries(lista.map(t => [t.slug || t.key || t.id, t]))
}
function initials(nome) {
  return (nome || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
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
  tipo: 'treinamento',
  titulo: '', descricao: '',
  data_inicio: '', data_fim: '',
  responsavel_id: 'u1', responsavel_nome: 'Lucas Ferreira',
  local: '', vagas: '', inscritos: 0,
  status: 'agendado',
  tenant_id: 't1',
  custo_previsto: '',
  custos: [],
  documentos: [],
  anexos: [],
}

const APROVACAO_CFG = {
  aguardando: { label: 'Aguardando aprovação', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  aprovado:   { label: 'Aprovado',             color: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  rejeitado:  { label: 'Rejeitado',            color: '#EF4444', bg: '#FEE2E2', text: '#991B1B' },
}

function fmtMoeda(v) {
  if (v === '' || v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function TipoBadge({ tipo, tiposMap }) {
  const cfg = (tiposMap || TIPOS_ACAO_DEFAULT)[tipo] || { icon: '◎', label: tipo, color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px',
      borderRadius:20, background:cfg.bg, color:cfg.color, fontSize:11, fontWeight:600,
      whiteSpace:'nowrap', border:`1px solid ${cfg.color}22` }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const cfg = STATUS_ACAO[status] || { label: status, color:'#9A9590', bg:'#F1F5F9', text:'#475569' }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 9px',
      borderRadius:20, background:cfg.bg, color:cfg.text, fontSize:11, fontWeight:600,
      fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, display:'inline-block' }} />
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

// ─── SlideOver de cadastro ────────────────────────────────────────────────────
function AcaoSlideOver({ open, initial, onSave, onClose, onDelete, tiposMap, empresasOpts, responsaveisOpts, tarefas, saveTarefa, deleteTarefa, tiposTarefa }) {
  const isNew = !initial?.id
  const [tab, setTab] = useState('dados')
  const [form, setForm]   = useState(initial ? { ...EMPTY_ACAO, ...initial } : { ...EMPTY_ACAO })
  const [saving, setSaving] = useState(false)
  const [errs, setErrs] = useState({})
  const [uploadingAnexo, setUploadingAnexo] = useState(false)
  const [custosSelected, setCustosSelected] = useState([])
  const { profile, isAdmin } = useProfile()

  useMemo(() => {
    setForm(initial ? { ...EMPTY_ACAO, ...initial, vagas: initial.vagas || '', empresa_id: initial.empresa_id || '' } : { ...EMPTY_ACAO })
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

  const docsBadge = (form.documentos || []).length || undefined

  const tabs = [
    { key:'dados',      label:'Dados' },
    { key:'tarefas',    label:'Tarefas',    badge: tarefasBadge },
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
    >
      {/* ── Tab bar ── */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border2)', marginBottom:20, paddingBottom:0 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'8px 16px', background:'none', border:'none',
              borderBottom: tab===t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab===t.key ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: tab===t.key ? 700 : 500, fontSize:13, cursor:'pointer', fontFamily:'var(--font)', marginBottom:-1 }}>
            {t.label}
            {t.badge && <span style={{ fontSize:10, fontWeight:700, background:'var(--accent)', color:'#fff', borderRadius:99, padding:'1px 6px', marginLeft:2 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Aba Dados ── */}
      {tab === 'dados' && (
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

          <FormField label="Responsável (ISV)">
            <select className="so-field" value={form.responsavel_id} onChange={e => set('responsavel_id', e.target.value)}>
              <option value="">— Selecione —</option>
              {responsaveisOpts.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </FormField>

          <FormField label="Local">
            <input className="so-field" value={form.local || ''} onChange={e => set('local', e.target.value)} placeholder="Ex: Online / São Paulo" />
          </FormField>

          <FormField label="Data e hora de início" required error={errs.data_inicio}>
            <input className="so-field" type="datetime-local" value={form.data_inicio} onChange={e => set('data_inicio', e.target.value)}
              style={{ borderColor: errs.data_inicio ? '#DC2626' : '' }} />
          </FormField>

          <FormField label="Data e hora de fim">
            <input className="so-field" type="datetime-local" value={form.data_fim || ''} onChange={e => set('data_fim', e.target.value)} />
          </FormField>

          <FormField label="Vagas" style={{ gridColumn: 'span 2' }}>
            <input className="so-field" type="number" min="0" value={form.vagas} onChange={e => set('vagas', e.target.value)} placeholder="Deixe vazio para ilimitado" />
          </FormField>

          <FormField label="Custo previsto (R$)">
            <input className="so-field" type="number" min="0" step="0.01" value={form.custo_previsto || ''} onChange={e => set('custo_previsto', e.target.value)} placeholder="0,00" />
          </FormField>

          <FormField label="Custo realizado (R$)">
            <div className="so-field" style={{ background:'var(--surface2)', color:'var(--text-muted)', cursor:'default', display:'flex', alignItems:'center' }}>
              {fmtMoeda((form.custos || []).reduce((s, c) => s + (c.executado ? (Number(c.valor_realizado) || 0) : 0), 0))}
            </div>
          </FormField>

          <FormField label="Descrição / Objetivos" style={{ gridColumn: 'span 2' }}>
            <textarea className="so-field" rows={4} style={{ resize:'vertical' }} value={form.descricao || ''} onChange={e => set('descricao', e.target.value)} placeholder="Objetivos, conteúdo programático, observações…" />
          </FormField>
        </FormGrid>
      )}

      {/* ── Aba Custos ── */}
      {tab === 'custos' && (() => {
        const custos = form.custos || []
        const nomeUsuario = profile?.full_name || profile?.email || 'Usuário'
        const addCusto    = () => set('custos', [...custos, { id: crypto.randomUUID(), descricao:'', valor_previsto:'', valor_realizado:'', executado: false, aprovacoes:[], _open: false }])
        const updCusto    = (id, p) => set('custos', custos.map(c => c.id === id ? { ...c, ...p } : c))
        const remCusto    = (id) => { if (window.confirm('Remover?')) set('custos', custos.filter(c => c.id !== id)) }
        const aprovar     = (id, status) => {
          const obs = custos.find(c => c.id === id)?._obsInput || ''
          const entrada = { id: crypto.randomUUID(), status, obs, por: nomeUsuario, em: new Date().toISOString() }
          set('custos', custos.map(c => c.id === id ? { ...c, aprovacoes:[...(c.aprovacoes||[]), entrada], _obsInput:'' } : c))
        }
        const solicitarAprovacao = (id) => {
          const entrada = { id: crypto.randomUUID(), status: 'aguardando', obs: '', por: nomeUsuario, em: new Date().toISOString() }
          set('custos', custos.map(c => c.id === id ? { ...c, aprovacoes:[entrada] } : c))
        }
        const totalPrev = custos.reduce((s,c) => s + (Number(c.valor_previsto)||0), 0)
        const totalExec = custos.reduce((s,c) => s + (c.executado ? (Number(c.valor_realizado)||0) : 0), 0)
        const lbl = { fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', display:'block', marginBottom:3 }

        const selected = custosSelected
        const setSelected = setCustosSelected
        const toggleSel = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
        const allSel = custos.length > 0 && selected.length === custos.length
        const toggleAll = () => setSelected(allSel ? [] : custos.map(c => c.id))

        const bulkAprovar = (status) => {
          const obs = ''
          set('custos', custos.map(c => selected.includes(c.id)
            ? { ...c, aprovacoes:[...(c.aprovacoes||[]), { id: crypto.randomUUID(), status, obs, por: nomeUsuario, em: new Date().toISOString() }], _obsInput:'' }
            : c
          ))
          setSelected([])
        }
        const bulkExecutar = (executado) => {
          set('custos', custos.map(c => selected.includes(c.id) ? { ...c, executado } : c))
          setSelected([])
        }

        return (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {/* Totalizador */}
            {custos.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:4 }}>
                {[['Total previsto', fmtMoeda(totalPrev), false],['Total executado', fmtMoeda(totalExec), totalExec > totalPrev]].map(([lbl2,val,red]) => (
                  <div key={lbl2} style={{ padding:'8px 12px', background:'var(--surface2)', borderRadius:7, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{lbl2}</div>
                    <div style={{ fontSize:14, fontWeight:700, color: red?'#EF4444':'var(--text)', marginTop:2 }}>{val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Barra de ações em lote */}
            {custos.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
                <input type="checkbox" checked={allSel} onChange={toggleAll} style={{ cursor:'pointer' }} />
                <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                  {selected.length > 0 ? `${selected.length} selecionado(s)` : 'Selecionar todos'}
                </span>
                {selected.length > 0 && (
                  <>
                    {isAdmin && (
                      <>
                        <button onClick={() => bulkAprovar('aprovado')}
                          style={{ padding:'3px 10px', borderRadius:5, border:'none', background:'#10B981', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>
                          ✓ Aprovar selecionados
                        </button>
                        <button onClick={() => bulkAprovar('rejeitado')}
                          style={{ padding:'3px 10px', borderRadius:5, border:'none', background:'#EF4444', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>
                          ✗ Rejeitar selecionados
                        </button>
                      </>
                    )}
                    <button onClick={() => bulkExecutar(true)}
                      style={{ padding:'3px 10px', borderRadius:5, border:'1px solid #6366F1', background:'none', color:'#6366F1', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>
                      ✔ Marcar como executado
                    </button>
                    <button onClick={() => bulkExecutar(false)}
                      style={{ padding:'3px 10px', borderRadius:5, border:'1px solid var(--border)', background:'none', color:'var(--text-muted)', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>
                      Desmarcar execução
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Items */}
            {custos.map((c, idx) => {
              const ultima = (c.aprovacoes||[]).slice(-1)[0]
              const cfgAp  = ultima ? (APROVACAO_CFG[ultima.status] || APROVACAO_CFG.aguardando) : null
              const aprovado = ultima?.status === 'aprovado'
              const isOpen = c._open !== false
              return (
                <div key={c.id} style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                  {/* Linha de resumo (sempre visível) */}
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'var(--surface2)', cursor:'pointer' }}
                    onClick={() => updCusto(c.id, { _open: !isOpen })}>
                    <input type="checkbox" checked={selected.includes(c.id)} onClick={e => e.stopPropagation()} onChange={() => toggleSel(c.id)} style={{ cursor:'pointer', flexShrink:0 }} />
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', flexShrink:0 }}>#{idx+1}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--text)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {c.descricao || <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>Sem descrição</span>}
                    </span>
                    <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{fmtMoeda(c.valor_previsto)}</span>
                    {cfgAp && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'1px 6px', borderRadius:20, background:cfgAp.bg, color:cfgAp.text, fontSize:10, fontWeight:700, flexShrink:0 }}>
                        <span style={{ width:4, height:4, borderRadius:'50%', background:cfgAp.color }} />{cfgAp.label}
                      </span>
                    )}
                    {aprovado && (
                      <span style={{ display:'inline-flex', alignItems:'center', gap:3, padding:'1px 6px', borderRadius:20,
                        background: c.executado ? '#EDE9FE' : 'var(--surface)', color: c.executado ? '#5B21B6' : 'var(--text-muted)',
                        fontSize:10, fontWeight:700, border:'1px solid var(--border)', flexShrink:0 }}>
                        {c.executado ? '✔ Executado' : '— Não executado'}
                      </span>
                    )}
                    <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{isOpen ? '▲' : '▼'}</span>
                    <button onClick={e => { e.stopPropagation(); remCusto(c.id) }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:13, padding:'0 2px', lineHeight:1, flexShrink:0 }}>×</button>
                  </div>

                  {/* Conteúdo expandido */}
                  {isOpen && (
                    <>
                      <div style={{ padding:'8px 10px', display:'grid', gridTemplateColumns:'1fr 100px 100px', gap:8, alignItems:'start' }}>
                        <div>
                          <label style={lbl}>Descrição / Justificativa</label>
                          <input className="so-field" value={c.descricao} onChange={e => updCusto(c.id,{descricao:e.target.value})} placeholder="Finalidade do custo…" style={{ width:'100%', boxSizing:'border-box' }} />
                        </div>
                        <div>
                          <label style={lbl}>Previsto (R$)</label>
                          <input className="so-field" type="number" min="0" step="0.01" value={c.valor_previsto} onChange={e => updCusto(c.id,{valor_previsto:e.target.value})} placeholder="0,00" style={{ width:'100%', boxSizing:'border-box' }} />
                        </div>
                        <div>
                          <label style={lbl}>Realizado (R$)</label>
                          <input className="so-field" type="number" min="0" step="0.01" value={c.valor_realizado} onChange={e => updCusto(c.id,{valor_realizado:e.target.value})} placeholder="0,00" style={{ width:'100%', boxSizing:'border-box' }} />
                        </div>
                      </div>

                      {/* Execução — só após aprovado */}
                      {aprovado && (
                        <div style={{ padding:'0 10px 8px', display:'flex', alignItems:'center', gap:8 }}>
                          <input type="checkbox" id={`exec-${c.id}`} checked={!!c.executado} onChange={e => updCusto(c.id, { executado: e.target.checked })} style={{ cursor:'pointer' }} />
                          <label htmlFor={`exec-${c.id}`} style={{ fontSize:12, fontWeight:600, color: c.executado ? '#5B21B6' : 'var(--text)', cursor:'pointer' }}>
                            {c.executado ? 'Custo executado' : 'Marcar como executado'}
                          </label>
                        </div>
                      )}

                      {/* Histórico */}
                      {(c.aprovacoes||[]).length > 0 && (
                        <div style={{ margin:'0 10px 6px', background:'var(--surface2)', borderRadius:6, padding:'6px 8px' }}>
                          {(c.aprovacoes||[]).map(ap => {
                            const ac = APROVACAO_CFG[ap.status] || APROVACAO_CFG.aguardando
                            return (
                              <div key={ap.id} style={{ display:'flex', gap:6, fontSize:10, marginBottom:2, color:'var(--text-muted)' }}>
                                <span style={{ color:ac.color, fontWeight:700 }}>{ap.status==='aprovado'?'✓':ap.status==='rejeitado'?'✗':'⏳'}</span>
                                <span><b style={{ color:'var(--text)' }}>{ac.label}</b> · {ap.por} · {new Date(ap.em).toLocaleString('pt-BR')}{ap.obs ? ` — ${ap.obs}` : ''}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Ações de aprovação */}
                      {(c.aprovacoes||[]).length === 0 ? (
                        <div style={{ padding:'0 10px 8px' }}>
                          <button onClick={() => solicitarAprovacao(c.id)}
                            style={{ padding:'5px 12px', borderRadius:6, border:'1px solid var(--accent)', background:'none', color:'var(--accent)', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>
                            Solicitar aprovação
                          </button>
                        </div>
                      ) : isAdmin && !aprovado ? (
                        <div style={{ display:'flex', gap:6, padding:'0 10px 8px', alignItems:'center' }}>
                          <input className="so-field" value={c._obsInput||''} onChange={e => updCusto(c.id,{_obsInput:e.target.value})}
                            placeholder="Observação (opcional)…" style={{ flex:1, fontSize:11 }} />
                          <button onClick={() => aprovar(c.id,'aprovado')}
                            style={{ padding:'5px 10px', borderRadius:6, border:'none', background:'#10B981', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' }}>
                            ✓ Aprovar
                          </button>
                          <button onClick={() => aprovar(c.id,'rejeitado')}
                            style={{ padding:'5px 10px', borderRadius:6, border:'none', background:'#EF4444', color:'#fff', fontWeight:700, fontSize:11, cursor:'pointer', fontFamily:'var(--font)', whiteSpace:'nowrap' }}>
                            ✗ Rejeitar
                          </button>
                        </div>
                      ) : !isAdmin && !aprovado ? (
                        <div style={{ padding:'4px 10px 8px', fontSize:11, color:'var(--text-muted)' }}>Aguardando aprovação do administrador.</div>
                      ) : null}
                    </>
                  )}
                </div>
              )
            })}
            <button onClick={addCusto} style={{ padding:'6px 0', borderRadius:7, border:'1px dashed var(--border)', background:'none', fontSize:12, fontWeight:600, color:'var(--accent)', cursor:'pointer', fontFamily:'var(--font)' }}>
              + Adicionar item de custo
            </button>
          </div>
        )
      })()}

      {/* ── Aba Documentos ── */}
      {tab === 'documentos' && (() => {
        const docs = form.documentos || []
        const addDoc = () => set('documentos', [...docs, { id: crypto.randomUUID(), titulo:'', url:'', tipo:'externo', obs:'' }])
        const updDoc = (id, p) => set('documentos', docs.map(d => d.id === id ? { ...d, ...p } : d))
        const remDoc = (id) => set('documentos', docs.filter(d => d.id !== id))
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {docs.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:'28px 0' }}>
                Nenhum documento vinculado ainda.
              </div>
            )}
            {docs.map(d => (
              <div key={d.id} style={{ border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 100px auto', gap:8, alignItems:'center' }}>
                  <input className="so-field" value={d.titulo} onChange={e => updDoc(d.id,{titulo:e.target.value})} placeholder="Título / nome do documento…" style={{ width:'100%', boxSizing:'border-box' }} />
                  <select className="so-field" value={d.tipo} onChange={e => updDoc(d.id,{tipo:e.target.value})}>
                    <option value="externo">Link externo</option>
                    <option value="contrato">Contrato</option>
                    <option value="proposta">Proposta</option>
                    <option value="ata">Ata</option>
                    <option value="nf">Nota fiscal</option>
                    <option value="outro">Outro</option>
                  </select>
                  <button onClick={() => remDoc(d.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16, padding:'0 4px', lineHeight:1 }}>×</button>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input className="so-field" value={d.url} onChange={e => updDoc(d.id,{url:e.target.value})} placeholder="https://… ou caminho do documento" style={{ flex:1, boxSizing:'border-box', fontFamily:'monospace', fontSize:11 }} />
                  {d.url && (
                    <a href={d.url} target="_blank" rel="noopener noreferrer"
                      style={{ padding:'5px 10px', borderRadius:6, border:'1px solid var(--border)', fontSize:11, color:'var(--accent)', textDecoration:'none', whiteSpace:'nowrap', fontFamily:'var(--font)' }}>
                      ↗ Abrir
                    </a>
                  )}
                </div>
                <input className="so-field" value={d.obs||''} onChange={e => updDoc(d.id,{obs:e.target.value})} placeholder="Observação (opcional)…" style={{ width:'100%', boxSizing:'border-box', fontSize:11 }} />
              </div>
            ))}
            <button onClick={addDoc} style={{ padding:'6px 0', borderRadius:7, border:'1px dashed var(--border)', background:'none', fontSize:12, fontWeight:600, color:'var(--accent)', cursor:'pointer', fontFamily:'var(--font)' }}>
              + Adicionar documento / link
            </button>
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
    const tipo = activeFilters.tipo   || []
    const stat = activeFilters.status || []
    const emp  = activeFilters.empresa || []

    return acoes.filter(a =>
      (!tipo.length   || tipo.includes(a.tipo)) &&
      (!stat.length   || stat.includes(a.status)) &&
      (!emp.length    || emp.includes(String(a.empresa_id))) &&
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

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const kpis = (data) => {
    const totalPrev = data.reduce((s, a) => s + (a.custos || []).reduce((ss, c) => ss + (Number(c.valor_previsto) || 0), 0), 0)
    const totalReal = data.reduce((s, a) => s + (a.custos || []).reduce((ss, c) => ss + (Number(c.valor_realizado) || 0), 0), 0)
    const overBudget = totalReal > totalPrev && totalPrev > 0
    return (
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr) 1.6fr', gap:12 }}>
        {[
          { label:'Total',      value: data.length,                                     color:'var(--border)' },
          { label:'Agendadas',  value: data.filter(a => a.status==='agendado').length,  color:'#F59E0B' },
          { label:'Realizadas', value: data.filter(a => a.status==='realizado').length, color:'#10B981' },
          { label:'Canceladas', value: data.filter(a => a.status==='cancelado').length, color:'#EF4444' },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--surface)', border:'1px solid var(--border2)',
            borderRadius:10, padding:'14px 18px', display:'flex', flexDirection:'column', gap:4,
            boxShadow:'var(--shadow)', borderTop:`3px solid ${k.color}` }}>
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
  ]

  // ── card render ───────────────────────────────────────────────────────────
  function renderCard(acao) {
    const hoje     = new Date().toISOString().slice(0, 10)
    const atrasado = acao.status === 'agendado' && acao.data_inicio < hoje
    const tipoCfg  = (tiposMap || TIPOS_ACAO_DEFAULT)[acao.tipo] || { icon:'◎', color:'#6B7280', bg:'#F3F4F6' }
    return (
      <div onClick={() => { setEditando(acao); setSlideOpen(true) }}
        style={{ background:'var(--surface)', border:'1px solid var(--border2)', borderRadius:10,
          padding:'14px 16px', cursor:'pointer', boxShadow:'var(--shadow)',
          display:'flex', flexDirection:'column', gap:10, borderTop:`3px solid ${tipoCfg.color}` }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', lineHeight:1.3, flex:1 }}>{acao.titulo}</div>
          <TipoBadge tipo={acao.tipo} tiposMap={tiposMap} />
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>🏢 {acao.empresa_nome}</div>
        {acao.local && <div style={{ fontSize:11, color:'var(--text-muted)' }}>📍 {acao.local}</div>}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'auto', paddingTop:8, borderTop:'1px solid var(--border2)' }}>
          <AvatarCell nome={acao.responsavel_nome} />
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, fontFamily:'var(--mono)', color: atrasado ? 'var(--red)' : 'var(--text-muted)' }}>
              {atrasado && '⚠ '}{fmtPeriodo(acao.data_inicio, acao.data_fim)}
            </span>
            <StatusBadge status={acao.status} />
          </div>
        </div>
        {acao.vagas && <VagasBar vagas={acao.vagas} inscritos={acao.inscritos} />}
        {(() => {
          const ts = tarefas.filter(t => String(t.entidade_id) === String(acao.id) && t.entidade_tipo === 'acao')
          if (!ts.length) return null
          const done = ts.filter(t => t.status === 'concluida').length
          const pct = Math.round((done / ts.length) * 100)
          return (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:10, color:'var(--text-muted)' }}>✅ {done}/{ts.length} tarefas</span>
                <span style={{ fontSize:10, fontWeight:700, color: pct===100 ? '#10B981' : 'var(--accent)' }}>{pct}%</span>
              </div>
              <div style={{ height:4, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', background: pct===100 ? '#10B981' : 'var(--accent)', borderRadius:99, width:`${pct}%`, transition:'width .3s' }} />
              </div>
            </div>
          )
        })()}
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
          {[{ id:'lista', label:'Lista' }, { id:'franquias', label:'🏢 Por Franquia' }].map(t => (
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

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(480px, 1fr))', gap:16 }}>
      {porFranquia.map(grupo => {
        const agendadas  = grupo.acoes.filter(a => a.status === 'agendado').length
        const realizadas = grupo.acoes.filter(a => a.status === 'realizado').length
        const canceladas = grupo.acoes.filter(a => a.status === 'cancelado').length

        // tarefas de todas as ações deste grupo
        const idsAcoes = new Set(grupo.acoes.map(a => String(a.id)))
        const tarefasGrupo = tarefas.filter(t => t.entidade_tipo === 'acao' && idsAcoes.has(String(t.entidade_id)))
        const tPendentes   = tarefasGrupo.filter(t => t.status === 'pendente').length
        const tAndamento   = tarefasGrupo.filter(t => t.status === 'em_andamento').length
        const tConcluidas  = tarefasGrupo.filter(t => t.status === 'concluida').length

        return (
          <div key={grupo.id} style={{ border:'1px solid var(--border)', borderRadius:12,
            background:'var(--surface)', boxShadow:'var(--shadow)', overflow:'hidden' }}>
            {/* Cabeçalho do grupo */}
            <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border2)',
              background:'var(--surface2)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent-glow)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🏢</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>{grupo.nome}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:1 }}>
                    {grupo.acoes.length} ação{grupo.acoes.length !== 1 ? 'ões' : ''}
                    {tarefasGrupo.length > 0 && ` · ${tarefasGrupo.length} tarefa${tarefasGrupo.length !== 1 ? 's' : ''}`}
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {/* Indicadores de ações */}
                {[{ label:'Agendadas', val:agendadas, color:'#F59E0B' },
                  { label:'Realizadas', val:realizadas, color:'#10B981' },
                  { label:'Canceladas', val:canceladas, color:'#EF4444' }].map(k => k.val > 0 && (
                  <div key={k.label} style={{ textAlign:'center', padding:'4px 12px', borderRadius:8,
                    background:`${k.color}14`, border:`1px solid ${k.color}44` }}>
                    <div style={{ fontSize:16, fontWeight:800, color:k.color, fontFamily:'var(--mono)' }}>{k.val}</div>
                    <div style={{ fontSize:9, color:k.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
                  </div>
                ))}
                {/* Separador + indicadores de tarefas */}
                {tarefasGrupo.length > 0 && (
                  <>
                    <div style={{ width:1, background:'var(--border)', alignSelf:'stretch', margin:'0 4px' }} />
                    {[{ label:'Pendentes', val:tPendentes, color:'#F59E0B', bg:'#FEF3C7' },
                      { label:'Andamento', val:tAndamento, color:'#3B82F6', bg:'#DBEAFE' },
                      { label:'Concluídas', val:tConcluidas, color:'#10B981', bg:'#D1FAE5' }].map(k => k.val > 0 && (
                      <div key={k.label} style={{ textAlign:'center', padding:'4px 12px', borderRadius:8,
                        background:k.bg, border:`1px solid ${k.color}44`, display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <div style={{ fontSize:9, color:k.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:1 }}>📋 {k.label}</div>
                        <div style={{ fontSize:16, fontWeight:800, color:k.color, fontFamily:'var(--mono)' }}>{k.val}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
            {/* Cards das ações */}
            <div style={{ padding:'16px 20px', display:'grid',
              gridTemplateColumns:'repeat(auto-fill, minmax(270px, 1fr))', gap:12 }}>
              {grupo.acoes.map(acao => renderCard(acao))}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )

  const toggleVisao = (
    <div style={{ display:'flex', gap:2, background:'var(--surface2)', borderRadius:9,
      padding:3, border:'1px solid var(--border)' }}>
      {[{ id:'lista', label:'Lista' }, { id:'franquias', label:'🏢 Por Franquia' }].map(t => (
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
  )

  return (
    <>
      {visao === 'franquias' ? viewFranquias : (
        <BrowseLayout
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
