/* Tracktion — router, chrome, map, bootstrap */
window.App = (function () {
  const { $, $$, el, icon } = UI;
  const DB = window.DB;
  let mapObj = null, markers = [], curDiff = 'all';

  const TABS = [
    { route: '/community', label: 'Community', ic: 'user' },
    { route: '/home',      label: 'Discover',  ic: 'compass' },
    { route: '/parts',     label: 'Parts',     ic: 'parts' },
    { route: '/tracks',    label: 'Tracks',    ic: 'map' },
    { route: '/garage',    label: 'Garage',    ic: 'garage' }
  ];

  function routeParts() {
    const h = (location.hash || '#/community').replace(/^#/, '');
    return h.split('/').filter(Boolean); // ['part','maxtrax-mkii']
  }

  function currentTab() {
    const p = routeParts()[0] || 'community';
    const map = { home: '/home', parts: '/parts', part: '/parts', tracks: '/tracks', track: '/tracks', community: '/community', garage: '/garage' };
    return map[p] || '/community';
  }

  // ---- chrome (top + bottom bars) --------------------------------------
  function chrome() {
    const s = Store.get(), loc = Store.location();
    const initials = s.user ? s.user.name.split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : 'ME';
    return `
    <header class="topbar"><div class="wrap">
      <a class="brand" href="#/community"><span class="logo">${Views.logoSVG()}</span><b><span class="fwd">4WD</span>Scout</b></a>
      <nav class="desknav" id="desknav">
        ${TABS.map(t => `<a href="#${t.route}" data-r="${t.route}">${t.label}</a>`).join('')}
      </nav>
      <button class="loc-pill" id="locpill">${icon('pin')}<span id="loclabel">${loc ? UI.esc(loc.label) : 'Set location'}</span></button>
      <a class="avatar-btn" href="#/garage" aria-label="Garage">${initials}</a>
    </div></header>
    <main id="main" class="app"></main>
    <nav class="tabbar">
      ${TABS.map(t => `<button class="tab" data-r="${t.route}">${icon(t.ic)}<span>${t.label}</span></button>`).join('')}
    </nav>`;
  }

  function refreshChrome() {
    const loc = Store.location();
    const ll = $('#loclabel'); if (ll && loc) ll.textContent = loc.label;
    const tab = currentTab();
    $$('.tabbar .tab').forEach(b => b.classList.toggle('active', b.dataset.r === tab));
    $$('#desknav a').forEach(a => a.classList.toggle('active', a.dataset.r === tab));
  }

  // ---- render a view ----------------------------------------------------
  function render() {
    if (!Store.get().user) return mountAuth();
    if (!Store.get().onboarded) return mountOnboard();
    const [p, arg] = routeParts();
    let v;
    switch (p) {
      case 'parts':     v = Views.parts(arg); break;
      case 'part':      v = Views.part(arg); break;
      case 'tracks':    v = Views.tracks(); break;
      case 'track':     v = Views.track(arg); break;
      case 'home':      v = Views.home(); break;
      case 'community':
      default:          v = Views.community(arg); break;
    }
    const main = $('#main');
    main.innerHTML = v.html;
    window.scrollTo({ top: 0 });
    refreshChrome();
    if (v.map) initMap();
    v.after && v.after(main);
    UI.reveal(main);
  }

  function mountAuth() {
    document.body.innerHTML = '<div id="root"></div>';
    const root = $('#root');
    const v = Views.auth();
    root.innerHTML = v.html;
    v.after && v.after(root);
  }

  function mountOnboard() {
    // Already showing? Never stack a second popup (nav/auth events re-enter here).
    if (document.getElementById('ob-scrim')) return;
    // Ensure the main app shell exists in the background
    if (!document.getElementById('main')) {
      document.body.innerHTML = chrome();
      $$('.tabbar .tab').forEach(b => b.addEventListener('click', () => nav(b.dataset.r)));
      $('#locpill').addEventListener('click', openLocSheet);
    }
    
    // Render the community view in the background so it's not empty
    const main = $('#main');
    const bgView = Views.community();
    main.innerHTML = bgView.html;
    bgView.after && bgView.after(main);

    // Create a styled popup modal over the app
    const scrim = UI.el('<div class="scrim show" id="ob-scrim" style="z-index:9999; background:rgba(28,26,22,.8); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);"></div>');
    const modal = UI.el('<div id="root" class="sheet show" style="z-index:10000; top:50%; left:50%; transform:translate(-50%,-50%); bottom:auto; border-radius:24px; padding:32px 24px; width:92%; max-width:480px; box-shadow:0 20px 40px rgba(0,0,0,.3); max-height:85vh;"></div>');
    
    const v = Views.onboard();
    modal.innerHTML = v.html;
    document.body.append(scrim, modal);
    v.after && v.after(modal);
    UI.reveal(modal);
  }

  function nav(route) { if (location.hash === '#' + route) render(); else location.hash = '#' + route; }

  // ---- map --------------------------------------------------------------
  function pinIcon(diff, suggested) {
    return L.divIcon({ className: '', html: `<div class="pin d-${diff}${suggested ? ' suggested' : ''}"></div>`, iconSize: [26, 26], iconAnchor: [13, 24] });
  }
  // base map styles — terrain (topo, great for 4WD), satellite, dark (Strava-ish)
  function baseLayers() {
    return {
      terrain: [L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        subdomains: 'abc', maxZoom: 17, attribution: '&copy; OpenTopoMap (CC-BY-SA)' })],
      satellite: [
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19, attribution: '&copy; Esri, Maxar, Earthstar Geographics' }),
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19 })
      ],
      dark: [darkLayer()]
    };
  }
  // OpenFreeMap dark (vector via MapLibre) with a CARTO raster fallback if the CDN/WebGL is unavailable
  function darkLayer() {
    if (window.L && L.maplibreGL && window.maplibregl) {
      try {
        return L.maplibreGL({ style: 'https://tiles.openfreemap.org/styles/dark',
          attribution: '&copy; OpenFreeMap &copy; OpenMapTiles' });
      } catch (e) { /* fall through */ }
    }
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' });
  }
  let baseGroup = [], curBase = 'terrain';
  function setBase(name) {
    if (!mapObj) return;
    baseGroup.forEach(l => mapObj.removeLayer(l));
    baseGroup = (baseLayers()[name] || baseLayers().terrain);
    baseGroup.forEach(l => { l.addTo(mapObj); if (l.bringToBack) l.bringToBack(); });
    curBase = name;
    document.body.classList.toggle('map-dark', name !== 'terrain');
  }
  function initMap() {
    const loc = Store.location() || { lat: -33.87, lng: 151.21 };
    mapObj = L.map('map', { zoomControl: false, attributionControl: true }).setView([loc.lat, loc.lng], 6);
    L.control.zoom({ position: 'bottomright' }).addTo(mapObj);
    setBase(curBase);
    $$('#mapstyle button').forEach(b => b.addEventListener('click', () => {
      $$('#mapstyle button').forEach(x => x.classList.toggle('on', x === b));
      setBase(b.dataset.base);
    }));
    if (Store.location()) {
      L.marker([loc.lat, loc.lng], { icon: L.divIcon({ className: '', html: '<div class="pin me"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }) })
        .addTo(mapObj).bindTooltip('You');
    }
    drawMarkers();
    // filter chips
    $$('#mapfilters .chip').forEach(c => c.addEventListener('click', () => {
      curDiff = c.dataset.diff;
      $$('#mapfilters .chip').forEach(x => x.classList.toggle('on', x === c));
      drawMarkers();
    }));
    setTimeout(() => mapObj.invalidateSize(), 60);
  }
  function drawMarkers() {
    markers.forEach(m => mapObj.removeLayer(m)); markers = [];
    const loc = Store.location();
    const source = DB.tracks.concat(Store.suggestions());
    const list = source
      .filter(t => curDiff === 'all' || t.difficulty === curDiff)
      .map(t => ({ t, d: loc ? distanceKm(loc, t) : null }))
      .sort((a, b) => (a.d ?? 1e9) - (b.d ?? 1e9));
    list.forEach(({ t }) => {
      const m = L.marker([t.lat, t.lng], { icon: pinIcon(t.difficulty, t.community) }).addTo(mapObj);
      m.on('click', () => nav('/track/' + t.id));
      m.bindTooltip(t.community ? t.name + ' (your suggestion)' : t.name, { direction: 'top', offset: [0, -20] });
      markers.push(m);
    });
    // panel list
    const lst = $('#trklist');
    if (lst) {
      lst.innerHTML = list.map(({ t, d }) => `<a class="track-mini" href="#/track/${t.id}">
        <div class="track-ico d-${t.difficulty}" style="background:var(--${t.difficulty}-wash);color:var(--${t.difficulty})">${icon(UI.typeIcon[t.type] || 'map')}</div>
        <div class="grow"><div class="spread"><b style="font-size:14.5px">${UI.esc(t.name)}</b>${d!=null?`<span class="meta">${d} km</span>`:''}</div>
        <div class="meta" style="font-size:12px">${UI.esc(t.region)}, ${t.state}</div>
        <div class="row" style="gap:6px;margin-top:5px"><span class="tag d-${t.difficulty}" style="font-size:9px"><span class="dot d-${t.difficulty}"></span>${t.difficulty}</span><span class="tag" style="font-size:9px">${t.lengthKm}km · ${t.hours}h</span>${t.community?'<span class="tag" style="font-size:9px;background:var(--olive-wash);color:var(--olive);border:0">Yours</span>':''}</div></div>
      </a>`).join('');
      $('#trkcount').textContent = `${list.length} track${list.length!==1?'s':''}`;
      const nr = $('#trknear'); if (nr && loc) nr.textContent = `nearest ${list[0]?.d ?? '–'} km`;
    }
  }

  // ---- location ---------------------------------------------------------
  function detectLocation(interactive) {
    if (!navigator.geolocation) { if (interactive) UI.toast('Geolocation not available', false); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { Store.setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'Near you', source: 'gps' });
        refreshChrome(); if (mapObj) { mapObj.setView([pos.coords.latitude, pos.coords.longitude], 7); render(); }
        if (interactive) UI.toast('Location updated'); },
      () => { if (!Store.location()) Store.setLocation({ lat: -33.87, lng: 151.21, label: 'Sydney, NSW', source: 'default' });
        refreshChrome(); if (interactive) UI.toast('Using Sydney as default', false); },
      { timeout: 8000 }
    );
  }
  function openLocSheet() {
    const cities = [
      ['Sydney, NSW', -33.87, 151.21], ['Newcastle, NSW', -32.93, 151.78], ['Brisbane, QLD', -27.47, 153.03],
      ['Melbourne, VIC', -37.81, 144.96], ['Adelaide, SA', -34.93, 138.60], ['Perth, WA', -31.95, 115.86],
      ['Cairns, QLD', -16.92, 145.77]
    ];
    const sh = UI.sheet(`<h3 class="display" style="font-size:20px">Your location</h3>
      <p class="muted" style="margin:6px 0 16px">We use it to sort tracks by distance and centre the map.</p>
      <button class="btn btn-clay btn-block" id="usegps" style="margin-bottom:14px">${icon('pin')} Use my current location</button>
      <div class="divider">or pick a city</div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        ${cities.map(c => `<button class="btn btn-ghost" data-lat="${c[1]}" data-lng="${c[2]}" data-l="${c[0]}">${c[0]}</button>`).join('')}
      </div>`);
    $('#usegps', sh.el).addEventListener('click', () => { sh.close(); detectLocation(true); });
    $$('[data-lat]', sh.el).forEach(b => b.addEventListener('click', () => {
      Store.setLocation({ lat: +b.dataset.lat, lng: +b.dataset.lng, label: b.dataset.l, source: 'city' });
      sh.close(); refreshChrome(); render();
    }));
  }

  // ---- bootstrap --------------------------------------------------------
  function mountApp() {
    document.body.innerHTML = chrome();
    $$('.tabbar .tab').forEach(b => b.addEventListener('click', () => nav(b.dataset.r)));
    $('#locpill').addEventListener('click', openLocSheet);
    render();
    if (!Store.location()) detectLocation(false);
  }

  let lastUid = null;
  async function onAuthChanged(user) {
    if (user) {
      // Same user + something already on screen (app OR onboarding wizard):
      // ignore repeat auth events (token refresh / tab focus) — remounting
      // would kick an in-progress wizard back to step 1.
      if (user.id === lastUid && (document.getElementById('main') || document.getElementById('root'))) return;
      lastUid = user.id;
      try {
        const data = await Backend.fetchState(user.id);
        Store.hydrate(data);
        Store.setAdapter(Backend.adapter(user.id));
      } catch (e) { console.warn('hydrate failed, offline cache', e); }
      mountApp();
    } else {
      lastUid = null;
      Store.setAdapter(null);
      Store.reset();
      mountAuth();
    }
  }

  // Called by the backend adapter after a mutation to refresh from the server.
  async function resync() {
    const uid = Backend.uid && Backend.uid(); if (!uid) return;
    try {
      const data = await Backend.fetchState(uid);
      // Mid-onboarding: absorb the fresh data quietly but do NOT re-render —
      if (!Store.get().onboarded && !data.onboarded) { delete data.onboarded; delete data.prefs; Store.hydrate(data); return; }
      if (data.onboarded && !Store.get().onboarded) {
        // If the other tab finished onboarding, close ours and render
        Store.hydrate(data);
        const obScrim = document.getElementById('ob-scrim');
        if (obScrim) obScrim.remove();
        const rootNode = document.getElementById('root');
        if (rootNode) rootNode.remove();
        return render();
      }
      Store.hydrate(data);
      if (document.getElementById('main')) { render(); } else { mountApp(); }
    } catch (e) { console.warn('resync', e); }
  }

  async function signOut() {
    if (Backend.isOn()) { await Backend.signOut(); }   // onAuth fires -> mountAuth
    else { Store.logout(); mountAuth(); }
  }

  async function boot() {
    if (Backend.init()) {
      Backend.onAuth((user) => onAuthChanged(user));
      const user = await Backend.currentUser();
      await onAuthChanged(user);
      return;
    }
    // offline path (localStorage prototype)
    if (!Store.get().user) return mountAuth();
    mountApp();
  }

  window.addEventListener('hashchange', () => { if (document.getElementById('main')) render(); });
  document.addEventListener('DOMContentLoaded', boot);

  return { nav, boot, render, refreshChrome, detectLocation, resync, signOut };
})();
