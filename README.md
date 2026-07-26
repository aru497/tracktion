# 4WDScout

**Compare 4WD parts across every Aussie retailer by your exact rig — then find the best tracks near you.** Free.

*(The repo/folder is named `tracktion` for deploy stability; the product brand is **4WDScout**.)*

A zero-dependency, install-nothing web app (plus Leaflet for the map). Built from a real user survey of NSW 4WD owners.

## What the survey told us (and how the app answers it)

The #1 pain wasn't price — it was **fitment confusion** ("VIN lookup doesn't bring up the right car", "too much confusing info"). So fitment is the spine of the app:

| Survey signal | Feature |
|---|---|
| Fitment confusion (top pain) | **Garage** → add your exact rig → every part shows *Fits your rig / Not your rig / Check fitment* |
| Live price comparison (top ask) | **Part page** ranks all retailers, flags the best price, shows member prices + shipping |
| Price-drop alerts (top ask) | Set a target on any part; watch + trigger from the Garage |
| Community part reviews | Owner reviews tagged with the reviewer's vehicle |
| Trail difficulty ratings | **Tracks** map, colour-coded easy→extreme, sorted by distance from you |
| Find tracks (word-of-mouth today) | Location-aware map of real AU tracks with what-you'll-need + directions |

## Run it

```bash
cd Tracktion
python3 -m http.server 4173
# open http://localhost:4173
```

Any static server works. It needs `http://` (not `file://`) so the map tiles and geolocation load.

## Architecture

```
index.html            app shell (loads Leaflet + scripts, no build step)
assets/css/app.css    design system — warm editorial minimalism + rugged topo accent
assets/js/
  data.js             seed data (retailers, vehicles, parts, tracks) → window.DB
  ui.js               inline SVG icons, toast, bottom-sheet, scroll-reveal
  store.js            state + localStorage (auth, garage, alerts, saved, location)
  views.js            every screen (home, parts, part, tracks, track, garage, auth)
  app.js              hash router, nav chrome, Leaflet map, geolocation, bootstrap
crawler/crawl.mjs     Firecrawl-based price crawler → data/parts.crawled.json
```

**Design language:** warm bone canvas, ink text, 1px borders, flat cards, editorial serif headings, a single *outback clay* accent, earthy difficulty colours, and a subtle topographic contour motif. No gradients on surfaces, no heavy shadows, no icon-library dependency (icons are hand-drawn inline SVG). Motion is IntersectionObserver reveals + subtle hovers, and respects `prefers-reduced-motion`.

## Data is real, seeded

- Retailers are the actual AU 4WD shops from the research doc.
- MAXTRAX MKII prices ($299–$319.99) were scraped live across maxtrax.com.au, BCF, Supercheap and Outback Equipment.
- OME BP-51 LC300 price ($5,038) is the live ARB listing.
- Tracks are real Australian trails with real coordinates and difficulty (Watagans, Stockton, Yalwal/Danjera, Barrington Tops, Simpson Desert French Line, Old Telegraph Track, Billy Goat Bluff, K'gari, and more).

## Refreshing prices

```bash
FIRECRAWL_API_KEY=fc-xxxx node crawler/crawl.mjs
```

Add products to `WATCHLIST` in `crawler/crawl.mjs` (product URL per retailer). It writes `data/parts.crawled.json`; merge the offers into `assets/js/data.js`.

## Backend (real, config-gated)

A full **Supabase backend** ships in [`supabase/`](supabase/): Postgres schema + Row-Level Security, email/Google/Apple auth, cloud garage/alerts/saved items, a catalog seeder, and a price-alert email edge function. It's **off by default** — with `assets/js/config.js` blank the app runs entirely on localStorage (the prototype). Fill in your Supabase URL + anon key and the same UI becomes real accounts with zero frontend changes, because the app only ever talks to `Store`, which delegates to `assets/js/backend.js` when configured. See [`supabase/README.md`](supabase/README.md) to switch it on.

Still to do for launch: schedule `crawler/crawl.mjs` to keep `offers` fresh, and add affiliate tracking params to the retailer `View` links (affiliate-friendly retailers are flagged in `data.js`).
