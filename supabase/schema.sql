-- ============================================================
-- planeja-viagem — schema completo
-- ============================================================

create extension if not exists "pgcrypto";

-- Enum: tipos de categoria
create type category_tipo as enum (
  'passagens',
  'hotel',
  'carro',
  'passeios',
  'seguro',
  'translados',
  'gastos_diarios',
  'restaurantes'
);

-- Enum: status da categoria
create type category_status as enum (
  'pesquisando',
  'fechado',
  'descartado'
);

-- Enum: status de uma opção
create type option_status as enum (
  'em_pesquisa',
  'selecionado',
  'descartado'
);

-- ============================================================
-- Tabela: trips
-- ============================================================
create table trips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  destination   text not null,
  start_date    date,
  end_date      date,
  num_people    int not null default 1,
  currency      text not null default 'BRL',
  exchange_rate numeric(10,4) default 1,
  notes         text,
  created_at    timestamptz default now()
);

-- ============================================================
-- Tabela: categories
-- ============================================================
create table categories (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid references trips(id) on delete cascade not null,
  tipo        category_tipo not null,
  name        text not null,
  status      category_status not null default 'pesquisando',
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- ============================================================
-- Tabela: options
-- ============================================================
-- campos jsonb por tipo:
--   passagens:     { cia, voo, escala, duracao, bagagem }
--   hotel:         { estrelas, cafe_manha, bairro, regime }
--   carro:         { categoria, transmissao, cobertura, dias }
--   passeios:      { duracao_horas, inclui_transporte, idioma }
--   seguro:        { cobertura_medica, cobertura_bagagem, franquia }
--   translados:    { tipo, percurso }
--   restaurantes:  { tipo_cozinha, preco_medio_pessoa }
--   gastos_diarios:{ por_dia, num_dias }
create table options (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid references categories(id) on delete cascade not null,
  name          text not null,
  value         numeric(12,2),
  status        option_status not null default 'em_pesquisa',
  campos        jsonb default '{}',
  url           text,
  notes         text,
  created_at    timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table trips      enable row level security;
alter table categories enable row level security;
alter table options    enable row level security;

create policy "trips_owner" on trips
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "categories_owner" on categories
  using (
    exists (
      select 1 from trips
      where trips.id = categories.trip_id
        and trips.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from trips
      where trips.id = categories.trip_id
        and trips.user_id = auth.uid()
    )
  );

create policy "options_owner" on options
  using (
    exists (
      select 1 from categories
      join trips on trips.id = categories.trip_id
      where categories.id = options.category_id
        and trips.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from categories
      join trips on trips.id = categories.trip_id
      where categories.id = options.category_id
        and trips.user_id = auth.uid()
    )
  );
