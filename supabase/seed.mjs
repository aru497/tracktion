#!/usr/bin/env node
/* Tracktion — push the catalog (retailers, vehicles, categories, parts, offers,
 * tracks, reviews) from the app's single source of truth (assets/js/data.js)
 * into Supabase. Run once after applying schema.sql.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/seed.mjs
 *
 * Uses the SERVICE ROLE key (bypasses RLS) — run locally / in CI only, never ship it.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const sb = createClient(URL, KEY, { auth: { persistSession: false } });

// load window.DB from the browser data file without a browser
const __dir = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dir, '..', 'assets', 'js', 'data.js'), 'utf8');
const sandbox = { window: {} };
new Function('window', src)(sandbox.window);
const DB = sandbox.window.DB;

async function up(table, rows, onConflict) {
  const { error } = await sb.from(table).upsert(rows, onConflict ? { onConflict } : undefined);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ✓ ${table}: ${rows.length}`);
}

const run = async () => {
  await up('retailers', DB.retailers.map(r => ({ id: r.id, name: r.name, url: r.url, ship: r.ship, rating: r.rating, affiliate: r.affiliate })));
  await up('vehicles', DB.vehicles.map(v => ({ fit_key: v.fitKey, make: v.make, model: v.model, years: v.years, variants: v.variants })));
  await up('categories', DB.categories.map(c => ({ id: c.id, name: c.name, glyph: c.glyph, blurb: c.blurb })));
  await up('parts', DB.parts.map(p => ({
    id: p.id, name: p.name, brand: p.brand, category: p.category,
    fit: p.fit === 'universal' ? ['universal'] : p.fit, blurb: p.blurb, rating: p.rating, reviews: p.reviews
  })));

  // offers (flatten) — clear then insert so removed retailers drop off
  const offers = DB.parts.flatMap(p => p.offers.map(o => ({
    part_id: p.id, retailer_id: o.retailer, price: o.price, club_price: o.club,
    stock: o.stock, shipping: o.shipping, url: o.url
  })));
  await up('offers', offers, 'part_id,retailer_id');

  const reviews = DB.parts.flatMap(p => (p._reviews || []).map(r => ({
    part_id: p.id, user_name: r.user, vehicle: r.vehicle, stars: r.stars, body: r.body
  })));
  if (reviews.length) { const { error } = await sb.from('part_reviews').insert(reviews); if (error) console.warn('reviews:', error.message); else console.log(`  ✓ part_reviews: ${reviews.length}`); }

  await up('tracks', DB.tracks.map(t => ({
    id: t.id, name: t.name, region: t.region, state: t.state, lat: t.lat, lng: t.lng,
    difficulty: t.difficulty, type: t.type, length_km: t.lengthKm, hours: t.hours,
    permit: t.permit, dog: t.dog, blurb: t.blurb, needs: t.needs, season: t.season
  })));

  console.log('\nCatalog seeded.');
};
run().catch(e => { console.error(e); process.exit(1); });
