import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useProfile } from './useProfile'

// Fontes de dados reais do Supabase para uso no CanvasEditor (KPI, Gráfico, Tabela)
export function useDocumentDataSources() {
  const { profile } = useProfile()
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const tenantId = profile?.tenant_id
    if (!tenantId) { setSources([]); setLoading(false); return }
    setLoading(true)
    try {
      // Promise.allSettled: falha isolada de uma query não derruba as demais
      const results = await Promise.allSettled([
        // Pipeline (oportunidades) — sem deleted_at nem campanha_id (não existem nessa tabela)
        supabase.from('oportunidades')
          .select('id, titulo, situacao, valor_cdu, valor_sms, valor_servico, responsavel, stage_id, custom_fields, origem, motivo_perda, created_at')
          .eq('tenant_id', tenantId).limit(2000),

        // Etapas do pipeline
        supabase.from('pipeline_stages')
          .select('id, name').eq('tenant_id', tenantId).limit(200),

        // Campanhas
        supabase.from('campanhas')
          .select('id, nome, status, inicio, fim, meta, meta_oportunidades, custos')
          .eq('tenant_id', tenantId).limit(500),

        // Projetos
        supabase.from('projects')
          .select('id, nome, status, custom_fields, data_inicio, created_at')
          .eq('tenant_id', tenantId).is('deleted_at', null).limit(2000),

        // Empresas / Clientes
        supabase.from('companies')
          .select('id, nome_fantasia, razao_social, tipo, status, created_at')
          .eq('tenant_id', tenantId).is('deleted_at', null).limit(2000),

        // Parceiros
        supabase.from('parceiros')
          .select('id, nome, status, created_at')
          .eq('tenant_id', tenantId).limit(2000),

        // Metas
        supabase.from('goals')
          .select('id, tipo_alvo, alvo_nome, tipo_meta, valor_planejado, valor_atual, status, periodo_mes, periodo_ano, created_at')
          .eq('tenant_id', tenantId).limit(2000),

        // Ações / Tarefas
        supabase.from('actions')
          .select('id, titulo, tipo, status, prioridade, data_prevista, data_conclusao, created_at')
          .eq('tenant_id', tenantId).limit(2000),

        // Contatos
        supabase.from('contacts')
          .select('id, email, job_title, created_at')
          .eq('tenant_id', tenantId).limit(2000),

        // Vendedores (Contatos Canais)
        supabase.from('sellers')
          .select('id, nome, status, cargo, equipe, regiao, meta_mensal, created_at')
          .eq('tenant_id', tenantId).limit(2000),

        // Contratos — RLS via my_tenant_id(), sem filtro explícito de tipo conflitante
        supabase.from('contracts')
          .select('id, numero, status, data_inicio, data_fim, created_at')
          .is('deleted_at', null).limit(2000),

        // Pagamentos — amount_total_net é coluna gerada; busca as partes e calcula em JS
        supabase.from('payments')
          .select('id, amount_cdu, amount_sms, amount_services, amount_discount, status, reference_month, due_date, created_at')
          .limit(2000),

        // Comissões — tenant_id = auth.uid(); persona e periodo_mes/ano podem não existir em prod
        supabase.from('commission_payments')
          .select('id, beneficiario_nome, receita_tipo, valor_base, percentual, status, created_at')
          .limit(2000),

        // Sucesso do Cliente
        supabase.from('customer_health')
          .select('id, laer_stage, touch_model, health_score, renewal_date, created_at')
          .eq('tenant_id', tenantId).limit(2000),

        // Questionários — tenant_id é TEXT nessa tabela; RLS via current_setting
        supabase.from('questionnaire_templates')
          .select('id, title, type, is_active, created_at').limit(2000),

        supabase.from('questionnaire_submissions')
          .select('id, template_id, status, created_at').limit(2000),

        // Documentos
        supabase.from('documents')
          .select('id, title, categoria, status, prazo_validade, created_at')
          .eq('tenant_id', tenantId).is('deleted_at', null).limit(2000),

        // Playbooks — coluna é 'title' e 'segment', não 'nome'/'tipo'
        supabase.from('playbooks')
          .select('id, title, segment, is_active, created_at')
          .limit(2000),

        // Funis (form_layouts entity='funis' — fields é array de {id, nome, etapas})
        supabase.from('form_layouts')
          .select('fields').eq('entity', 'funis').eq('tenant_id', tenantId).limit(1),

        // Histórico de etapas (cohort completo)
        supabase.from('oportunidade_etapa_historico')
          .select('oportunidade_id, stage_id, etapa_nome, situacao, entrou_em, saiu_em, dias_na_etapa')
          .eq('tenant_id', tenantId).limit(5000),

        // Tarefas vinculadas a oportunidades
        supabase.from('tasks')
          .select('entidade_id, status, data_inicio, prazo, concluida_em')
          .eq('tenant_id', tenantId).eq('entidade_tipo', 'oportunidade').limit(5000),

        // Propostas (relatorios tipo='proposta') para enriquecer pipeline
        supabase.from('relatorios')
          .select('id, titulo, tipo')
          .eq('tenant_id', tenantId).eq('tipo', 'proposta').is('deleted_at', null).limit(500),

        // oportunidades: proposta_produto_id e proposta_servico_id
        supabase.from('oportunidades')
          .select('id, proposta_produto_id, proposta_servico_id')
          .eq('tenant_id', tenantId).limit(2000),
      ])

      // Extrai data de cada resultado; query com erro retorna []
      const QUERY_NAMES = ['oportunidades','pipeline_stages','campanhas','projects','companies','parceiros','goals','actions','contacts','sellers','contracts','payments','commission_payments','customer_health','questionnaire_templates','questionnaire_submissions','documents','playbooks','form_layouts_funis','etapa_historico','tasks_opps','relatorios_proposta','opps_propostas_ids']
      const safe = (i) => {
        const r = results[i]
        if (r.status === 'rejected') { console.warn('[DataSources]', QUERY_NAMES[i], 'REJECTED:', r.reason); return [] }
        if (r.value?.error)           { console.warn('[DataSources]', QUERY_NAMES[i], 'ERROR:', r.value.error.message); return [] }
        console.log('[DataSources]', QUERY_NAMES[i], '→', r.value?.data?.length ?? 0, 'registros')
        return r.value?.data || []
      }

      const [
        oppsData, stagesData, campanhasData, projData, companiesData,
        parceirosData, goalsData, actionsData, contactsData, sellersData,
        contractsData, paymentsData, commissionsData, csData,
        questTemplatesData, questSubmissionsData, documentsData, playbooksData,
        funisLayoutData, etapaHistoricoData,
        tasksOppsData, relatoriasPropostaData, oppsPropostasIdsData,
      ] = Array.from({ length: 23 }, (_, i) => safe(i))

      // ── Mapeamento de cada fonte ──────────────────────────────────────────

      // Lookups para enriquecer oportunidades
      const stageMap    = Object.fromEntries(stagesData.map(s => [s.id, s.name]))
      const campanhaMap = Object.fromEntries(campanhasData.map(c => [c.id, c.nome]))
      const funisArr = funisLayoutData[0]?.fields || []
      // funilMap: id (qualquer tipo) → nome do funil
      const funilMap = Object.fromEntries(funisArr.map(f => [String(f.id), f.nome || '']))

      // taskMap: oportunidade_id → { proxima_tarefa_data, proxima_tarefa_hora, primeira_conclusao_data, primeira_conclusao_hora }
      const tasksByOpp = {}
      for (const t of tasksOppsData) {
        const eid = t.entidade_id
        if (!eid) continue
        if (!tasksByOpp[eid]) tasksByOpp[eid] = { pendentes: [], concluidas: [] }
        if (t.status === 'concluida' && t.concluida_em) tasksByOpp[eid].concluidas.push(t)
        else if (t.status !== 'cancelada') tasksByOpp[eid].pendentes.push(t)
      }
      const taskMap = {}
      for (const [eid, g] of Object.entries(tasksByOpp)) {
        // proxima: pendente com data_inicio mais próxima
        const proxima = g.pendentes
          .filter(t => t.data_inicio)
          .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))[0]
        // primeira conclusão: concluida_em mais antigo
        const primeira = g.concluidas
          .sort((a, b) => a.concluida_em.localeCompare(b.concluida_em))[0]
        taskMap[eid] = {
          proxima_tarefa_data:     proxima?.data_inicio?.slice(0, 10) || '',
          proxima_tarefa_hora:     proxima?.data_inicio?.slice(11, 16) || '',
          primeira_conclusao_data: primeira?.concluida_em?.slice(0, 10) || '',
          primeira_conclusao_hora: primeira?.concluida_em?.slice(11, 16) || '',
        }
      }

      // propostaMap: relatorio id → titulo
      const propostaMap = Object.fromEntries(relatoriasPropostaData.map(r => [r.id, r.titulo || '']))
      // oppsPropostasMap: oportunidade id → { proposta_produto_id, proposta_servico_id }
      const oppsPropostasMap = Object.fromEntries(
        oppsPropostasIdsData.map(o => [o.id, { pp: o.proposta_produto_id, ps: o.proposta_servico_id }])
      )

      function isoWeekLabel(dateStr) {
        if (!dateStr) return '—'
        const d = new Date(dateStr)
        // ISO week: Thursday of the week determines the year
        const thu = new Date(d)
        thu.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3)
        const yearStart = new Date(thu.getFullYear(), 0, 1)
        const week = Math.ceil(((thu - yearStart) / 86400000 + 1) / 7)
        return `S${String(week).padStart(2,'0')}/${thu.getFullYear()}`
      }

      const oportunidades = oppsData.map(o => {
        const tm = taskMap[String(o.id)] || {}
        const pm = oppsPropostasMap[String(o.id)] || {}
        return {
        situacao:     o.situacao || 'em_andamento',
        titulo:       o.titulo || '',
        responsavel:  o.responsavel || '',
        valor:        (Number(o.valor_cdu)||0) + (Number(o.valor_sms)||0) + (Number(o.valor_servico)||0),
        origem:       o.origem || 'Não informado',
        // Bug antigo: sempre voltava 'Sem campanha' fixo, nunca resolvia via
        // custom_fields.campanha_id (mesmo com o vínculo persistido de verdade).
        campanha:     o.custom_fields?.campanha_id ? (campanhaMap[o.custom_fields.campanha_id] || 'Campanha removida') : 'Sem campanha',
        // Tarefas
        proxima_tarefa_data:     tm.proxima_tarefa_data     || '',
        proxima_tarefa_hora:     tm.proxima_tarefa_hora     || '',
        primeira_conclusao_data: tm.primeira_conclusao_data || '',
        primeira_conclusao_hora: tm.primeira_conclusao_hora || '',
        // Propostas
        proposta_produto: pm.pp ? (propostaMap[pm.pp] || pm.pp) : '',
        proposta_servico: pm.ps ? (propostaMap[pm.ps] || pm.ps) : '',
        etapa_nome:   (() => {
          if (o.stage_id && stageMap[o.stage_id]) return stageMap[o.stage_id]
          // funil etapas têm IDs numéricos em custom_fields.etapa_id
          const eid = o.custom_fields?.etapa_id
          if (eid) {
            for (const f of funisArr) {
              const e = (f.etapas||[]).find(e => String(e.id) === String(eid))
              if (e) return e.nome || 'Sem etapa'
            }
          }
          return 'Sem etapa'
        })(),
        funil_nome:   (() => { const fid = o.custom_fields?.funil_id ?? o.funil_id; return fid ? (funilMap[String(fid)] || 'Sem funil') : 'Sem funil' })(),
        motivo_perda: o.motivo_perda || '',
        mes:          o.created_at?.slice(0,7) || '',
        semana:       isoWeekLabel(o.created_at),
        created_at:   o.created_at?.slice(0,10) || '',
      }})

      const projetos = projData.map(p => {
        const cf = p.custom_fields || {}
        return {
          status:     p.status || '',
          fase:       cf.phase || '',
          horas_est:  Number(cf.total_hours_estimated || 0),
          horas_exec: Number(cf.total_hours_executed  || 0),
          nome:       p.nome || '',
          created_at: p.created_at?.slice(0,10) || '',
          // Financeiro (sincronizado pela aba Financeiro em Projetos.js, custom_fields.fin_*)
          custo_hora:        Number(cf.fin_custo_hora || 0),
          valor_contrato:    Number(cf.fin_valor_contrato || 0),
          custo_realizado:   Number(cf.fin_custo_realizado || 0),
          receita_faturada:  Number(cf.fin_receita_faturada || 0),
          margem_bruta:      Number(cf.fin_margem_bruta || 0),
          margem_pct:        Number(cf.fin_margem_pct || 0),
          custo_forecast:    Number(cf.fin_custo_forecast || 0),
          margem_forecast:   Number(cf.fin_margem_forecast || 0),
        }
      })

      // Campanhas — meta x realizado. Realizado vem das Oportunidades vinculadas
      // via custom_fields.campanha_id (mesmo campo usado pra resolver o nome
      // da campanha acima) — sem query extra, já está no oppsData carregado.
      const campanhas = campanhasData.map(c => {
        const oppsDaCampanha = oppsData.filter(o => String(o.custom_fields?.campanha_id || '') === String(c.id))
        const ganhas = oppsDaCampanha.filter(o => o.situacao === 'ganha')
        const valorRealizado = ganhas.reduce((s, o) => s + (Number(o.valor_cdu)||0) + (Number(o.valor_sms)||0) + (Number(o.valor_servico)||0), 0)
        const metaValor = Number(c.meta || 0)
        const metaOportunidades = Number(c.meta_oportunidades || 0)
        const custoRealizado = (c.custos || []).reduce((s, cc) => s + (cc.executado ? (Number(cc.valor_realizado)||0) : 0), 0)
        const custoPrevisto  = (c.custos || []).reduce((s, cc) => s + (Number(cc.valor_previsto)||0), 0)
        return {
          nome:   c.nome || '',
          status: c.status || 'rascunho',
          inicio: c.inicio || '',
          fim:    c.fim || '',
          meta_valor:              metaValor,
          meta_oportunidades:      metaOportunidades,
          oportunidades_qtd:       oppsDaCampanha.length,
          oportunidades_ganhas:    ganhas.length,
          valor_realizado:         valorRealizado,
          atingimento_valor_pct:      metaValor > 0 ? Math.round((valorRealizado / metaValor) * 1000) / 10 : 0,
          atingimento_oport_pct:      metaOportunidades > 0 ? Math.round((ganhas.length / metaOportunidades) * 1000) / 10 : 0,
          custo_previsto:  custoPrevisto,
          custo_realizado: custoRealizado,
        }
      })

      const empresas = companiesData.map(c => ({
        tipo:       c.tipo || '',
        status:     c.status || '',
        nome:       c.nome_fantasia || c.razao_social || '',
        created_at: c.created_at?.slice(0,10) || '',
      }))

      const parceiros = parceirosData.map(p => ({
        nome:       p.nome || '',
        status:     p.status || 'ativo',
        created_at: p.created_at?.slice(0,10) || '',
      }))

      const metas = goalsData.map(g => ({
        tipo_alvo:       g.tipo_alvo || '',
        alvo_nome:       g.alvo_nome || '',
        tipo_meta:       g.tipo_meta || '',
        status:          g.status || 'ativa',
        valor_planejado: Number(g.valor_planejado || 0),
        valor_atual:     Number(g.valor_atual || 0),
        periodo:         `${String(g.periodo_mes||'').padStart(2,'0')}/${g.periodo_ano||''}`,
        created_at:      g.created_at?.slice(0,10) || '',
      }))

      const acoes = actionsData.map(a => ({
        titulo:     a.titulo || '',
        tipo:       a.tipo || '',
        status:     a.status || '',
        prioridade: a.prioridade || '',
        data_prev:  a.data_prevista?.slice(0,10) || '',
        data_conc:  a.data_conclusao?.slice(0,10) || '',
        created_at: a.created_at?.slice(0,10) || '',
      }))

      const contatos = contactsData.map(c => ({
        email:      c.email || '',
        cargo:      c.job_title || '',
        created_at: c.created_at?.slice(0,10) || '',
      }))

      const vendedores = sellersData.map(s => ({
        nome:        s.nome || '',
        status:      s.status || '',
        cargo:       s.cargo || '',
        equipe:      s.equipe || '',
        regiao:      s.regiao || '',
        meta_mensal: Number(s.meta_mensal || 0),
        created_at:  s.created_at?.slice(0,10) || '',
      }))

      const contratos = contractsData.map(c => ({
        numero:      c.numero || '',
        status:      c.status || '',
        vigencia_ini: c.data_inicio?.slice(0,10) || '',
        vigencia_fim: c.data_fim?.slice(0,10) || '',
        created_at:  c.created_at?.slice(0,10) || '',
      }))

      const pagamentos = paymentsData.map(p => ({
        status:       p.status || '',
        mes_ref:      p.reference_month?.slice(0,7) || '',
        vencimento:   p.due_date?.slice(0,10) || '',
        valor_cdu:    Number(p.amount_cdu || 0),
        valor_sms:    Number(p.amount_sms || 0),
        valor_serv:   Number(p.amount_services || 0),
        desconto:     Number(p.amount_discount || 0),
        valor_total:  Math.max(0, (Number(p.amount_cdu||0) + Number(p.amount_sms||0) + Number(p.amount_services||0) - Number(p.amount_discount||0))),
        created_at:   p.created_at?.slice(0,10) || '',
      }))

      const comissoes = commissionsData.map(c => ({
        beneficiario: c.beneficiario_nome || '',
        receita_tipo: c.receita_tipo || '',
        valor_base:   Number(c.valor_base || 0),
        percentual:   Number(c.percentual || 0),
        status:       c.status || '',
        created_at:   c.created_at?.slice(0,10) || '',
      }))

      const cs = csData.map(h => ({
        laer_stage:   h.laer_stage || '',
        touch_model:  h.touch_model || '',
        health_score: Number(h.health_score || 0),
        renewal_date: h.renewal_date?.slice(0,10) || '',
        created_at:   h.created_at?.slice(0,10) || '',
      }))

      const questionarios = questTemplatesData.map(t => ({
        titulo:    t.title || '',
        tipo:      t.type || '',
        ativo:     t.is_active ? 'Sim' : 'Não',
        created_at: t.created_at?.slice(0,10) || '',
      }))

      const respostas = questSubmissionsData.map(s => ({
        template_id: s.template_id || '',
        status:      s.status || '',
        created_at:  s.created_at?.slice(0,10) || '',
      }))

      const documentos = documentsData.map(d => ({
        titulo:       d.title || '',
        categoria:    d.categoria || '',
        status:       d.status || '',
        prazo_valid:  d.prazo_validade?.slice(0,10) || '',
        created_at:   d.created_at?.slice(0,10) || '',
      }))

      const playbooks = playbooksData.map(p => ({
        titulo:    p.title || '',
        segmento:  p.segment || '',
        ativo:     p.is_active ? 'Sim' : 'Não',
        created_at: p.created_at?.slice(0,10) || '',
      }))

      const etapaHistorico = etapaHistoricoData.map(h => ({
        etapa_nome:    h.etapa_nome || 'Sem etapa',
        situacao:      h.situacao   || '',
        dias_na_etapa: Number(h.dias_na_etapa ?? 0),
        status_etapa:  h.saiu_em ? 'concluída' : 'atual',
        entrou_em:     h.entrou_em?.slice(0,10) || '',
        saiu_em:       h.saiu_em?.slice(0,10)   || '',
        mes:           h.entrou_em?.slice(0,7)   || '',
      }))

      // ── Definição das fontes com fields ──────────────────────────────────

      setSources([
        {
          id: 'pipeline', label: 'Pipeline', icon: '📈',
          registros: oportunidades,
          fields: [
            { key:'funil_nome',   label:'Funil',         type:'text'   },
            { key:'situacao',     label:'Situação',      type:'text'   },
            { key:'titulo',       label:'Título',        type:'text'   },
            { key:'responsavel',  label:'Responsável',   type:'text'   },
            { key:'valor',        label:'Valor (R$)',    type:'number' },
            { key:'origem',       label:'Origem',        type:'text'   },
            { key:'campanha',     label:'Campanha',      type:'text'   },
            { key:'etapa_nome',   label:'Etapa',         type:'text'   },
            { key:'motivo_perda',          label:'Motivo perda',             type:'text' },
            { key:'mes',                   label:'Mês (YYYY-MM)',            type:'text' },
            { key:'semana',                label:'Semana',                   type:'text' },
            { key:'created_at',            label:'Criado em',                type:'date' },
            { key:'proxima_tarefa_data',   label:'Data próxima tarefa',      type:'date' },
            { key:'proxima_tarefa_hora',   label:'Hora próxima tarefa',      type:'text' },
            { key:'primeira_conclusao_data', label:'Data 1ª conclusão tarefa', type:'date' },
            { key:'primeira_conclusao_hora', label:'Hora 1ª conclusão tarefa', type:'text' },
            { key:'proposta_produto',      label:'Proposta produto',          type:'text' },
            { key:'proposta_servico',      label:'Proposta serviço',          type:'text' },
          ],
        },
        {
          id: 'projetos', label: 'Projetos', icon: '🏗️',
          registros: projetos,
          fields: [
            { key:'status',     label:'Status',       type:'text'   },
            { key:'fase',       label:'Fase',         type:'text'   },
            { key:'nome',       label:'Nome',         type:'text'   },
            { key:'horas_est',  label:'Horas estim.', type:'number' },
            { key:'horas_exec', label:'Horas exec.',  type:'number' },
            { key:'created_at', label:'Criado em',    type:'date'   },
            { key:'custo_hora',       label:'Custo/hora (R$)',        type:'number' },
            { key:'valor_contrato',   label:'Valor do contrato (R$)', type:'number' },
            { key:'custo_realizado',  label:'Custo realizado (R$)',   type:'number' },
            { key:'receita_faturada', label:'Receita faturada (R$)',  type:'number' },
            { key:'margem_bruta',     label:'Margem bruta (R$)',      type:'number' },
            { key:'margem_pct',       label:'Margem (%)',             type:'number' },
            { key:'custo_forecast',   label:'Custo forecast (R$)',    type:'number' },
            { key:'margem_forecast',  label:'Margem forecast (R$)',   type:'number' },
          ],
        },
        {
          id: 'campanhas', label: 'Campanhas', icon: '📣',
          registros: campanhas,
          fields: [
            { key:'nome',   label:'Nome',   type:'text' },
            { key:'status', label:'Status', type:'text' },
            { key:'inicio', label:'Início', type:'date' },
            { key:'fim',    label:'Fim',    type:'date' },
            { key:'meta_valor',           label:'Meta de valor (R$)',        type:'number' },
            { key:'valor_realizado',      label:'Valor realizado (R$)',      type:'number' },
            { key:'atingimento_valor_pct',label:'Atingimento de valor (%)',  type:'number' },
            { key:'meta_oportunidades',   label:'Meta de oportunidades',     type:'number' },
            { key:'oportunidades_ganhas', label:'Oportunidades ganhas',      type:'number' },
            { key:'oportunidades_qtd',    label:'Oportunidades (total)',     type:'number' },
            { key:'atingimento_oport_pct',label:'Atingimento de oport. (%)', type:'number' },
            { key:'custo_previsto',       label:'Custo previsto (R$)',       type:'number' },
            { key:'custo_realizado',      label:'Custo realizado (R$)',      type:'number' },
          ],
        },
        {
          id: 'empresas', label: 'Empresas', icon: '🏢',
          registros: empresas,
          fields: [
            { key:'tipo',      label:'Tipo',      type:'text' },
            { key:'status',    label:'Status',    type:'text' },
            { key:'nome',      label:'Nome',      type:'text' },
            { key:'created_at',label:'Criado em', type:'date' },
          ],
        },
        {
          id: 'parceiros', label: 'Parceiros', icon: '🤝',
          registros: parceiros,
          fields: [
            { key:'status',    label:'Status',    type:'text' },
            { key:'nome',      label:'Nome',      type:'text' },
            { key:'created_at',label:'Criado em', type:'date' },
          ],
        },
        {
          id: 'metas', label: 'Metas', icon: '🎯',
          registros: metas,
          fields: [
            { key:'tipo_alvo',      label:'Tipo de alvo',  type:'text'   },
            { key:'alvo_nome',      label:'Alvo',          type:'text'   },
            { key:'tipo_meta',      label:'Tipo',          type:'text'   },
            { key:'status',         label:'Status',        type:'text'   },
            { key:'valor_planejado',label:'Planejado (R$)',type:'number' },
            { key:'valor_atual',    label:'Atual (R$)',    type:'number' },
            { key:'periodo',        label:'Período',       type:'text'   },
          ],
        },
        {
          id: 'acoes', label: 'Ações', icon: '⚡',
          registros: acoes,
          fields: [
            { key:'titulo',    label:'Título',     type:'text' },
            { key:'tipo',      label:'Tipo',       type:'text' },
            { key:'status',    label:'Status',     type:'text' },
            { key:'prioridade',label:'Prioridade', type:'text' },
            { key:'data_prev', label:'Prevista',   type:'date' },
            { key:'data_conc', label:'Concluída',  type:'date' },
            { key:'created_at',label:'Criado em',  type:'date' },
          ],
        },
        {
          id: 'contatos', label: 'Contatos', icon: '👤',
          registros: contatos,
          fields: [
            { key:'email',     label:'E-mail',    type:'text' },
            { key:'cargo',     label:'Cargo',     type:'text' },
            { key:'created_at',label:'Criado em', type:'date' },
          ],
        },
        {
          id: 'vendedores', label: 'Contatos Canais', icon: '🧑‍💼',
          registros: vendedores,
          fields: [
            { key:'nome',       label:'Nome',       type:'text'   },
            { key:'status',     label:'Status',     type:'text'   },
            { key:'cargo',      label:'Cargo',      type:'text'   },
            { key:'equipe',     label:'Equipe',     type:'text'   },
            { key:'regiao',     label:'Região',     type:'text'   },
            { key:'meta_mensal',label:'Meta (R$)',  type:'number' },
            { key:'created_at', label:'Criado em',  type:'date'   },
          ],
        },
        {
          id: 'contratos', label: 'Contratos', icon: '📄',
          registros: contratos,
          fields: [
            { key:'numero',      label:'Número',     type:'text' },
            { key:'status',      label:'Status',     type:'text' },
            { key:'vigencia_ini',label:'Início',     type:'date' },
            { key:'vigencia_fim',label:'Fim',        type:'date' },
            { key:'created_at',  label:'Criado em',  type:'date' },
          ],
        },
        {
          id: 'pagamentos', label: 'Pagamentos', icon: '💰',
          registros: pagamentos,
          fields: [
            { key:'status',      label:'Status',        type:'text'   },
            { key:'mes_ref',     label:'Mês ref.',      type:'text'   },
            { key:'vencimento',  label:'Vencimento',    type:'date'   },
            { key:'valor_cdu',   label:'CDU (R$)',      type:'number' },
            { key:'valor_sms',   label:'SMS (R$)',      type:'number' },
            { key:'valor_serv',  label:'Serviços (R$)', type:'number' },
            { key:'desconto',    label:'Desconto (R$)', type:'number' },
            { key:'valor_total', label:'Total (R$)',    type:'number' },
          ],
        },
        {
          id: 'comissoes', label: 'Comissões', icon: '💸',
          registros: comissoes,
          fields: [
            { key:'beneficiario', label:'Beneficiário',  type:'text'   },
            { key:'receita_tipo', label:'Tipo receita',  type:'text'   },
            { key:'valor_base',   label:'Valor base',    type:'number' },
            { key:'percentual',   label:'% comissão',   type:'number' },
            { key:'status',       label:'Status',        type:'text'   },
            { key:'created_at',   label:'Criado em',     type:'date'   },
          ],
        },
        {
          id: 'customer_health', label: 'Sucesso do Cliente', icon: '❤️',
          registros: cs,
          fields: [
            { key:'laer_stage',  label:'Etapa LAER',   type:'text'   },
            { key:'touch_model', label:'Toque',        type:'text'   },
            { key:'health_score',label:'Score saúde',  type:'number' },
            { key:'renewal_date',label:'Renovação',    type:'date'   },
          ],
        },
        {
          id: 'questionarios', label: 'Questionários', icon: '📋',
          registros: questionarios,
          fields: [
            { key:'titulo',    label:'Título',    type:'text' },
            { key:'tipo',      label:'Tipo',      type:'text' },
            { key:'ativo',     label:'Ativo',     type:'text' },
            { key:'created_at',label:'Criado em', type:'date' },
          ],
        },
        {
          id: 'questionarios_respostas', label: 'Respostas Questionários', icon: '📝',
          registros: respostas,
          fields: [
            { key:'status',    label:'Status',    type:'text' },
            { key:'created_at',label:'Criado em', type:'date' },
          ],
        },
        {
          id: 'documentos', label: 'Documentos', icon: '🗂️',
          registros: documentos,
          fields: [
            { key:'titulo',     label:'Título',    type:'text' },
            { key:'categoria',  label:'Categoria', type:'text' },
            { key:'status',     label:'Status',    type:'text' },
            { key:'prazo_valid',label:'Validade',  type:'date' },
            { key:'created_at', label:'Criado em', type:'date' },
          ],
        },
        {
          id: 'playbooks', label: 'Playbooks', icon: '📚',
          registros: playbooks,
          fields: [
            { key:'titulo',    label:'Título',    type:'text' },
            { key:'segmento',  label:'Segmento',  type:'text' },
            { key:'ativo',     label:'Ativo',     type:'text' },
            { key:'created_at',label:'Criado em', type:'date' },
          ],
        },
        {
          id: 'etapa_historico', label: 'Histórico de Etapas', icon: '🔄',
          registros: etapaHistorico,
          fields: [
            { key:'etapa_nome',    label:'Etapa',           type:'text'   },
            { key:'situacao',      label:'Situação',        type:'text'   },
            { key:'dias_na_etapa', label:'Dias na etapa',   type:'number' },
            { key:'status_etapa',  label:'Status etapa',    type:'text'   },
            { key:'mes',           label:'Mês entrada',     type:'text'   },
            { key:'entrou_em',     label:'Entrou em',       type:'date'   },
            { key:'saiu_em',       label:'Saiu em',         type:'date'   },
          ],
        },
      ])
    } catch (_) {
      setSources([])
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id])

  useEffect(() => { load() }, [load])

  return { sources, loading, reload: load }
}
