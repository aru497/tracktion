# Tracktion — Supabase backend

Turns the prototype into a real product: accounts, cloud garage, saved parts/tracks, and working price-drop alert emails. The frontend stays exactly the same — it only talks to `Store`; `Store` talks to `assets/js/backend.js`; that talks to Supabase.

**Offline by default.** With `assets/js/config.js` blank, the app runs 100% on localStorage (the prototype). Fill in the config and everything becomes real, no frontend rewrite.

## 1. Create the project & schema
1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → paste **`schema.sql`** → Run. This creates the catalog + user tables, the signup→profile trigger, and Row-Level Security (users can only ever read/write their own rows; the catalog is world-readable).

## 2. Seed the catalog
```bash
npm i @supabase/supabase-js
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role key> \
node supabase/seed.mjs
```
Reads `assets/js/data.js` (the single source of truth) and upserts retailers, vehicles, categories, parts, offers, tracks and reviews.

## 3. Turn it on in the app
Edit `assets/js/config.js`:
```js
window.TRACKTION_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "<anon public key>",     // safe to ship — RLS protects data
  oauth: { google: true, apple: true }
};
```
Reload. The login screen now uses real Supabase auth:
- **Email** → magic-link (OTP).
- **Google / Apple** → enable each provider under Auth → Providers first, and add your site URL to Auth → URL Configuration (redirect URLs).

## 4. Price-drop alert emails
The edge function `functions/check-price-alerts/` emails users when a watched part reaches their target.

```bash
supabase functions deploy check-price-alerts
supabase secrets set RESEND_API_KEY=re_xxx ALERT_FROM_EMAIL="Tracktion <alerts@yourdomain.com>"
```
Schedule it (Supabase Dashboard → Edge Functions → Schedules, or pg_cron):
```sql
select cron.schedule('tracktion-alerts', '0 * * * *',   -- hourly
  $$ select net.http_post(
       url:='https://xxxx.functions.supabase.co/check-price-alerts',
       headers:='{"Authorization":"Bearer <anon key>"}'::jsonb) $$);
```
Keep prices fresh by running `crawler/crawl.mjs` on a schedule too (it upserts `offers`).

## Community routes (moderation)
Users submit tracks via **Suggest a route** — stored in `track_suggestions` with `status = 'pending'`. RLS lets a user see their own submissions (any status) plus anyone's `approved` ones. To publish a suggestion:
```sql
-- review, then approve
update track_suggestions set status = 'approved' where id = '<uuid>';
-- optionally promote it into the public tracks catalog
insert into tracks (id, name, region, state, lat, lng, difficulty, type, length_km, hours, permit, dog, blurb, needs, season)
select 'usr_'||left(id::text,8), name, region, state, lat, lng, difficulty, type, length_km, hours, permit, dog, blurb, needs, season
from track_suggestions where id = '<uuid>';
```

## Google sign-in (the primary path)
The login screen leads with **Continue with Google**. Enable it in Supabase → Auth → Providers → Google (add your OAuth client ID/secret from Google Cloud), then add your site + Vercel URLs under Auth → URL Configuration → Redirect URLs. Apple and email magic-link are the fallbacks.

## Data model (RLS summary)
| Table | Read | Write |
|---|---|---|
| `retailers, vehicles, categories, parts, offers, tracks` | everyone | service role (seed/crawler) |
| `part_reviews` | everyone | signed-in users write their own |
| `profiles, garage_vehicles, price_alerts, saved_parts, saved_tracks` | owner only | owner only |

Profiles are auto-created on signup by the `on_auth_user_created` trigger.
