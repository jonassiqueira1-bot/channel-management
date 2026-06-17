// src/components/ui/SelectRelation.js
// Seletor de relacionamento (FK) com busca type-ahead.
// Encapsula SearchSelect adicionando label, hint e slot de criação rápida.
//
// Props:
//   label          string
//   hint           string
//   error          string
//   required       bool
//   options        [{id, label, sublabel?, color?}]
//   value          id selecionado
//   onChange       (id, label) => void
//   placeholder    string
//   onCreateNew    () => void   — se fornecido, exibe link "Criar novo…"
//   createNewLabel string       — label do link (default: 'Criar novo…')
//   allowClear     bool
//   style          objeto extra no wrapper

import SearchSelect from '../SearchSelect'

export default function SelectRelation({
  label,
  hint,
  error,
  required       = false,
  options        = [],
  value,
  onChange,
  placeholder    = 'Buscar…',
  onCreateNew,
  createNewLabel = 'Criar novo…',
  allowClear     = true,
  style: extra   = {},
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...extra }}>
      {label && (
        <label style={{
          fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)',
        }}>
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <SearchSelect
          options={options}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          allowClear={allowClear}
          inputStyle={error ? {
            borderColor: 'var(--danger)',
            boxShadow: '0 0 0 3px rgba(239,68,68,0.10)',
          } : undefined}
        />
      </div>

      {/* Footer: hint / erro / criar novo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>
          {error && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>{error}</span>
          )}
          {!error && hint && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{hint}</span>
          )}
        </span>
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 'var(--text-xs)', color: 'var(--accent)',
              fontFamily: 'var(--font)', padding: 0,
            }}
          >
            + {createNewLabel}
          </button>
        )}
      </div>
    </div>
  )
}
