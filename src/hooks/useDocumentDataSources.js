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
          .select('id, nome').eq('tenant_id', tenantId).limit(500),

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
      ])

      // Extrai data de cada resultado; query com erro retorna []
      const QUERY_NAMES = ['oportunidades','pipeline_stages','campanhas','projects','companies','parceiros','goals','actions','contacts','sellers','contracts','payments','commission_payments','customer_health','questionnaire_templates','questionnaire_submissions','documents','playbooks','form_layouts_funis']
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
        funisLayoutData,
      ] = Array.from({ length: 19 }, (_, i) => safe(i))

      // ── Mapeamento de cada fonte ──────────────────────────────────────────

      // Lookups para enriquecer oportunidades
      const stageMap    = Object.fromEntries(stagesData.map(s => [s.id, s.name]))
      const campanhaMap = Object.fromEntries(campanhasData.map(c => [c.id, c.nome]))
      const funisArr = funisLayoutData[0]?.fields || []
      // funilMap: id (qualquer tipo) → nome do funil
      const funilMap = Object.fromEntries(funisArr.map(f => [String(f.id), f.nome || '']))

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

      const oportunidades = oppsData.map(o => ({
        situacao:     o.situacao || 'em_andamento',
        titulo:       o.titulo || '',
        responsavel:  o.responsavel || '',
        valor:        (Number(o.valor_cdu)||0) + (Number(o.valor_sms)||0) + (Number(o.valor_servico)||0),
        origem:       o.origem || 'Não informado',
        campanha:     'Sem campanha',
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
      }))

      const projetos = projData.map(p => {
        const cf = p.custom_fields || {}
        return {
          status:     p.status || '',
          fase:       cf.phase || '',
          horas_est:  Number(cf.total_hours_estimated || 0),
          horas_exec: Number(cf.total_hours_executed  || 0),
          nome:       p.nome || '',
          created_at: p.created_at?.slice(0,10) || '',
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
            { key:'motivo_perda', label:'Motivo perda',  type:'text'   },
            { key:'mes',          label:'Mês (YYYY-MM)', type:'text'   },
            { key:'semana',       label:'Semana',        type:'text'   },
            { key:'created_at',   label:'Criado em',     type:'date'   },
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
