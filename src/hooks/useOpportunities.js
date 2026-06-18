import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfile } from './useProfile'

// Mock inline — mesmo dado que estava em Pipeline.js
const MOCK_OPORTUNIDADES = [
  { id:1,  titulo:'Expansão Canal SP',        funil_id:1, etapa_id:13, playbook_id:'pb-1', empresa_id:1, empresa_nome:'Nexus Tech',   valor:890,  valor_cdu:400,  valor_sms:190,  valor_servico:350,  valor_desconto:50,  primary_contact_id:'c1',  primary_contact_nome:'Lucas Ferreira',  responsavel:'Lucas Ferreira',  prazo:'2026-07-30', origem:'Inbound',   criado:'2026-05-01', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'Remota',     segmento_industria:'Tecnologia',   exige_integracao:true  } },
  { id:2,  titulo:'Renovação Contrato 2025',  funil_id:1, etapa_id:14, playbook_id:'pb-1', empresa_id:4, empresa_nome:'Milenium',     valor:1340, valor_cdu:600,  valor_sms:340,  valor_servico:400,  valor_desconto:0,   primary_contact_id:'c8',  primary_contact_nome:'Carla Menezes',   responsavel:'Carla Menezes',   prazo:'2026-07-15', origem:'Canal',     criado:'2026-05-10', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'Presencial',  segmento_industria:'Varejo',       exige_integracao:false } },
  { id:3,  titulo:'Nova unidade RS',          funil_id:1, etapa_id:12, playbook_id:'pb-2', empresa_id:8, empresa_nome:'MedGroup',     valor:290,  valor_cdu:0,    valor_sms:90,   valor_servico:200,  valor_desconto:0,   primary_contact_id:'c18', primary_contact_nome:'Fernanda Rocha',  responsavel:'Fernanda Rocha',  prazo:'2026-08-20', origem:'Outbound',  criado:'2026-05-18', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'', segmento_industria:'', exige_integracao:false } },
  { id:4,  titulo:'Upgrade Pro',              funil_id:1, etapa_id:11, playbook_id:'pb-1', empresa_id:3, empresa_nome:'Solaris',      valor:600,  valor_cdu:300,  valor_sms:0,    valor_servico:300,  valor_desconto:0,   primary_contact_id:'c7',  primary_contact_nome:'Pedro Alves',     responsavel:'Pedro Alves',     prazo:'2026-09-01', origem:'Inbound',   criado:'2026-05-20', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'', segmento_industria:'', exige_integracao:false } },
  { id:5,  titulo:'Contrato financeiro SP',   funil_id:1, etapa_id:13, playbook_id:'pb-1', empresa_id:6, empresa_nome:'FinCorp',      valor:3200, valor_cdu:1800, valor_sms:700,  valor_servico:900,  valor_desconto:200, primary_contact_id:'c13', primary_contact_nome:'Mariana Silva',   responsavel:'Mariana Silva',   prazo:'2026-07-01', origem:'Indicação', criado:'2026-04-12', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'Híbrida',    segmento_industria:'Financeiro',   exige_integracao:true  } },
  { id:6,  titulo:'Piloto agro PR',           funil_id:1, etapa_id:15, playbook_id:null,   empresa_id:5, empresa_nome:'AgriSmart',    valor:890,  valor_cdu:0,    valor_sms:0,    valor_servico:890,  valor_desconto:0,   primary_contact_id:'c11', primary_contact_nome:'João Lima',       responsavel:'João Lima',       prazo:'2026-06-30', origem:'Canal',     criado:'2026-03-05', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'Presencial',  segmento_industria:'Agronegócio',  exige_integracao:false } },
  { id:7,  titulo:'Parceria distribuição',    funil_id:2, etapa_id:22, playbook_id:'pb-1', empresa_id:2, empresa_nome:'Alpha Dist.',  valor:1200, valor_cdu:500,  valor_sms:400,  valor_servico:300,  valor_desconto:0,   primary_contact_id:'c5',  primary_contact_nome:'Ana Costa',       responsavel:'Ana Costa',       prazo:'2026-08-10', origem:'Canal',     criado:'2026-05-15', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'', segmento_industria:'', exige_integracao:false } },
  { id:8,  titulo:'Demo Canal Sul',           funil_id:2, etapa_id:21, playbook_id:null,   empresa_id:7, empresa_nome:'Logix',        valor:580,  valor_cdu:0,    valor_sms:180,  valor_servico:400,  valor_desconto:0,   primary_contact_id:'c17', primary_contact_nome:'Rafael Santos',   responsavel:'Rafael Santos',   prazo:'2026-09-15', origem:'Outbound',  criado:'2026-05-22', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'', segmento_industria:'', exige_integracao:false } },
  { id:9,  titulo:'Proposta distribuidora',   funil_id:2, etapa_id:23, playbook_id:'pb-1', empresa_id:4, empresa_nome:'Milenium',     valor:890,  valor_cdu:390,  valor_sms:200,  valor_servico:350,  valor_desconto:50,  primary_contact_id:'c9',  primary_contact_nome:'Felipe Souza',    responsavel:'Carla Menezes',   prazo:'2026-07-20', origem:'Canal',     criado:'2026-05-08', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'Remota',     segmento_industria:'Distribuição', exige_integracao:true  } },
  { id:10, titulo:'Aprovação parceiro RJ',    funil_id:2, etapa_id:24, playbook_id:null,   empresa_id:3, empresa_nome:'Solaris',      valor:1780, valor_cdu:800,  valor_sms:480,  valor_servico:500,  valor_desconto:0,   primary_contact_id:null,  primary_contact_nome:'',                responsavel:'Pedro Alves',     prazo:'2026-07-05', origem:'Indicação', criado:'2026-04-28', situacao:'em_andamento', custom_fields:{ tipo_implantacao:'', segmento_industria:'', exige_integracao:false } },
]

function rowToOpp(row) {
  const cf = row.custom_fields || {}
  return {
    id:                    row.id,
    titulo:                row.titulo || '',
    funil_id:              cf.funil_id || null,
    etapa_id:              row.stage_id || null,
    playbook_id:           cf.playbook_id || null,
    empresa_id:            row.company_id || null,
    empresa_nome:          row.companies?.nome_fantasia || row.companies?.razao_social || cf.empresa_nome || '',
    valor:                 row.valor || 0,
    valor_cdu:             cf.valor_cdu || 0,
    valor_sms:             cf.valor_sms || 0,
    valor_servico:         cf.valor_servico || 0,
    valor_desconto:        cf.valor_desconto || 0,
    primary_contact_id:    row.contact_id || null,
    primary_contact_nome:  cf.primary_contact_nome || '',
    responsavel:           row.responsavel || '',
    prazo:                 row.prazo || '',
    origem:                row.origem || '',
    criado:                row.created_at?.slice(0, 10) || '',
    situacao:              row.situacao || 'em_andamento',
    descricao:             row.descricao || '',
    motivo_perda:          row.motivo_perda || '',
    tenant_id:             row.tenant_id || null,
    branch_id:             row.branch_id || null,
    custom_fields: {
      tipo_implantacao:   cf.tipo_implantacao || '',
      segmento_industria: cf.segmento_industria || '',
      exige_integracao:   cf.exige_integracao || false,
    },
  }
}

function oppToRow(opp, tenantId, branchId) {
  return {
    tenant_id:   tenantId,
    branch_id:   branchId || null,
    titulo:      opp.titulo,
    company_id:  opp.empresa_id || null,
    contact_id:  opp.primary_contact_id || null,
    stage_id:    opp.etapa_id || null,
    responsavel: opp.responsavel || '',
    valor:       opp.valor || 0,
    situacao:    opp.situacao || 'em_andamento',
    origem:      opp.origem || '',
    prazo:       opp.prazo || null,
    descricao:   opp.descricao || '',
    motivo_perda:opp.motivo_perda || '',
    custom_fields: {
      funil_id:              opp.funil_id,
      playbook_id:           opp.playbook_id,
      empresa_nome:          opp.empresa_nome,
      primary_contact_nome:  opp.primary_contact_nome,
      valor_cdu:             opp.valor_cdu || 0,
      valor_sms:             opp.valor_sms || 0,
      valor_servico:         opp.valor_servico || 0,
      valor_desconto:        opp.valor_desconto || 0,
      tipo_implantacao:      opp.custom_fields?.tipo_implantacao || '',
      segmento_industria:    opp.custom_fields?.segmento_industria || '',
      exige_integracao:      opp.custom_fields?.exige_integracao || false,
    },
  }
}

export function useOpportunities() {
  const { session } = useAuth()
  const { profile } = useProfile()

  const [opps,    setOpps]    = useState(MOCK_OPORTUNIDADES)
  const [loading, setLoading] = useState(true)
  const isMockMode            = useRef(true)

  const tenantId = profile?.tenant_id
  const branchId = profile?.branch_id || null

  const load = useCallback(async () => {
    setLoading(true)

    if (!session?.user) {
      setOpps(MOCK_OPORTUNIDADES)
      isMockMode.current = true
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('opportunities')
      .select('*, companies(nome_fantasia, razao_social)')
      .order('created_at', { ascending: false })

    if (error) {
      isMockMode.current = true
      setOpps(MOCK_OPORTUNIDADES)
      setLoading(false)
      return
    }

    isMockMode.current = false
    setOpps((data || []).map(rowToOpp))
    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  // Salvar (insert ou update)
  const save = useCallback(async (data) => {
    if (isMockMode.current) {
      setOpps(prev => {
        const idx = prev.findIndex(o => o.id === data.id)
        if (idx >= 0) { const n = [...prev]; n[idx] = data; return n }
        return [...prev, { ...data, id: data.id || Date.now() + Math.random(), criado: new Date().toISOString().slice(0, 10) }]
      })
      return { ok: true }
    }

    const row = oppToRow(data, tenantId, branchId)
    // É update se tiver UUID real (com traço) OU se já existe na lista local
    const isUuid = typeof data.id === 'string' && data.id.includes('-')
    const existeLocal = isUuid // IDs reais do Supabase são sempre UUIDs

    if (existeLocal) {
      // Atualiza local imediatamente
      setOpps(prev => prev.map(o => o.id === data.id ? { ...o, ...data } : o))
      const { error } = await supabase.from('opportunities').update(row).eq('id', data.id)
      if (error) console.warn('[useOpportunities] update error:', error.message)
    } else {
      // Insere localmente com UUID temporário (com traço) para que edições subsequentes tomem o caminho UPDATE
      const tempId = crypto.randomUUID()
      const optimistic = { ...data, id: tempId, criado: new Date().toISOString().slice(0, 10) }
      setOpps(prev => [...prev, optimistic])
      const { data: inserted, error } = await supabase.from('opportunities').insert(row).select('*, companies(nome_fantasia, razao_social)').single()
      if (error) {
        console.warn('[useOpportunities] insert error:', error.message)
        // Mantém o registro local com ID temporário
        return { ok: true }
      }
      // Substitui ID temporário pelo ID real do Supabase
      setOpps(prev => prev.map(o => o.id === tempId ? rowToOpp(inserted) : o))
    }
    return { ok: true }
  }, [tenantId, branchId])

  // Mover para etapa (drag kanban)
  const moveToStage = useCallback(async (id, etapaId) => {
    setOpps(prev => prev.map(o => o.id === id ? { ...o, etapa_id: etapaId } : o))
    if (!isMockMode.current) {
      await supabase.from('opportunities').update({ stage_id: etapaId }).eq('id', id)
    }
  }, [])

  // Bulk mover para etapa
  const bulkMoveToStage = useCallback(async (ids, etapaId) => {
    setOpps(prev => prev.map(o => ids.includes(o.id) ? { ...o, etapa_id: etapaId } : o))
    if (!isMockMode.current) {
      await supabase.from('opportunities').update({ stage_id: etapaId }).in('id', ids)
    }
  }, [])

  // Remover
  const remove = useCallback(async (id) => {
    if (isMockMode.current) {
      setOpps(prev => prev.filter(o => o.id !== id))
      return { ok: true }
    }
    const { error } = await supabase.from('opportunities').delete().eq('id', id)
    if (error) return { ok: false, message: error.message }
    setOpps(prev => prev.filter(o => o.id !== id))
    return { ok: true }
  }, [])

  // Remover vários
  const removeMany = useCallback(async (ids) => {
    setOpps(prev => prev.filter(o => !ids.includes(o.id)))
    if (!isMockMode.current) {
      await supabase.from('opportunities').delete().in('id', ids)
    }
  }, [])

  // Importar
  const importMany = useCallback(async (rows) => {
    if (isMockMode.current) {
      const novas = rows.map(r => ({ ...r, id: Date.now() + Math.random(), criado: new Date().toISOString().slice(0, 10) }))
      setOpps(prev => [...prev, ...novas])
      return { ok: true }
    }
    const dbRows = rows.map(r => oppToRow(r, tenantId, branchId))
    const { data, error } = await supabase.from('opportunities').insert(dbRows).select()
    if (error) return { ok: false, message: error.message }
    setOpps(prev => [...prev, ...(data || []).map(rowToOpp)])
    return { ok: true }
  }, [tenantId, branchId])

  return { opps, loading, reload: load, save, remove, removeMany, moveToStage, bulkMoveToStage, importMany }
}
