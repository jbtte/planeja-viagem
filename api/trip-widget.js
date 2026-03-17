import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function fmtCurrency(val, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val)
  } catch {
    return `${currency} ${Number(val).toFixed(2)}`
  }
}

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function calcBudgets(categories, numPeople) {
  let estimado = 0
  let fechado = 0
  for (const cat of categories) {
    if (cat.status === 'descartado') continue
    const options = cat.options ?? []
    const selected = options.find(o => o.status === 'selecionado')
    const best =
      selected ??
      options
        .filter(o => o.status !== 'descartado')
        .sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0))[0]
    const rawVal = Number(best?.value ?? 0)
    const val = best?.campos?.por_pessoa ? rawVal * (numPeople ?? 1) : rawVal
    estimado += val
    if (cat.status === 'fechado') fechado += val
  }
  return { estimado, fechado }
}

const STATUS_LABEL = { pesquisando: 'Pesquisando', fechado: 'Fechado', descartado: 'Descartado' }
const STATUS_COLOR = { pesquisando: '#f59e0b', fechado: '#10b981', descartado: '#94a3b8' }

function renderWidget(trip, categories) {
  const currency = trip.currency
  const { estimado, fechado } = calcBudgets(categories, trip.num_people)
  const showBrl = currency !== 'BRL' && trip.exchange_rate > 1

  const visibleCats = categories.filter(c => c.status !== 'descartado')

  const rows = visibleCats.map(cat => {
    const opts = cat.options ?? []
    const selected = opts.find(o => o.status === 'selecionado')
    const best =
      selected ??
      opts.filter(o => o.status !== 'descartado')
        .sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0))[0]
    const rawVal = Number(best?.value ?? 0)
    const val = best?.campos?.por_pessoa ? rawVal * (trip.num_people ?? 1) : rawVal
    const brlVal = val * (trip.exchange_rate || 1)
    const statusColor = STATUS_COLOR[cat.status] || '#94a3b8'
    const statusLabel = STATUS_LABEL[cat.status] || cat.status

    return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b;font-size:13px">${cat.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#475569;font-size:13px">${best?.name ?? '—'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600;color:#1e293b;font-size:13px">
          ${val > 0 ? fmtCurrency(val, currency) : '—'}
          ${showBrl && val > 0 ? `<br><span style="font-size:11px;color:#94a3b8;font-weight:400">≈ ${fmtCurrency(brlVal, 'BRL')}</span>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;text-align:center">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:${statusColor}20;color:${statusColor}">${statusLabel}</span>
        </td>
      </tr>`
  }).join('')

  const brlEstimado = estimado * (trip.exchange_rate || 1)
  const brlFechado = fechado * (trip.exchange_rate || 1)

  const budgetCards = [
    trip.budget ? `
      <div style="flex:1;min-width:120px;background:#fff;border:2px solid #6366f120;border-radius:10px;padding:12px 14px">
        <div style="font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Estimativa</div>
        <div style="font-size:17px;font-weight:700;color:#1e293b">${fmtCurrency(trip.budget, currency)}</div>
        ${showBrl ? `<div style="font-size:11px;color:#94a3b8">≈ ${fmtCurrency(trip.budget * (trip.exchange_rate || 1), 'BRL')}</div>` : ''}
      </div>` : '',
    `<div style="flex:1;min-width:120px;background:#fff;border:2px solid #f59e0b20;border-radius:10px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#f59e0b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Projetado</div>
      <div style="font-size:17px;font-weight:700;color:${trip.budget && estimado > trip.budget ? '#ef4444' : '#1e293b'}">${fmtCurrency(estimado, currency)}</div>
      ${showBrl ? `<div style="font-size:11px;color:#94a3b8">≈ ${fmtCurrency(brlEstimado, 'BRL')}</div>` : ''}
    </div>`,
    `<div style="flex:1;min-width:120px;background:#fff;border:2px solid #10b98120;border-radius:10px;padding:12px 14px">
      <div style="font-size:10px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Comprometido</div>
      <div style="font-size:17px;font-weight:700;color:#1e293b">${fmtCurrency(fechado, currency)}</div>
      ${showBrl ? `<div style="font-size:11px;color:#94a3b8">≈ ${fmtCurrency(brlFechado, 'BRL')}</div>` : ''}
    </div>`,
  ].join('')

  const dateStr = trip.start_date && trip.end_date
    ? `${fmtDate(trip.start_date)} – ${fmtDate(trip.end_date)}`
    : 'Datas a definir'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${trip.destination} — Orçamento</title>
</head>
<body style="margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b">
  <div style="max-width:700px;margin:0 auto">
    <div style="margin-bottom:16px">
      <div style="font-size:18px;font-weight:700;color:#1e293b">${trip.destination}</div>
      <div style="font-size:12px;color:#64748b;margin-top:3px">${dateStr} · ${trip.num_people} pessoa${trip.num_people !== 1 ? 's' : ''} · ${currency}</div>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Categoria</th>
            <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Opção</th>
            <th style="padding:9px 12px;text-align:right;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Valor</th>
            <th style="padding:9px 12px;text-align:center;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">Nenhuma categoria</td></tr>'}
        </tbody>
      </table>
    </div>
    <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
      ${budgetCards}
    </div>
    <div style="margin-top:14px;font-size:10px;color:#cbd5e1;text-align:right">
      Planeja Viagem · Atualizado em tempo real
    </div>
  </div>
</body>
</html>`
}

export default async function handler(req, res) {
  const { token } = req.query

  if (!token) {
    return res.status(400).send('<p style="font-family:sans-serif;color:#ef4444">Token não informado.</p>')
  }

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('share_token', token)
    .single()

  if (!trip) {
    return res.status(404).send('<p style="font-family:sans-serif;color:#ef4444">Viagem não encontrada.</p>')
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('*, options(*)')
    .eq('trip_id', trip.id)
    .order('sort_order')

  const cats = (categories ?? []).map(c => ({
    ...c,
    options: (c.options ?? []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }))

  const html = renderWidget(trip, cats)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Security-Policy', "frame-ancestors *")
  return res.status(200).send(html)
}
