-- ============================================================================
-- 4WDScout — invite-only scouts (run AFTER schema2_social.sql)
-- Adds the invite_only flag and a join-request queue so private convoys
-- survive server resyncs instead of silently becoming public.
-- ============================================================================

alter table scouts add column if not exists invite_only boolean default false;

create table if not exists scout_requests (
  scout_id    uuid not null references scouts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  member_name text,
  requested_at timestamptz default now(),
  primary key (scout_id, user_id)
);

alter table scout_requests enable row level security;

-- anyone signed-in can see requests (hosts render the queue; requesters see "Requested")
drop policy if exists "read requests" on scout_requests;
create policy "read requests" on scout_requests for select using (true);

-- you may only request for yourself
drop policy if exists "request self" on scout_requests;
create policy "request self" on scout_requests for insert with check (auth.uid() = user_id);

-- a requester can withdraw; the scout's host can clear (approve/deny)
drop policy if exists "withdraw or host clears" on scout_requests;
create policy "withdraw or host clears" on scout_requests for delete
  using (auth.uid() = user_id or auth.uid() = (select host_id from scouts where id = scout_id));

-- approval also inserts into scout_members on the member's behalf — allow the host
drop policy if exists "host adds approved member" on scout_members;
create policy "host adds approved member" on scout_members for insert
  with check (auth.uid() = user_id or auth.uid() = (select host_id from scouts where id = scout_id));
