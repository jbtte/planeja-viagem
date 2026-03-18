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
const TIPO_LABEL = {
  passagens: 'Passagens', hotel: 'Hotel', carro: 'Carro', passeios: 'Passeios',
  seguro: 'Seguro', translados: 'Translados', gastos_diarios: 'Gastos do dia a dia', restaurantes: 'Restaurantes',
}

function catValue(cat, numPeople) {
  const opts = cat.options ?? []
  const selected = opts.find(o => o.status === 'selecionado')
  const best =
    selected ??
    opts.filter(o => o.status !== 'descartado')
      .sort((a, b) => (Number(a.value) || 0) - (Number(b.value) || 0))[0]
  const rawVal = Number(best?.value ?? 0)
  return best?.campos?.por_pessoa ? rawVal * (numPeople ?? 1) : rawVal
}

function renderWidget(trip, categories) {
  const currency = trip.currency
  const { estimado, fechado } = calcBudgets(categories, trip.num_people)
  const showBrl = currency !== 'BRL' && trip.exchange_rate > 1
  const overBudget = trip.budget && estimado > trip.budget

  // Group by tipo, skipping descartado
  const groups = {}
  for (const cat of categories) {
    if (cat.status === 'descartado') continue
    if (!groups[cat.tipo]) groups[cat.tipo] = []
    groups[cat.tipo].push(cat)
  }

  const rows = Object.entries(groups).map(([tipo, cats]) => {
    const total = cats.reduce((sum, c) => sum + catValue(c, trip.num_people), 0)
    const brlTotal = total * (trip.exchange_rate || 1)
    // Status: fechado only if ALL are fechado, otherwise pesquisando
    const groupStatus = cats.every(c => c.status === 'fechado') ? 'fechado' : 'pesquisando'
    const statusColor = STATUS_COLOR[groupStatus]
    const statusLabel = STATUS_LABEL[groupStatus]
    const label = TIPO_LABEL[tipo] ?? tipo

    return `
      <tr>
        <td class="td-name">${label}</td>
        <td class="td-value">
          ${total > 0 ? fmtCurrency(total, currency) : '—'}
          ${showBrl && total > 0 ? `<br><span class="brl">≈ ${fmtCurrency(brlTotal, 'BRL')}</span>` : ''}
        </td>
        <td class="td-status">
          <span class="badge" style="background:${statusColor}22;color:${statusColor}">${statusLabel}</span>
        </td>
      </tr>`
  }).join('')

  const brlEstimado = estimado * (trip.exchange_rate || 1)
  const brlFechado = fechado * (trip.exchange_rate || 1)

  const budgetCards = [
    trip.budget ? `
      <div class="card" style="border-color:#6366f133">
        <div class="card-label" style="color:#6366f1">Estimativa</div>
        <div class="card-value">${fmtCurrency(trip.budget, currency)}</div>
        ${showBrl ? `<div class="brl">≈ ${fmtCurrency(trip.budget * (trip.exchange_rate || 1), 'BRL')}</div>` : ''}
      </div>` : '',
    `<div class="card" style="border-color:#f59e0b33">
      <div class="card-label" style="color:#f59e0b">Projetado</div>
      <div class="card-value${overBudget ? ' over-budget' : ''}">${fmtCurrency(estimado, currency)}</div>
      ${showBrl ? `<div class="brl">≈ ${fmtCurrency(brlEstimado, 'BRL')}</div>` : ''}
    </div>`,
    `<div class="card" style="border-color:#10b98133">
      <div class="card-label" style="color:#10b981">Comprometido</div>
      <div class="card-value">${fmtCurrency(fechado, currency)}</div>
      ${showBrl ? `<div class="brl">≈ ${fmtCurrency(brlFechado, 'BRL')}</div>` : ''}
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
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --row-border: #f1f5f9;
      --thead-bg: #f8fafc;
      --text: #1e293b;
      --text-2: #475569;
      --muted: #94a3b8;
      --very-muted: #cbd5e1;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #191919;
        --surface: #2f2f2f;
        --border: #3f3f3f;
        --row-border: #383838;
        --thead-bg: #252525;
        --text: #e5e5e5;
        --text-2: #a0a0a0;
        --muted: #6b6b6b;
        --very-muted: #4a4a4a;
      }
    }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); }
    .container { max-width: 700px; margin: 0 auto; }
    .trip-title { font-size: 18px; font-weight: 700; margin-bottom: 3px; }
    .trip-sub { font-size: 12px; color: var(--muted); margin-bottom: 16px; }
    .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: var(--thead-bg); }
    th { padding: 9px 12px; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); text-align: left; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    .td-name { padding: 10px 12px; border-bottom: 1px solid var(--row-border); font-size: 13px; font-weight: 500; color: var(--text); }
    .td-option { padding: 10px 12px; border-bottom: 1px solid var(--row-border); font-size: 13px; color: var(--text-2); }
    .td-value { padding: 10px 12px; border-bottom: 1px solid var(--row-border); font-size: 13px; font-weight: 600; color: var(--text); text-align: right; }
    .td-status { padding: 10px 12px; border-bottom: 1px solid var(--row-border); text-align: center; }
    .brl { font-size: 11px; color: var(--muted); font-weight: 400; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .cards { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
    .card { flex: 1; min-width: 120px; background: var(--surface); border: 2px solid; border-radius: 10px; padding: 12px 14px; }
    .card-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .card-value { font-size: 17px; font-weight: 700; color: var(--text); }
    .card-value.over-budget { color: #ef4444; }
    .footer { margin-top: 14px; font-size: 10px; color: var(--very-muted); text-align: right; }
    .empty { padding: 20px; text-align: center; color: var(--muted); font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="trip-title">${trip.destination}</div>
    <div class="trip-sub">${dateStr} · ${trip.num_people} pessoa${trip.num_people !== 1 ? 's' : ''} · ${currency}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th class="right">Valor</th>
            <th class="center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="3" class="empty">Nenhuma categoria</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="cards">${budgetCards}</div>
    <div class="footer">Planeja Viagem · Atualizado em tempo real</div>
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
