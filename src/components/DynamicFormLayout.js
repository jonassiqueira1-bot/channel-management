import { useState, useEffect } from 'react'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

/**
 * DynamicFormLayout
 * Renderiza o formulário de uma entidade com base no layout salvo em Conf. de Campos.
 *
 * Props:
 *   sections    — array de seções vindo de useFormLayout()
 *   fieldById   — map id → field vindo de useFormLayout()
 *   renderField — (fieldKey, field) → JSX do input (sem label)
 *                 Retornar null oculta o campo.
 *   sectionStyle  — override de estilo para o bloco de seção (opcional)
 *   labelStyle    — override de estilo para o label de campo (opcional)
 */
export default function DynamicFormLayout({ sections, fieldById, renderField, sectionStyle, labelStyle }) {
  const isMobile = useIsMobile()
  const defSec = {
    background: 'var(--surface)', border: '1px solid var(--border2)',
    borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    ...sectionStyle,
  }
  const defLabel = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.07em', color: 'var(--text-muted)',
    display: 'block', marginBottom: 5,
    ...labelStyle,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sections.map(sec => {
        // filtra linhas onde ao menos um campo tem definição no fieldById
        const rows = sec.rows
          .map(row => ({ left: fieldById[row[0]] || null, right: fieldById[row[1]] || null }))
          .filter(r => r.left || r.right)

        if (rows.length === 0) return null

        return (
          <div key={sec.id} style={defSec}>
            {/* Cabeçalho da seção */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              paddingBottom: 10, borderBottom: '1px solid var(--border)',
              marginBottom: 2,
            }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--accent)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.1px' }}>
                {sec.label}
              </span>
            </div>

            {/* Linhas de campos */}
            {rows.map(({ left, right }, ri) => {
              const leftNode  = left  ? renderField(left.field_key,  left)  : undefined
              const rightNode = right ? renderField(right.field_key, right) : undefined
              const showLeft  = left  && leftNode  !== null
              const showRight = right && rightNode !== null
              if (!showLeft && !showRight) return null
              return (
                <div key={ri} style={{
                  display: 'grid',
                  gridTemplateColumns: !isMobile && showLeft && showRight ? '1fr 1fr' : '1fr',
                  gap: 14,
                }}>
                  {showLeft  && <FieldSlot field={left}  preRendered={leftNode}  labelStyle={defLabel} />}
                  {showRight && <FieldSlot field={right} preRendered={rightNode} labelStyle={defLabel} />}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// Input genérico para campos sem renderField específico (campos customizados)
function GenericInput({ field }) {
  const base = {
    width: '100%', padding: '8px 12px', border: '1px solid var(--border)',
    borderRadius: 7, background: 'var(--surface2)', color: 'var(--text)',
    fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
    boxSizing: 'border-box',
  }
  const { field_type, options } = field
  if (field_type === 'textarea')
    return <textarea style={{ ...base, minHeight: 72, resize: 'vertical' }} placeholder="—" />
  if (field_type === 'boolean')
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
        padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)',
        background: 'var(--surface2)' }}>
        <input type="checkbox" style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
        <span style={{ fontSize: 13, color: 'var(--text)' }}>—</span>
      </label>
    )
  if (field_type === 'date')
    return <input type="date" style={base} />
  if (field_type === 'number')
    return <input type="number" style={base} placeholder="0" />
  if (field_type === 'select' && options?.length)
    return (
      <select style={base}>
        <option value="">— Selecione —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  return <input type="text" style={base} placeholder="—" />
}

function FieldSlot({ field, preRendered, labelStyle }) {
  return (
    <div>
      <label style={labelStyle}>
        {field.label}
        {field.is_required && (
          <span style={{ color: 'var(--red)', marginLeft: 3, fontWeight: 900 }}>*</span>
        )}
      </label>
      {preRendered ?? <GenericInput field={field} />}
    </div>
  )
}
