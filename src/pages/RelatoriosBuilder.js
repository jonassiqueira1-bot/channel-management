/**
 * Novo construtor de Relatórios — substitui gradualmente o editor de canvas
 * (CanvasEditor) por um assistente guiado em 4 fases, ancorado no motor de
 * relacionamentos entre entidades (ver proposta de arquitetura).
 *
 * Fases implementadas até aqui:
 *   1. Fonte       — escolher entidade principal + relacionamentos a incluir
 *   2. Colunas      — escolher quais campos (da entidade principal e das
 *                      relacionadas) entram no relatório, e em que ordem
 * Fases 3-4 (filtros/agrupamento/ordenação e a grade de resultado ao vivo)
 * ainda não existem — aparecem como "em construção".
 *
 * Vive lado a lado com Relatorios.js (não substitui nada ainda) — acessível
 * por um item de menu na tela atual, pra comparação lado a lado.
 */
import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, ChevronUp, ChevronDown, X, Search } from 'lucide-react'
import { ENTIDADES, relacionadasDe } from '../data/reportEntities'
import { useDocumentDataSources } from '../hooks/useDocumentDataSources'

const FASES = [
  { id: 'fonte',     label: 'Fonte' },
  { id: 'colunas',   label: 'Colunas & Cálculo' },
  { id: 'regras',    label: 'Regras' },
  { id: 'resultado', label: 'Resultado' },
]

export default function RelatoriosBuilder() {
  const navigate = useNavigate()
  const { sources } = useDocumentDataSources()

  const [fase, setFase]           = useState(0)
  const [fonteStep, setFonteStep] = useState(0) // dentro da fase "Fonte": 0=entidade, 1=relacionamentos
  const [entidadeId, setEntidadeId] = useState(null)
  const [joins, setJoins]         = useState([])   // ids de entidades relacionadas incluídas
  const [campos, setCampos]       = useState([])   // [{ id, entidadeId, key, label, type }]
  const [buscaCampo, setBuscaCampo] = useState('')

  const entidade      = ENTIDADES.find(e => e.id === entidadeId) || null
  const relacionadas   = useMemo(() => entidadeId ? relacionadasDe(entidadeId) : [], [entidadeId])
  const entidadesAtivas = useMemo(() => entidadeId ? [entidadeId, ...joins] : [], [entidadeId, joins])

  // Remove da seleção de campos qualquer entidade que deixou de estar ativa
  // (ex.: usuário voltou na fase Fonte e desmarcou um relacionamento).
  useEffect(() => {
    setCampos(prev => prev.filter(c => entidadesAtivas.includes(c.entidadeId)))
  }, [entidadesAtivas])

  function escolherEntidade(id) {
    setEntidadeId(id)
    setJoins([])
    setCampos([])
    setFonteStep(1)
  }

  function toggleJoin(id) {
    setJoins(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function toggleCampo(entidadeId, field) {
    const campoId = `${entidadeId}.${field.key}`
    setCampos(prev => prev.some(c => c.id === campoId)
      ? prev.filter(c => c.id !== campoId)
      : [...prev, { id: campoId, entidadeId, key: field.key, label: field.label, type: field.type }])
  }

  function moverCampo(idx, dir) {
    setCampos(prev => {
      const i = idx + dir
      if (i < 0 || i >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[i]] = [next[i], next[idx]]
      return next
    })
  }

  const faseHabilitada = (i) => i === 0 || (i === 1 && entidadeId) || (i >= 2 && entidadeId)

  return (
    <div style={s.page}>
      {/* ── Cabeçalho + navegação de fases ── */}
      <div style={s.header}>
        <div>
          <div style={s.eyebrow}>Construtor de relatórios · novo</div>
          <h1 style={s.title}>{entidade ? entidade.label : 'Novo relatório'}</h1>
        </div>
        <button style={s.btnGhost} onClick={() => navigate('/relatorios')}>Voltar aos relatórios</button>
      </div>

      <div style={s.faseNav}>
        {FASES.map((f, i) => {
          const ativo = i === fase
          const habilitado = faseHabilitada(i)
          return (
            <button key={f.id}
              disabled={!habilitado}
              onClick={() => habilitado && setFase(i)}
              style={{ ...s.faseTab, ...(ativo ? s.faseTabAtivo : {}), ...(!habilitado ? s.faseTabDisabled : {}) }}>
              <span style={s.faseNum}>{i + 1}</span>
              {f.label}
            </button>
          )
        })}
      </div>

      {/* ── Fase 1: Fonte (entidade → relacionamentos) ── */}
      {fase === 0 && fonteStep === 0 && (
        <div style={s.body}>
          <p style={s.hint}>De qual cadastro este relatório vai partir? Você poderá trazer campos de outros cadastros relacionados na próxima etapa.</p>
          <div style={s.grid}>
            {ENTIDADES.map(e => (
              <button key={e.id} onClick={() => escolherEntidade(e.id)}
                style={{ ...s.entityCard, ...(entidadeId === e.id ? s.entityCardSel : {}) }}>
                <span style={s.entityIcon}>{e.icon}</span>
                <span style={s.entityLabel}>{e.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {fase === 0 && fonteStep === 1 && entidade && (
        <div style={s.body}>
          <p style={s.hint}>
            Marque quais cadastros relacionados a <strong>{entidade.label}</strong> você quer trazer para este relatório.
            Campos desses cadastros ficarão disponíveis na próxima etapa.
          </p>

          {relacionadas.length === 0 && (
            <div style={s.emptyRel}>Esta entidade ainda não tem relacionamentos mapeados no motor.</div>
          )}

          <div style={s.relList}>
            {relacionadas.map(({ entidade: rel, relacao }) => {
              const incluida = joins.includes(rel.id)
              return (
                <button key={rel.id} onClick={() => toggleJoin(rel.id)}
                  style={{ ...s.relRow, ...(incluida ? s.relRowSel : {}) }}>
                  <span style={s.relCheck}>{incluida && <Check size={13} strokeWidth={3} />}</span>
                  <span style={s.relIcon}>{rel.icon}</span>
                  <span style={s.relLabel}>{rel.label}</span>
                  <span style={s.relCard}>{relacao.rotulo}</span>
                </button>
              )
            })}
          </div>

          <div style={s.footerNav}>
            <button style={s.btnGhost} onClick={() => setFonteStep(0)}><ArrowLeft size={14} /> Trocar entidade</button>
            <button style={s.btnPrimary} onClick={() => setFase(1)}>Continuar <ArrowRight size={14} /></button>
          </div>
        </div>
      )}

      {/* ── Fase 2: Colunas ── */}
      {fase === 1 && entidade && (
        <ColunasFase
          entidadesAtivas={entidadesAtivas}
          sources={sources}
          campos={campos}
          busca={buscaCampo}
          onBusca={setBuscaCampo}
          onToggleCampo={toggleCampo}
          onMoverCampo={moverCampo}
          onRemoverCampo={id => setCampos(prev => prev.filter(c => c.id !== id))}
          onVoltar={() => { setFase(0); setFonteStep(1) }}
          onContinuar={() => setFase(2)}
        />
      )}

      {/* ── Fases seguintes: ainda não implementadas ── */}
      {fase >= 2 && (
        <div style={s.body}>
          <div style={s.building}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🚧</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Etapa "{FASES[fase].label}" ainda em construção</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto' }}>
              Fonte ({entidade?.label}, {joins.length} relacionamento{joins.length !== 1 ? 's' : ''}) e Colunas ({campos.length} campo{campos.length !== 1 ? 's' : ''}) já estão prontas.
              Filtros, agrupamento, ordenação e a grade de resultado ao vivo são o próximo passo da implementação.
            </div>
            <button style={{ ...s.btnGhost, marginTop: 18 }} onClick={() => setFase(1)}>
              <ArrowLeft size={14} /> Voltar para colunas
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Fase "Colunas & Cálculo" — escolha de campos ────────────────────────────
function ColunasFase({ entidadesAtivas, sources, campos, busca, onBusca, onToggleCampo, onMoverCampo, onRemoverCampo, onVoltar, onContinuar }) {
  const grupos = entidadesAtivas
    .map(id => sources.find(s => s.id === id))
    .filter(Boolean)
    .map(src => ({
      ...src,
      fields: (src.fields || []).filter(f =>
        !busca || f.label.toLowerCase().includes(busca.toLowerCase())
      ),
    }))

  const selecionadosSet = useMemo(() => new Set(campos.map(c => c.id)), [campos])

  return (
    <div style={{ ...s.body, maxWidth: 'none', display: 'flex', gap: 20, minHeight: 0 }}>
      {/* Disponíveis */}
      <div style={s.colPanel}>
        <div style={s.colPanelHead}>Campos disponíveis</div>
        <div style={s.searchWrap}>
          <Search size={13} style={s.searchIcon} />
          <input value={busca} onChange={e => onBusca(e.target.value)} placeholder="Buscar campo…" style={s.searchInput} />
        </div>
        <div style={s.colPanelBody}>
          {grupos.length === 0 && (
            <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 12.5 }}>Carregando fontes…</div>
          )}
          {grupos.map(g => (
            <div key={g.id} style={{ marginBottom: 16 }}>
              <div style={s.groupHead}><span>{g.icon}</span> {g.label}</div>
              {g.fields.length === 0 && <div style={s.groupEmpty}>Nenhum campo encontrado</div>}
              {g.fields.map(f => {
                const campoId = `${g.id}.${f.key}`
                const sel = selecionadosSet.has(campoId)
                return (
                  <button key={campoId} onClick={() => onToggleCampo(g.id, f)}
                    style={{ ...s.fieldRow, ...(sel ? s.fieldRowSel : {}) }}>
                    <span style={s.relCheck}>{sel && <Check size={12} strokeWidth={3} />}</span>
                    <span style={{ flex: 1 }}>{f.label}</span>
                    <span style={s.fieldType}>{f.type}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selecionados */}
      <div style={s.colPanel}>
        <div style={s.colPanelHead}>Colunas do relatório ({campos.length})</div>
        <div style={{ ...s.colPanelBody, paddingTop: 12 }}>
          {campos.length === 0 && (
            <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 12.5, fontStyle: 'italic' }}>
              Nenhum campo escolhido ainda — clique nos campos à esquerda.
            </div>
          )}
          {campos.map((c, idx) => {
            const g = ENTIDADES.find(e => e.id === c.entidadeId)
            return (
              <div key={c.id} style={s.selectedRow}>
                <div style={s.reorderCol}>
                  <button disabled={idx === 0} onClick={() => onMoverCampo(idx, -1)} style={s.reorderBtn}><ChevronUp size={12} /></button>
                  <button disabled={idx === campos.length - 1} onClick={() => onMoverCampo(idx, 1)} style={s.reorderBtn}><ChevronDown size={12} /></button>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{g?.icon} {g?.label}</div>
                </div>
                <button onClick={() => onRemoverCampo(c.id)} style={s.removeBtn}><X size={13} /></button>
              </div>
            )
          })}
        </div>
      </div>

      <div style={s.colunasFooter}>
        <button style={s.btnGhost} onClick={onVoltar}><ArrowLeft size={14} /> Voltar</button>
        <button style={s.btnPrimary} disabled={campos.length === 0} onClick={onContinuar}>Continuar <ArrowRight size={14} /></button>
      </div>
    </div>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 24px 0' },
  eyebrow: { fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' },
  btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--text-soft)', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 'var(--radius-md, 8px)', cursor: 'pointer', fontFamily: 'var(--font)' },
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, padding: '9px 16px', borderRadius: 'var(--radius-md, 8px)', cursor: 'pointer', fontFamily: 'var(--font)' },

  faseNav: { display: 'flex', gap: 4, padding: '18px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 },
  faseTab: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  faseTabAtivo: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  faseTabDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  faseNum: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: 'var(--surface2)', color: 'inherit', fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--mono)' },

  body: { flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 760, position: 'relative' },
  hint: { fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.6, marginBottom: 22, maxWidth: 560 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 },
  entityCard: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '16px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', transition: 'border-color 0.12s, box-shadow 0.12s' },
  entityCardSel: { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px var(--accent-glow)' },
  entityIcon: { fontSize: 20 },
  entityLabel: { fontSize: 13, fontWeight: 700, color: 'var(--text)' },

  emptyRel: { padding: '20px 0', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' },
  relList: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22 },
  relRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', width: '100%' },
  relRowSel: { borderColor: 'var(--accent)', background: 'var(--accent-glow)' },
  relCheck: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--border2)', color: 'var(--accent)', flexShrink: 0 },
  relIcon: { fontSize: 15, flexShrink: 0 },
  relLabel: { fontSize: 13.5, fontWeight: 700, color: 'var(--text)', flexShrink: 0, minWidth: 140 },
  relCard: { fontSize: 12, color: 'var(--text-muted)' },

  footerNav: { display: 'flex', justifyContent: 'space-between', paddingTop: 8 },
  building: { textAlign: 'center', padding: '48px 0' },

  // Colunas
  colPanel: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', maxHeight: 'calc(100vh - 230px)' },
  colPanelHead: { padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)' },
  colPanelBody: { flex: 1, overflowY: 'auto', padding: '10px 12px' },
  searchWrap: { position: 'relative', padding: '10px 12px 0' },
  searchIcon: { position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' },
  searchInput: { width: '100%', boxSizing: 'border-box', padding: '7px 10px 7px 30px', fontSize: 12.5, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font)', outline: 'none' },
  groupHead: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 4px' },
  groupEmpty: { fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', padding: '2px 8px 6px' },
  fieldRow: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', fontSize: 13, color: 'var(--text)' },
  fieldRowSel: { background: 'var(--accent-glow)' },
  fieldType: { fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--mono)' },

  selectedRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderBottom: '1px solid var(--border2)' },
  reorderCol: { display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0 },
  reorderBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' },
  removeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 },
  colunasFooter: { position: 'absolute', bottom: -8, left: 24, right: 24, display: 'flex', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--border)', background: 'var(--surface)' },
}
