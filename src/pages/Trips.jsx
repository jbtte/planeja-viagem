import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { TIPO_LABELS } from '../lib/categoryConfig'

const CURRENCIES = ['BRL', 'USD', 'EUR', 'ARS', 'CLP', 'PEN', 'COP', 'GBP']

// Categorias pré-selecionadas por padrão
const DEFAULT_CATEGORIAS = ['passagens', 'hotel', 'gastos_diarios']

const EMPTY_FORM = {
  destination: '',
  start_date: '',
  end_date: '',
  num_people: 2,
  currency: 'BRL',
  exchange_rate: 1,
  notes: '',
}

export default function Trips() {
  const [trips, setTrips] = useState([])
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState(DEFAULT_CATEGORIAS)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      const { data } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false })
      setTrips(data ?? [])
    }
    load()
  }, [])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleCategoria(tipo) {
    setCategoriasSelecionadas(prev =>
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    )
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)

    const { data: trip, error } = await supabase
      .from('trips')
      .insert([{ ...form, user_id: user.id, exchange_rate: Number(form.exchange_rate) || 1 }])
      .select()
      .single()

    if (error) { setSaving(false); return }

    // Cria as categorias selecionadas de uma vez
    if (categoriasSelecionadas.length > 0) {
      await supabase.from('categories').insert(
        categoriasSelecionadas.map((tipo, i) => ({
          trip_id: trip.id,
          tipo,
          name: TIPO_LABELS[tipo],
          sort_order: i,
        }))
      )
    }

    setSaving(false)
    navigate(`/trip/${trip.id}`)
  }

  async function handleDelete(e, tripId) {
    e.stopPropagation()
    if (!confirm('Deletar essa viagem? Essa ação não pode ser desfeita.')) return
    await supabase.from('trips').delete().eq('id', tripId)
    setTrips(t => t.filter(tr => tr.id !== tripId))
  }

  function openModal() {
    setForm(EMPTY_FORM)
    setCategoriasSelecionadas(DEFAULT_CATEGORIAS)
    setShowModal(true)
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Minhas Viagens</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user && (
            <span style={{ fontSize: 13, color: '#64748b', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.user_metadata?.name ?? user.email}
            </span>
          )}
          <button onClick={() => supabase.auth.signOut()} style={btnSecondary}>Sair</button>
        </div>
      </div>

      <button onClick={openModal} style={{ ...btnPrimary, width: '100%', marginBottom: 20 }}>
        + Nova viagem
      </button>

      {trips.length === 0 && (
        <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: 48 }}>
          Nenhuma viagem ainda. Crie a primeira!
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trips.map(trip => (
          <div key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} style={tripCard}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{trip.destination}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                {trip.start_date && trip.end_date
                  ? `${fmtDate(trip.start_date)} – ${fmtDate(trip.end_date)}`
                  : 'Datas a definir'}
                {' · '}{trip.num_people} pessoa{trip.num_people !== 1 ? 's' : ''}
                {' · '}{trip.currency}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={e => handleDelete(e, trip.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: 16, padding: '4px 6px' }}
                title="Deletar viagem"
              >
                🗑
              </button>
              <span style={{ fontSize: 20, color: '#cbd5e1' }}>›</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title="Nova viagem" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Destino *">
              <input
                style={inputStyle}
                value={form.destination}
                onChange={e => set('destination', e.target.value)}
                placeholder="Ex: Lisboa, Portugal"
                required
                autoFocus
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Data de ida">
                <input type="date" style={inputStyle} value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              </Field>
              <Field label="Data de volta">
                <input type="date" style={inputStyle} value={form.end_date} onChange={e => set('end_date', e.target.value)} />
              </Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Nº de pessoas">
                <input type="number" min="1" style={inputStyle} value={form.num_people} onChange={e => set('num_people', Number(e.target.value))} />
              </Field>
              <Field label="Moeda">
                <select style={inputStyle} value={form.currency} onChange={e => set('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>

            {form.currency !== 'BRL' && (
              <Field label={`Cotação (1 ${form.currency} = ? BRL)`}>
                <input
                  type="number"
                  step="0.0001"
                  style={inputStyle}
                  value={form.exchange_rate}
                  onChange={e => set('exchange_rate', e.target.value)}
                  placeholder="Ex: 5.80"
                />
              </Field>
            )}

            <Field label="Observações">
              <textarea
                style={{ ...inputStyle, minHeight: 56, resize: 'vertical' }}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Motivação da viagem, contexto..."
              />
            </Field>

            {/* Seleção de categorias */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
                Categorias para começar
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(TIPO_LABELS).map(([tipo, label]) => {
                  const ativo = categoriasSelecionadas.includes(tipo)
                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => toggleCategoria(tipo)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        border: `1.5px solid ${ativo ? '#3b82f6' : '#e2e8f0'}`,
                        background: ativo ? '#eff6ff' : '#f8fafc',
                        color: ativo ? '#1d4ed8' : '#64748b',
                        transition: 'all 0.15s',
                      }}
                    >
                      {ativo ? '✓ ' : ''}{label}
                    </button>
                  )
                })}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                Você pode adicionar ou remover categorias depois.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
                {saving ? 'Criando...' : 'Criar viagem'}
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
      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{label}</span>
      {children}
    </label>
  )
}

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
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

const tripCard = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: '14px 18px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
}
