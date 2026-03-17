import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CategoryCard from '../components/CategoryCard'
import CoverageGrid from '../components/CoverageGrid'
import Modal from '../components/Modal'
import { TIPO_LABELS } from '../lib/categoryConfig'

const TIPOS = Object.keys(TIPO_LABELS)

export default function Trip() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState(null)
  const [categories, setCategories] = useState([])
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCat, setNewCat] = useState({ tipo: 'passagens', name: '' })
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState('')
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900)
  const [photoUrl, setPhotoUrl] = useState(null)

  useEffect(() => {
    loadAll()
  }, [slug])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const handler = e => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (!trip?.destination) return
    setPhotoUrl(null)
    const key = import.meta.env.VITE_UNSPLASH_ACCESS_KEY
    const query = trip.destination
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '').trim() + ' landmark travel'
    fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=portrait&per_page=10&order_by=relevant&client_id=${key}`)
      .then(r => r.json())
      .then(data => {
        const results = data.results ?? []
        if (!results.length) return
        const pick = results[Math.floor(Math.random() * Math.min(5, results.length))]
        setPhotoUrl(pick.urls.regular)
      })
      .catch(() => {})
  }, [trip?.destination])

  async function loadAll() {
    const { data: tripData } = await supabase.from('trips').select('*').eq('slug', slug).single()
    if (!tripData) return
    const year = tripData.start_date ? new Date(tripData.start_date + 'T12:00:00').getFullYear() : null
    document.title = `${tripData.destination}${year ? ` · ${year}` : ''} — Planeja Viagem`
    const { data: catsData } = await supabase
      .from('categories')
      .select('*, options(*)')
      .eq('trip_id', tripData.id)
      .order('sort_order')
    setTrip(tripData)
    // Sort options by created_at within each category
    setCategories(
      (catsData ?? []).map(c => ({
        ...c,
        options: (c.options ?? []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
      }))
    )
  }

  async function addCategory(e) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        trip_id: trip.id,
        tipo: newCat.tipo,
        name: newCat.name.trim() || TIPO_LABELS[newCat.tipo],
        sort_order: categories.length,
      }])
      .select('*, options(*)')
      .single()
    setSaving(false)
    if (!error) {
      setCategories(c => [...c, { ...data, options: [] }])
      setShowNewCat(false)
      setNewCat({ tipo: 'passagens', name: '' })
    }
  }

  async function updateCategoryStatus(catId, status) {
    await supabase.from('categories').update({ status }).eq('id', catId)
    setCategories(cats => cats.map(c => c.id === catId ? { ...c, status } : c))
  }

  async function deleteCategory(catId) {
    if (!confirm('Deletar esta categoria e todas as suas opções?')) return
    await supabase.from('categories').delete().eq('id', catId)
    setCategories(cats => cats.filter(c => c.id !== catId))
  }

  async function addOption(catId, option) {
    const { data, error } = await supabase
      .from('options')
      .insert([{ ...option, category_id: catId }])
      .select()
      .single()
    if (!error) {
      setCategories(cats =>
        cats.map(c =>
          c.id === catId ? { ...c, options: [...(c.options ?? []), data] } : c
        )
      )
    }
  }

  async function updateOptionStatus(catId, optionId, status) {
    if (status === 'selecionado') {
      // Deselect all others in the same category first
      await supabase
        .from('options')
        .update({ status: 'em_pesquisa' })
        .eq('category_id', catId)
        .eq('status', 'selecionado')
      await supabase.from('options').update({ status: 'selecionado' }).eq('id', optionId)
      setCategories(cats =>
        cats.map(c =>
          c.id === catId
            ? {
                ...c,
                options: (c.options ?? []).map(o => ({
                  ...o,
                  status: o.id === optionId
                    ? 'selecionado'
                    : o.status === 'selecionado' ? 'em_pesquisa' : o.status,
                })),
              }
            : c
        )
      )
    } else {
      await supabase.from('options').update({ status }).eq('id', optionId)
      setCategories(cats =>
        cats.map(c =>
          c.id === catId
            ? { ...c, options: (c.options ?? []).map(o => o.id === optionId ? { ...o, status } : o) }
            : c
        )
      )
    }
  }

  async function deleteOption(catId, optionId) {
    await supabase.from('options').delete().eq('id', optionId)
    setCategories(cats =>
      cats.map(c =>
        c.id === catId
          ? { ...c, options: (c.options ?? []).filter(o => o.id !== optionId) }
          : c
      )
    )
  }

  async function updateOption(catId, optionId, data) {
    const { data: updated, error } = await supabase
      .from('options')
      .update(data)
      .eq('id', optionId)
      .select()
      .single()
    if (!error) {
      setCategories(cats =>
        cats.map(c =>
          c.id === catId
            ? { ...c, options: (c.options ?? []).map(o => o.id === optionId ? updated : o) }
            : c
        )
      )
    }
  }

  async function updateCategoryNotionUrl(catId, notionUrl) {
    await supabase.from('categories').update({ notion_url: notionUrl }).eq('id', catId)
    setCategories(cats => cats.map(c => c.id === catId ? { ...c, notion_url: notionUrl } : c))
  }

  async function updateTripNotionFolderUrl(url) {
    await supabase.from('trips').update({ notion_folder_url: url }).eq('id', trip.id)
    setTrip(t => ({ ...t, notion_folder_url: url }))
  }

  async function handleGenerateSummary() {
    setLoadingSummary(true)
    setSummary('')
    setShowSummary(true)
    try {
      const res = await fetch('/api/trip-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip, categories }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSummary(json.summary)
    } catch (err) {
      setSummary(`Erro: ${err.message}`)
    }
    setLoadingSummary(false)
  }

  if (!trip) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Carregando...</div>

  const { estimado, fechado } = calcBudgets(categories, trip.num_people)
  const currency = trip.currency

  return (
    <div style={isDesktop ? { display: 'flex', height: '100vh', overflow: 'hidden' } : {}}>

      {/* Image panel — desktop only */}
      {isDesktop && (
        <div style={{ width: '42%', flexShrink: 0, position: 'relative', background: '#0f172a', overflow: 'hidden' }}>
          {photoUrl && (
            <img
              src={photoUrl}
              alt={trip.destination}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.82 }}
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            padding: '36px 32px',
            color: '#fff',
          }}>
            {trip.start_date && trip.end_date && (
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 8, letterSpacing: 0.3 }}>
                {fmtDate(trip.start_date)} – {fmtDate(trip.end_date)}
              </div>
            )}
            <div style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15 }}>{trip.destination}</div>
            <div style={{ fontSize: 13, opacity: 0.65, marginTop: 10 }}>
              {trip.num_people} pessoa{trip.num_people !== 1 ? 's' : ''} · {currency}
              {trip.budget ? ` · Estimativa ${fmtCurrency(trip.budget, currency)}` : ''}
            </div>
            {trip.notes && (
              <div style={{ fontSize: 12, opacity: 0.55, marginTop: 6, fontStyle: 'italic' }}>{trip.notes}</div>
            )}
          </div>
        </div>
      )}

      {/* Content panel */}
      <div style={isDesktop ? { flex: 1, overflowY: 'auto' } : {}}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate('/')} style={btnBack}>← Minhas viagens</button>
        <button
          onClick={handleGenerateSummary}
          disabled={loadingSummary}
          style={{ ...btnSummary, opacity: loadingSummary ? 0.6 : 1 }}
        >
          {loadingSummary ? '✨ Gerando...' : '✨ Resumo'}
        </button>
      </div>
      <div style={{ marginTop: 12, marginBottom: 24 }}>
        {!isDesktop && <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700 }}>{trip.destination}</h1>}
        <div style={{ fontSize: 13, color: '#64748b' }}>
          {trip.start_date && trip.end_date
            ? `${fmtDate(trip.start_date)} – ${fmtDate(trip.end_date)}`
            : 'Datas a definir'}
          {' · '}{trip.num_people} pessoa{trip.num_people !== 1 ? 's' : ''}
          {' · '}{currency}
        </div>
        {trip.notes && <div style={{ marginTop: 6, fontSize: 13, color: '#475569' }}>{trip.notes}</div>}
      </div>

      {/* Budget cards */}
      <div style={{ display: 'grid', gridTemplateColumns: trip.budget ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 28 }}>
        {trip.budget && (
          <BudgetCard
            label="Estimativa de gasto"
            value={trip.budget}
            currency={currency}
            exchangeRate={trip.exchange_rate}
            color="#6366f1"
            hint="Meta definida para a viagem"
          />
        )}
        <BudgetCard
          label={trip.budget ? 'Projetado' : 'Orçamento projetado'}
          value={estimado}
          currency={currency}
          exchangeRate={trip.exchange_rate}
          color={trip.budget && estimado > trip.budget ? '#ef4444' : '#f59e0b'}
          hint={trip.budget
            ? estimado > trip.budget
              ? `${fmtCurrency(estimado - trip.budget, currency)} acima da estimativa`
              : `${fmtCurrency(trip.budget - estimado, currency)} abaixo da estimativa`
            : 'Melhor opção por categoria'}
        />
        <BudgetCard
          label="Comprometido"
          value={fechado}
          currency={currency}
          exchangeRate={trip.exchange_rate}
          color="#10b981"
          hint="Apenas categorias fechadas"
        />
      </div>

      {/* Grade de cobertura */}
      <CoverageGrid trip={trip} categories={categories} />

      {/* Documentos da Viagem */}
      <DocsSection
        trip={trip}
        categories={categories}
        onFolderUrlSave={updateTripNotionFolderUrl}
      />

      {/* Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {categories.map(cat => (
          <CategoryCard
            key={cat.id}
            category={cat}
            currency={currency}
            tripDestination={trip.destination}
            tripNumPeople={trip.num_people}
            onStatusChange={status => updateCategoryStatus(cat.id, status)}
            onAddOption={option => addOption(cat.id, option)}
            onOptionStatusChange={(optId, status) => updateOptionStatus(cat.id, optId, status)}
            onDeleteOption={optId => deleteOption(cat.id, optId)}
            numPeople={trip.num_people}
            onDelete={() => deleteCategory(cat.id)}
            onNotionUrlSave={url => updateCategoryNotionUrl(cat.id, url)}
            onUpdateOption={(optId, data) => updateOption(cat.id, optId, data)}
          />
        ))}
      </div>

      {/* Add category */}
      <button
        onClick={() => setShowNewCat(true)}
        style={{ ...btnDashed, marginTop: categories.length > 0 ? 14 : 0 }}
      >
        + Adicionar categoria
      </button>

      {/* Modal de resumo */}
      {showSummary && (
        <Modal title="Resumo da viagem" onClose={() => setShowSummary(false)}>
          {loadingSummary ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
              Gerando resumo com IA...
            </div>
          ) : (
            <div>
              <textarea
                readOnly
                value={summary}
                style={{
                  width: '100%',
                  minHeight: 320,
                  padding: 12,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  color: '#1e293b',
                  background: '#f8fafc',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(summary) }}
                style={{ ...btnPrimary, width: '100%', marginTop: 12 }}
              >
                Copiar para área de transferência
              </button>
            </div>
          )}
        </Modal>
      )}

      {showNewCat && (
        <Modal title="Nova categoria" onClose={() => setShowNewCat(false)}>
          <form onSubmit={addCategory} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Tipo">
              <select
                style={inputStyle}
                value={newCat.tipo}
                onChange={e => setNewCat(f => ({ ...f, tipo: e.target.value, name: '' }))}
              >
                {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
              </select>
            </Field>
            <Field label="Nome personalizado (opcional)">
              <input
                style={inputStyle}
                value={newCat.name}
                onChange={e => setNewCat(f => ({ ...f, name: e.target.value }))}
                placeholder={TIPO_LABELS[newCat.tipo]}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setShowNewCat(false)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      </div>
      </div>
    </div>
  )
}

function DocsSection({ trip, categories, onFolderUrlSave }) {
  const [collapsed, setCollapsed] = useState(false)
  const [folderUrl, setFolderUrl] = useState(trip.notion_folder_url ?? '')
  const [copied, setCopied] = useState(false)
  const closedWithDocs = categories.filter(c => c.status === 'fechado' && c.notion_url)
  const widgetUrl = trip.share_token
    ? `${window.location.origin}/api/trip-widget?token=${trip.share_token}`
    : null

  function copyWidgetUrl() {
    navigator.clipboard.writeText(widgetUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
      <div
        style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>📁 Documentos da Viagem</span>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>{collapsed ? '▼' : '▲'}</span>
      </div>
      {!collapsed && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Pasta no Notion */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 5 }}>
              Pasta no Notion
            </div>
            <input
              type="url"
              style={inputStyle}
              value={folderUrl}
              onChange={e => setFolderUrl(e.target.value)}
              onBlur={() => onFolderUrlSave(folderUrl || null)}
              placeholder="Cole o link da pasta no Notion..."
            />
            {folderUrl && (
              <a href={folderUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6', marginTop: 4, display: 'inline-block' }}>
                Abrir pasta ↗
              </a>
            )}
          </div>

          {/* Documentos por categoria */}
          {closedWithDocs.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>
                Documentos por categoria
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {closedWithDocs.map(cat => (
                  <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{cat.name}</span>
                    <a href={cat.notion_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 8 }}>
                      Ver documento ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {closedWithDocs.length === 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
              Documentos aparecerão aqui quando você fechar categorias e adicionar links do Notion.
            </div>
          )}

          {/* Widget Notion */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 5 }}>
              Widget de orçamento
            </div>
            {widgetUrl ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  readOnly
                  style={{ ...inputStyle, fontSize: 12, color: '#64748b', background: '#f8fafc', cursor: 'default' }}
                  value={widgetUrl}
                  onFocus={e => e.target.select()}
                />
                <button onClick={copyWidgetUrl} style={{ ...btnSecondary, whiteSpace: 'nowrap', padding: '8px 12px', fontSize: 12 }}>
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                Execute a migração SQL para habilitar o widget.
              </div>
            )}
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
              Cole no Notion como <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>/embed</code> — exibe o orçamento atualizado em tempo real.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BudgetCard({ label, value, currency, exchangeRate, color, hint }) {
  const showBrl = currency !== 'BRL' && exchangeRate > 1
  const brlValue = value * (exchangeRate || 1)
  return (
    <div style={{ background: '#fff', border: `2px solid ${color}30`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, margin: '6px 0 2px', color: '#1e293b' }}>
        {fmtCurrency(value, currency)}
      </div>
      {showBrl && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
          ≈ {fmtCurrency(brlValue, 'BRL')}
        </div>
      )}
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</span>
      {children}
    </label>
  )
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

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function fmtCurrency(val, currency) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(val)
  } catch {
    return `${currency} ${Number(val).toFixed(2)}`
  }
}

const inputStyle = {
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
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

const btnBack = {
  background: 'none',
  border: 'none',
  color: '#3b82f6',
  fontSize: 14,
  cursor: 'pointer',
  padding: 0,
  fontWeight: 500,
}

const btnSummary = {
  background: '#faf5ff',
  border: '1px solid #e9d5ff',
  borderRadius: 8,
  padding: '7px 14px',
  color: '#7c3aed',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

const btnDashed = {
  width: '100%',
  padding: 14,
  background: 'transparent',
  border: '2px dashed #d1d5db',
  borderRadius: 12,
  color: '#64748b',
  fontSize: 14,
  cursor: 'pointer',
  fontWeight: 500,
}
