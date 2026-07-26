/* Tracktion — views. Each view returns { html, after?(root) }.
 * App (app.js) mounts the html and calls after() for wiring + map init. */
window.Views = (function () {
  const { icon, money, esc, stars, toast, sheet, $, $$ } = UI;
  const DB = window.DB;

  const catById  = Object.fromEntries(DB.categories.map(c => [c.id, c]));
  const partById = Object.fromEntries(DB.parts.map(p => [p.id, p]));
  const trackById= Object.fromEntries(DB.tracks.map(t => [t.id, t]));
  // official tracks + the user's own community suggestions
  const getTrack = (id) => trackById[id] || Store.suggestionById(id);
  const allTracks = () => DB.tracks.concat(Store.suggestions());

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
    return `<div class="thumb c-${p.category}">${icon(catById[p.category].glyph)}</div>`;
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
    const near = [...DB.tracks]
      .map(t => ({ t, d: loc ? distanceKm(loc, t) : null }))
      .sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9)).slice(0, 3);
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

        <a class="searchbar reveal" href="#/parts" style="margin:16px 0 22px">
          ${icon('search')}<input placeholder="Search parts — snorkel, lift kit, boards…" readonly>
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
          <h3 style="font-size:16px">Tracks near you</h3>
          <a class="meta" href="#/tracks" style="color:var(--clay)">Open map</a>
        </div>
        <div class="grid" style="grid-template-columns:1fr">
          ${near.map(({t,d}) => trackRow(t, d)).join('')}
        </div>
        <div style="height:20px"></div>
      </div></div>` };
  }

  function trackRow(t, d) {
    return `<a class="card card-hover reveal" href="#/track/${t.id}" style="display:flex;gap:0;overflow:hidden">
      <div class="track-ico d-${t.difficulty}" style="border-radius:0;width:64px;background:var(--${t.difficulty}-wash);color:var(--${t.difficulty})">${icon(UI.typeIcon[t.type])}</div>
      <div class="card-pad" style="flex:1;padding:14px 16px">
        <div class="spread"><b style="font-size:15px">${esc(t.name)}</b>${d!=null?`<span class="tag">${d} km</span>`:''}</div>
        <div class="meta" style="margin:2px 0 8px">${esc(t.region)}, ${t.state}</div>
        <div class="row" style="gap:8px"><span class="tag d-${t.difficulty}"><span class="dot d-${t.difficulty}"></span>${t.difficulty}</span>
        <span class="tag">${icon('ruler')} ${t.lengthKm} km</span><span class="tag">${icon('clock')} ${t.hours}h</span></div>
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
            <button class="btn btn-ghost" id="savebtn" aria-pressed="${save}">${icon(save?'heartF':'heart')}</button>
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
          <button data-base="terrain" class="on">Terrain</button>
          <button data-base="satellite">Satellite</button>
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
        <div style="position:relative;height:170px;background:var(--${t.difficulty}-wash);display:grid;place-items:center;color:var(--${t.difficulty})">
          <div class="topo"></div>
          <span style="position:relative;transform:scale(2.4)">${icon(UI.typeIcon[t.type])}</span>
        </div>
        <div class="card-pad">
          <div class="spread"><div><div class="eyebrow">${esc(t.region)}, ${t.state}</div>
          <h1 class="display" style="font-size:26px;margin-top:4px">${esc(t.name)}</h1></div>
          <button class="btn btn-ghost" id="savetrk" aria-pressed="${saved}">${icon(saved?'heartF':'heart')}</button></div>
          <div class="row wrap-r" style="gap:8px;margin-top:12px">
            <span class="tag d-${t.difficulty}"><span class="dot d-${t.difficulty}"></span>${t.difficulty}</span>
            <span class="tag">${icon(UI.typeIcon[t.type])} ${t.type}</span>
            <span class="tag">${icon('ruler')} ${t.lengthKm} km</span>
            <span class="tag">${icon('clock')} ${t.hours}h</span>
            ${d!=null?`<span class="tag">${icon('pin')} ${d} km away</span>`:''}
            ${t.permit?`<span class="tag tag-best">Permit required</span>`:''}
            ${community?`<span class="tag" style="background:var(--olive-wash);color:var(--olive);border:0">${icon('user')} Community · pending review</span>`:''}
          </div>
          <p class="muted" style="margin:16px 0 0">${esc(t.blurb)}</p>
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
      ${rigs.length ? `<div class="grid" style="grid-template-columns:1fr;gap:10px">${rigs.map(r => `
        <div class="card garage-vehicle ${r.id===s.activeRigId?'':''}" style="${r.id===s.activeRigId?'border-color:var(--clay);box-shadow:0 0 0 3px var(--clay-wash)':''}">
          <div class="rig-badge">${icon('garage')}</div>
          <div class="grow stack"><b>${esc(r.name)}</b><span class="meta" style="font-size:12px">${esc(r.variant||'Base')} · ${r.years||''}</span></div>
          ${r.id===s.activeRigId?'<span class="tag tag-fit">Active</span>':`<button class="btn btn-ghost btn-sm" data-active="${r.id}">Set active</button>`}
          <button class="btn btn-ghost btn-sm" data-remove="${r.id}" aria-label="Remove">${icon('x')}</button>
        </div>`).join('')}</div>`
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
          <a class="track-ico d-${t.difficulty}" href="#/track/${t.id}" style="border-radius:0;width:60px;background:var(--${t.difficulty}-wash);color:var(--${t.difficulty})">${icon(UI.typeIcon[t.type]||'map')}</a>
          <a class="card-pad" href="#/track/${t.id}" style="flex:1;padding:12px 14px">
            <div class="spread"><b style="font-size:14.5px">${esc(t.name)}</b><span class="tag" style="background:var(--olive-wash);color:var(--olive);border:0">Pending</span></div>
            <div class="meta" style="font-size:12px">${esc(t.region)}, ${t.state} · ${t.difficulty}</div>
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
        <div class="topo"></div>
        <div style="position:relative" class="row"><span style="width:34px;height:34px">${logoSVG()}</span><b class="wordmark" style="font-size:23px;color:#F7F5F1"><span style="color:#C9855F">4WD</span>Scout</b></div>
        <div style="position:relative">
          <div class="eyebrow" style="color:#C9855F">For people who air down</div>
          <h1 class="display" style="font-size:42px;line-height:1.05;margin:14px 0;max-width:14ch">Know it fits. Find the track.</h1>
          <p style="color:#C4BEB2;max-width:34ch;font-size:15px">Compare 4WD parts across every Aussie retailer by your exact rig — then go wheel the best tracks near you.</p>
        </div>
        <div class="stat-strip" style="position:relative">
          <div><div class="n">14</div><span class="meta" style="color:#8C877C">retailers compared</span></div>
          <div><div class="n">17</div><span class="meta" style="color:#8C877C">tracks mapped</span></div>
          <div><div class="n">$0</div><span class="meta" style="color:#8C877C">to use, always</span></div>
        </div>
      </div>
      <div class="auth-formside">
        <div class="auth-card">
          <img src="assets/img/wordmark.png" alt="4WDScout" style="height:38px;width:auto;margin-bottom:10px;display:block">
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
    return `<img src="assets/img/logo.png" alt="4WDScout" draggable="false"
      style="width:100%;height:100%;object-fit:contain;border-radius:23%;display:block">`;
  }

  return { home, parts, part, tracks, track, garage, auth, trackById, difficultyOf: id => trackById[id]?.difficulty, logoSVG };
})();
