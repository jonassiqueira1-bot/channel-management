import { useState, useMemo } from 'react'
import {
  Terminal, Trash2,
  Plus, Pencil, X, CheckCircle2, XCircle, DollarSign, Send, RotateCcw, Eye,
} from 'lucide-react'
import { useLocalState } from '../../hooks/useLocalState'
import { AUDIT_LOG_KEY } from '../../hooks/useAuditLog'
import SettingsLayout from '../../components/ui/SettingsLayout'
import Button from '../../components/Button'

const ACAO_CFG = {
  criar:        { label: 'Criado',       color: '#10B981', Icon: Plus        },
  editar:       { label: 'Editado',      color: '#3B82F6', Icon: Pencil      },
  excluir:      { label: 'Excluído',     color: '#EF4444', Icon: X           },
  aprovar:      { label: 'Aprovado',     color: '#10B981', Icon: CheckCircle2},
  rejeitar:     { label: 'Rejeitado',    color: '#EF4444', Icon: XCircle     },
  pagar:        { label: 'Pago',         color: '#F59E0B', Icon: DollarSign  },
  enviar:       { label: 'Enviado',      color: '#8B5CF6', Icon: Send        },
  reabrir:      { label: 'Reaberto',     color: '#6B7280', Icon: RotateCcw   },
  ativar:       { label: 'Ativado',      color: '#10B981', Icon: CheckCircle2},
  desativar:    { label: 'Desativado',   color: '#9CA3AF', Icon: XCircle     },
  importar:     { label: 'Importado',    color: '#6366F1', Icon: Plus        },
  conectar:     { label: 'Conectado',    color: '#0EA5E9', Icon: CheckCircle2},
  desconectar:  { label: 'Desconectado', color: '#EF4444', Icon: XCircle     },
  restaurar:    { label: 'Restaurado',   color: '#F59E0B', Icon: RotateCcw   },
}

const ENTIDADE_LABEL = {
  // ── Configurações › Geral ───────────────────────────────────────────────────
  empresa:             'Empresa / ISV',
  minha_conta:         'Minha Conta',
  parceiro:            'Parceiro (Unidade)',
  unidade:             'Unidade',
  // ── Configurações › Segurança ───────────────────────────────────────────────
  usuario:             'Usuário',
  perfil_acesso:       'Perfil de Acesso',
  equipe:              'Equipe',
  // ── Configurações › Regras do Canal ────────────────────────────────────────
  habilitacao:         'Habilitação',
  produto:             'Produto',
  funil:               'Funil de Vendas',
  comissao_regra:      'Regra de Comissão',
  comissao_lancamento: 'Lançamento de Comissão',
  comissao_aprovacao:  'Aprovação de Comissão',
  tipo_acao:           'Tipo de Ação',
  campanha:            'Campanha de Incentivo',
  indicador:           'Indicador',
  meta_kpi:            'Meta / KPI',
  // ── Configurações › Multi-filial ────────────────────────────────────────────
  compartilhamento:    'Compartilhamento',
  // ── Configurações › Sistema ─────────────────────────────────────────────────
  config_campo:        'Config. de Campos',
  integracao:          'Integração',
  // ── Módulos principais ──────────────────────────────────────────────────────
  contrato:            'Contrato',
  contato:             'Contato',
  empresa_crm:         'Empresa (CRM)',
  oportunidade:        'Oportunidade',
  projeto:             'Projeto',
  customer_success:    'Customer Success',
  playbook:            'Playbook',
  tarefa:              'Tarefa',
  acao:                'Ação Comercial',
  meta:                'Meta Comercial',
  vendedor:            'Contato Canal',
  pagamento:           'Pagamento',
  fechamento_horas:    'Fechamento de Horas',
}

function AcaoBadge({ acao }) {
  const cfg = ACAO_CFG[acao] || { label: acao, color: 'var(--text-muted)', Icon: Terminal }
  const { Icon } = cfg
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px',
      borderRadius:99, fontSize:11, fontWeight:700,
      color: cfg.color, background: `${cfg.color}18`,
      border: `1px solid ${cfg.color}30` }}>
      <Icon size={10} strokeWidth={2.5} />
      {cfg.label}
    </span>
  )
}

function fmtTs(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit' })
}

const ACOES_OPTIONS   = Object.entries(ACAO_CFG).map(([k, v]) => ({ value: k, label: v.label }))
const ENTIDADE_OPTIONS = Object.entries(ENTIDADE_LABEL).map(([k, v]) => ({ value: k, label: v }))

export default function Logs() {
  const [logs, setLogs]         = useLocalState(AUDIT_LOG_KEY, [])
  const [search, setSearch]     = useState('')
  const [filterAcao, setFilterAcao]       = useState('')
  const [filterEntidade, setFilterEntidade] = useState('')
  const [detalhe, setDetalhe]   = useState(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return logs.filter(l => {
      if (filterAcao     && l.acao     !== filterAcao)     return false
      if (filterEntidade && l.entidade !== filterEntidade) return false
      if (q && !(
        (l.usuario_nome || '').toLowerCase().includes(q) ||
        (l.descricao    || '').toLowerCase().includes(q) ||
        (l.entidade_id  || '').toLowerCase().includes(q) ||
        (l.entidade     || '').toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [logs, search, filterAcao, filterEntidade])

  function exportCSV() {
    const cols = ['timestamp','usuario_nome','acao','entidade','entidade_id','descricao']
    const rows = filtered.map(l => cols.map(k => `"${String(l[k] ?? '').replace(/"/g,'""')}"`).join(','))
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type:'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `audit_log_${new Date().toISOString().slice(0,10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function limpar() {
    if (window.confirm('Apagar todo o histórico de logs? Esta ação não pode ser desfeita.')) setLogs([])
  }

  const COLUMNS = [
    {
      key: 'timestamp', label: 'Data / Hora', priority: 1,
      render: val => (
        <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text-muted)', whiteSpace:'nowrap' }}>
          {fmtTs(val)}
        </span>
      ),
    },
    {
      key: 'usuario_nome', label: 'Usuário', priority: 1,
      render: val => (
        <span style={{ fontSize:12, fontWeight:600, color:'var(--text)' }}>{val || '—'}</span>
      ),
    },
    {
      key: 'acao', label: 'Ação', priority: 1,
      render: val => <AcaoBadge acao={val} />,
    },
    {
      key: 'entidade', label: 'Módulo', priority: 2,
      render: val => (
        <span style={{ fontSize:11, color:'var(--text-muted)' }}>
          {ENTIDADE_LABEL[val] || val}
        </span>
      ),
    },
    {
      key: 'descricao', label: 'Descrição', priority: 2,
      render: val => (
        <span style={{ fontSize:12, color:'var(--text-soft)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:260, display:'block' }}>
          {val || '—'}
        </span>
      ),
    },
    {
      key: 'entidade_id', label: 'ID', priority: 3,
      render: val => (
        <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--text-muted)' }}>{val || '—'}</span>
      ),
    },
  ]

  return (
    <>
      {/* Filtros extras acima do SettingsLayout */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:8 }}>
        <select value={filterAcao} onChange={e => setFilterAcao(e.target.value)}
          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:12, fontFamily:'var(--font)', outline:'none' }}>
          <option value="">Todas as ações</option>
          {ACOES_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterEntidade} onChange={e => setFilterEntidade(e.target.value)}
          style={{ padding:'5px 10px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text)', fontSize:12, fontFamily:'var(--font)', outline:'none' }}>
          <option value="">Todos os módulos</option>
          {ENTIDADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ flex:1 }} />
        {logs.length > 0 && (
          <button onClick={limpar}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7,
              border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.06)',
              color:'#EF4444', fontSize:12, cursor:'pointer', fontFamily:'var(--font)' }}>
            <Trash2 size={12} strokeWidth={2} /> Limpar histórico
          </button>
        )}
      </div>

      <SettingsLayout
        title="Logs de Auditoria"
        description={`${filtered.length} de ${logs.length} eventos registrados`}
        icon={<Terminal size={16} />}
        columns={COLUMNS}
        data={filtered}
        keyField="id"
        search={search}
        onSearchChange={setSearch}
        rowActions={[{ label: 'Ver detalhes', icon: <Eye size={13} />, onClick: row => setDetalhe(row) }]}
        onExportCsv={exportCSV}
        emptyLabel={logs.length === 0 ? 'Nenhum log registrado ainda.' : 'Nenhum resultado para os filtros aplicados.'}
      />

      {/* Detalhe do log */}
      {detalhe && (
        <div style={{ position:'fixed', inset:0, zIndex:700, display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(0,0,0,0.55)', padding:16 }}
          onClick={() => setDetalhe(null)}>
          <div style={{ background:'var(--surface)', borderRadius:14, width:'100%', maxWidth:520,
            padding:24, display:'flex', flexDirection:'column', gap:16, boxShadow:'var(--shadow)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
                <Terminal size={16} style={{ color:'var(--accent)' }} />
                Detalhe do evento
              </div>
              <button onClick={() => setDetalhe(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:'8px 12px', fontSize:12 }}>
              {[
                ['Data / Hora',  fmtTs(detalhe.timestamp)],
                ['Usuário',      detalhe.usuario_nome || '—'],
                ['Ação',         <AcaoBadge acao={detalhe.acao} />],
                ['Módulo',       ENTIDADE_LABEL[detalhe.entidade] || detalhe.entidade],
                ['ID do registro', detalhe.entidade_id || '—'],
                ['Descrição',    detalhe.descricao || '—'],
              ].map(([k, v]) => (
                <>
                  <span key={k} style={{ color:'var(--text-muted)', fontWeight:600 }}>{k}</span>
                  <span key={k+'v'} style={{ color:'var(--text)', fontFamily: k === 'ID do registro' ? 'var(--mono)' : 'var(--font)', fontSize: k === 'ID do registro' ? 11 : 12 }}>{v}</span>
                </>
              ))}
            </div>
            {(detalhe.antes || detalhe.depois) && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {detalhe.antes && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#EF4444', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Antes</div>
                    <pre style={{ fontSize:10, background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:7, padding:'8px 10px', margin:0, overflowX:'auto', color:'#991B1B' }}>
                      {JSON.stringify(detalhe.antes, null, 2)}
                    </pre>
                  </div>
                )}
                {detalhe.depois && (
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:'#10B981', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:4 }}>Depois</div>
                    <pre style={{ fontSize:10, background:'#F0FDF4', border:'1px solid #6EE7B7', borderRadius:7, padding:'8px 10px', margin:0, overflowX:'auto', color:'#065F46' }}>
                      {JSON.stringify(detalhe.depois, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
