#!/bin/bash

set -e

echo "🗺️  Criando estrutura do planeja-viagem..."

# Diretórios
mkdir -p src/pages
mkdir -p src/components
mkdir -p src/lib
mkdir -p supabase

# src/App.jsx — roteamento
cat > src/App.jsx << 'EOF'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Trips from './pages/Trips'
import Trip from './pages/Trip'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={session ? <Trips /> : <Navigate to="/login" />} />
        <Route path="/trip/:id" element={session ? <Trip /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}
EOF

# src/pages/Login.jsx — tela de login Google
cat > src/pages/Login.jsx << 'EOF'
import { supabase } from '../lib/supabase'

export default function Login() {
  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>Planeja Viagem</h1>
      <button onClick={handleGoogleLogin}>Entrar com Google</button>
    </div>
  )
}
EOF

# src/pages/Trips.jsx — lista de viagens
cat > src/pages/Trips.jsx << 'EOF'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Trips() {
  const [trips, setTrips] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setTrips(data ?? [])
    }
    load()
  }, [])

  return (
    <div>
      <h1>Minhas Viagens</h1>
      <ul>
        {trips.map((trip) => (
          <li key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} style={{ cursor: 'pointer' }}>
            {trip.destination} — {trip.start_date} a {trip.end_date}
          </li>
        ))}
      </ul>
    </div>
  )
}
EOF

# src/pages/Trip.jsx — detalhe da viagem
cat > src/pages/Trip.jsx << 'EOF'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import CategoryCard from '../components/CategoryCard'

export default function Trip() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [categories, setCategories] = useState([])

  useEffect(() => {
    async function load() {
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', id).single()
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*, options(*)')
        .eq('trip_id', id)
        .order('order')
      setTrip(tripData)
      setCategories(categoriesData ?? [])
    }
    load()
  }, [id])

  if (!trip) return <p>Carregando...</p>

  return (
    <div>
      <h1>{trip.destination}</h1>
      <p>{trip.start_date} – {trip.end_date}</p>
      {categories.map((cat) => (
        <CategoryCard key={cat.id} category={cat} />
      ))}
    </div>
  )
}
EOF

# src/components/CategoryCard.jsx
cat > src/components/CategoryCard.jsx << 'EOF'
import OptionRow from './OptionRow'

export default function CategoryCard({ category }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <h2>{category.name}</h2>
      {category.options?.map((option) => (
        <OptionRow key={option.id} option={option} />
      ))}
    </div>
  )
}
EOF

# src/components/OptionRow.jsx
cat > src/components/OptionRow.jsx << 'EOF'
export default function OptionRow({ option }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
      <span>{option.name}</span>
      {option.price && <span>{option.price}</span>}
      {option.url && <a href={option.url} target="_blank" rel="noreferrer">Ver</a>}
    </div>
  )
}
EOF

# src/lib/supabase.js — cliente Supabase
cat > src/lib/supabase.js << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
EOF

# supabase/schema.sql — tudo que roda no Supabase
cat > supabase/schema.sql << 'EOF'
-- Habilita UUID
create extension if not exists "pgcrypto";

-- Viagens
create table trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null,
  destination text not null,
  start_date  date,
  end_date    date,
  created_at  timestamptz default now()
);

-- Categorias dentro de uma viagem (ex: voos, hotéis, passeios)
create table categories (
  id      uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade not null,
  name    text not null,
  "order" int default 0
);

-- Opções dentro de cada categoria
create table options (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade not null,
  name        text not null,
  price       text,
  url         text,
  notes       text,
  selected    boolean default false
);

-- RLS
alter table trips    enable row level security;
alter table categories enable row level security;
alter table options  enable row level security;

create policy "owner" on trips    using (auth.uid() = user_id);
create policy "owner" on categories using (
  exists (select 1 from trips where trips.id = categories.trip_id and trips.user_id = auth.uid())
);
create policy "owner" on options using (
  exists (
    select 1 from categories
    join trips on trips.id = categories.trip_id
    where categories.id = options.category_id and trips.user_id = auth.uid()
  )
);
EOF

# .env.example
cat > .env.example << 'EOF'
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
EOF

echo ""
echo "✅ Estrutura criada com sucesso!"
echo ""
echo "Próximos passos:"
echo "  1. cp .env.example .env  e preencha as variáveis"
echo "  2. npm create vite@latest . -- --template react  (se ainda não tiver o projeto)"
echo "  3. npm install @supabase/supabase-js react-router-dom"
echo "  4. Rode o schema.sql no painel do Supabase (SQL Editor)"
echo "  5. npm run dev"
