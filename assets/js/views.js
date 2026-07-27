/* Tracktion — views. Each view returns { html, after?(root) }.
 * App (app.js) mounts the html and calls after() for wiring + map init. */
window.Views = (function () {
  const { icon, money, esc, stars, toast, sheet, $, $$ } = UI;
  const DB = window.DB;
  // brand film (Higgsfield launch teaser) — reused across login, home hero, empty states
  const TEASER_MP4 = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GUt22WNlgn1g3XxIzwf3DVxKos/hf_20260726_140943_8540b07c-247b-41e7-8c58-f0e7fedd6bd5.mp4';
  const filmTag = (cls = '') => `<video class="${cls}" autoplay muted loop playsinline preload="metadata" aria-hidden="true"><source src="${TEASER_MP4}" type="video/mp4"></video>`;

  const catById  = Object.fromEntries(DB.categories.map(c => [c.id, c]));
  const partById = Object.fromEntries(DB.parts.map(p => [p.id, p]));
  const trackById= Object.fromEntries(DB.tracks.map(t => [t.id, t]));
  // official tracks + the user's own community suggestions
  const getTrack = (id) => trackById[id] || Store.suggestionById(id);
  const allTracks = () => DB.tracks.concat(Store.suggestions());

  // ==================== STRAVA-STYLE ROUTE WIDGETS ====================
  // Deterministic mini-maps: every track gets a stable, credible-looking route
  // polyline drawn as inline SVG (no tiles, no network, instant). Seeded from
  // the track id; shaped by terrain type. NOTE: decorative preview geometry —
  // real GPX comes later via community uploads.
  function seeded(id) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h = Math.imul(h ^ (h >>> 15), 2246822519); h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  }
  function routePts(t, w, h) {
    const r = seeded(t.id), pad = Math.min(w, h) * 0.16;
    const n = 9 + Math.floor(r() * 4);
    const shape = { beach: { amp: .16, drift: .95 }, desert: { amp: .22, drift: .9 },
      river: { amp: .34, drift: .8 }, forest: { amp: .3, drift: .55 }, mountain: { amp: .42, drift: .7 } }[t.type] || { amp: .3, drift: .7 };
    const pts = []; let y = h * (0.35 + r() * 0.3), dy = 0;
    for (let i = 0; i < n; i++) {
      const x = pad + (w - 2 * pad) * (i / (n - 1));
      dy = dy * shape.drift + (r() - 0.5) * h * shape.amp;
      y = Math.max(pad, Math.min(h - pad, y + dy));
      pts.push([x, y]);
    }
    return pts;
  }
  const toPath = (pts) => pts.map((p, i) => {
    if (!i) return `M${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    const q = pts[i - 1], mx = ((q[0] + p[0]) / 2).toFixed(1), my = ((q[1] + p[1]) / 2).toFixed(1);
    return `Q${q[0].toFixed(1)} ${q[1].toFixed(1)} ${mx} ${my}`;
  }).join(' ');
  // light sage map canvas + faint street grid + park blobs + orange route w/ white casing
  function miniMap(t, w = 340, h = 150, opts = {}) {
    const r = seeded(t.id + 'bg'), pts = routePts(t, w, h), d = toPath(pts);
    const s = pts[0], e = pts[pts.length - 1];
    let blobs = '';
    for (let i = 0; i < 3; i++) {
      blobs += `<ellipse cx="${(r() * w).toFixed(0)}" cy="${(r() * h).toFixed(0)}" rx="${(w * (0.12 + r() * 0.15)).toFixed(0)}" ry="${(h * (0.15 + r() * 0.2)).toFixed(0)}" fill="#E4EAE0" opacity="${(0.5 + r() * 0.4).toFixed(2)}"/>`;
    }
    let grid = '';
    for (let x = 20; x < w; x += 34) grid += `<line x1="${x}" y1="0" x2="${x + 10}" y2="${h}" stroke="#FFFFFF" stroke-width="2" opacity=".55"/>`;
    for (let y2 = 18; y2 < h; y2 += 30) grid += `<line x1="0" y1="${y2}" x2="${w}" y2="${y2 - 6}" stroke="#FFFFFF" stroke-width="2" opacity=".45"/>`;
    return `<svg viewBox="0 0 ${w} ${h}" class="mmap${opts.cls ? ' ' + opts.cls : ''}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Route preview: ${esc(t.name || '')}">
      <rect width="${w}" height="${h}" fill="#EEF0EA"/>${blobs}${grid}
      <path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" fill="none" stroke="#FC4C02" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${s[0].toFixed(1)}" cy="${s[1].toFixed(1)}" r="5" fill="#FFFFFF"/><circle cx="${s[0].toFixed(1)}" cy="${s[1].toFixed(1)}" r="3" fill="#1B753A"/>
      <circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="5" fill="#FFFFFF"/><circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="3" fill="#242428"/>
    </svg>`;
  }
  // Strava-style elevation profile sparkline
  function elevSpark(id, w = 320, h = 46) {
    const r = seeded(id + 'elev'); const pts = []; let y = h * 0.6, dy = 0;
    for (let i = 0; i <= 28; i++) {
      dy = dy * 0.6 + (r() - 0.48) * h * 0.28;
      y = Math.max(6, Math.min(h - 4, y + dy));
      pts.push([(w * i / 28), y]);
    }
    const line = toPath(pts);
    return `<svg viewBox="0 0 ${w} ${h}" class="espark" preserveAspectRatio="none" aria-hidden="true">
      <path d="${line} L${w} ${h} L0 ${h} Z" fill="#FC4C02" opacity=".10"/>
      <path d="${line}" fill="none" stroke="#FC4C02" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }
  // Strava stat band: LABEL over big tabular number, hairline dividers between.
  // 4th tuple slot marks a word value (sans, not bold-mono).
  function statRow(items) {
    return `<div class="statrow">` + items.map(([label, val, sub, word]) =>
      `<div class="stat"><span class="stat-l">${label}</span><span class="stat-v${word ? ' stat-v--word' : ''}">${val}${sub ? `<em>${sub}</em>` : ''}</span></div>`).join('') + `</div>`;
  }
  // difficulty/type values reach templates from user-suggestable rows — whitelist
  // anything used in class names / CSS vars, escape anything printed.
  const DIFFS = { easy: 1, medium: 1, hard: 1, extreme: 1 };
  const dsafe = (d) => DIFFS[d] ? d : 'medium';
  const gradeCell = (t) => ['Grade', `<span style="color:var(--${dsafe(t.difficulty)}-ink)">${esc(t.difficulty)}</span>`, '', true];
  // avatar chip — real profile photo (Google DP) when known, initials otherwise
  function avatar(name, size = 40) {
    const url = Store.avatarOf ? Store.avatarOf(name) : null;
    if (url && /^https:\/\//.test(url)) {
      return `<img class="av" aria-hidden="true" src="${esc(url)}" alt="" referrerpolicy="no-referrer" loading="lazy" style="width:${size}px;height:${size}px;object-fit:cover">`;
    }
    const hues = [['#FFF0E6', '#C83C00'], ['#E8F1EC', '#1B753A'], ['#EDEDF3', '#4A4A55'], ['#FEF3E9', '#B26313']];
    const i = (name || '?').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length;
    const init = (name || '?').split(/\s+/).map(x => x[0]).slice(0, 2).join('').toUpperCase();
    return `<span class="av" aria-hidden="true" style="width:${size}px;height:${size}px;background:${hues[i][0]};color:${hues[i][1]};font-size:${Math.round(size * 0.36)}px">${esc(init)}</span>`;
  }

  // effective (lowest) price for a part across its offers
  const bestOffer = (p) => p.offers.reduce((m, o) => (priceOf(o) < priceOf(m) ? o : m));
  const priceOf   = (o) => o.club ?? o.price;
  const rrpRange  = (p) => { const ps = p.offers.map(priceOf); return { min: Math.min(...ps), max: Math.max(...ps) }; };

  function fitBadge(p) {
    const f = Store.fits(p);
    if (p.fit === 'universal') return `<span class="tag tag-fit">${icon('check')} Fits all rigs</span>`;
    if (f === true)  return `<span class="tag tag-fit">${icon('check')} Fits your rig</span>`;
    if (f === false) return `<span class="tag tag-nofit">Not your rig</span>`;
    return `<span class="tag">Check fitment</span>`;
  }

  function thumb(p) {
    return `<div class="thumb c-${p.category}"><img src="assets/img/cat/${p.category}.jpg" alt="" loading="lazy"></div>`;
  }

  function partCard(p) {
    const b = bestOffer(p), saved = Store.get().savedParts.includes(p.id);
    return `<a class="card card-hover part reveal" href="#/part/${p.id}">
      ${thumb(p)}
      <div class="body">
        <div class="row" style="gap:8px">${fitBadge(p)}</div>
        <div class="name">${esc(p.name)}</div>
        <div class="row meta" style="gap:6px">${stars(p.rating)}<span>${p.reviews.toLocaleString()}</span></div>
        <div class="from spread">
          <div><span class="meta">from</span> <span class="price" style="font-size:16px">${money(priceOf(b))}</span></div>
          <span class="meta">${p.offers.length} shops</span>
        </div>
      </div>
    </a>`;
  }

  // ============================ HOME ==================================
  function home() {
    const s = Store.get(), rig = Store.activeRig(), loc = Store.location();
    const fitParts = rig ? DB.parts.filter(p => Store.fits(p) === true) : [];
    const showParts = (fitParts.length ? fitParts : DB.parts).slice(0, 4);
    const prefs = Store.prefs();
    const near = allTracks()
      .map(t => ({ t, d: loc ? distanceKm(loc, t) : null, m: prefs ? Store.matchScore(t) : null }))
      .sort((a, b) => prefs ? (b.m - a.m) : ((a.d ?? 1e9) - (b.d ?? 1e9)))
      .slice(0, 3);
    const firstName = s.user ? s.user.name.split(' ')[0] : 'there';
    const activeAlerts = s.alerts.length;

    const rigBlock = rig ? `
      <div class="card card-pad reveal" style="position:relative;overflow:hidden">
        <div class="topo"></div>
        <div style="position:relative">
          <div class="eyebrow">Active rig</div>
          <div class="spread" style="margin-top:8px">
            <div class="row" style="gap:14px">
              <div class="rig-badge">${icon('garage')}</div>
              <div class="stack">
                <b style="font-size:17px;letter-spacing:-.02em">${esc(rig.name)}</b>
                <span class="meta">${esc(rig.variant || 'Base')} · ${fitParts.length} parts confirmed to fit</span>
              </div>
            </div>
            <a class="btn btn-ghost btn-sm" href="#/garage">Switch</a>
          </div>
        </div>
      </div>` : `
      <a class="card card-pad card-hover reveal" href="#/garage" style="position:relative;overflow:hidden;display:block">
        <div class="topo"></div>
        <div class="spread" style="position:relative">
          <div class="stack">
            <div class="eyebrow" style="color:var(--clay-ink)">Start here</div>
            <b style="font-size:18px;letter-spacing:-.02em;margin-top:4px">Add your rig</b>
            <span class="meta" style="max-width:32ch">Tell us exactly what you drive and every part gets a real fitment check — no more VIN guessing.</span>
          </div>
          <span class="btn btn-clay btn-sm">${icon('plus')} Add</span>
        </div>
      </a>`;

    const alertBlock = activeAlerts ? `
      <a class="card card-pad card-hover reveal spread" href="#/garage" style="display:flex">
        <div class="row"><span class="rig-badge" style="background:var(--clay-wash);color:var(--clay)">${icon('bell')}</span>
          <div class="stack"><b>${activeAlerts} price-drop alert${activeAlerts>1?'s':''} watching</b>
          <span class="meta">${s.alerts.filter(a=>a.triggered).length} triggered</span></div></div>
        ${icon('chev','muted')}
      </a>` : '';

    return { html: `<div class="view">
      <div class="wrap section">
        <div class="spread" style="margin-bottom:6px">
          <div><div class="eyebrow">Gear up. Head out.</div>
          <h1 class="display" style="font-size:30px;margin-top:4px">G'day, ${esc(firstName)}.</h1></div>
        </div>

        <a class="searchbar reveal" href="#/parts" style="margin:16px 0 18px">
          ${icon('search')}<input placeholder="Search parts — snorkel, lift kit, boards…" readonly>
        </a>

        <a class="vhero reveal" href="#/tracks" aria-label="Open the track map">
          ${filmTag('vhero-film')}
          <div class="vhero-scrim"></div>
          <div class="vhero-txt">
            <b>Gear up. Head out.</b>
            <span>${DB.tracks.length}+ tracks mapped across Australia — matched to your rig and style.</span>
            <span class="btn btn-clay btn-sm" style="align-self:flex-start;margin-top:10px">${icon('map')} Find your next track</span>
          </div>
        </a>

        ${rigBlock}
        ${alertBlock ? `<div style="height:14px"></div>${alertBlock}` : ''}

        <div class="spread" style="margin:26px 0 12px">
          <h3 style="font-size:16px">${rig ? 'Fits your ' + esc(rig.model.split(' ')[0]) : 'Popular right now'}</h3>
          <a class="meta" href="#/parts" style="color:var(--clay)">Browse all</a>
        </div>
        <div class="grid grid-parts">${showParts.map(partCard).join('')}</div>

        <div class="spread" style="margin:30px 0 12px">
          <h3 style="font-size:16px">Shop by category</h3>
        </div>
        <div class="grid grid-cats">
          ${DB.categories.map(c => `<a class="card card-hover card-pad reveal" href="#/parts/${c.id}" style="display:flex;flex-direction:column;gap:10px">
            <span style="color:var(--olive)">${icon(c.glyph)}</span>
            <div class="stack"><b style="font-size:14.5px">${c.name}</b><span class="meta" style="font-size:12px">${c.blurb}</span></div>
          </a>`).join('')}
        </div>

        <div class="spread" style="margin:32px 0 12px">
          <h3 style="font-size:16px">${prefs ? 'Matched to your style' : 'Tracks near you'}</h3>
          <a class="meta" href="#/tracks" style="color:var(--clay)">Open map</a>
        </div>
        <div class="grid" style="grid-template-columns:1fr">
          ${near.map(({t,d,m}) => trackRow(t, d, m)).join('')}
        </div>
        <div style="height:20px"></div>
      </div></div>` };
  }

  // Strava Routes-list style: route thumbnail left, name + stat band right
  function trackRow(t, d, m) {
    return `<a class="card card-hover reveal trk" href="#/track/${t.id}">
      <div class="trk-thumb">${miniMap(t, 120, 120, { cls: 'sq' })}</div>
      <div class="trk-body">
        <div class="spread" style="align-items:flex-start">
          <b class="trk-name">${esc(t.name)}</b>
          ${m != null ? `<span class="tag tag-best">${m}%</span>` : (d != null ? `<span class="meta mono-num">${d} km</span>` : '')}
        </div>
        <div class="meta" style="font-size:12.5px">${esc(t.region)}, ${esc(t.state)} · <span style="color:var(--${dsafe(t.difficulty)}-ink);font-weight:600;text-transform:capitalize">${esc(t.difficulty)}</span></div>
        ${statRow([
          ['Distance', `${t.lengthKm}`, 'km'],
          ['Time', `${t.hours}`, 'h'],
          ...(d != null ? [['Away', `${d}`, 'km']] : [['Terrain', esc(t.type), '', true]])
        ])}
      </div>
    </a>`;
  }

  // ============================ PARTS =================================
  function parts(cat) {
    const active = cat && catById[cat] ? cat : null;
    let list = active ? DB.parts.filter(p => p.category === active) : DB.parts;
    const rig = Store.activeRig();

    return { html: `<div class="view"><div class="wrap section">
      <h1 class="display" style="font-size:26px">${active ? catById[active].name : 'All parts'}</h1>
      <p class="muted" style="margin:4px 0 16px">${rig ? 'Fitment checked against your <b>'+esc(rig.name)+'</b>.' : 'Add a rig in your Garage to auto-check fitment.'}</p>

      <div class="searchbar" style="margin-bottom:14px">
        ${icon('search')}<input id="q" placeholder="Search ${active?catById[active].name.toLowerCase():'parts'}…" autocomplete="off">
      </div>

      <div class="chips" id="catchips" style="margin-bottom:8px">
        <button class="chip ${!active?'on':''}" data-cat="">All</button>
        ${DB.categories.map(c => `<button class="chip ${active===c.id?'on':''}" data-cat="${c.id}">${c.name}</button>`).join('')}
      </div>
      ${rig ? `<label class="row meta" style="gap:8px;margin:10px 2px 16px;cursor:pointer">
        <input type="checkbox" id="fitonly"> Only show parts that fit my rig</label>` : '<div style="height:8px"></div>'}

      <div class="grid grid-parts" id="plist">${list.map(partCard).join('')}</div>
      <div class="empty hide" id="pempty">${icon('search')}<div>No parts match that search.</div></div>
    </div></div>`,

    after(root) {
      const q = $('#q', root), plist = $('#plist', root), empty = $('#pempty', root), fitonly = $('#fitonly', root);
      function apply() {
        const term = (q.value || '').toLowerCase().trim();
        const onlyFit = fitonly && fitonly.checked;
        const res = list.filter(p => {
          const hit = !term || (p.name + ' ' + p.brand + ' ' + p.blurb).toLowerCase().includes(term);
          const fit = !onlyFit || Store.fits(p) === true;
          return hit && fit;
        });
        plist.innerHTML = res.map(partCard).join('');
        empty.classList.toggle('hide', res.length > 0);
        plist.classList.toggle('hide', res.length === 0);
        UI.reveal(plist);
      }
      q.addEventListener('input', apply);
      fitonly && fitonly.addEventListener('change', apply);
      $$('#catchips .chip', root).forEach(c => c.addEventListener('click', () => App.nav('/parts' + (c.dataset.cat ? '/' + c.dataset.cat : ''))));
    }};
  }

  // ========================== PART DETAIL ============================
  function part(id) {
    const p = partById[id];
    if (!p) return { html: `<div class="wrap section"><p>Part not found.</p></div>` };
    const offers = [...p.offers].sort((a, b) => priceOf(a) - priceOf(b));
    const best = offers[0], worst = offers[offers.length - 1];
    const save  = Store.get().savedParts.includes(p.id);
    const alert = Store.alertFor(p.id);
    const saving = priceOf(worst) - priceOf(best);
    const fit = Store.fits(p), rig = Store.activeRig();

    const fitLine = p.fit === 'universal'
      ? `<div class="card card-pad" style="background:var(--good-wash);border-color:transparent">${icon('checkC')} <b>Fits every 4WD</b> — universal fitment.</div>`
      : fit === true ? `<div class="card card-pad" style="background:var(--good-wash);border-color:transparent">${icon('checkC')} <b>Confirmed fit</b> for your ${esc(rig.name)}.</div>`
      : fit === false ? `<div class="card card-pad" style="background:var(--paper-2)">${icon('x')} Does not fit your ${esc(rig.name)}. Fits: ${p.fit.map(fk => modelName(fk)).join(', ')}.</div>`
      : `<a class="card card-pad card-hover" href="#/garage" style="display:block">${icon('garage')} <b>Add your rig</b> to confirm this fits. Listed for: ${p.fit.map(fk=>modelName(fk)).join(', ')}.</a>`;

    return { html: `<div class="view"><div class="wrap section">
      <a class="btn btn-ghost btn-sm" href="#/parts" style="margin-bottom:16px">${icon('back')} Parts</a>
      <div class="grid grid-bento" style="align-items:start">
        <div class="card" style="overflow:hidden">${thumb(p)}</div>
        <div class="stack" style="gap:12px">
          <div class="row wrap-r" style="gap:8px">${fitBadge(p)}<span class="tag">${esc(p.brand)}</span></div>
          <h1 class="display" style="font-size:26px">${esc(p.name)}</h1>
          <div class="row" style="gap:8px">${stars(p.rating)}<span class="meta">${p.rating} · ${p.reviews.toLocaleString()} reviews</span></div>
          <p class="muted" style="margin:0">${esc(p.blurb)}</p>
          <div class="row" style="gap:16px;margin-top:2px">
            <div><span class="meta">Best price</span><div class="price" style="font-size:26px;color:var(--clay-ink)">${money(priceOf(best))}</div></div>
            ${saving>0?`<div><span class="meta">You save</span><div class="price" style="font-size:18px">${money(saving)}</div><span class="meta">vs dearest</span></div>`:''}
          </div>
          <div class="row" style="gap:10px;margin-top:4px">
            <a class="btn btn-clay grow" href="${best.url}" target="_blank" rel="noopener">Buy at ${DB.retailerById[best.retailer].name} · ${money(priceOf(best))}</a>
            <button class="btn btn-ghost" id="savebtn" aria-pressed="${save}" aria-label="Save part">${icon(save?'heartF':'heart')}</button>
          </div>
        </div>
      </div>

      <div style="height:20px"></div>
      ${fitLine}

      <div class="spread" style="margin:28px 0 12px"><h3 style="font-size:16px">Price comparison</h3><span class="meta">${offers.length} retailers · live seed</span></div>
      <div class="cmp">
        ${offers.map((o, i) => {
          const r = DB.retailerById[o.retailer];
          const eff = priceOf(o);
          return `<div class="cmp-row ${i===0?'best':''}">
            <div class="cmp-store">
              <div class="store-logo">${r.name.slice(0,2).toUpperCase()}</div>
              <div class="stack">
                <div class="row" style="gap:7px"><b style="font-size:14.5px">${esc(r.name)}</b>${i===0?'<span class="tag tag-best">Best</span>':''}${r.affiliate?'':'<span class="tag" style="font-size:9px">no affiliate</span>'}</div>
                <span class="meta" style="font-size:12px">${o.stock==='in'?'In stock':o.stock==='low'?'Low stock':'Out of stock'} · ${o.shipping===0?'Free ship':'+'+money(o.shipping)+' ship'}${o.club?' · <span style="color:var(--good)">member price</span>':''}</span>
              </div>
            </div>
            <div class="price" style="font-size:17px;text-align:right">${money(eff)}${o.club?`<div class="meta" style="font-size:11px;text-decoration:line-through">${money(o.price)}</div>`:''}</div>
            <a class="btn btn-sm ${i===0?'btn-primary':'btn-ghost'}" href="${o.url}" target="_blank" rel="noopener">View</a>
          </div>`;
        }).join('')}
      </div>

      <div class="card card-pad" style="margin-top:16px;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div class="row"><span class="rig-badge" style="background:var(--clay-wash);color:var(--clay)">${icon('bell')}</span>
          <div class="stack"><b>Price-drop alert</b><span class="meta">${alert?`Watching for ${money(alert.target)}`:'Get notified when it drops'}</span></div></div>
        <button class="btn ${alert?'btn-ghost':'btn-primary'} btn-sm" id="alertbtn">${alert?'Edit alert':'Set alert'}</button>
      </div>

      <div class="spread" style="margin:30px 0 6px"><h3 style="font-size:16px">Owner reviews</h3><span class="meta">Verified on-vehicle</span></div>
      <div class="card card-pad">
        ${p._reviews.map(rv => `<div class="review">
          <div class="spread"><div class="row" style="gap:8px"><span class="avatar-btn" style="width:30px;height:30px;font-size:11px">${rv.user.slice(0,2).toUpperCase()}</span><div class="stack"><b style="font-size:14px">${esc(rv.user)}</b><span class="meta" style="font-size:12px">${icon('garage')} ${esc(rv.vehicle)}</span></div></div>${stars(rv.stars)}</div>
          <p class="muted" style="margin:8px 0 0">${esc(rv.body)}</p>
        </div>`).join('')}
      </div>
      <div style="height:24px"></div>
    </div></div>`,

    after(root) {
      $('#savebtn', root).addEventListener('click', (e) => {
        const on = Store.toggleSavedPart(p.id);
        e.currentTarget.innerHTML = icon(on ? 'heartF' : 'heart');
        e.currentTarget.setAttribute('aria-pressed', String(on));
        toast(on ? 'Saved to your garage' : 'Removed from saved');
      });
      $('#alertbtn', root).addEventListener('click', () => openAlertSheet(p, best));
    }};
  }

  function modelName(fk) { const v = DB.vehicles.find(v => v.fitKey === fk); return v ? v.model.split(' ')[0] + ' ' + (v.model.match(/\d+|\bMR\b|\bPX\b|Y62/)?.[0] || '') : fk; }

  function openAlertSheet(p, best) {
    const cur = priceOf(best), existing = Store.alertFor(p.id);
    const suggested = existing ? existing.target : Math.round(cur * 0.9);
    const sh = sheet(`
      <h3 style="font-size:19px" class="display">Alert me when it drops</h3>
      <p class="muted" style="margin:6px 0 16px">${esc(p.name)} — best price right now <b class="price">${money(cur)}</b>.</p>
      <div class="field"><label>Notify me at or below</label>
        <input class="input price" id="target" type="number" inputmode="decimal" value="${suggested}"></div>
      <div class="chips" style="margin:12px 0 18px">
        ${[5,10,15,20].map(pc => `<button class="chip" data-pc="${pc}">${pc}% off (${money(Math.round(cur*(1-pc/100)))})</button>`).join('')}
      </div>
      <button class="btn btn-clay btn-block" id="save">${icon('bell')} ${existing?'Update alert':'Set price-drop alert'}</button>
      ${existing?`<button class="btn btn-ghost btn-block" id="del" style="margin-top:10px">Remove alert</button>`:''}
    `);
    $$('[data-pc]', sh.el).forEach(b => b.addEventListener('click', () => $('#target', sh.el).value = Math.round(cur * (1 - b.dataset.pc / 100))));
    $('#save', sh.el).addEventListener('click', () => {
      const t = parseFloat($('#target', sh.el).value);
      if (!t || t <= 0) return;
      Store.addAlert(p.id, cur, t);
      sh.close(); toast(`Watching. We'll alert you at ${money(t)}.`);
      App.refreshChrome();
    });
    const del = $('#del', sh.el);
    del && del.addEventListener('click', () => { Store.removeAlert(existing.id); sh.close(); toast('Alert removed'); App.refreshChrome(); });
  }

  // ============================ TRACKS (map) =========================
  function tracks() {
    return { html: `<div class="view">
      <div class="map-wrap">
        <div class="map-filters" id="mapfilters">
          ${['all','easy','medium','hard','extreme'].map(d => `<button class="chip ${d==='all'?'on':''}" data-diff="${d}">${d==='all'?'All tracks':d[0].toUpperCase()+d.slice(1)}</button>`).join('')}
        </div>
        <div class="map-style seg" id="mapstyle">
          <button data-base="satellite" class="on">Satellite</button>
          <button data-base="dark">Dark</button>
        </div>
        <div id="map"></div>
        <div class="map-panel">
          <div class="handle"></div>
          <div class="spread" style="padding:2px 16px 8px">
            <div class="stack"><b id="trkcount">${DB.tracks.length} tracks</b><span class="meta" id="trknear"></span></div>
            <button class="btn btn-clay btn-sm" id="suggestbtn">${icon('plus')} Suggest</button>
          </div>
          <div class="scroll" id="trklist"></div>
        </div>
      </div>
    </div>`, map: true,
    after(root) {
      const b = root.querySelector('#suggestbtn');
      b && b.addEventListener('click', () => openSuggestSheet());
    }};
  }

  // ---- suggest a route (community) --------------------------------------
  function openSuggestSheet() {
    const loc = Store.location();
    const diffs = ['easy','medium','hard','extreme'];
    const types = ['forest','mountain','beach','desert','river'];
    const states = ['NSW','VIC','QLD','SA','WA','TAS','NT','ACT'];
    const sh = sheet(`
      <h3 class="display" style="font-size:20px">Suggest a route</h3>
      <p class="muted" style="margin:6px 0 16px">Share a track with the community. It shows on your map straight away and goes to review before it's public.</p>
      <div class="field" style="margin-bottom:12px"><label>Track name</label><input class="input" id="s_name" placeholder="e.g. Watagans — Georges Rd"></div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="field"><label>Region</label><input class="input" id="s_region" placeholder="Central Coast"></div>
        <div class="field"><label>State</label><select class="input" id="s_state">${states.map(s=>`<option ${s==='NSW'?'selected':''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="field"><label>Difficulty</label><select class="input" id="s_diff">${diffs.map(d=>`<option value="${d}">${d[0].toUpperCase()+d.slice(1)}</option>`).join('')}</select></div>
        <div class="field"><label>Terrain</label><select class="input" id="s_type">${types.map(t=>`<option value="${t}">${t[0].toUpperCase()+t.slice(1)}</option>`).join('')}</select></div>
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="field"><label>Length (km)</label><input class="input" id="s_len" type="number" inputmode="decimal" placeholder="20"></div>
        <div class="field"><label>Time (hrs)</label><input class="input" id="s_hrs" type="number" inputmode="decimal" placeholder="4"></div>
      </div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px">
        <div class="field"><label>Latitude</label><input class="input" id="s_lat" type="number" inputmode="decimal" value="${loc?loc.lat.toFixed(4):''}" placeholder="-33.03"></div>
        <div class="field"><label>Longitude</label><input class="input" id="s_lng" type="number" inputmode="decimal" value="${loc?loc.lng.toFixed(4):''}" placeholder="151.38"></div>
      </div>
      <button class="btn btn-ghost btn-sm" id="s_here" style="margin:0 0 14px">${icon('pin')} Use my current location</button>
      <div class="field" style="margin-bottom:12px"><label>What's it like?</label><textarea class="input" id="s_blurb" rows="3" placeholder="Rock steps, a couple of water crossings, great riverside camp at the end."></textarea></div>
      <div class="field" style="margin-bottom:18px"><label>What you'll need (comma separated)</label><input class="input" id="s_needs" placeholder="High clearance, Recovery gear, Snorkel"></div>
      <button class="btn btn-clay btn-block" id="s_submit">${icon('check')} Submit route</button>
    `);
    $('#s_here', sh.el).addEventListener('click', () => {
      if (!navigator.geolocation) return toast('Geolocation not available', false);
      navigator.geolocation.getCurrentPosition(p => {
        $('#s_lat', sh.el).value = p.coords.latitude.toFixed(4);
        $('#s_lng', sh.el).value = p.coords.longitude.toFixed(4);
        toast('Pinned to your location');
      }, () => toast('Could not get location', false));
    });
    $('#s_submit', sh.el).addEventListener('click', () => {
      const v = (id) => $('#' + id, sh.el).value.trim();
      const name = v('s_name'), lat = parseFloat(v('s_lat')), lng = parseFloat(v('s_lng'));
      if (!name) { $('#s_name', sh.el).focus(); return toast('Give it a name', false); }
      if (isNaN(lat) || isNaN(lng)) { $('#s_lat', sh.el).focus(); return toast('Add a location', false); }
      Store.addSuggestion({
        name, region: v('s_region') || '—', state: v('s_state'),
        difficulty: v('s_diff'), type: v('s_type'),
        lengthKm: +v('s_len') || 0, hours: +v('s_hrs') || 0, lat, lng,
        blurb: v('s_blurb') || 'Community-submitted route.',
        needs: v('s_needs') ? v('s_needs').split(',').map(x => x.trim()).filter(Boolean) : ['High clearance'],
        season: 'Check conditions', permit: false, dog: false
      });
      sh.close(); toast('Thanks — route added to your map');
      if (window.App) App.render();
    });
  }

  // ========================== TRACK DETAIL ==========================
  function track(id) {
    const t = getTrack(id); if (!t) return { html: `<div class="wrap section">Track not found.</div>` };
    const loc = Store.location(), d = loc ? distanceKm(loc, t) : null;
    const saved = Store.get().savedTracks.includes(t.id);
    const community = !!t.community;
    return { html: `<div class="view"><div class="wrap section">
      <a class="btn btn-ghost btn-sm" href="#/tracks" style="margin-bottom:16px">${icon('back')} Map</a>
      <div class="card" style="overflow:hidden">
        <div style="position:relative;height:210px">
          <img src="assets/img/terrain/${UI.typeIcon[t.type] ? t.type : 'forest'}.jpg" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(28,26,22,.55))"></div>
          <span class="tag d-${dsafe(t.difficulty)}" style="position:absolute;left:14px;bottom:12px"><span class="dot d-${dsafe(t.difficulty)}"></span>${esc(t.difficulty)}</span>
        </div>
        <div class="card-pad">
          <div class="spread"><div><div class="eyebrow">${esc(t.region)}, ${t.state}</div>
          <h1 class="display" style="font-size:26px;margin-top:4px">${esc(t.name)}</h1></div>
          <button class="btn btn-ghost" id="savetrk" aria-pressed="${saved}" aria-label="Save track">${icon(saved?'heartF':'heart')}</button></div>
          <div class="row wrap-r" style="gap:8px;margin-top:12px">
            <span class="tag d-${dsafe(t.difficulty)}"><span class="dot d-${dsafe(t.difficulty)}"></span>${esc(t.difficulty)}</span>
            <span class="tag">${icon(UI.typeIcon[t.type])} ${t.type}</span>
            <span class="tag">${icon('ruler')} ${t.lengthKm} km</span>
            <span class="tag">${icon('clock')} ${t.hours}h</span>
            ${d!=null?`<span class="tag">${icon('pin')} ${d} km away</span>`:''}
            ${t.permit?`<span class="tag tag-best">Permit required</span>`:''}
            ${community?`<span class="tag" style="background:var(--olive-wash);color:var(--olive);border:0">${icon('user')} Community · pending review</span>`:''}
          </div>
          ${statRow([
            ['Distance', `${t.lengthKm}`, 'km'],
            ['Est. time', `${t.hours}`, 'h'],
            gradeCell(t)
          ])}
          <p class="muted" style="margin:14px 0 0">${esc(t.blurb)}</p>
        </div>
      </div>

      <div class="card reveal" style="margin-top:16px;overflow:hidden">
        ${miniMap(t, 720, 240)}
        <div class="card-pad" style="padding:14px 20px 16px">
          <div class="spread" style="margin-bottom:6px"><span class="eyebrow" style="font-size:10px">Route profile</span><span class="meta mono-num" style="font-size:12px">${t.lengthKm} km</span></div>
          ${elevSpark(t.id, 680, 52)}
          <p class="meta" style="margin:8px 0 0;font-size:11.5px">Preview shape — community GPX uploads will replace this with the real line.</p>
        </div>
      </div>

      <div class="grid grid-bento" style="margin-top:16px">
        <div class="card card-pad">
          <div class="eyebrow">What you'll need</div>
          <ul style="margin:12px 0 0;padding-left:2px;list-style:none">
            ${t.needs.map(n => `<li class="row" style="gap:9px;padding:5px 0;align-items:flex-start"><span style="color:var(--clay);margin-top:3px">${icon('check')}</span><span>${esc(n)}</span></li>`).join('')}
          </ul>
        </div>
        <div class="card card-pad stack" style="gap:14px">
          <div><div class="eyebrow">Best season</div><b style="display:block;margin-top:4px">${esc(t.season)}</b></div>
          <div><div class="eyebrow">Dogs</div><b style="display:block;margin-top:4px">${t.dog?'Allowed (check park rules)':'Not permitted'}</b></div>
          <a class="btn btn-primary btn-sm" href="https://www.google.com/maps/search/?api=1&query=${t.lat},${t.lng}" target="_blank" rel="noopener">${icon('route')} Directions</a>
        </div>
      </div>
      <div style="height:24px"></div>
    </div></div>`,
    after(root) {
      $('#savetrk', root).addEventListener('click', (e) => {
        const on = Store.toggleSavedTrack(t.id);
        e.currentTarget.innerHTML = icon(on ? 'heartF' : 'heart');
        e.currentTarget.setAttribute('aria-pressed', String(on));
        toast(on ? 'Track saved' : 'Removed from saved');
      });
    }};
  }

  // ============================ GARAGE ==============================
  function garage() {
    const s = Store.get(), rigs = s.garage;
    const savedParts = s.savedParts.map(id => partById[id]).filter(Boolean);
    const savedTracks = s.savedTracks.map(id => trackById[id]).filter(Boolean);
    const mySuggestions = s.suggestions || [];

    const alertsHtml = s.alerts.length ? s.alerts.map(a => {
      const p = partById[a.partId];
      return `<div class="alert-row">
        <div class="thumb c-${p.category}" style="width:44px;height:44px;flex:none">${icon(catById[p.category].glyph)}</div>
        <div class="grow stack"><b style="font-size:14px">${esc(p.name)}</b>
          <span class="meta" style="font-size:12px">${a.triggered?`<span style="color:var(--good)">Dropped to ${money(a.current)}</span> — target hit`:`Watching for ${money(a.target)} · now ${money(a.current)}`}</span></div>
        ${a.triggered
          ? `<a class="btn btn-clay btn-sm" href="#/part/${p.id}">View</a>`
          : `<button class="btn btn-ghost btn-sm" data-drop="${a.id}">Simulate drop</button>`}
      </div>`;
    }).join('') : `<div class="empty">${icon('bell')}<div>No alerts yet. Open any part and tap “Set alert”.</div></div>`;

    return { html: `<div class="view"><div class="wrap section">
      <h1 class="display" style="font-size:28px">Garage</h1>
      <p class="muted" style="margin:4px 0 18px">Your rigs, alerts and saved gear.</p>

      <div class="spread" style="margin-bottom:10px"><h3 style="font-size:16px">Your rigs</h3>
        <button class="btn btn-clay btn-sm" id="addrig">${icon('plus')} Add rig</button></div>
      ${rigs.length ? `<div class="grid" style="grid-template-columns:1fr;gap:10px">${rigs.map(r => {
        const dbRig = DB.vehicles.find(x => x.fitKey === r.fitKey);
        const imgHtml = dbRig && dbRig.imgType ? `<img src="assets/img/vehicle_${dbRig.imgType}.jpg" style="width:46px;height:46px;border-radius:11px;object-fit:cover;">` : `<div class="rig-badge">${icon('garage')}</div>`;
        return `
        <div class="card garage-vehicle ${r.id===s.activeRigId?'':''}" style="${r.id===s.activeRigId?'border-color:var(--clay);box-shadow:0 0 0 3px var(--clay-wash)':''}">
          ${imgHtml}
          <div class="grow stack"><b>${esc(r.name)}</b><span class="meta" style="font-size:12px">${esc(r.variant||'Base')} · ${r.years||''}</span></div>
          ${r.id===s.activeRigId?'<span class="tag tag-fit">Active</span>':`<button class="btn btn-ghost btn-sm" data-active="${r.id}">Set active</button>`}
          <button class="btn btn-ghost btn-sm" data-remove="${r.id}" aria-label="Remove">${icon('x')}</button>
        </div>`;
      }).join('')}</div>`
        : `<div class="card empty">${icon('garage')}<div>No rigs yet. Add your 4WD to unlock real fitment checks.</div></div>`}

      <div class="spread" style="margin:28px 0 10px"><h3 style="font-size:16px">Price-drop alerts</h3></div>
      <div class="card card-pad">${alertsHtml}</div>

      <div class="spread" style="margin:28px 0 10px"><h3 style="font-size:16px">Saved parts</h3><span class="meta">${savedParts.length}</span></div>
      ${savedParts.length ? `<div class="grid grid-parts">${savedParts.map(partCard).join('')}</div>`
        : `<div class="card empty">${icon('heart')}<div>Nothing saved yet.</div></div>`}

      <div class="spread" style="margin:28px 0 10px"><h3 style="font-size:16px">Saved tracks</h3><span class="meta">${savedTracks.length}</span></div>
      ${savedTracks.length ? `<div class="grid" style="grid-template-columns:1fr">${savedTracks.map(t => trackRow(t, Store.location()?distanceKm(Store.location(),t):null)).join('')}</div>`
        : `<div class="card empty">${icon('map')}<div>No saved tracks yet.</div></div>`}

      <div class="spread" style="margin:28px 0 10px"><h3 style="font-size:16px">Your suggested routes</h3>
        <button class="btn btn-clay btn-sm" id="suggestbtn2">${icon('plus')} Suggest</button></div>
      ${mySuggestions.length ? `<div class="grid" style="grid-template-columns:1fr;gap:10px">${mySuggestions.map(t => `
        <div class="card" style="display:flex;gap:0;overflow:hidden;align-items:stretch">
          <a class="track-ico d-${dsafe(t.difficulty)}" href="#/track/${t.id}" style="border-radius:0;width:60px;background:var(--${dsafe(t.difficulty)}-wash);color:var(--${dsafe(t.difficulty)}-ink)">${icon(UI.typeIcon[t.type]||'map')}</a>
          <a class="card-pad" href="#/track/${t.id}" style="flex:1;padding:12px 14px">
            <div class="spread"><b style="font-size:14.5px">${esc(t.name)}</b><span class="tag" style="background:var(--olive-wash);color:var(--olive);border:0">Pending</span></div>
            <div class="meta" style="font-size:12px">${esc(t.region)}, ${esc(t.state)} · ${esc(t.difficulty)}</div>
          </a>
          <button class="btn btn-ghost btn-sm" data-delsug="${t.id}" aria-label="Remove" style="border:0;border-left:1px solid var(--line);border-radius:0">${icon('x')}</button>
        </div>`).join('')}</div>`
        : `<div class="card empty">${icon('route')}<div>No routes suggested yet. Know a good track? Add it — it shows on your map instantly.</div></div>`}

      <div style="height:20px"></div>
      <button class="btn btn-ghost btn-block" id="signout">Sign out</button>
      <div style="height:24px"></div>
    </div></div>`,
    after(root) {
      $('#addrig', root).addEventListener('click', openAddRig);
      $$('[data-active]', root).forEach(b => b.addEventListener('click', () => { Store.setActiveRig(b.dataset.active); App.nav('/garage'); toast('Active rig switched'); }));
      $$('[data-remove]', root).forEach(b => b.addEventListener('click', () => { Store.removeRig(b.dataset.remove); App.nav('/garage'); }));
      $$('[data-drop]', root).forEach(b => b.addEventListener('click', () => { Store.simulateDrop(b.dataset.drop); App.nav('/garage'); toast('Price dropped — alert triggered'); App.refreshChrome(); }));
      $$('[data-delsug]', root).forEach(b => b.addEventListener('click', () => { Store.removeSuggestion(b.dataset.delsug); App.nav('/garage'); toast('Route removed'); }));
      $('#suggestbtn2', root).addEventListener('click', () => openSuggestSheet());
      $('#signout', root).addEventListener('click', () => { location.hash = ''; App.signOut(); });
    }};
  }

  function openAddRig() {
    const makes = [...new Set(DB.vehicles.map(v => v.make))];
    const sh = sheet(`
      <h3 class="display" style="font-size:20px">Add your rig</h3>
      <p class="muted" style="margin:6px 0 16px">Exact model = exact fitment. This is the whole point.</p>
      <div class="field" style="margin-bottom:12px"><label>Make</label>
        <select class="input" id="mk"><option value="">Select make…</option>${makes.map(m=>`<option>${m}</option>`).join('')}</select></div>
      <div class="field" style="margin-bottom:12px"><label>Model</label>
        <select class="input" id="md" disabled><option>Select make first</option></select></div>
      <div class="field" style="margin-bottom:20px"><label>Variant (optional)</label>
        <select class="input" id="vr" disabled><option>—</option></select></div>
      <button class="btn btn-clay btn-block" id="addbtn" disabled>Add to garage</button>
    `);
    const mk = $('#mk', sh.el), md = $('#md', sh.el), vr = $('#vr', sh.el), add = $('#addbtn', sh.el);
    mk.addEventListener('change', () => {
      const models = DB.vehicles.filter(v => v.make === mk.value);
      md.disabled = false; md.innerHTML = `<option value="">Select model…</option>` + models.map(v => `<option value="${v.fitKey}">${v.model} (${v.years})</option>`).join('');
      vr.disabled = true; vr.innerHTML = '<option>—</option>'; add.disabled = true;
    });
    md.addEventListener('change', () => {
      const v = DB.vehicles.find(x => x.fitKey === md.value);
      if (!v) { add.disabled = true; return; }
      vr.disabled = false; vr.innerHTML = `<option value="">Base / not sure</option>` + v.variants.map(x => `<option>${x}</option>`).join('');
      add.disabled = false;
    });
    add.addEventListener('click', () => {
      const v = DB.vehicles.find(x => x.fitKey === md.value); if (!v) return;
      Store.addRig({ make: v.make, model: v.model, fitKey: v.fitKey, variant: vr.value || '', years: v.years });
      sh.close(); App.nav('/garage'); toast(`${v.model} added — fitment is now live`); App.refreshChrome();
    });
  }

  // ============================= AUTH ===============================
  function auth() {
    return { html: `<div class="auth">
      <div class="auth-brandside">
        <video class="auth-video" autoplay muted loop playsinline poster="assets/img/logo-512.png">
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_3GUt22WNlgn1g3XxIzwf3DVxKos/hf_20260726_140943_8540b07c-247b-41e7-8c58-f0e7fedd6bd5.mp4" type="video/mp4">
        </video>
        <div class="auth-video-scrim"></div>
        <div class="topo" style="z-index:1"></div>
        <div style="position:relative;z-index:2" class="row"><span style="width:34px;height:34px">${logoSVG()}</span><b class="wordmark" style="font-size:23px;color:#F7F5F1"><span style="color:#C9855F">4WD</span>Scout</b></div>
        <div style="position:relative;z-index:2">
          <div class="eyebrow" style="color:#C9855F">For people who air down</div>
          <h1 class="display" style="font-size:42px;line-height:1.05;margin:14px 0;max-width:14ch">Know it fits. Find the track.</h1>
          <p style="color:#C4BEB2;max-width:34ch;font-size:15px">Compare 4WD parts across every Aussie retailer by your exact rig — then go wheel the best tracks near you.</p>
        </div>
        <div class="stat-strip" style="position:relative;z-index:2">
          <div><div class="n">14</div><span class="meta" style="color:#8C877C">retailers compared</span></div>
          <div><div class="n">17</div><span class="meta" style="color:#8C877C">tracks mapped</span></div>
          <div><div class="n">$0</div><span class="meta" style="color:#8C877C">to use, always</span></div>
        </div>
      </div>
      <div class="auth-formside">
        <div class="auth-card">
          <img src="assets/img/wordmark.png?v=2" alt="4WDScout" style="height:38px;width:auto;margin-bottom:10px;display:block">
          <div class="hide"><span style="width:26px;height:26px">${logoSVG()}</span></div>
          <h2 class="display" style="font-size:26px;margin:14px 0 4px">Sign in to your garage</h2>
          <p class="muted" style="margin:0 0 20px">One tap with Google. Your rigs, alerts and saved tracks sync across every device.</p>
          <div class="auth-social">
            <button class="sso sso-google" data-p="Google">${UI.ICON.google} Continue with Google</button>
            <button class="sso" data-p="Apple">${UI.ICON.apple} Continue with Apple</button>
          </div>
          <div class="divider">or use email instead</div>
          <div class="field" style="margin-bottom:10px"><label>Name</label><input class="input" id="nm" placeholder="Jordan"></div>
          <div class="field" style="margin-bottom:14px"><label>Email</label><input class="input" id="em" type="email" placeholder="you@example.com"></div>
          <button class="btn btn-ghost btn-block" id="emailgo">${icon('mail')} Email me a magic link</button>
          <p class="meta" style="text-align:center;margin:18px 0 0;font-size:12px">By continuing you agree to keep it on the tracks. We never post on your behalf.</p>
        </div>
      </div>
    </div>`,
    after(root) {
      const live = window.Backend && Backend.isOn();
      $$('.sso', root).forEach(b => b.addEventListener('click', async () => {
        const provider = b.dataset.p.toLowerCase();
        if (live) { try { await Backend.signInOAuth(provider); } catch (e) { toast('Sign-in failed', false); } }
        else finishAuth({ name: 'Jordan Reeve', email: 'jordan@example.com', provider: b.dataset.p });
      }));
      $('#emailgo', root).addEventListener('click', async () => {
        const name = $('#nm', root).value.trim() || 'Mate';
        const email = $('#em', root).value.trim();
        if (!email || !email.includes('@')) { $('#em', root).focus(); toast('Enter a valid email', false); return; }
        if (live) {
          try {
            await Backend.signInEmail(email);
            root.querySelector('.auth-card').innerHTML =
              `<div style="text-align:center;padding:20px 0">${icon('mail')}
               <h2 class="display" style="font-size:24px;margin:14px 0 8px">Check your email</h2>
               <p class="muted">We sent a magic sign-in link to <b>${esc(email)}</b>. Open it on this device to finish.</p></div>`;
          } catch (e) { toast('Could not send link', false); }
        } else finishAuth({ name, email, provider: 'email' });
      });
    }};
  }
  function finishAuth(user) { Store.login(user); toast(`Welcome, ${user.name.split(' ')[0]}`); App.boot(); }

  function logoSVG() {
    return `<img src="assets/img/logo.png?v=3" alt="4WDScout" draggable="false"
      style="width:100%;height:100%;object-fit:contain;border-radius:23%;display:block">`;
  }

  // ============================ ONBOARDING ============================
  // 3 calm steps: your rig → where you are → what you love driving.
  function onboard() {
    const makes = [...new Set(DB.vehicles.map(v => v.make))];
    const cities = [
      ['Sydney, NSW', -33.87, 151.21], ['Newcastle, NSW', -32.93, 151.78], ['Brisbane, QLD', -27.47, 153.03],
      ['Melbourne, VIC', -37.81, 144.96], ['Adelaide, SA', -34.93, 138.60], ['Perth, WA', -31.95, 115.86]
    ];
    const types = [['beach','Beach & dunes'],['mountain','High country'],['forest','Forest trails'],['river','River crossings'],['desert','Outback & desert']];
    return { html: `<div class="view"><div class="wrap section" style="max-width:560px">
      <div class="row" style="gap:10px;margin-bottom:8px"><span style="width:30px;height:30px">${logoSVG()}</span>
        <span class="eyebrow">Set up your scout</span></div>

      <div class="ob-step" data-step="1">
        <h1 class="display" style="font-size:27px">First — what do you drive?</h1>
        <p class="muted" style="margin:6px 0 20px">Your exact rig powers real fitment checks on every part.</p>
        <div id="ob_img" style="height:140px; background:var(--paper-2); border-radius:12px; margin-bottom:16px; overflow:hidden; display:none; align-items:center; justify-content:center;">
          <img src="" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div class="field" style="margin-bottom:12px"><label>Make</label>
          <select class="input" id="ob_mk"><option value="">Select make…</option>${makes.map(m=>`<option>${m}</option>`).join('')}</select></div>
        <div class="field" style="margin-bottom:12px"><label>Model</label>
          <select class="input" id="ob_md" disabled><option>Select make first</option></select></div>
        <div class="field" style="margin-bottom:20px"><label>Variant (optional)</label>
          <select class="input" id="ob_vr" disabled><option>—</option></select></div>
        <button class="btn btn-clay btn-block" id="ob_next1" disabled>Next ${icon('arrow')}</button>
        <button class="btn btn-ghost btn-block" id="ob_skip1" style="margin-top:10px">I'll add it later</button>
      </div>

      <div class="ob-step hide" data-step="2">
        <h1 class="display" style="font-size:27px">Where are you based?</h1>
        <p class="muted" style="margin:6px 0 20px">We sort tracks, warnings and scouts by distance from you.</p>
        <button class="btn btn-clay btn-block" id="ob_gps" style="margin-bottom:14px">${icon('pin')} Use my current location</button>
        <div class="divider">or pick a city</div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 4px">
          ${cities.map(c => `<button class="btn btn-ghost ob-city" data-lat="${c[1]}" data-lng="${c[2]}" data-l="${c[0]}">${c[0]}</button>`).join('')}
        </div>
      </div>

      <div class="ob-step hide" data-step="3">
        <h1 class="display" style="font-size:27px">What do you love driving?</h1>
        <p class="muted" style="margin:6px 0 20px">Pick as many as you like — we'll match tracks to your style.</p>
        <div class="chips" id="ob_types" style="margin-bottom:22px">
          ${types.map(t=>`<button class="chip" data-t="${t[0]}" style="padding:11px 16px;font-size:14px">${icon(UI.typeIcon[t[0]])} ${t[1]}</button>`).join('')}
        </div>
        <div class="field" style="margin-bottom:22px"><label>How gnarly do you go?</label>
          <div class="seg" id="ob_diff" style="width:100%;justify-content:stretch">
            ${['easy','medium','hard','extreme'].map((d,i)=>`<button data-d="${d}" class="${d==='medium'?'on':''}" style="flex:1">${d[0].toUpperCase()+d.slice(1)}</button>`).join('')}
          </div></div>
        <div class="field" style="margin-bottom:24px"><label>Happy to travel</label>
          <div class="seg" id="ob_range" style="width:100%">
            ${[['150','~1.5 hrs'],['300','Half a day'],['800','Weekender'],['3000','Anywhere']].map((r,i)=>`<button data-r="${r[0]}" class="${i===1?'on':''}" style="flex:1">${r[1]}</button>`).join('')}
          </div></div>
        <button class="btn btn-clay btn-block" id="ob_done">${icon('check')} Find my tracks</button>
      </div>
    </div></div>`,
    after(root) {
      const show = (n) => $$('.ob-step', root).forEach(s => s.classList.toggle('hide', s.dataset.step != n));
      // step 1 — rig
      const mk=$('#ob_mk',root), md=$('#ob_md',root), vr=$('#ob_vr',root), next1=$('#ob_next1',root);
      mk.addEventListener('change', () => {
        const models = DB.vehicles.filter(v=>v.make===mk.value);
        md.disabled=false; md.innerHTML=`<option value="">Select model…</option>`+models.map(v=>`<option value="${v.fitKey}">${v.model} (${v.years})</option>`).join('');
        vr.disabled=true; vr.innerHTML='<option>—</option>'; next1.disabled=true;
      });
      md.addEventListener('change', () => {
        const v=DB.vehicles.find(x=>x.fitKey===md.value);
        const imgEl = $('#ob_img img', root);
        if(!v){
          next1.disabled=true;
          $('#ob_img', root).style.display='none';
          return;
        }
        if (imgEl && v.imgType) {
          imgEl.src = `assets/img/vehicle_${v.imgType}.jpg`;
          $('#ob_img', root).style.display='flex';
        } else {
          $('#ob_img', root).style.display='none';
        }
        vr.disabled=false; vr.innerHTML=`<option value="">Base / not sure</option>`+v.variants.map(x=>`<option>${x}</option>`).join('');
        next1.disabled=false;
      });
      next1.addEventListener('click', () => {
        const v=DB.vehicles.find(x=>x.fitKey===md.value); if(!v) return;
        Store.addRig({make:v.make,model:v.model,fitKey:v.fitKey,variant:vr.value||'',years:v.years});
        show(2);
      });
      $('#ob_skip1',root).addEventListener('click', ()=>show(2));
      // step 2 — location
      $('#ob_gps',root).addEventListener('click', () => {
        if (!navigator.geolocation) { show(3); return; }
        navigator.geolocation.getCurrentPosition(
          p => { Store.setLocation({lat:p.coords.latitude,lng:p.coords.longitude,label:'Near you',source:'gps'}); show(3); },
          () => { toast('Could not get location — pick a city', false); });
      });
      $$('.ob-city',root).forEach(b=>b.addEventListener('click',()=>{
        Store.setLocation({lat:+b.dataset.lat,lng:+b.dataset.lng,label:b.dataset.l,source:'city'}); show(3);
      }));
      // step 3 — prefs
      const picked=new Set();
      $$('#ob_types .chip',root).forEach(c=>c.addEventListener('click',()=>{
        c.classList.toggle('on'); c.classList.contains('on')?picked.add(c.dataset.t):picked.delete(c.dataset.t);
      }));
      const segOn=(sel)=>{ $$(sel+' button',root).forEach(b=>b.addEventListener('click',()=>$$(sel+' button',root).forEach(x=>x.classList.toggle('on',x===b)))); };
      segOn('#ob_diff'); segOn('#ob_range');
      $('#ob_done',root).addEventListener('click',()=>{
        Store.setPrefs({
          types:[...picked],
          maxDiff: $('#ob_diff .on',root)?.dataset.d || 'medium',
          range: +($('#ob_range .on',root)?.dataset.r || 300)
        });
        Store.setOnboarded();
        toast("You're set — tracks matched to you");
        const obScrim = document.getElementById('ob-scrim');
        if (obScrim) obScrim.remove();
        root.remove();
        location.hash = '#/community';
        App.render();
      });
    }};
  }

  // ============================ COMMUNITY ============================
  const POST_TYPES = {
    warning:   { label:'Warning',   ic:'shield', wash:'var(--hard-wash)',   ink:'var(--hard)' },
    condition: { label:'Conditions',ic:'route',  wash:'var(--medium-wash)', ink:'var(--medium)' },
    trip:      { label:'Trip report',ic:'compass',wash:'var(--easy-wash)',  ink:'var(--easy)' }
  };
  const ago = (t) => { const m=Math.floor((Date.now()-t)/60000); if(m<1)return 'just now'; if(m<60)return m+'m ago'; const h=Math.floor(m/60); if(h<24)return h+'h ago'; return Math.floor(h/24)+'d ago'; };

  function community(sub) {
    const seg = sub === 'scouts' ? 'scouts' : 'feed';
    const loc = Store.location();
    const posts = Store.posts().map(p => ({ p, d: (loc&&p.lat!=null) ? distanceKm(loc,p) : null }))
      .sort((a,b)=>(a.d??1e9)-(b.d??1e9) || b.p.createdAt-a.p.createdAt);
    const scouts = Store.scouts().map(sc => {
      const t = sc.trackId ? getTrack(sc.trackId) : null;
      return { sc, t, d: (loc&&t) ? distanceKm(loc,t) : null };
    }).sort((a,b)=>(new Date(a.sc.date))-(new Date(b.sc.date)));
    const me = Store.get().user?.name;

    const feedHtml = posts.length ? posts.map(({p,d}) => {
      const T = POST_TYPES[p.type]||POST_TYPES.trip;
      const trk = p.trackId ? getTrack(p.trackId) : null;
      const likes = p.likes || [], liked = me && likes.includes(me);
      const nc = (p.comments || []).length;
      return `<article class="fcard reveal">
        <header class="fhead">
          ${avatar(p.author, 42)}
          <div class="fhead-t">
            <b>${esc(p.author)}</b>
            <span class="meta">${ago(p.createdAt)}${p.vehicle?` · ${esc(p.vehicle)}`:''}${d!=null?` · ${d} km away`:(p.label?` · ${esc(p.label)}`:'')}</span>
          </div>
          <span class="ftype" style="background:${T.wash};color:${T.ink}">${icon(T.ic)} <span class="lbl">${T.label}</span></span>
        </header>
        <p class="fbody">${esc(p.body)}</p>
        ${trk ? `<a class="fmap" href="#/track/${trk.id}" aria-label="Open ${esc(trk.name)}">
          ${miniMap(trk, 640, 210)}
          <div class="fmap-cap"><div><b>${esc(trk.name)}</b><span class="meta"> · ${esc(trk.region)}, ${esc(trk.state)}</span></div>${icon('chev')}</div>
        </a>
        ${statRow([['Distance', `${trk.lengthKm}`, 'km'], ['Time', `${trk.hours}`, 'h'], gradeCell(trk)])}` : ''}
        <footer class="fsoc">
          <button class="soc-btn ${liked?'on':''}" data-kudos="${p.id}" aria-pressed="${liked}" aria-label="Give kudos">${icon(liked?'kudosF':'kudos')} <span class="mono-num">${likes.length || ''}</span></button>
          <button class="soc-btn" data-cfocus="${p.id}" aria-label="Comment">${icon('comment')} <span class="mono-num">${nc || ''}</span></button>
          <span class="meta ksum" data-ksum="${p.id}" style="margin-left:auto;font-size:12px">${likes.length ? `${esc(likes.slice(0,2).join(', '))}${likes.length>2?` + ${likes.length-2} more`:''} gave kudos` : ''}</span>
        </footer>
        ${nc ? `<div class="fcomments">` + p.comments.map(c => `
          <div class="fcomment">${avatar(c.author, 26)}<div><b>${esc(c.author)}</b> <span class="meta" style="font-size:11px">${ago(c.createdAt)}</span><p>${esc(c.body)}</p></div></div>`).join('') + `</div>` : ''}
        <div class="fcompose">
          ${avatar(me || 'You', 28)}
          <input class="input" placeholder="Add a comment…" aria-label="Add a comment" data-cid="${p.id}">
          <button class="btn btn-clay btn-sm" data-csend="${p.id}">Post</button>
        </div>
      </article>`;
    }).join('') : `<div class="card empty">${icon('compass')}<div>Nothing posted near you yet. Seen a washout, closure or bog hole? Warn the next crew.</div></div>`;

    const scoutsHtml = scouts.length ? scouts.map(({sc,t,d}) => {
      const joined = me && sc.members.includes(me);
      const full = sc.capacity && (sc.members.length + (sc.guests ? sc.guests.length : 0)) >= sc.capacity;
      const dt = new Date(sc.date);
      const going = sc.members.length + (sc.guests ? sc.guests.length : 0);
      return `<article class="fcard reveal">
        <header class="fhead">
          <div class="dblock"><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('en-AU',{month:'short'})}</span></div>
          <div class="fhead-t">
            <b>${esc(sc.title)}</b>
            <span class="meta">${dt.toLocaleDateString('en-AU',{weekday:'long'})} · hosted by ${esc(sc.host)}${d!=null?` · ${d} km away`:''}</span>
          </div>
          <span class="tag ${joined?'tag-fit':''}" style="flex:none">${going}${sc.capacity?'/'+sc.capacity:''} in</span>
        </header>
        ${t ? `<a class="fmap" href="#/track/${t.id}" aria-label="Open ${esc(t.name)}">
          ${miniMap(t, 640, 180)}
          <div class="fmap-cap"><div><b>${esc(t.name)}</b><span class="meta"> · ${esc(t.region)}, ${esc(t.state)}</span></div>${icon('chev')}</div>
        </a>
        ${statRow([['Distance', `${t.lengthKm}`, 'km'], ['Time', `${t.hours}`, 'h'], gradeCell(t)])}` : ''}
        ${sc.notes?`<p class="fbody" style="margin-top:10px">${esc(sc.notes)}</p>`:''}
        <div class="crew">
          <div class="crew-row">
            ${avatar(sc.host, 30)}
            <b>${esc(sc.host)}</b>
            <span class="tag tag-best">Organiser</span>
            <span class="tag">${icon('shield')} Approval to join</span>
          </div>
          <span class="stat-l" style="margin:10px 0 6px">Going (${sc.members.length + (sc.guests?sc.guests.length:0)}${sc.capacity?` of ${sc.capacity}`:''})</span>
          <div class="crew-list">
            ${sc.members.map(mn => `<span class="crew-chip">${avatar(mn, 24)}${esc(mn)}${mn===sc.host?'':''}</span>`).join('')}
            ${(sc.guests||[]).map(gn => `<span class="crew-chip crew-guest">${avatar(gn, 24)}${esc(gn)}${(sc.host===me||sc.hostIsMe)?`<button class="crew-x" data-delguest="${sc.id}" data-gn="${esc(gn)}" aria-label="Remove ${esc(gn)}">${icon('x')}</button>`:''}</span>`).join('')}
            ${(sc.host===me||sc.hostIsMe)?`<button class="crew-chip crew-add" data-addguest="${sc.id}">${icon('plus')} Add a mate</button>`:''}
          </div>
        </div>
        <footer class="fsoc" style="gap:12px">
          <span style="margin-left:auto" class="row">
          ${(sc.host===me || sc.hostIsMe)
            ? `<button class="btn btn-ghost btn-sm" data-delscout="${sc.id}">${icon('x')} Cancel</button>`
            : (joined ? `<button class="btn btn-ghost btn-sm" data-join="${sc.id}">Leave</button>` :
               (sc.requests && sc.requests.includes(me)
                  ? `<button class="btn btn-ghost btn-sm" disabled>Requested</button>`
                  : `<button class="btn btn-clay btn-sm" data-reqjoin="${sc.id}" ${(full)?'disabled':''}>${full?'Full':'Request to join'}</button>`))
          }</span>
        </footer>
        ${(sc.host===me || sc.hostIsMe) && sc.requests && sc.requests.length ? `
          <div class="fcomments">
          <div style="font-size:13px;font-weight:600;margin-bottom:8px">Pending requests</div>
          ${sc.requests.map(ru => `<div class="spread" style="margin-bottom:4px"><span class="row" style="gap:8px">${avatar(ru,26)}<span class="meta">${esc(ru)}</span></span><button class="btn btn-ghost btn-sm" data-approve="${sc.id}" data-ru="${esc(ru)}">Approve</button></div>`).join('')}
          </div>` : ''}
      </article>`;
    }).join('') : `<div class="vempty reveal">
        ${filmTag('vhero-film')}
        <div class="vhero-scrim"></div>
        <div class="vhero-txt">
          <b>No scouts planned near you</b>
          <span>Solo trips are better as convoys — create one and the crew will come.</span>
          <button class="btn btn-clay btn-sm" id="emptyscout" style="align-self:flex-start;margin-top:10px">${icon('route')} Create a scout</button>
        </div>
      </div>`;

    return { html: `<div class="view"><div class="wrap section">
      <div class="spread" style="margin-bottom:18px">
        <div><h1 class="display" style="font-size:26px">${seg==='scouts'?'Scouts':'Community'}</h1>
        <p class="muted" style="margin:4px 0 0">${seg==='scouts'
          ? `Convoy runs near ${loc?esc(loc.label):'you'} — join one or lead your own.`
          : `Warnings and track intel near ${loc?esc(loc.label):'you'}.`}</p></div>
        <button class="btn btn-clay btn-sm" id="composebtn">${icon('plus')} ${seg==='scouts'?'New scout':'Post'}</button>
      </div>
      <div class="feedcol">${seg==='feed'?feedHtml:scoutsHtml}</div>
      <div style="height:20px"></div>
    </div></div>`,
    after(root) {
      // Feed and Scouts are separate tabs now
      $('#composebtn',root).addEventListener('click',()=> seg==='scouts'?openScoutSheet():openPostSheet());
      const es = $('#emptyscout',root); es && es.addEventListener('click', openScoutSheet);
      // host: add / remove mates directly
      $$('[data-addguest]',root).forEach(b=>b.addEventListener('click',()=>openAddMateSheet(b.dataset.addguest)));
      $$('[data-delguest]',root).forEach(b=>b.addEventListener('click',()=>{
        Store.removeScoutGuest(b.dataset.delguest, b.dataset.gn); App.render();
      }));
      $$('[data-join]',root).forEach(b=>b.addEventListener('click',()=>{
        const r=Store.toggleScoutJoin(b.dataset.join);
        if(r===null) toast('That convoy is full',false); else toast(r?'You’re in — see you out there':'Left the convoy');
        App.render();
      }));
      // comments — in-place append like kudos: no re-render, no scroll jump
      function postComment(id) {
        const inp = $(`input[data-cid="${id}"]`, root);
        if (!inp || !inp.value.trim()) return;
        const c = Store.addComment(id, inp.value.trim());
        if (!c) return;
        const card = inp.closest('.fcard');
        if (card) {
          let list = card.querySelector('.fcomments');
          if (!list) {
            list = document.createElement('div'); list.className = 'fcomments';
            card.insertBefore(list, card.querySelector('.fcompose'));
          }
          list.insertAdjacentHTML('beforeend',
            `<div class="fcomment">${avatar(c.author, 26)}<div><b>${esc(c.author)}</b> <span class="meta" style="font-size:11px">just now</span><p>${esc(c.body)}</p></div></div>`);
          const cnt = card.querySelector(`[data-cfocus="${id}"] .mono-num`);
          if (cnt) { const p = Store.posts().find(x => x.id === id); cnt.textContent = (p && p.comments) ? p.comments.length : ''; }
        }
        inp.value = '';
      }
      $$('[data-csend]',root).forEach(b=>b.addEventListener('click',()=>postComment(b.dataset.csend)));
      $$('input[data-cid]',root).forEach(inp=>inp.addEventListener('keydown',(e)=>{
        if (e.isComposing || e.keyCode === 229 || e.repeat) return;   // don't post mid-IME composition
        if (e.key==='Enter') postComment(inp.dataset.cid);
      }));
      // kudos — optimistic flip, no full re-render (keeps scroll position)
      $$('[data-kudos]',root).forEach(b=>b.addEventListener('click',()=>{
        const on = Store.toggleLike(b.dataset.kudos);
        if (on === null) return;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
        const p = Store.posts().find(x=>x.id===b.dataset.kudos);
        const likes = (p && p.likes) || [];
        b.innerHTML = `${icon(on?'kudosF':'kudos')} <span class="mono-num">${likes.length || ''}</span>`;
        const sum = root.querySelector(`[data-ksum="${b.dataset.kudos}"]`);
        if (sum) sum.innerHTML = likes.length ? `${esc(likes.slice(0,2).join(', '))}${likes.length>2?` + ${likes.length-2} more`:''} gave kudos` : '';
      }));
      $$('[data-cfocus]',root).forEach(b=>b.addEventListener('click',()=>{
        const inp = $(`input[data-cid="${b.dataset.cfocus}"]`, root);
        if (inp) { inp.focus(); inp.scrollIntoView({block:'center',behavior:'smooth'}); }
      }));
      $$('[data-reqjoin]',root).forEach(b=>b.addEventListener('click',()=>{
        Store.requestJoinScout(b.dataset.reqjoin); toast('Request sent to host'); App.render();
      }));
      $$('[data-approve]',root).forEach(b=>b.addEventListener('click',()=>{
        Store.approveScoutRequest(b.dataset.approve, b.dataset.ru); toast('Approved ' + b.dataset.ru); App.render();
      }));
      $$('[data-delscout]',root).forEach(b=>b.addEventListener('click',()=>{ Store.removeScout(b.dataset.delscout); toast('Scout cancelled'); App.render(); }));
    }};
  }

  function openPostSheet() {
    const loc = Store.location(); const rig = Store.activeRig();
    const sh = sheet(`
      <h3 class="display" style="font-size:20px">Post to the community</h3>
      <p class="muted" style="margin:6px 0 16px">Warnings save people's weekends (and diffs).</p>
      <div class="chips" id="pt" style="margin-bottom:14px">
        ${Object.entries(POST_TYPES).map(([k,v],i)=>`<button class="chip ${i===0?'on':''}" data-k="${k}">${icon(v.ic)} ${v.label}</button>`).join('')}
      </div>
      <div class="field" style="margin-bottom:12px"><label>What's happening out there?</label>
        <textarea class="input" id="pbody" rows="3" placeholder="Deep washout on the second climb after the gate — passable with 33s+, sketchy in the wet."></textarea></div>
      <div class="field" style="margin-bottom:18px"><label>Tag a track (optional)</label>
        <select class="input" id="ptrack"><option value="">— none —</option>${allTracks().map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></div>
      <button class="btn btn-clay btn-block" id="psend">${icon('check')} Post it</button>
    `);
    $$('#pt .chip',sh.el).forEach(c=>c.addEventListener('click',()=>$$('#pt .chip',sh.el).forEach(x=>x.classList.toggle('on',x===c))));
    $('#psend',sh.el).addEventListener('click',()=>{
      const body=$('#pbody',sh.el).value.trim();
      if(!body){$('#pbody',sh.el).focus();return toast('Say what you saw',false);}
      const trackId=$('#ptrack',sh.el).value||null;
      const t=trackId?getTrack(trackId):null;
      Store.addPost({ type:$('#pt .on',sh.el).dataset.k, body, trackId,
        lat: t?t.lat:(loc?loc.lat:null), lng: t?t.lng:(loc?loc.lng:null),
        label: t?null:(loc?loc.label:null), vehicle: rig?rig.model:null });
      sh.close(); toast('Posted — the crew thanks you'); App.render();
    });
  }

  function openScoutSheet() {
    const tomorrow = new Date(Date.now()+86400000*7).toISOString().slice(0,10);
    const sh = sheet(`
      <h3 class="display" style="font-size:20px">Create a scout</h3>
      <p class="muted" style="margin:6px 0 16px">A convoy run anyone nearby can join.</p>
      <div class="field" style="margin-bottom:12px"><label>Name it</label>
        <input class="input" id="stitle" placeholder="Sunday sand run — beginners welcome"></div>
      <div class="field" style="margin-bottom:12px"><label>Track</label>
        <select class="input" id="strack">${allTracks().map(t=>`<option value="${t.id}">${esc(t.name)} (${t.difficulty})</option>`).join('')}</select></div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div class="field"><label>Date</label><input class="input" id="sdate" type="date" value="${tomorrow}"></div>
        <div class="field"><label>Max rigs</label><select class="input" id="scap"><option value="">No limit</option>${[4,6,8,10,15].map(n=>`<option>${n}</option>`).join('')}</select></div>
      </div>
      <p class="meta" style="margin:0 0 12px;font-size:12.5px">${icon('shield')} Everyone joins by request — you approve each rig, and you can add mates directly.</p>
      <div class="field" style="margin-bottom:18px"><label>Notes (optional)</label>
        <textarea class="input" id="snotes" rows="2" placeholder="Meet at the servo 7am. UHF 18. Bring boards + lunch."></textarea></div>
      <button class="btn btn-clay btn-block" id="screate">${icon('route')} Create scout</button>
    `);
    $('#screate',sh.el).addEventListener('click',()=>{
      const title=$('#stitle',sh.el).value.trim();
      if(!title){$('#stitle',sh.el).focus();return toast('Give it a name',false);}
      const dv=$('#sdate',sh.el).value;
      if(!dv || isNaN(Date.parse(dv))){$('#sdate',sh.el).focus();return toast('Pick a date',false);}
      Store.addScout({ title, trackId:$('#strack',sh.el).value, date:dv,
        capacity:+($('#scap',sh.el).value||0)||null, notes:$('#snotes',sh.el).value.trim(), inviteOnly:!!($('#sinvite',sh.el)&&$('#sinvite',sh.el).checked) });
      sh.close(); toast('Scout created — it’s live for the crew'); App.nav('/scouts');
    });
  }

  function openAddMateSheet(scoutId) {
    const sh = sheet(`
      <h3 class="display" style="font-size:20px">Add a mate to the convoy</h3>
      <p class="muted" style="margin:6px 0 16px">They don't need the app — you're vouching for their rig.</p>
      <div class="field" style="margin-bottom:18px"><label>Name</label>
        <input class="input" id="gname" placeholder="Davo (79 Series)" autocomplete="off"></div>
      <button class="btn btn-clay btn-block" id="gadd">${icon('plus')} Add to crew</button>
    `);
    const go = () => {
      const n = $('#gname', sh.el).value.trim();
      if (!n) { $('#gname', sh.el).focus(); return toast('Give them a name', false); }
      const r = Store.addScoutGuest(scoutId, n);
      if (r === null) { toast('Convoy is full', false); return; }
      if (r === false) { toast('Already on the list', false); return; }
      sh.close(); toast(`${n} added to the crew`); App.render();
    };
    $('#gadd', sh.el).addEventListener('click', go);
    $('#gname', sh.el).addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) go(); });
  }

  return { home, parts, part, tracks, track, garage, auth, onboard, community, trackById, difficultyOf: id => trackById[id]?.difficulty, logoSVG };
})();
