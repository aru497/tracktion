#!/usr/bin/env node
/* Tracktion price crawler
 * -----------------------------------------------------------------------
 * Refreshes real product prices from AU 4WD retailers using the Firecrawl
 * API (the same engine used to seed the app). Writes data/parts.crawled.json
 * which you can diff into assets/js/data.js.
 *
 * WHY Firecrawl and not raw fetch: every retailer renders prices differently
 * (Shopify, Magento, BigCommerce, custom). Firecrawl's `json` extraction lets
 * us describe the price we want in plain language and get structured output,
 * so one script handles all of them without a bespoke parser per site.
 *
 * Usage:
 *   FIRECRAWL_API_KEY=fc-xxxx node crawler/crawl.mjs
 *
 * Add products to WATCHLIST below (name + a search query per retailer, OR a
 * direct product URL). Prices come back in AUD.
 * -----------------------------------------------------------------------
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://api.firecrawl.dev/v1/scrape';
const KEY = process.env.FIRECRAWL_API_KEY;
const __dir = dirname(fileURLToPath(import.meta.url));

// The watchlist is generated from the app catalogue (assets/js/data.js):
// every part × every retailer offer URL. Add products to data.js (or replace
// an offer's url with a direct product page for a sharper hit) and the crawler
// picks them up automatically — no separate list to maintain.
function loadWatchlist() {
  const src = readFileSync(join(__dir, '..', 'assets', 'js', 'data.js'), 'utf8');
  const win = {};
  new Function('window', src)(win);
  return win.DB.parts.map(p => ({
    id: p.id,
    name: p.name,
    sources: p.offers.map(o => ({ retailer: o.retailer, url: o.url, seedPrice: o.price }))
  }));
}
const WATCHLIST = loadWatchlist();

// Sanity guard: many seed URLs are brand/landing pages, where extraction can
// grab the WRONG product's price. Only accept a crawled price within ±60% of
// the last known price; otherwise mark it suspect and keep the old price.
const sane = (crawled, seed) => !seed || (crawled >= seed * 0.4 && crawled <= seed * 1.6);

const PRICE_SCHEMA = {
  type: 'object',
  properties: {
    price:       { type: 'number', description: 'Current selling price in AUD, numeric only' },
    memberPrice: { type: 'number', description: 'Club/member price in AUD if shown, else omit' },
    inStock:     { type: 'boolean', description: 'True if purchasable now' },
    currency:    { type: 'string' }
  },
  required: ['price']
};

async function scrapePrice(url) {
  if (!KEY) throw new Error('Set FIRECRAWL_API_KEY');
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      url,
      formats: ['json'],
      onlyMainContent: true,
      waitFor: 3500,
      location: { country: 'AU' },
      jsonOptions: { schema: PRICE_SCHEMA, prompt: 'Extract the current AUD price for the main product on this page.' }
    })
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const data = await res.json();
  return data?.data?.json ?? null;
}

async function run() {
  const out = [];
  for (const p of WATCHLIST) {
    const offers = [];
    for (const src of p.sources) {
      try {
        const j = await scrapePrice(src.url);
        if (j?.price && sane(j.price, src.seedPrice)) {
          offers.push({ retailer: src.retailer, price: j.price, club: j.memberPrice ?? null,
            stock: j.inStock === false ? 'out' : 'in', url: src.url });
          console.log(`  ✓ ${p.id} @ ${src.retailer}: $${j.price}${j.memberPrice ? ` (member $${j.memberPrice})` : ''}`);
        } else if (j?.price) {
          console.warn(`  ~ ${p.id} @ ${src.retailer}: $${j.price} rejected (seed $${src.seedPrice} — likely wrong product on a landing page)`);
        } else {
          console.warn(`  – ${p.id} @ ${src.retailer}: no price found`);
        }
      } catch (e) {
        console.warn(`  ! ${p.id} @ ${src.retailer}: ${e.message}`);
      }
    }
    out.push({ id: p.id, name: p.name, offers, crawledAt: new Date().toISOString() });
  }
  const dir = join(__dir, '..', 'data');
  await mkdir(dir, { recursive: true });
  const file = join(dir, 'parts.crawled.json');
  await writeFile(file, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${out.length} products → ${file}`);

  // --push: upsert crawled offers straight into Supabase (used by CI cron)
  if (process.argv.includes('--push')) {
    const SB_URL = process.env.SUPABASE_URL, SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SB_URL || !SB_KEY) { console.error('Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for --push'); process.exit(1); }
    const rows = out.flatMap(p => p.offers.map(o => ({
      part_id: p.id, retailer_id: o.retailer, price: o.price, club_price: o.club,
      stock: o.stock, url: o.url, crawled_at: p.crawledAt
    })));
    if (rows.length) {
      const res = await fetch(`${SB_URL}/rest/v1/offers?on_conflict=part_id,retailer_id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
          Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(rows)
      });
      console.log(`Supabase upsert: ${res.status} (${rows.length} offers)`);
    } else console.log('No offers to push.');
  } else {
    console.log('Review, then merge into assets/js/data.js — or run with --push to update Supabase.');
  }
}

run().catch(e => { console.error(e); process.exit(1); });
