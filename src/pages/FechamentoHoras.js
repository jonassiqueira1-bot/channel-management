import { useState, useMemo, useCallback } from 'react'
import { Clock, CheckSquare, Square, ChevronDown, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useLocalState } from '../hooks/useLocalState'
import { RULES_STORAGE_KEY, PAYMENTS_STORAGE_KEY, MOCK_RULES, MOCK_PAYMENTS } from '../data/mockComissoes'
import { MOCK_TIME_LOGS } from '../data/mockProjetos'
import Button from '../components/Button'

const TIMELOGS_KEY = 'projetos:timeLogs_v1'
const PROJETOS_KEY = 'projetos:lista_v2'

function fmtDate(d) {
  if (!d) return '—'
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y}`
}
function fmtMoney(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtH(h) {
  return `${Number(h || 0).toFixed(1)}h`
}

// ─── Cabeçalho KPI ──────────────────────────────────────────────────────────
function KpiBox({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || 'var(--text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

// ─── Linha de apontamento ────────────────────────────────────────────────────
function LogRow({ log, projeto, selected, onToggle, valorHora, servicos_pct }) {
  const valor_base = Number(log.hours_executed) * valorHora
  const valor_com  = valor_base * (servicos_pct / 100)
  return (
    <div
      onClick={onToggle}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', cursor: 'pointer',
        background: selected ? 'rgba(99,102,241,0.05)' : 'transparent',
        borderBottom: '1px solid var(--border)', transition: 'background .12s' }}
    >
      <div style={{ paddingTop: 2, color: selected ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
        {selected ? <CheckSquare size={16} /> : <Square size={16} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{log.user_name || 'Não informado'}</span>
          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>· {fmtDate(log.logged_at)}</span>
          {projeto && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)', background: 'var(--surface2)', padding: '1px 6px', borderRadius: 4 }}>{projeto.name}</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>{fmtH(log.hours_executed)}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{fmtMoney(valor_com)}</div>
      </div>
    </div>
  )
}

// ─── Grupo por analista ──────────────────────────────────────────────────────
function AnalystGroup({ userName, logs, projetos, selected, onToggleAll, onToggleOne, valorHora, servicos_pct }) {
  const [open, setOpen] = useState(true)
  const allSelected = logs.every(l => selected.has(l.id))
  const someSelected = logs.some(l => selected.has(l.id))
  const totalH  = logs.reduce((s, l) => s + Number(l.hours_executed), 0)
  const baseTotal = totalH * valorHora
  const comTotal  = baseTotal * (servicos_pct / 100)

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      {/* Header do grupo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: 'var(--surface2)', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        <div onClick={e => { e.stopPropagation(); onToggleAll(logs, !allSelected) }}
          style={{ color: allSelected ? 'var(--accent)' : someSelected ? '#F59E0B' : 'var(--text-muted)', flexShrink: 0 }}>
          {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{userName || 'Não informado'}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{logs.length} apontamento{logs.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ textAlign: 'right', marginRight: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{fmtH(totalH)}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>repasse: {fmtMoney(comTotal)}</div>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </div>
      </div>
      {/* Linhas */}
      {open && logs.map(log => {
        const proj = projetos.find(p => p.id === log.project_id)
        return (
          <LogRow key={log.id} log={log} projeto={proj}
            selected={selected.has(log.id)}
            onToggle={() => onToggleOne(log.id)}
            valorHora={valorHora}
            servicos_pct={servicos_pct}
          />
        )
      })}
    </div>
  )
}

// ─── Modal de confirmação de fechamento ─────────────────────────────────────
function ConfirmModal({ selectedLogs, projetos, valorHora, servicos_pct, regraNome, onConfirm, onCancel }) {
  const byUser = useMemo(() => {
    const map = {}
    selectedLogs.forEach(l => {
      const k = l.user_name || 'Não informado'
      if (!map[k]) map[k] = { userName: k, userId: l.user_id, hours: 0 }
      map[k].hours += Number(l.hours_executed)
    })
    return Object.values(map)
  }, [selectedLogs])

  const totalH  = selectedLogs.reduce((s, l) => s + Number(l.hours_executed), 0)
  const baseTotal = totalH * valorHora
  const comTotal  = baseTotal * (servicos_pct / 100)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14,
        padding: 28, width: 480, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Confirmar fechamento</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
          Os apontamentos selecionados serão fechados e comissões geradas em <strong>Comissões</strong>.
        </div>

        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Resumo por analista</div>
          {byUser.map(u => {
            const base = u.hours * valorHora
            const com  = base * (servicos_pct / 100)
            return (
              <div key={u.userName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.userName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                    {fmtH(u.hours)} × {fmtMoney(valorHora)}/h = {fmtMoney(base)} × {servicos_pct}%
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#10B981' }}>{fmtMoney(com)}</div>
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Total de repasses</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#10B981' }}>{fmtMoney(comTotal)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, marginBottom: 20 }}>
          <AlertCircle size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: '#92400E' }}>
            Regra aplicada: <strong>{regraNome}</strong>. Os apontamentos fechados não poderão ser reabertos por aqui.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={onConfirm} style={{ background: '#10B981', color: '#fff' }}>Confirmar fechamento</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function FechamentoHoras() {
  // Dados
  const [timeLogs, setTimeLogs] = useState(() => {
    try { const s = localStorage.getItem(TIMELOGS_KEY); return s ? JSON.parse(s) : MOCK_TIME_LOGS }
    catch { return MOCK_TIME_LOGS }
  })
  const projetos = useMemo(() => {
    try { const s = localStorage.getItem(PROJETOS_KEY); return s ? JSON.parse(s) : [] }
    catch { return [] }
  }, [])
  const [rules] = useLocalState(RULES_STORAGE_KEY, MOCK_RULES)
  const [payments, setPayments] = useLocalState(PAYMENTS_STORAGE_KEY, MOCK_PAYMENTS)

  // Filtros / configuração
  const [ruleId, setRuleId]     = useState(MOCK_RULES[0]?.id || '')
  const [valorHora, setValorHora] = useState(80)
  const [selected, setSelected] = useState(new Set())
  const [showConfirm, setShowConfirm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [filterUser, setFilterUser] = useState('')

  // Apenas apontamentos ainda não fechados
  const pendingLogs = useMemo(() =>
    timeLogs.filter(l => !l.fechado),
  [timeLogs])

  const filteredLogs = useMemo(() =>
    filterUser
      ? pendingLogs.filter(l => (l.user_name || '').toLowerCase().includes(filterUser.toLowerCase()))
      : pendingLogs,
  [pendingLogs, filterUser])

  // Agrupar por analista
  const groups = useMemo(() => {
    const map = {}
    filteredLogs.forEach(l => {
      const k = l.user_name || 'Não informado'
      if (!map[k]) map[k] = []
      map[k].push(l)
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredLogs])

  // Regra selecionada e percentual Serviços para persona "interno"
  const activeRule = useMemo(() => rules.find(r => r.id === ruleId) || rules[0], [rules, ruleId])
  const servicos_pct = useMemo(() => {
    if (!activeRule) return 8
    const pp = (activeRule.persona_percentuais || []).find(p => p.persona_id === 'interno')
    return pp?.servicos_pct ?? 8
  }, [activeRule])

  // Seleção
  const toggleOne = useCallback((id) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const toggleAll = useCallback((logs, forceOn) => {
    setSelected(prev => {
      const n = new Set(prev)
      logs.forEach(l => forceOn ? n.add(l.id) : n.delete(l.id))
      return n
    })
  }, [])
  const selectAll = () => setSelected(new Set(filteredLogs.map(l => l.id)))
  const clearAll  = () => setSelected(new Set())

  // KPIs da seleção
  const selectedLogs  = filteredLogs.filter(l => selected.has(l.id))
  const totalHSel     = selectedLogs.reduce((s, l) => s + Number(l.hours_executed), 0)
  const baseTotal     = totalHSel * valorHora
  const comTotal      = baseTotal * (servicos_pct / 100)

  // Fechar selecionados
  function handleFechar() {
    if (selectedLogs.length === 0) return
    setShowConfirm(true)
  }

  function handleConfirm() {
    // Agrupa por analista e gera um pagamento por pessoa
    const byUser = {}
    selectedLogs.forEach(l => {
      const k = l.user_id || l.user_name || 'desconhecido'
      if (!byUser[k]) byUser[k] = { userId: l.user_id, userName: l.user_name || 'Não informado', hours: 0 }
      byUser[k].hours += Number(l.hours_executed)
    })
    const hoje = new Date().toISOString().slice(0, 10)
    const mes  = hoje.slice(0, 7) + '-01'
    const novos = Object.values(byUser).map((u, i) => {
      const valor_base = u.hours * valorHora
      const valor_com  = valor_base * (servicos_pct / 100)
      return {
        id: `p_fec_${Date.now()}_${i}`,
        rule_id: activeRule?.id || 'r1',
        beneficiario_id: u.userId || null,
        beneficiario_nome: u.userName,
        persona: 'interno',
        receita_tipo: 'Serviços',
        valor_base,
        percentual: servicos_pct,
        valor_comissao: valor_com,
        data_competencia: mes,
        data_vencimento: hoje,
        data_pagamento: null,
        status: 'pendente',
        descricao: `Fechamento timesheet — ${u.hours.toFixed(1)}h × R$${valorHora}/h (${activeRule?.nome || 'Regra'})`,
        notas: null,
      }
    })

    // Salva pagamentos
    const updatedPayments = [...payments, ...novos]
    setPayments(updatedPayments)
    localStorage.setItem(PAYMENTS_STORAGE_KEY, JSON.stringify(updatedPayments))

    // Marca timeLogs como fechados
    const selectedIds = new Set(selectedLogs.map(l => l.id))
    const updatedLogs = timeLogs.map(l => selectedIds.has(l.id) ? { ...l, fechado: true, fechado_em: hoje } : l)
    setTimeLogs(updatedLogs)
    localStorage.setItem(TIMELOGS_KEY, JSON.stringify(updatedLogs))

    setSelected(new Set())
    setShowConfirm(false)
    setSuccessMsg(`${novos.length} repasse(s) gerado(s) em Comissões com sucesso.`)
    setTimeout(() => setSuccessMsg(''), 5000)
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 900, margin: '0 auto' }}>
      {/* Título */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={22} style={{ color: 'var(--accent)' }} />
          Fechamento de Horas
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Confirme os apontamentos de Timesheet e gere repasses de comissão para os analistas.
        </div>
      </div>

      {/* Feedback de sucesso */}
      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.4)', borderRadius: 10,
          marginBottom: 20, color: '#065F46', fontSize: 13 }}>
          <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0 }} />
          {successMsg}
        </div>
      )}

      {/* Configuração */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 220 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>
            Regra de comissionamento
          </label>
          <select
            value={ruleId}
            onChange={e => setRuleId(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)' }}
          >
            {rules.map(r => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>
            Valor/hora (R$)
          </label>
          <input
            type="number" min="1" step="5"
            value={valorHora}
            onChange={e => setValorHora(Number(e.target.value) || 80)}
            style={{ width: '100%', padding: '8px 10px', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>
            % Serviços (Interno)
          </label>
          <div style={{ padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 8, fontSize: 14, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
            {servicos_pct}%
          </div>
        </div>
        <div style={{ flex: 2, minWidth: 200 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: 6 }}>
            Filtrar por analista
          </label>
          <input
            type="text" placeholder="Digite o nome…"
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)' }}
          />
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiBox label="Apontamentos pendentes" value={pendingLogs.length} />
        <KpiBox label="Selecionados" value={selectedLogs.length} color="var(--accent)" />
        <KpiBox label="Horas selecionadas" value={fmtH(totalHSel)} color="var(--accent)" />
        <KpiBox label="Repasse estimado" value={fmtMoney(comTotal)} color="#10B981"
          sub={`Base: ${fmtMoney(baseTotal)} × ${servicos_pct}%`} />
      </div>

      {/* Barra de ações */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={selectAll} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Selecionar todos</button>
          <span style={{ color: 'var(--border)' }}>|</span>
          <button onClick={clearAll}  style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Limpar seleção</button>
        </div>
        <Button
          onClick={handleFechar}
          disabled={selectedLogs.length === 0}
          style={{ opacity: selectedLogs.length === 0 ? 0.5 : 1 }}
        >
          Fechar selecionados ({selectedLogs.length})
        </Button>
      </div>

      {/* Lista */}
      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
          <Clock size={32} style={{ marginBottom: 12, opacity: .4 }} />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Nenhum apontamento pendente de fechamento.</div>
        </div>
      ) : (
        groups.map(([userName, logs]) => (
          <AnalystGroup
            key={userName}
            userName={userName}
            logs={logs}
            projetos={projetos}
            selected={selected}
            onToggleAll={toggleAll}
            onToggleOne={toggleOne}
            valorHora={valorHora}
            servicos_pct={servicos_pct}
          />
        ))
      )}

      {showConfirm && (
        <ConfirmModal
          selectedLogs={selectedLogs}
          projetos={projetos}
          valorHora={valorHora}
          servicos_pct={servicos_pct}
          regraNome={activeRule?.nome || ''}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
