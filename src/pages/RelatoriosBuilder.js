/**
 * Novo construtor de Relatórios — substitui gradualmente o editor de canvas
 * (CanvasEditor) por um assistente guiado em 4 fases, ancorado no motor de
 * relacionamentos entre entidades (ver proposta de arquitetura).
 *
 * Este arquivo implementa o começo do fluxo: Fase 1 (escolher entidade) e
 * Fase 2 (escolher relacionamentos). As fases seguintes (campos, filtros,
 * agrupamento, resultado) ainda não existem — aparecem como "em construção"
 * pra deixar claro o que já funciona e o que não.
 *
 * Vive lado a lado com Relatorios.js (não substitui nada ainda) — acessível
 * por um botão "Experimentar novo construtor" na tela atual, pra comparação.
 */
import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { ENTIDADES, relacionadasDe } from '../data/reportEntities'

const FASES = [
  { id: 'fonte',   label: 'Fonte' },
  { id: 'colunas', label: 'Colunas & Cálculo' },
  { id: 'regras',  label: 'Regras' },
  { id: 'resultado', label: 'Resultado' },
]

export default function RelatoriosBuilder() {
  const navigate = useNavigate()
  const [fase, setFase] = useState(0)
  const [entidadeId, setEntidadeId] = useState(null)
  const [joins, setJoins] = useState([]) // ids de entidades relacionadas incluídas

  const entidade = ENTIDADES.find(e => e.id === entidadeId) || null
  const relacionadas = useMemo(() => entidadeId ? relacionadasDe(entidadeId) : [], [entidadeId])

  function escolherEntidade(id) {
    setEntidadeId(id)
    setJoins([])
    setFase(1)
  }

  function toggleJoin(id) {
    setJoins(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

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
          const habilitado = i === 0 || (i === 1 && entidadeId)
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

      {/* ── Fase 1: Entidade ── */}
      {fase === 0 && (
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

      {/* ── Fase 2: Relacionamentos ── */}
      {fase === 1 && entidade && (
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
            <button style={s.btnGhost} onClick={() => setFase(0)}><ArrowLeft size={14} /> Trocar entidade</button>
            <button style={s.btnPrimary} onClick={() => setFase(2)}>Continuar <ArrowRight size={14} /></button>
          </div>
        </div>
      )}

      {/* ── Fases seguintes: ainda não implementadas ── */}
      {fase >= 2 && (
        <div style={s.body}>
          <div style={s.building}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🚧</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Etapa "{FASES[fase].label}" ainda em construção</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto' }}>
              As etapas de fonte ({entidade?.label}) e relacionamentos ({joins.length} incluído{joins.length !== 1 ? 's' : ''}) já estão prontas.
              As próximas — escolha de campos, filtros, agrupamento e a grade de resultado ao vivo — são o próximo passo da implementação.
            </div>
            <button style={{ ...s.btnGhost, marginTop: 18 }} onClick={() => setFase(1)}>
              <ArrowLeft size={14} /> Voltar para relacionamentos
            </button>
          </div>
        </div>
      )}
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

  faseNav: { display: 'flex', gap: 4, padding: '18px 24px 0', borderBottom: '1px solid var(--border)' },
  faseTab: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' },
  faseTabAtivo: { color: 'var(--accent)', borderBottomColor: 'var(--accent)' },
  faseTabDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  faseNum: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 4, background: 'var(--surface2)', color: 'inherit', fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--mono)' },

  body: { flex: 1, overflowY: 'auto', padding: '24px', maxWidth: 760 },
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
}
