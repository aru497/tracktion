-- ============================================================================
-- 4WDScout — social layer (run AFTER schema.sql)
-- Community posts (warnings/conditions/trips), Scouts (events/convoys),
-- and rider preferences for track matching.
-- ============================================================================

-- preferences live on the profile (types[], maxDiff, range km)
alter table profiles add column if not exists prefs jsonb;

-- ---------------------------------------------------------------------------
-- Community posts
-- ---------------------------------------------------------------------------
create table if not exists community_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  author      text,
  vehicle     text,
  type        text default 'trip',        -- warning | condition | trip
  body        text not null,
  track_id    text references tracks(id) on delete set null,
  lat         double precision,
  lng         double precision,
  label       text,
  created_at  timestamptz default now()
);
create index if not exists posts_created_idx on community_posts(created_at desc);
create index if not exists posts_track_idx on community_posts(track_id);

alter table community_posts enable row level security;
drop policy if exists "read posts" on community_posts;
create policy "read posts" on community_posts for select using (true);
drop policy if exists "write own posts" on community_posts;
create policy "write own posts" on community_posts for insert with check (auth.uid() = user_id);
drop policy if exists "delete own posts" on community_posts;
create policy "delete own posts" on community_posts for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Scouts (events / convoy runs)
-- ---------------------------------------------------------------------------
create table if not exists scouts (
  id          uuid primary key default gen_random_uuid(),
  host_id     uuid not null references auth.users(id) on delete cascade,
  host_name   text,
  title       text not null,
  track_id    text references tracks(id) on delete set null,
  date        date not null,
  capacity    int,
  notes       text,
  created_at  timestamptz default now()
);
create index if not exists scouts_date_idx on scouts(date);

create table if not exists scout_members (
  scout_id    uuid not null references scouts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  member_name text,
  joined_at   timestamptz default now(),
  primary key (scout_id, user_id)
);

alter table scouts enable row level security;
drop policy if exists "read scouts" on scouts;
create policy "read scouts" on scouts for select using (true);
drop policy if exists "host writes scouts" on scouts;
create policy "host writes scouts" on scouts for insert with check (auth.uid() = host_id);
drop policy if exists "host deletes scouts" on scouts;
create policy "host deletes scouts" on scouts for delete using (auth.uid() = host_id);

alter table scout_members enable row level security;
drop policy if exists "read members" on scout_members;
create policy "read members" on scout_members for select using (true);
drop policy if exists "join self" on scout_members;
create policy "join self" on scout_members for insert with check (auth.uid() = user_id);
drop policy if exists "leave self" on scout_members;
create policy "leave self" on scout_members for delete using (auth.uid() = user_id);
