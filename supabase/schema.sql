-- ============================================================================
-- Tracktion — Supabase schema
-- Run in the Supabase SQL editor (or: supabase db push). Idempotent-ish.
-- Tables split into:
--   * CATALOG (public, read-only): retailers, vehicles, categories, parts,
--     offers, tracks — the shared data everyone sees.
--   * USER DATA (per-user, RLS-protected): profiles, garage_vehicles,
--     price_alerts, saved_parts, saved_tracks.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- CATALOG
-- ---------------------------------------------------------------------------
create table if not exists retailers (
  id          text primary key,
  name        text not null,
  url         text not null,
  ship        text,
  rating      numeric(2,1),
  affiliate   boolean default false
);

create table if not exists vehicles (
  fit_key   text primary key,
  make      text not null,
  model     text not null,
  years     text,
  variants  text[] default '{}'
);

create table if not exists categories (
  id     text primary key,
  name   text not null,
  glyph  text,
  blurb  text
);

create table if not exists parts (
  id          text primary key,
  name        text not null,
  brand       text,
  category    text references categories(id),
  fit         text[] default '{}',          -- ['universal'] or list of vehicles.fit_key
  blurb       text,
  rating      numeric(2,1) default 0,
  reviews     int default 0,
  created_at  timestamptz default now()
);
create index if not exists parts_category_idx on parts(category);

-- current best-known price per (part, retailer). The crawler upserts here.
create table if not exists offers (
  id           uuid primary key default gen_random_uuid(),
  part_id      text references parts(id) on delete cascade,
  retailer_id  text references retailers(id),
  price        numeric(10,2) not null,
  club_price   numeric(10,2),
  stock        text default 'in',           -- in | low | out
  shipping     numeric(10,2) default 0,
  url          text,
  crawled_at   timestamptz default now(),
  unique (part_id, retailer_id)
);
create index if not exists offers_part_idx on offers(part_id);

create table if not exists part_reviews (
  id          uuid primary key default gen_random_uuid(),
  part_id     text references parts(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  user_name   text,
  vehicle     text,
  stars       int check (stars between 1 and 5),
  body        text,
  created_at  timestamptz default now()
);
create index if not exists part_reviews_part_idx on part_reviews(part_id);

create table if not exists tracks (
  id          text primary key,
  name        text not null,
  region      text,
  state       text,
  lat         double precision not null,
  lng         double precision not null,
  difficulty  text,                          -- easy | medium | hard | extreme
  type        text,                          -- beach | mountain | desert | forest | river
  length_km   int,
  hours       numeric(4,1),
  permit      boolean default false,
  dog         boolean default false,
  blurb       text,
  needs       text[] default '{}',
  season      text
);

-- ---------------------------------------------------------------------------
-- USER DATA
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text,
  created_at  timestamptz default now()
);

create table if not exists garage_vehicles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  fit_key     text references vehicles(fit_key),
  make        text,
  model       text,
  variant     text,
  years       text,
  is_active   boolean default false,
  created_at  timestamptz default now()
);
create index if not exists garage_user_idx on garage_vehicles(user_id);

create table if not exists price_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  part_id     text references parts(id) on delete cascade,
  target      numeric(10,2) not null,
  baseline    numeric(10,2),                 -- price when the alert was set
  triggered   boolean default false,
  triggered_at timestamptz,
  notified    boolean default false,         -- email sent?
  created_at  timestamptz default now(),
  unique (user_id, part_id)
);
create index if not exists alerts_open_idx on price_alerts(part_id) where triggered = false;

create table if not exists saved_parts (
  user_id  uuid not null references auth.users(id) on delete cascade,
  part_id  text references parts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, part_id)
);

create table if not exists saved_tracks (
  user_id   uuid not null references auth.users(id) on delete cascade,
  track_id  text references tracks(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, track_id)
);

-- community-submitted routes (moderated before they go public)
create table if not exists track_suggestions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  region      text,
  state       text,
  lat         double precision,
  lng         double precision,
  difficulty  text,
  type        text,
  length_km   int,
  hours       numeric(4,1),
  blurb       text,
  needs       text[] default '{}',
  season      text,
  permit      boolean default false,
  dog         boolean default false,
  status      text default 'pending',   -- pending | approved | rejected
  created_at  timestamptz default now()
);
create index if not exists suggestions_user_idx on track_suggestions(user_id);
create index if not exists suggestions_approved_idx on track_suggestions(status) where status = 'approved';

-- ---------------------------------------------------------------------------
-- Auto-create a profile row on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Catalog: readable by everyone (including anon), writable only by service role.
alter table retailers   enable row level security;
alter table vehicles    enable row level security;
alter table categories  enable row level security;
alter table parts       enable row level security;
alter table offers      enable row level security;
alter table tracks      enable row level security;
alter table part_reviews enable row level security;

do $$
declare t text;
begin
  foreach t in array array['retailers','vehicles','categories','parts','offers','tracks'] loop
    execute format('drop policy if exists "read %1$s" on %1$s', t);
    execute format('create policy "read %1$s" on %1$s for select using (true)', t);
  end loop;
end $$;

-- Reviews: anyone can read; authenticated users write their own.
drop policy if exists "read reviews" on part_reviews;
create policy "read reviews" on part_reviews for select using (true);
drop policy if exists "write own reviews" on part_reviews;
create policy "write own reviews" on part_reviews for insert with check (auth.uid() = user_id);
drop policy if exists "edit own reviews" on part_reviews;
create policy "edit own reviews" on part_reviews for update using (auth.uid() = user_id);
drop policy if exists "delete own reviews" on part_reviews;
create policy "delete own reviews" on part_reviews for delete using (auth.uid() = user_id);

-- User data: each user sees and writes only their own rows.
alter table profiles         enable row level security;
alter table garage_vehicles  enable row level security;
alter table price_alerts     enable row level security;
alter table saved_parts      enable row level security;
alter table saved_tracks     enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['garage_vehicles','price_alerts','saved_parts','saved_tracks'] loop
    execute format('drop policy if exists "own rows %1$s" on %1$s', t);
    execute format('create policy "own rows %1$s" on %1$s using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Suggestions: anyone can read APPROVED routes; users read + write their own.
alter table track_suggestions enable row level security;
drop policy if exists "read own or approved" on track_suggestions;
create policy "read own or approved" on track_suggestions for select
  using (auth.uid() = user_id or status = 'approved');
drop policy if exists "insert own suggestion" on track_suggestions;
create policy "insert own suggestion" on track_suggestions for insert with check (auth.uid() = user_id);
drop policy if exists "delete own suggestion" on track_suggestions;
create policy "delete own suggestion" on track_suggestions for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Convenience view: a part with its lowest current price (for lists)
-- ---------------------------------------------------------------------------
create or replace view parts_with_best as
  select p.*,
         (select min(coalesce(o.club_price, o.price)) from offers o where o.part_id = p.id) as best_price,
         (select count(*) from offers o where o.part_id = p.id) as offer_count
  from parts p;
