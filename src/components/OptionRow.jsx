import { TIPO_CAMPOS } from '../lib/categoryConfig'

export default function OptionRow({ option, currency, tipo, locked, onSelect, onDeselect, onDescart, onDelete }) {
  const campos = TIPO_CAMPOS[tipo] ?? []
  const isSelected = option.status === 'selecionado'
  const isDescartado = option.status === 'descartado'

  const campoEntries = campos
    .map(campo => {
      const val = option.campos?.[campo.key]
      if (val === undefined || val === null || val === '') return null
      return { label: campo.label, display: campo.type === 'boolean' ? (val ? 'Sim' : 'Não') : String(val) }
    })
    .filter(Boolean)

  return (
    <div
      style={{
        padding: '11px 16px',
        borderBottom: '1px solid #f8fafc',
        background: isSelected ? '#f0fdf4' : isDescartado ? '#f9fafb' : '#fff',
        opacity: isDescartado ? 0.55 : 1,
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Select button */}
        {!locked && !isDescartado && (
          <button
            onClick={isSelected ? onDeselect : onSelect}
            title={isSelected ? 'Desmarcar' : 'Selecionar esta opção'}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: `2px solid ${isSelected ? '#10b981' : '#d1d5db'}`,
              background: isSelected ? '#10b981' : '#fff',
              cursor: 'pointer',
              flexShrink: 0,
              marginTop: 2,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + value */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: isSelected ? 600 : 400,
                color: isDescartado ? '#94a3b8' : '#1e293b',
                textDecoration: isDescartado ? 'line-through' : 'none',
              }}
            >
              {option.name}
            </span>
            {option.value != null && (
              <span style={{ fontSize: 14, fontWeight: 600, color: isSelected ? '#059669' : '#374151' }}>
                {fmtCurrency(option.value, currency)}
              </span>
            )}
            {option.url && (
              <a
                href={option.url}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none' }}
                onClick={e => e.stopPropagation()}
              >
                Ver link ↗
              </a>
            )}
          </div>

          {/* Campos tags */}
          {campoEntries.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
              {campoEntries.map(({ label, display }) => (
                <span key={label} style={tag}>
                  {label}: <strong>{display}</strong>
                </span>
              ))}
            </div>
          )}

          {/* Notes */}
          {option.notes && (
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{option.notes}</div>
          )}
        </div>

        {/* Actions */}
        {!locked && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {!isDescartado && (
              <button onClick={onDescart} style={btnAction} title="Descartar esta opção">
                ✕
              </button>
            )}
            {isDescartado && (
              <button onClick={onSelect} style={{ ...btnAction, color: '#10b981' }} title="Restaurar para pesquisa">
                ↩
              </button>
            )}
            <button onClick={onDelete} style={{ ...btnAction, color: '#fca5a5' }} title="Deletar permanentemente">
              🗑
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function fmtCurrency(val, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val)
  } catch {
    return `${currency} ${Number(val).toFixed(2)}`
  }
}

const tag = {
  background: '#f1f5f9',
  color: '#475569',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 11,
}

const btnAction = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  color: '#cbd5e1',
  padding: '3px 5px',
  borderRadius: 4,
  lineHeight: 1,
}
