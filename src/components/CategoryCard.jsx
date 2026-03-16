import { useState } from 'react'
import OptionRow from './OptionRow'
import Modal from './Modal'
import { TIPO_LABELS, TIPO_CAMPOS } from '../lib/categoryConfig'

const STATUS_COLORS = {
  pesquisando: '#f59e0b',
  fechado: '#10b981',
  descartado: '#94a3b8',
}

const STATUS_LABELS = {
  pesquisando: 'Pesquisando',
  fechado: 'Fechado',
  descartado: 'Descartado',
}

const EMPTY_OPT = { name: '', value: '', url: '', notes: '', campos: {} }

export default function CategoryCard({
  category,
  currency,
  onStatusChange,
  onAddOption,
  onOptionStatusChange,
  onDeleteOption,
  onDelete,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [showAddOption, setShowAddOption] = useState(false)
  const [optForm, setOptForm] = useState(EMPTY_OPT)
  const [saving, setSaving] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')

  const campos = TIPO_CAMPOS[category.tipo] ?? []
  const options = category.options ?? []
  const selected = options.find(o => o.status === 'selecionado')
  const best =
    selected ??
    options
      .filter(o => o.status !== 'descartado')
      .sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0))[0]
  const subtotal = Number(best?.value ?? 0)
  const color = STATUS_COLORS[category.status]
  const isFechado = category.status === 'fechado'

  function setCampo(key, value) {
    setOptForm(f => ({ ...f, campos: { ...f.campos, [key]: value } }))
  }

  // For gastos_diarios, value is derived from campos
  const calculatedValue =
    category.tipo === 'gastos_diarios'
      ? (Number(optForm.campos.por_dia ?? 0)) * (Number(optForm.campos.num_dias ?? 0))
      : null

  async function handleParseLink() {
    if (!linkUrl.startsWith('http')) {
      setParseError('Cole uma URL válida começando com http')
      return
    }
    setParsing(true)
    setParseError('')
    try {
      const res = await fetch('/api/parse-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl, tipo: category.tipo }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const { data } = json
      setOptForm({
        name: data.name ?? '',
        value: data.value ?? '',
        url: data.url ?? linkUrl,
        notes: '',
        campos: data.campos ?? {},
      })
      setLinkUrl('')
    } catch (err) {
      setParseError(err.message ?? 'Erro ao analisar o link')
    }
    setParsing(false)
  }

  async function submitOption(e) {
    e.preventDefault()
    setSaving(true)
    const value = category.tipo === 'gastos_diarios' ? calculatedValue : (Number(optForm.value) || null)
    await onAddOption({
      name: optForm.name,
      value,
      url: optForm.url || null,
      notes: optForm.notes || null,
      campos: optForm.campos,
    })
    setSaving(false)
    setShowAddOption(false)
    setOptForm(EMPTY_OPT)
  }

  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${color}35`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{category.name}</span>
            <span
              style={{
                fontSize: 11,
                background: `${color}18`,
                color,
                borderRadius: 20,
                padding: '2px 8px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {STATUS_LABELS[category.status]}
            </span>
          </div>
          {subtotal > 0 && (
            <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
              {fmtCurrency(subtotal, currency)}
              {selected && (
                <span style={{ color: '#10b981', marginLeft: 6, fontSize: 12, fontWeight: 600 }}>
                  ✓ selecionado
                </span>
              )}
              {!selected && best && (
                <span style={{ color: '#94a3b8', marginLeft: 6, fontSize: 11 }}>
                  (menor valor)
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {!isFechado && (
            <button onClick={() => onStatusChange('fechado')} style={btnSmallGreen} title="Fechar esta categoria">
              Fechar
            </button>
          )}
          {isFechado && (
            <button onClick={() => onStatusChange('pesquisando')} style={btnSmallAmber} title="Reabrir para pesquisa">
              Reabrir
            </button>
          )}
          <button onClick={() => setCollapsed(c => !c)} style={btnSmallGray} title={collapsed ? 'Expandir' : 'Colapsar'}>
            {collapsed ? '▼' : '▲'}
          </button>
          <button onClick={onDelete} style={{ ...btnSmallGray, color: '#fca5a5' }} title="Deletar categoria">
            ✕
          </button>
        </div>
      </div>

      {/* Options list */}
      {!collapsed && (
        <div style={{ borderTop: '1px solid #f1f5f9' }}>
          {options.length === 0 && (
            <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>
              Nenhuma opção ainda.
            </div>
          )}
          {options.map(opt => (
            <OptionRow
              key={opt.id}
              option={opt}
              currency={currency}
              tipo={category.tipo}
              locked={isFechado}
              onSelect={() => onOptionStatusChange(opt.id, 'selecionado')}
              onDeselect={() => onOptionStatusChange(opt.id, 'em_pesquisa')}
              onDescart={() => onOptionStatusChange(opt.id, 'descartado')}
              onDelete={() => onDeleteOption(opt.id)}
            />
          ))}
          {!isFechado && (
            <div
              style={{
                padding: '10px 16px',
                borderTop: options.length > 0 ? '1px solid #f1f5f9' : 'none',
              }}
            >
              <button onClick={() => setShowAddOption(true)} style={btnAddOption}>
                + Adicionar opção
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add option modal */}
      {showAddOption && (
        <Modal
          title={`Nova opção — ${TIPO_LABELS[category.tipo]}`}
          onClose={() => { setShowAddOption(false); setOptForm(EMPTY_OPT); setLinkUrl(''); setParseError('') }}
        >
          <form onSubmit={submitOption} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Preencher por link */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                ✨ Preencher automaticamente por link
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="url"
                  style={{ ...inputStyle, background: '#fff', flex: 1 }}
                  value={linkUrl}
                  onChange={e => { setLinkUrl(e.target.value); setParseError('') }}
                  placeholder="Cole o link da passagem, hotel, carro..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleParseLink())}
                />
                <button
                  type="button"
                  onClick={handleParseLink}
                  disabled={parsing || !linkUrl}
                  style={{
                    ...btnPrimary,
                    padding: '7px 14px',
                    fontSize: 13,
                    opacity: parsing || !linkUrl ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {parsing ? 'Analisando...' : 'Analisar'}
                </button>
              </div>
              {parseError && (
                <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>{parseError}</div>
              )}
              {parsing && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                  Lendo a página e extraindo informações...
                </div>
              )}
            </div>

            <Field label="Nome da opção *">
              <input
                style={inputStyle}
                value={optForm.name}
                onChange={e => setOptForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: LATAM — voo direto"
                required
                autoFocus
              />
            </Field>

            {/* Campos específicos do tipo */}
            {campos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {campos.map(campo => (
                  <Field key={campo.key} label={campo.label}>
                    {campo.type === 'boolean' ? (
                      <select
                        style={inputStyle}
                        value={
                          optForm.campos[campo.key] === true
                            ? 'true'
                            : optForm.campos[campo.key] === false
                            ? 'false'
                            : ''
                        }
                        onChange={e =>
                          setCampo(campo.key, e.target.value === '' ? undefined : e.target.value === 'true')
                        }
                      >
                        <option value="">—</option>
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    ) : (
                      <input
                        type={campo.type === 'number' ? 'number' : 'text'}
                        style={inputStyle}
                        value={optForm.campos[campo.key] ?? ''}
                        onChange={e => setCampo(campo.key, e.target.value)}
                        step={campo.type === 'number' ? '0.01' : undefined}
                        min={campo.type === 'number' ? '0' : undefined}
                      />
                    )}
                  </Field>
                ))}
              </div>
            )}

            {/* Valor */}
            {category.tipo === 'gastos_diarios' ? (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 13,
                  color: '#065f46',
                  fontWeight: 600,
                }}
              >
                Total calculado: {fmtCurrency(calculatedValue, currency)}
              </div>
            ) : (
              <Field label={`Valor total (${currency})`}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  style={inputStyle}
                  value={optForm.value}
                  onChange={e => setOptForm(f => ({ ...f, value: e.target.value }))}
                  placeholder="0,00"
                />
              </Field>
            )}

            <Field label="Link (opcional)">
              <input
                type="url"
                style={inputStyle}
                value={optForm.url}
                onChange={e => setOptForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://..."
              />
            </Field>

            <Field label="Observações (opcional)">
              <textarea
                style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
                value={optForm.notes}
                onChange={e => setOptForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Field>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => { setShowAddOption(false); setOptForm(EMPTY_OPT); setLinkUrl(''); setParseError('') }}
                style={{ ...btnSecondary, flex: 1 }}
              >
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{label}</span>
      {children}
    </label>
  )
}

function fmtCurrency(val, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val ?? 0)
  } catch {
    return `${currency} ${Number(val ?? 0).toFixed(2)}`
  }
}

const inputStyle = {
  padding: '7px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  color: '#1e293b',
  background: '#fff',
}

const btnPrimary = {
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSecondary = {
  background: '#f1f5f9',
  color: '#374151',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 14,
  cursor: 'pointer',
}

const btnSmallGreen = {
  background: '#d1fae5',
  color: '#065f46',
  border: 'none',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSmallAmber = {
  background: '#fef3c7',
  color: '#92400e',
  border: 'none',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnSmallGray = {
  background: '#f1f5f9',
  color: '#475569',
  border: 'none',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  cursor: 'pointer',
}

const btnAddOption = {
  background: 'transparent',
  border: '1px dashed #d1d5db',
  borderRadius: 6,
  padding: '6px 12px',
  color: '#64748b',
  fontSize: 13,
  cursor: 'pointer',
}
