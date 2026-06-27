import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useProfile } from '../../hooks/useProfile'
import { Bell, Mail, CheckSquare, Save } from 'lucide-react'

const GATILHOS = [
  { key: 'pagamento_vencido',    label: 'Pagamento vencido',          icon: '🔴', desc: 'Quando um pagamento passa da data de vencimento' },
  { key: 'contrato_vencendo',    label: 'Contrato vencendo',          icon: '🟡', desc: 'Quando um contrato está próximo do fim da vigência' },
  { key: 'oportunidade_parada',  label: 'Oportunidade parada',        icon: '🔴', desc: 'Quando uma oportunidade fica sem movimentação' },
  { key: 'score_cs_critico',     label: 'Score CS crítico',           icon: '🟡', desc: 'Quando o score de saúde do cliente fica abaixo do limite' },
]

const btnSm = (color, bg, border) => ({
  padding: '4px 11px', borderRadius: 6, border: `1px solid ${border}`,
  background: bg, color, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: 4,
})

const EMPTY_RULE = (gatilho) => ({ gatilho, ativo: true, dias_aviso: 1, modo: 'notificar', prazo_tarefa_dias: 3, destinatarios: [] })

export default function SettingsAlertas() {
  const { profile } = useProfile()
  const [rules, setRules]   = useState({})
  const [saving, setSaving] = useState(null)
  const [saved,  setSaved]  = useState(null)

  const tenantId = profile?.tenant_id

  const load = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase.from('alert_rules').select('*').eq('tenant_id', tenantId)
    const map = {}
    GATILHOS.forEach(g => {
      const r = (data || []).find(x => x.gatilho === g.key)
      map[g.key] = r ? { ...r } : EMPTY_RULE(g.key)
    })
    setRules(map)
  }, [tenantId])

  useEffect(() => { load() }, [load])

  function set(gatilho, field, value) {
    setRules(prev => ({ ...prev, [gatilho]: { ...prev[gatilho], [field]: value } }))
  }

  async function save(gatilho) {
    const rule = rules[gatilho]
    if (!tenantId) return
    setSaving(gatilho)
    const row = {
      tenant_id:        tenantId,
      gatilho:          rule.gatilho,
      ativo:            rule.ativo,
      dias_aviso:       Number(rule.dias_aviso) || 1,
      modo:             rule.modo,
      prazo_tarefa_dias: rule.modo === 'criar_tarefa' ? (Number(rule.prazo_tarefa_dias) || 3) : null,
      destinatarios:    rule.destinatarios || [],
      updated_at:       new Date().toISOString(),
    }
    let error
    if (rule.id) {
      ({ error } = await supabase.from('alert_rules').update(row).eq('id', rule.id))
    } else {
      const { data, error: e } = await supabase.from('alert_rules').insert(row).select().single()
      error = e
      if (data) setRules(prev => ({ ...prev, [gatilho]: { ...prev[gatilho], id: data.id } }))
    }
    setSaving(null)
    if (!error) { setSaved(gatilho); setTimeout(() => setSaved(null), 2000) }
    else alert('Erro ao salvar: ' + error.message)
  }

  return (
    <div style={{ maxWidth: 680, padding: '32px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Bell size={20} strokeWidth={2} color="var(--accent)" />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Alertas & Notificações</h2>
      </div>
      <p style={{ margin: '0 0 28px', fontSize: 13, color: 'var(--text-muted)' }}>
        Configure quando e como o sistema deve notificar sua equipe.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {GATILHOS.map(g => {
          const rule = rules[g.key]
          if (!rule) return null
          return (
            <div key={g.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
              {/* Cabeçalho */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: rule.ativo ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15 }}>{g.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g.desc}</div>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={rule.ativo} onChange={e => set(g.key, 'ativo', e.target.checked)} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rule.ativo ? 'Ativo' : 'Inativo'}</span>
                </label>
              </div>

              {rule.ativo && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                  {/* Dias aviso */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                    Avisar após
                    <input
                      type="number" min={1} max={90}
                      value={rule.dias_aviso}
                      onChange={e => set(g.key, 'dias_aviso', e.target.value)}
                      style={{ width: 48, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, textAlign: 'center' }}
                    />
                    dia(s)
                  </label>

                  {/* Modo */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                    <Mail size={12} strokeWidth={2} />
                    <select
                      value={rule.modo}
                      onChange={e => set(g.key, 'modo', e.target.value)}
                      style={{ padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12 }}
                    >
                      <option value="notificar">Só notificar</option>
                      <option value="criar_tarefa">Criar tarefa automaticamente</option>
                    </select>
                  </label>

                  {/* Prazo tarefa */}
                  {rule.modo === 'criar_tarefa' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                      <CheckSquare size={12} strokeWidth={2} />
                      Prazo da tarefa:
                      <input
                        type="number" min={1} max={30}
                        value={rule.prazo_tarefa_dias}
                        onChange={e => set(g.key, 'prazo_tarefa_dias', e.target.value)}
                        style={{ width: 44, padding: '3px 6px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, textAlign: 'center' }}
                      />
                      dia(s)
                    </label>
                  )}

                  {/* Salvar */}
                  <button
                    onClick={() => save(g.key)}
                    disabled={saving === g.key}
                    style={{ ...btnSm(saved === g.key ? '#065F46' : '#fff', saved === g.key ? '#D1FAE5' : 'var(--accent)', saved === g.key ? '#6EE7B7' : 'var(--accent)'), marginLeft: 'auto' }}
                  >
                    <Save size={11} strokeWidth={2.5} />
                    {saving === g.key ? 'Salvando…' : saved === g.key ? 'Salvo!' : 'Salvar'}
                  </button>
                </div>
              )}

              {!rule.ativo && (
                <button onClick={() => save(g.key)} disabled={saving === g.key}
                  style={{ ...btnSm('var(--text-muted)', 'var(--surface2)', 'var(--border)'), marginTop: 4 }}>
                  <Save size={11} strokeWidth={2} />
                  {saving === g.key ? 'Salvando…' : 'Salvar'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
