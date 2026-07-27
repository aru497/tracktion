-- ============================================================================
-- 4WDScout — engagement layer (run AFTER schema2_social.sql)
-- Kudos (likes) + comments on community posts.
-- ============================================================================

create table if not exists post_likes (
  post_id     uuid not null references community_posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  user_name   text,
  created_at  timestamptz default now(),
  primary key (post_id, user_id)
);

create table if not exists post_comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references community_posts(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author      text,
  body        text not null,
  created_at  timestamptz default now()
);
create index if not exists comments_post_idx on post_comments(post_id);

alter table post_likes enable row level security;
drop policy if exists "read likes" on post_likes;
create policy "read likes" on post_likes for select using (true);
drop policy if exists "like self" on post_likes;
create policy "like self" on post_likes for insert with check (auth.uid() = user_id);
drop policy if exists "unlike self" on post_likes;
create policy "unlike self" on post_likes for delete using (auth.uid() = user_id);

alter table post_comments enable row level security;
drop policy if exists "read comments" on post_comments;
create policy "read comments" on post_comments for select using (true);
drop policy if exists "comment self" on post_comments;
create policy "comment self" on post_comments for insert with check (auth.uid() = user_id);
drop policy if exists "delete own comment" on post_comments;
create policy "delete own comment" on post_comments for delete using (auth.uid() = user_id);
