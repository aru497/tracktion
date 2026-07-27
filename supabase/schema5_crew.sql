-- ============================================================================
-- 4WDScout — crew & profile photos (run AFTER schema4_scouts.sql)
-- 1) Google DPs: store each user's avatar on their profile, expose a safe
--    public directory (name + photo only — never email/prefs).
-- 2) Host-added guests: the organiser can put mates on the crew list even if
--    they're not app users yet.
-- ============================================================================

-- profile photos ------------------------------------------------------------
alter table profiles add column if not exists avatar_url text;

-- keep the signup trigger writing the avatar for new users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
          new.email,
          coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
  on conflict (id) do update set avatar_url = excluded.avatar_url;
  return new;
end $$;

-- backfill avatars for existing users (e.g. accounts that signed in with Google)
update profiles p
set avatar_url = coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
where p.id = u.id and p.avatar_url is null;

-- safe public directory: name + photo only (view runs as owner, bypassing the
-- own-profile RLS, so it must never include email/prefs)
create or replace view public_profiles as
  select id, name, avatar_url from profiles;
grant select on public_profiles to anon, authenticated;

-- host-added guests ----------------------------------------------------------
create table if not exists scout_guests (
  scout_id    uuid not null references scouts(id) on delete cascade,
  member_name text not null,
  added_by    uuid not null references auth.users(id) on delete cascade,
  added_at    timestamptz default now(),
  primary key (scout_id, member_name)
);

alter table scout_guests enable row level security;

drop policy if exists "read guests" on scout_guests;
create policy "read guests" on scout_guests for select using (true);

-- only the scout's host can add or remove guests
drop policy if exists "host adds guests" on scout_guests;
create policy "host adds guests" on scout_guests for insert
  with check (auth.uid() = (select host_id from scouts where id = scout_id));

drop policy if exists "host removes guests" on scout_guests;
create policy "host removes guests" on scout_guests for delete
  using (auth.uid() = (select host_id from scouts where id = scout_id));
