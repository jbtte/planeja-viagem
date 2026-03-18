import { useState } from 'react'

const GRID_TIPOS = ['passagens', 'hotel', 'carro', 'translados', 'passeios', 'restaurantes']

const TIPO_META = {
  passagens:   { emoji: '✈️', label: 'Voos' },
  hotel:       { emoji: '🏨', label: 'Hotel' },
  carro:       { emoji: '🚗', label: 'Carro' },
  translados:  { emoji: '🚌', label: 'Translados' },
  passeios:    { emoji: '🎭', label: 'Passeios' },
  restaurantes:{ emoji: '🍽️', label: 'Refeições' },
}

// Types where a gap (no coverage on a day) is highlighted in red
const CRITICAL_TIPOS = new Set(['hotel'])

export default function CoverageGrid({ trip, categories }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('collapsed_coverage') === 'true' } catch { return false }
  })

  if (!trip.start_date || !trip.end_date) return null

  const days = getDays(trip.start_date, trip.end_date)
  if (days.length === 0) return null

  const rows = buildRows(categories, days)
  if (rows.length === 0) return null

  const colW = Math.max(40, Math.min(56, Math.floor((640 - 110) / days.length)))

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('collapsed_coverage', next) } catch {}
      return next
    })
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      marginBottom: 20,
      overflow: 'hidden',
    }}>
      <div
        style={{ padding: '12px 16px', borderBottom: collapsed ? 'none' : '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={toggleCollapsed}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>📅 Cobertura da Viagem</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{collapsed ? '▼' : '▲'}</span>
      </div>

      {!collapsed && (<><div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: `${110 + colW * days.length}px` }}>
          <thead>
            <tr>
              <th style={{ width: 110, padding: '6px 12px', textAlign: 'left' }} />
              {days.map(d => (
                <th key={d} style={{ width: colW, padding: '6px 2px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>{fmtWeekday(d)}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{fmtDayNum(d)}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>{fmtMonth(d)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={row.tipo} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '5px 12px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 13 }}>{row.emoji}</span>
                  <span style={{ fontSize: 12, color: '#374151', marginLeft: 5 }}>{row.label}</span>
                </td>
                {days.map(d => {
                  const cell = row.cells[d]
                  const isGap = !cell && CRITICAL_TIPOS.has(row.tipo)
                  return (
                    <td key={d} style={{ padding: '4px 2px', textAlign: 'center' }}>
                      {cell ? (
                        <div
                          title={cell.name}
                          style={{
                            background: cell.fechado ? '#d1fae5' : '#fef9c3',
                            border: `1px solid ${cell.fechado ? '#6ee7b7' : '#fde68a'}`,
                            borderRadius: 4,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            color: cell.fechado ? '#065f46' : '#92400e',
                            overflow: 'hidden',
                          }}
                        >
                          {cell.fechado ? '✓' : '~'}
                        </div>
                      ) : isGap ? (
                        <div
                          title="Sem cobertura"
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: 4,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            color: '#dc2626',
                          }}
                        >
                          !
                        </div>
                      ) : (
                        <div style={{ height: 22, background: '#f8fafc', borderRadius: 4 }} />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '8px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <LegendItem bg="#d1fae5" border="#6ee7b7" text="#065f46" label="Fechado" mark="✓" />
        <LegendItem bg="#fef9c3" border="#fde68a" text="#92400e" label="Em pesquisa" mark="~" />
        <LegendItem bg="#fee2e2" border="#fca5a5" text="#dc2626" label="Gap de hotel" mark="!" />
      </div>
      </>)}
    </div>
  )
}

function LegendItem({ bg, border, text, label, mark }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 18, height: 18, background: bg, border: `1px solid ${border}`,
        borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: text, fontWeight: 600,
      }}>
        {mark}
      </div>
      <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDays(startStr, endStr) {
  const days = []
  let d = new Date(startStr + 'T12:00:00')
  const end = new Date(endStr + 'T12:00:00')
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10))
    d = new Date(d.getTime() + 86400000)
  }
  return days
}

function buildRows(categories, days) {
  const rows = []

  for (const tipo of GRID_TIPOS) {
    const cats = categories.filter(c => c.tipo === tipo && c.status !== 'descartado')
    if (cats.length === 0) continue

    const cells = {}

    for (const cat of cats) {
      const options = cat.options ?? []
      const best =
        options.find(o => o.status === 'selecionado') ??
        options
          .filter(o => o.status !== 'descartado')
          .sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0))[0]

      if (!best) continue

      const c = best.campos ?? {}
      const fechado = cat.status === 'fechado'
      const name = best.name

      const markDay = date => {
        if (date && days.includes(date)) cells[date] = { name, fechado }
      }

      const markRange = (from, toExclusive) => {
        let d = new Date(from + 'T12:00:00')
        const end = new Date(toExclusive + 'T12:00:00')
        while (d < end) {
          const s = d.toISOString().slice(0, 10)
          if (days.includes(s)) cells[s] = { name, fechado }
          d = new Date(d.getTime() + 86400000)
        }
      }

      if (tipo === 'passagens') {
        markDay(c.data_ida)
        markDay(c.data_volta)
      } else if (tipo === 'hotel') {
        if (c.check_in && c.check_out) markRange(c.check_in, c.check_out)
      } else if (tipo === 'carro') {
        if (c.data_retirada && c.dias) {
          const endDate = new Date(
            new Date(c.data_retirada + 'T12:00:00').getTime() + Number(c.dias) * 86400000
          ).toISOString().slice(0, 10)
          markRange(c.data_retirada, endDate)
        }
      } else {
        // passeios, translados, restaurantes — single day
        markDay(c.data)
      }
    }

    rows.push({ tipo, ...TIPO_META[tipo], cells })
  }

  return rows
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function fmtWeekday(dateStr) {
  return WEEKDAYS[new Date(dateStr + 'T12:00:00').getDay()]
}

function fmtDayNum(dateStr) {
  return dateStr.slice(8)
}

function fmtMonth(dateStr) {
  return MONTHS[parseInt(dateStr.slice(5, 7), 10) - 1]
}
