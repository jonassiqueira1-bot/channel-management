import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRoutines } from '../hooks/useRoutines'
import { useProfile } from '../hooks/useProfile'

// ─── Paleta / tokens ─────────────────────────────────────────────────────────
const C = {
  bg:      'var(--bg)',
  surface: 'var(--surface)',
  border:  'var(--border)',
  text:    'var(--text)',
  muted:   'var(--text-muted)',
  primary: 'var(--accent)',
  danger:  '#ef4444',
  success: '#22c55e',
}

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1200, display:'flex', alignItems:'flex-start', justifyContent:'flex-end' },
  drawer:  { width:400, height:'100vh', background:C.bg, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column' },
  header:  { padding:'16px 20px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' },
  title:   { fontWeight:600, fontSize:15, color:C.text, margin:0 },
  body:    { flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 },
  btn:     (variant='primary') => ({
    padding:'7px 14px', borderRadius:6, border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
    background: variant==='primary' ? C.primary : variant==='danger' ? C.danger : C.surface,
    color: variant==='ghost' ? C.text : '#fff',
    border: variant==='ghost' ? `1px solid ${C.border}` : 'none',
  }),
  card:    { background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 14px' },
  input:   { width:'100%', padding:'7px 10px', borderRadius:6, border:`1px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13, boxSizing:'border-box' },
  label:   { fontSize:12, color:C.muted, marginBottom:4, display:'block' },
  row:     { display:'flex', gap:8, alignItems:'center' },
  badge:   (color='#888') => ({ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 7px', borderRadius:10, background:color+'22', color }),
  modal:   { position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:1300, display:'flex', alignItems:'center', justifyContent:'center' },
  wizard:  { width:580, maxHeight:'90vh', background:C.bg, borderRadius:12, border:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden' },
}

// ─── Configuração de ações por contexto ──────────────────────────────────────
const ACOES_PIPELINE = [
  { key:'mover_etapa',       label:'Mover para etapa',              campos:['etapa_id'] },
  { key:'alterar_situacao',  label:'Alterar situação',              campos:['situacao'] },
  { key:'alterar_responsavel',label:'Alterar responsável',          campos:['responsavel'] },
  { key:'alterar_prazo',     label:'Alterar previsão de fechamento',campos:['prazo_tipo','prazo_valor'] },
  { key:'criar_tarefa',      label:'Criar tarefa em lote',          campos:['tarefa_titulo','tarefa_tipo','tarefa_prazo_dias','tarefa_responsavel'] },
  { key:'enviar_email',      label:'Enviar e-mail',                 campos:['email_para','email_assunto','email_mensagem'] },
  { key:'criar_alerta',      label:'Criar notificação',             campos:['alerta_titulo','alerta_mensagem'] },
  { key:'alterar_campo',     label:'Alterar campo personalizado',   campos:['cf_chave','cf_valor'] },
]

// ─── Engine de execução (Pipeline) ───────────────────────────────────────────
async function executarPipeline({ parametros, acoes, tenantId, userId, funis }) {
  // 1. Busca oportunidades filtrando no banco
  let q = supabase.from('oportunidades').select('*').eq('tenant_id', tenantId).is('deleted_at', null)
  if (parametros.funil_id)   q = q.eq('funil_id', parametros.funil_id)
  if (parametros.situacao && parametros.situacao !== 'todas') q = q.eq('situacao', parametros.situacao)
  if (parametros.stage_id)   q = q.eq('stage_id', parametros.stage_id)
  if (parametros.responsavel) q = q.ilike('responsavel', `%${parametros.responsavel}%`)
  if (parametros.valor_min)  q = q.gte('valor', Number(parametros.valor_min))
  if (parametros.valor_max)  q = q.lte('valor', Number(parametros.valor_max))
  if (parametros.prazo_ate)  q = q.lte('prazo', parametros.prazo_ate)
  if (parametros.criado_de)  q = q.gte('created_at', parametros.criado_de)
  if (parametros.criado_ate) q = q.lte('created_at', parametros.criado_ate + 'T23:59:59')

  const { data: opps, error } = await q
  if (error) return { ok: false, error: error.message, registros: [] }

  let lista = opps || []

  // Filtro "sem tarefa aberta" (não dá pra fazer no banco facilmente)
  if (parametros.sem_tarefa) {
    const { data: tasks } = await supabase
      .from('tasks').select('entidade_id')
      .eq('entidade_tipo','oportunidade').neq('status','concluida').is('deleted_at',null)
      .in('entidade_id', lista.map(o=>o.id))
    const comTarefa = new Set((tasks||[]).map(t=>t.entidade_id))
    lista = lista.filter(o => !comTarefa.has(o.id))
  }

  if (!lista.length) return { ok: true, registros: [], resumo: { total_encontrados:0, total_afetados:0, acoes_aplicadas:[], erros:[] } }

  const snapshot_antes = []
  const snapshot_depois = []
  const erros = []
  let afetados = 0
  const hoje = new Date().toISOString().slice(0,10)

  for (const opp of lista) {
    const before = { id: opp.id }
    const after  = { id: opp.id }
    let changes  = {}

    for (const acao of acoes) {
      try {
        if (acao.key === 'mover_etapa' && acao.etapa_id) {
          before.stage_id = opp.stage_id
          after.stage_id  = acao.etapa_id
          changes.stage_id = acao.etapa_id
        }
        if (acao.key === 'alterar_situacao' && acao.situacao) {
          before.situacao = opp.situacao
          after.situacao  = acao.situacao
          changes.situacao = acao.situacao
        }
        if (acao.key === 'alterar_responsavel' && acao.responsavel) {
          before.responsavel = opp.responsavel
          after.responsavel  = acao.responsavel
          changes.responsavel = acao.responsavel
        }
        if (acao.key === 'alterar_prazo') {
          const novaData = acao.prazo_tipo === 'fixo'
            ? acao.prazo_valor
            : new Date(Date.now() + Number(acao.prazo_valor||0)*86400000).toISOString().slice(0,10)
          before.prazo = opp.prazo
          after.prazo  = novaData
          changes.prazo = novaData
        }
        if (acao.key === 'alterar_campo' && acao.cf_chave) {
          const cf = opp.custom_fields || {}
          before.custom_fields = { ...cf }
          after.custom_fields  = { ...cf, [acao.cf_chave]: acao.cf_valor }
          changes.custom_fields = after.custom_fields
        }
        if (acao.key === 'criar_tarefa') {
          const prazo = new Date(Date.now() + Number(acao.tarefa_prazo_dias||1)*86400000).toISOString().slice(0,10)
          await supabase.from('tasks').insert({
            tenant_id:    tenantId,
            titulo:       acao.tarefa_titulo || 'Tarefa gerada por rotina',
            tipo:         acao.tarefa_tipo || 'ligação',
            status:       'pendente',
            prioridade:   'media',
            prazo,
            responsavel:  acao.tarefa_responsavel || opp.responsavel || '',
            entidade_tipo:'oportunidade',
            entidade_id:  opp.id,
            entidade_nome: opp.titulo,
          })
        }
        if (acao.key === 'criar_alerta') {
          await supabase.from('alerts').insert({
            tenant_id:    tenantId,
            gatilho:      'rotina',
            titulo:       acao.alerta_titulo || 'Alerta de rotina',
            mensagem:     acao.alerta_mensagem || '',
            entidade_tipo:'oportunidade',
            entidade_id:  opp.id,
            entidade_nome: opp.titulo,
            prioridade:   'media',
          })
        }
        if (acao.key === 'enviar_email' && acao.email_para) {
          const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
          const ANON_KEY     = process.env.REACT_APP_SUPABASE_ANON_KEY
          const { data: { session } } = await supabase.auth.getSession()
          await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method:'POST',
            headers:{ 'Content-Type':'application/json', 'Authorization':`Bearer ${session?.access_token}`, 'apikey': ANON_KEY },
            body: JSON.stringify({
              template:'notificacao_generica',
              to: acao.email_para,
              data:{ assunto: acao.email_assunto, mensagem: acao.email_mensagem, empresa_nome: opp.titulo },
            }),
          })
        }
      } catch(e) {
        erros.push({ opp_id: opp.id, opp_titulo: opp.titulo, acao: acao.key, erro: e.message })
      }
    }

    if (Object.keys(changes).length) {
      const { error: updErr } = await supabase.from('oportunidades').update(changes).eq('id', opp.id)
      if (updErr) { erros.push({ opp_id: opp.id, opp_titulo: opp.titulo, acao:'update', erro: updErr.message }); continue }
      snapshot_antes.push(before)
      snapshot_depois.push(after)
      afetados++
    } else {
      // ações que não alteram opp (tarefa, alerta, email) ainda contam
      const acoesIndiretas = acoes.filter(a => ['criar_tarefa','criar_alerta','enviar_email'].includes(a.key))
      if (acoesIndiretas.length) afetados++
    }
  }

  return {
    ok: true,
    snapshot_antes,
    snapshot_depois,
    registros: lista,
    resumo: {
      total_encontrados: lista.length,
      total_afetados:    afetados,
      acoes_aplicadas:   acoes.map(a=>a.key),
      erros,
    },
  }
}

// ─── Wizard ──────────────────────────────────────────────────────────────────
const STEPS = ['Identidade','Parâmetros','Ações','Executar']

function WizardStep1({ form, set }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <label style={s.label}>Nome da rotina *</label>
        <input style={s.input} value={form.nome} onChange={e=>set('nome',e.target.value)} placeholder="Ex: Mover oportunidades paradas" />
      </div>
      <div>
        <label style={s.label}>Descrição</label>
        <textarea style={{...s.input, height:60, resize:'vertical'}} value={form.descricao||''} onChange={e=>set('descricao',e.target.value)} />
      </div>
      <div style={s.row}>
        <div style={{flex:1}}>
          <label style={s.label}>Validade</label>
          <input type="date" style={s.input} value={form.validade||''} onChange={e=>set('validade',e.target.value)} />
        </div>
        <div style={{flex:1}}>
          <label style={s.label}>Compartilhamento</label>
          <select style={s.input} value={form.compartilhamento||'privado'} onChange={e=>set('compartilhamento',e.target.value)}>
            <option value="privado">Só eu</option>
            <option value="equipe">Minha equipe</option>
            <option value="filiais">Todas as filiais</option>
          </select>
        </div>
      </div>
      <div>
        <label style={s.label}>Agendamento</label>
        <select style={s.input} value={form.schedule_tipo||'manual'} onChange={e=>set('schedule_tipo',e.target.value)}>
          <option value="manual">Somente manual</option>
          <option value="diario">Diário</option>
          <option value="semanal">Semanal (toda segunda)</option>
          <option value="mensal">Mensal (dia 1)</option>
        </select>
      </div>
      {form.schedule_tipo && form.schedule_tipo !== 'manual' && (
        <div>
          <label style={s.label}>Horário de execução</label>
          <input type="time" style={s.input} value={form.schedule_hora||'08:00'} onChange={e=>set('schedule_hora',e.target.value)} />
        </div>
      )}
    </div>
  )
}

function WizardStep2({ form, set, funis }) {
  const etapas = funis.find(f=>f.id===form.parametros?.funil_id)?.etapas || []
  const setP = (k,v) => set('parametros', { ...form.parametros, [k]:v })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <label style={s.label}>Funil</label>
        <select style={s.input} value={form.parametros?.funil_id||''} onChange={e=>setP('funil_id', e.target.value||null)}>
          <option value="">Todos os funis</option>
          {funis.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
      </div>
      {etapas.length > 0 && (
        <div>
          <label style={s.label}>Etapa</label>
          <select style={s.input} value={form.parametros?.stage_id||''} onChange={e=>setP('stage_id', e.target.value||null)}>
            <option value="">Todas as etapas</option>
            {etapas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
      )}
      <div>
        <label style={s.label}>Situação</label>
        <select style={s.input} value={form.parametros?.situacao||'todas'} onChange={e=>setP('situacao',e.target.value)}>
          <option value="todas">Todas</option>
          <option value="em_andamento">Em andamento</option>
          <option value="ganha">Ganha</option>
          <option value="perdida">Perdida</option>
        </select>
      </div>
      <div>
        <label style={s.label}>Responsável (contém)</label>
        <input style={s.input} value={form.parametros?.responsavel||''} onChange={e=>setP('responsavel',e.target.value)} placeholder="Nome ou parte do nome" />
      </div>
      <div style={s.row}>
        <div style={{flex:1}}>
          <label style={s.label}>Valor mínimo (R$)</label>
          <input type="number" style={s.input} value={form.parametros?.valor_min||''} onChange={e=>setP('valor_min',e.target.value)} />
        </div>
        <div style={{flex:1}}>
          <label style={s.label}>Valor máximo (R$)</label>
          <input type="number" style={s.input} value={form.parametros?.valor_max||''} onChange={e=>setP('valor_max',e.target.value)} />
        </div>
      </div>
      <div style={s.row}>
        <div style={{flex:1}}>
          <label style={s.label}>Abertura de</label>
          <input type="date" style={s.input} value={form.parametros?.criado_de||''} onChange={e=>setP('criado_de',e.target.value)} />
        </div>
        <div style={{flex:1}}>
          <label style={s.label}>Abertura até</label>
          <input type="date" style={s.input} value={form.parametros?.criado_ate||''} onChange={e=>setP('criado_ate',e.target.value)} />
        </div>
      </div>
      <div style={s.row}>
        <div style={{flex:1}}>
          <label style={s.label}>Previsão até</label>
          <input type="date" style={s.input} value={form.parametros?.prazo_ate||''} onChange={e=>setP('prazo_ate',e.target.value)} />
        </div>
        <div style={{flex:1, paddingTop:20}}>
          <label style={{...s.label, display:'flex', alignItems:'center', gap:6, cursor:'pointer'}}>
            <input type="checkbox" checked={!!form.parametros?.sem_tarefa} onChange={e=>setP('sem_tarefa',e.target.checked)} />
            Sem tarefa aberta
          </label>
        </div>
      </div>
    </div>
  )
}

function AcaoEditor({ acao, onChange, onRemove, funis, parametros }) {
  const etapas = funis.find(f=>f.id===parametros?.funil_id)?.etapas || []
  const set = (k,v) => onChange({ ...acao, [k]:v })

  return (
    <div style={{ ...s.card, display:'flex', flexDirection:'column', gap:10 }}>
      <div style={s.row}>
        <select style={{...s.input, flex:1}} value={acao.key} onChange={e=>onChange({ key:e.target.value })}>
          <option value="">Selecione a ação</option>
          {ACOES_PIPELINE.map(a=><option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
        <button style={s.btn('danger')} onClick={onRemove}>✕</button>
      </div>

      {acao.key === 'mover_etapa' && (
        <select style={s.input} value={acao.etapa_id||''} onChange={e=>set('etapa_id',e.target.value)}>
          <option value="">Selecione a etapa</option>
          {etapas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
        </select>
      )}
      {acao.key === 'alterar_situacao' && (
        <select style={s.input} value={acao.situacao||''} onChange={e=>set('situacao',e.target.value)}>
          <option value="">Selecione</option>
          <option value="em_andamento">Em andamento</option>
          <option value="ganha">Ganha</option>
          <option value="perdida">Perdida</option>
        </select>
      )}
      {acao.key === 'alterar_responsavel' && (
        <input style={s.input} value={acao.responsavel||''} onChange={e=>set('responsavel',e.target.value)} placeholder="Nome do responsável" />
      )}
      {acao.key === 'alterar_prazo' && (
        <div style={s.row}>
          <select style={{...s.input, flex:1}} value={acao.prazo_tipo||'relativo'} onChange={e=>set('prazo_tipo',e.target.value)}>
            <option value="relativo">+N dias a partir de hoje</option>
            <option value="fixo">Data fixa</option>
          </select>
          {acao.prazo_tipo === 'fixo'
            ? <input type="date" style={{...s.input, flex:1}} value={acao.prazo_valor||''} onChange={e=>set('prazo_valor',e.target.value)} />
            : <input type="number" style={{...s.input, flex:1}} value={acao.prazo_valor||''} onChange={e=>set('prazo_valor',e.target.value)} placeholder="Dias" />
          }
        </div>
      )}
      {acao.key === 'criar_tarefa' && (
        <>
          <input style={s.input} value={acao.tarefa_titulo||''} onChange={e=>set('tarefa_titulo',e.target.value)} placeholder="Título da tarefa" />
          <div style={s.row}>
            <select style={{...s.input, flex:1}} value={acao.tarefa_tipo||'ligação'} onChange={e=>set('tarefa_tipo',e.target.value)}>
              {['ligação','reunião','email','visita','proposta','follow-up','outros'].map(t=><option key={t}>{t}</option>)}
            </select>
            <input type="number" style={{...s.input, flex:1}} value={acao.tarefa_prazo_dias||1} onChange={e=>set('tarefa_prazo_dias',e.target.value)} placeholder="Prazo (dias)" />
          </div>
          <input style={s.input} value={acao.tarefa_responsavel||''} onChange={e=>set('tarefa_responsavel',e.target.value)} placeholder="Responsável (vazio = mesmo da oportunidade)" />
        </>
      )}
      {acao.key === 'enviar_email' && (
        <>
          <input style={s.input} value={acao.email_para||''} onChange={e=>set('email_para',e.target.value)} placeholder="E-mail do destinatário" />
          <input style={s.input} value={acao.email_assunto||''} onChange={e=>set('email_assunto',e.target.value)} placeholder="Assunto" />
          <textarea style={{...s.input, height:60, resize:'vertical'}} value={acao.email_mensagem||''} onChange={e=>set('email_mensagem',e.target.value)} placeholder="Mensagem" />
        </>
      )}
      {acao.key === 'criar_alerta' && (
        <>
          <input style={s.input} value={acao.alerta_titulo||''} onChange={e=>set('alerta_titulo',e.target.value)} placeholder="Título da notificação" />
          <textarea style={{...s.input, height:50, resize:'vertical'}} value={acao.alerta_mensagem||''} onChange={e=>set('alerta_mensagem',e.target.value)} placeholder="Mensagem" />
        </>
      )}
      {acao.key === 'alterar_campo' && (
        <div style={s.row}>
          <input style={{...s.input, flex:1}} value={acao.cf_chave||''} onChange={e=>set('cf_chave',e.target.value)} placeholder="Chave do campo" />
          <input style={{...s.input, flex:1}} value={acao.cf_valor||''} onChange={e=>set('cf_valor',e.target.value)} placeholder="Novo valor" />
        </div>
      )}
    </div>
  )
}

function WizardStep3({ form, set, funis }) {
  const acoes = form.acoes || []
  const addAcao = () => set('acoes', [...acoes, { key:'' }])
  const updAcao = (i, v) => { const a=[...acoes]; a[i]=v; set('acoes',a) }
  const rmAcao  = (i) => set('acoes', acoes.filter((_,j)=>j!==i))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <p style={{ fontSize:13, color:C.muted, margin:0 }}>Ações executadas em ordem para cada registro encontrado.</p>
      {acoes.map((a,i)=>(
        <AcaoEditor key={i} acao={a} onChange={v=>updAcao(i,v)} onRemove={()=>rmAcao(i)} funis={funis} parametros={form.parametros} />
      ))}
      <button style={s.btn('ghost')} onClick={addAcao}>+ Adicionar ação</button>
    </div>
  )
}

function WizardStep4({ routine, funis, tenantId, userId, onSaveExecution, executions, onRevert }) {
  const [preview, setPreview]   = useState(null)
  const [running, setRunning]   = useState(false)
  const [resultado, setResultado] = useState(null)
  const [verExec, setVerExec]   = useState(null)

  const fazerPreview = useCallback(async () => {
    setPreview('carregando')
    let q = supabase.from('oportunidades').select('id,titulo').eq('tenant_id', tenantId).is('deleted_at', null)
    const p = routine.parametros || {}
    if (p.funil_id)   q = q.eq('funil_id', p.funil_id)
    if (p.situacao && p.situacao !== 'todas') q = q.eq('situacao', p.situacao)
    if (p.stage_id)   q = q.eq('stage_id', p.stage_id)
    if (p.valor_min)  q = q.gte('valor', Number(p.valor_min))
    if (p.valor_max)  q = q.lte('valor', Number(p.valor_max))
    const { data } = await q
    setPreview(data?.length ?? 0)
  }, [routine, tenantId])

  useEffect(() => { fazerPreview() }, [fazerPreview])

  const executar = useCallback(async () => {
    setRunning(true)
    const res = await executarPipeline({ parametros: routine.parametros||{}, acoes: routine.acoes||[], tenantId, userId, funis })
    const exec = await onSaveExecution({
      routine_id:      routine.id,
      status:          res.resumo?.erros?.length ? (res.resumo.total_afetados ? 'parcial' : 'erro') : 'sucesso',
      snapshot_antes:  res.snapshot_antes,
      snapshot_depois: res.snapshot_depois,
      resumo:          res.resumo,
    })
    setResultado({ ...res, exec_id: exec?.data?.id })
    setRunning(false)
  }, [routine, tenantId, userId, funis, onSaveExecution])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Preview */}
      <div style={{ ...s.card, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:22 }}>🔍</span>
        <div>
          <div style={{ fontWeight:600, fontSize:14 }}>
            {preview === 'carregando' ? 'Contando registros...' : preview === null ? '—' : `${preview} oportunidade${preview!==1?'s':''} encontrada${preview!==1?'s':''}`}
          </div>
          <div style={{ fontSize:12, color:C.muted }}>{(routine.acoes||[]).length} ação(ões) configurada(s)</div>
        </div>
        <button style={{ ...s.btn('ghost'), marginLeft:'auto', fontSize:12 }} onClick={fazerPreview}>Atualizar</button>
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{ ...s.card, background: resultado.resumo?.erros?.length ? '#ff000011' : '#00aa4411' }}>
          <div style={{ fontWeight:600, marginBottom:6 }}>
            {resultado.resumo?.total_afetados} registro(s) afetado(s) de {resultado.resumo?.total_encontrados} encontrado(s)
          </div>
          {resultado.resumo?.erros?.length > 0 && (
            <div style={{ fontSize:12, color:C.danger }}>
              {resultado.resumo.erros.length} erro(s): {resultado.resumo.erros.map(e=>`${e.opp_titulo} (${e.acao})`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Botão executar */}
      {!resultado && (
        <button style={s.btn('primary')} onClick={executar} disabled={running}>
          {running ? '⏳ Executando...' : '▶ Executar agora'}
        </button>
      )}
      {resultado && (
        <button style={s.btn('ghost')} onClick={()=>setResultado(null)}>Executar novamente</button>
      )}

      {/* Histórico */}
      <div>
        <div style={{ fontWeight:600, fontSize:13, marginBottom:8, color:C.muted }}>HISTÓRICO DE EXECUÇÕES</div>
        {executions.length === 0 && <div style={{ fontSize:13, color:C.muted }}>Nenhuma execução ainda.</div>}
        {executions.map(ex => (
          <div key={ex.id} style={{ ...s.card, marginBottom:8 }}>
            <div style={s.row}>
              <span style={s.badge(ex.status==='sucesso'?'#00aa44':ex.status==='parcial'?'#f59e0b':'#ef4444')}>
                {ex.status}
              </span>
              <span style={{ fontSize:12, color:C.muted }}>
                {new Date(ex.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                {' · '}{ex.resumo?.total_afetados ?? '?'} afetados
              </span>
              <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                <button style={{ ...s.btn('ghost'), fontSize:11 }} onClick={()=>setVerExec(verExec?.id===ex.id?null:ex)}>
                  {verExec?.id===ex.id ? 'Fechar' : 'Relatório'}
                </button>
                {!ex.revertido && (ex.snapshot_antes||[]).length > 0 && (
                  <button style={{ ...s.btn('danger'), fontSize:11 }} onClick={()=>onRevert(ex)}>
                    Reverter
                  </button>
                )}
                {ex.revertido && <span style={s.badge('#888')}>Revertido</span>}
              </div>
            </div>

            {verExec?.id === ex.id && (
              <div style={{ marginTop:10, fontSize:12, color:C.text }}>
                <div style={{ fontWeight:600, marginBottom:6 }}>Relatório detalhado</div>
                <div><b>Encontrados:</b> {ex.resumo?.total_encontrados ?? '?'}</div>
                <div><b>Afetados:</b> {ex.resumo?.total_afetados ?? '?'}</div>
                <div><b>Ações:</b> {(ex.resumo?.acoes_aplicadas||[]).join(', ')}</div>
                {(ex.resumo?.erros||[]).length > 0 && (
                  <div style={{ marginTop:6 }}>
                    <b style={{ color:C.danger }}>Erros:</b>
                    <ul style={{ margin:'4px 0 0 16px', padding:0 }}>
                      {ex.resumo.erros.map((e,i)=><li key={i}>{e.opp_titulo}: {e.erro}</li>)}
                    </ul>
                  </div>
                )}
                {(ex.snapshot_antes||[]).length > 0 && (
                  <div style={{ marginTop:8 }}>
                    <b>Registros alterados:</b>
                    <div style={{ maxHeight:120, overflowY:'auto', marginTop:4, background:C.surface, borderRadius:4, padding:6 }}>
                      {ex.snapshot_antes.map((snap,i)=>(
                        <div key={i} style={{ marginBottom:4, borderBottom:`1px solid ${C.border}`, paddingBottom:4 }}>
                          <b>{(ex.snapshot_depois[i]?.titulo)||snap.id}</b>
                          {Object.keys(snap).filter(k=>k!=='id').map(k=>(
                            <div key={k} style={{ color:C.muted }}>
                              {k}: <span style={{ color:C.danger }}>{String(snap[k])}</span>
                              {' → '}<span style={{ color:C.success }}>{String(ex.snapshot_depois[i]?.[k]||'')}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function RotinaWizard({ initial, onClose, onSaved, funis, tenantId, userId, saveExecution, loadExecutions, onRevert }) {
  const empty = { nome:'', descricao:'', compartilhamento:'privado', schedule_tipo:'manual', parametros:{}, acoes:[] }
  const [form, setForm]   = useState(initial || empty)
  const [step, setStep]   = useState(0)
  const [saving, setSaving] = useState(false)
  const [erroGeral, setErroGeral] = useState('')
  const [executions, setExecutions] = useState([])

  const set = (k,v) => setForm(f=>({...f, [k]:v}))

  useEffect(() => {
    if (step === 3 && form.id) {
      loadExecutions(form.id).then(setExecutions)
    }
  }, [step, form.id, loadExecutions])

  const scheduleMap = { manual:null, diario:`0 ${(form.schedule_hora||'08:00').replace(':','  ')} * * *`, semanal:`0 8 * * 1`, mensal:`0 8 1 * *` }

  const handleSave = async () => {
    if (!form.nome.trim()) { setErroGeral('Informe o nome da rotina.'); return }
    setSaving(true)
    const res = await onSaved({ ...form, schedule: scheduleMap[form.schedule_tipo||'manual'] })
    setSaving(false)
    if (!res?.ok) { setErroGeral(res?.message || 'Erro ao salvar'); return }
    if (step < 3) setStep(s=>s+1)
  }

  const canNext = () => {
    if (step === 0) return form.nome?.trim()
    if (step === 2) return (form.acoes||[]).some(a=>a.key)
    return true
  }

  return (
    <div style={s.modal} onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div style={s.wizard}>
        {/* Header */}
        <div style={{ ...s.header, flexDirection:'column', alignItems:'flex-start', gap:8 }}>
          <div style={s.row}>
            <span style={s.title}>{form.id ? 'Editar rotina' : 'Nova rotina'}</span>
            <button style={{ ...s.btn('ghost'), marginLeft:'auto', padding:'4px 10px' }} onClick={onClose}>✕</button>
          </div>
          {/* Steps */}
          <div style={{ display:'flex', gap:0, width:'100%' }}>
            {STEPS.map((st,i)=>(
              <div key={i} style={{ flex:1, textAlign:'center', fontSize:11, padding:'6px 0',
                borderBottom: i===step ? `2px solid ${C.primary}` : `2px solid ${C.border}`,
                color: i===step ? C.primary : i<step ? C.success : C.muted,
                cursor: i < step ? 'pointer' : 'default', fontWeight: i===step ? 600:400 }}
                onClick={()=>{ if(i<step) setStep(i) }}>
                {i<step ? '✓ ' : ''}{st}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {erroGeral && <div style={{ color:C.danger, fontSize:13, marginBottom:12 }}>{erroGeral}</div>}
          {step === 0 && <WizardStep1 form={form} set={set} />}
          {step === 1 && <WizardStep2 form={form} set={set} funis={funis} />}
          {step === 2 && <WizardStep3 form={form} set={set} funis={funis} />}
          {step === 3 && (
            <WizardStep4
              routine={form}
              funis={funis}
              tenantId={tenantId}
              userId={userId}
              onSaveExecution={saveExecution}
              executions={executions}
              onRevert={async (ex) => {
                if (!window.confirm(`Reverter ${(ex.snapshot_antes||[]).length} registro(s)?`)) return
                const r = await onRevert(ex, 'oportunidades')
                if (r.ok) { alert('Revertido com sucesso.'); loadExecutions(form.id).then(setExecutions) }
                else alert('Erro ao reverter: ' + (r.errors||[]).map(e=>e.error).join(', '))
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{ ...s.header, borderTop:`1px solid ${C.border}`, borderBottom:'none', justifyContent:'flex-end', gap:8 }}>
          {step > 0 && <button style={s.btn('ghost')} onClick={()=>setStep(s=>s-1)}>← Voltar</button>}
          {step < 3 && (
            <button style={s.btn('primary')} onClick={handleSave} disabled={saving || !canNext()}>
              {saving ? 'Salvando...' : step === 2 ? 'Salvar e revisar →' : 'Próximo →'}
            </button>
          )}
          {step === 3 && <button style={s.btn('ghost')} onClick={onClose}>Fechar</button>}
        </div>
      </div>
    </div>
  )
}

// ─── Drawer principal ─────────────────────────────────────────────────────────
export default function RotinasDrawer({ contexto, funis = [], onClose }) {
  const { profile }  = useProfile()
  const tenantId     = profile?.tenant_id
  const userId       = profile?.id
  const { routines, loading, save, remove, saveExecution, loadExecutions, revert } = useRoutines(contexto)
  const [wizard, setWizard] = useState(null) // null | {} | {routine}

  const badgeColor = (c) => c==='equipe'?'#3b82f6':c==='filiais'?'#8b5cf6':'#888'

  return (
    <>
      <div style={s.overlay} onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
        <div style={s.drawer}>
          <div style={s.header}>
            <span style={s.title}>⚙ Rotinas — {contexto}</span>
            <button style={s.btn('ghost')} onClick={onClose}>✕</button>
          </div>
          <div style={s.body}>
            <button style={s.btn('primary')} onClick={()=>setWizard({})}>+ Nova rotina</button>

            {loading && <div style={{ color:C.muted, fontSize:13 }}>Carregando...</div>}

            {!loading && routines.length === 0 && (
              <div style={{ color:C.muted, fontSize:13, textAlign:'center', marginTop:24 }}>
                Nenhuma rotina criada ainda.
              </div>
            )}

            {routines.map(r => (
              <div key={r.id} style={s.card}>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:4 }}>{r.nome}</div>
                {r.descricao && <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>{r.descricao}</div>}
                <div style={{ ...s.row, flexWrap:'wrap', gap:6, marginBottom:8 }}>
                  <span style={s.badge(badgeColor(r.compartilhamento))}>{r.compartilhamento}</span>
                  {r.schedule && <span style={s.badge('#f59e0b')}>agendado</span>}
                  {r.validade && <span style={s.badge('#888')}>até {r.validade}</span>}
                  {r.ultima_execucao && (
                    <span style={{ fontSize:11, color:C.muted }}>
                      Última: {new Date(r.ultima_execucao).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </span>
                  )}
                </div>
                <div style={s.row}>
                  <button style={s.btn('primary')} onClick={()=>setWizard({ ...r, _goStep:3 })}>▶ Executar</button>
                  <button style={s.btn('ghost')}   onClick={()=>setWizard(r)}>✏ Editar</button>
                  <button style={{ ...s.btn('ghost'), marginLeft:'auto', color:C.danger, borderColor:C.danger }}
                    onClick={()=>{ if(window.confirm('Remover rotina?')) remove(r.id) }}>
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {wizard !== null && (
        <RotinaWizard
          initial={wizard.id ? wizard : null}
          funis={funis}
          tenantId={tenantId}
          userId={userId}
          onClose={()=>setWizard(null)}
          onSaved={async (data) => {
            const res = await save(data)
            return res
          }}
          saveExecution={saveExecution}
          loadExecutions={loadExecutions}
          onRevert={revert}
        />
      )}
    </>
  )
}
