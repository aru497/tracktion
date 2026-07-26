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
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const API = 'https://api.firecrawl.dev/v1/scrape';
const KEY = process.env.FIRECRAWL_API_KEY;
const __dir = dirname(fileURLToPath(import.meta.url));

// Each entry: a product + the retailer product URLs to price-check.
// Populate `url` with the real product page on each retailer.
const WATCHLIST = [
  {
    id: 'maxtrax-mkii',
    name: 'MAXTRAX MKII Recovery Boards (pair)',
    sources: [
      { retailer: 'maxtrax',    url: 'https://maxtrax.com.au/products/maxtrax-mkii-black' },
      { retailer: 'bcf',        url: 'https://www.bcf.com.au/p/maxtrax-mkii-recovery-boards/592031.html' },
      { retailer: 'supercheap', url: 'https://www.supercheapauto.com.au/brands/maxtrax' },
      { retailer: 'outback',    url: 'https://www.outbackequipment.com.au/brand/maxtrax/' }
    ]
  },
  {
    id: 'ome-bp51-lc300',
    name: 'Old Man Emu BP-51 Suspension Kit — LC300',
    sources: [
      { retailer: 'arb', url: 'https://www.arb.com.au/product/ekbp00174-old-man-emu-bp-51-suspension-kit-toyota-landcruiser-300-series' }
    ]
  }
  // ...add the rest of your catalogue here.
];

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
        if (j?.price) {
          offers.push({ retailer: src.retailer, price: j.price, club: j.memberPrice ?? null,
            stock: j.inStock === false ? 'out' : 'in', url: src.url });
          console.log(`  ✓ ${p.id} @ ${src.retailer}: $${j.price}${j.memberPrice ? ` (member $${j.memberPrice})` : ''}`);
        } else {
          console.warn(`  – ${p.id} @ ${src.retailer}: no price found`);
        }
      } catch (e) {
        console.warn(`  ! ${p.id} @ ${src.retailer}: ${e.message}`);
      }
    }
    out.push({ id: p.id, name: p.name, offers, crawledAt: new Date().toISOString() });
  }
  const file = join(__dir, '..', 'data', 'parts.crawled.json');
  await writeFile(file, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${out.length} products → ${file}`);
  console.log('Review, then merge the offers into assets/js/data.js.');
}

run().catch(e => { console.error(e); process.exit(1); });
