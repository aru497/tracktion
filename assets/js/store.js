/* Tracktion — client state (localStorage). Stands in for a real backend.
 * Swap these methods for API calls when you build the Supabase/Node backend;
 * the rest of the app only talks to Store, never to localStorage directly. */
window.Store = (function () {
  const KEY = 'tracktion.v1';
  const seed = {
    user: null,                 // { name, email, provider }
    garage: [],                 // [{ id, make, model, fitKey, variant, year, name }]
    activeRigId: null,
    alerts: [],                 // [{ id, partId, target, current, createdAt, triggered }]
    savedParts: [],             // [partId]
    savedTracks: [],            // [trackId]
    suggestions: [],            // community-submitted tracks (track shape + status)
    people: {},                 // display name -> avatar url (from public profiles)
    prefs: null,                // { types: [], maxDiff: 'medium', range: 300 }
    posts: [
      { id: 'p_fake1', type: 'warning', author: 'DmaxDan', trackId: 'yalwal', lat: -34.87, lng: 150.42, body: 'Huge tree down blocking the main track. Winch or chainsaw required to get through.', createdAt: Date.now() - 14400000, comments: [] },
      { id: 'p_fake2', type: 'condition', author: 'PradoPete', trackId: 'stockton', lat: -32.80, lng: 152.00, body: 'Sand is extremely soft at the entrance today. Air down to 15psi before you hit the soft stuff.', createdAt: Date.now() - 7200000, comments: [ { author: 'Sandy', body: 'Thanks for the heads up!', createdAt: Date.now() - 3600000 } ] }
    ],                  // community feed: warnings / conditions / trips
    scouts: [],                 // events/convoys: { id,title,trackId,date,capacity,notes,host,members[],inviteOnly,requests[] }
    location: null,             // { lat, lng, label, source }
    onboarded: false
  };
  let state = load();
  const subs = new Set();
  // Optional backend adapter (Supabase). When set, mutations also persist to
  // the server; when null, the app is fully offline on localStorage.
  let adapter = null;
  function setAdapter(a) { adapter = a; }
  const fire = (op, ...args) => { try { adapter && adapter[op] && adapter[op](...args); } catch (e) { console.warn('adapter', op, e); } };

  function load() {
    try { return Object.assign({}, seed, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch { return { ...seed }; }
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(state)); subs.forEach(f => f(state)); }
  function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  const uid = () => Math.random().toString(36).slice(2, 9);

  // Replace in-memory state from an authoritative server fetch (no adapter echo).
  function hydrate(data) { state = Object.assign({ ...seed }, state, data); save(); }
  function reset() { state = { ...seed }; save(); }

  // ---- auth -------------------------------------------------------------
  function login(user) { state.user = user; save(); }
  function logout() { state.user = null; save(); }

  // ---- garage -----------------------------------------------------------
  function addRig(v) {
    const rig = { id: uid(), ...v, name: `${v.year || ''} ${v.make} ${v.model}`.trim() };
    state.garage.push(rig);
    if (!state.activeRigId) state.activeRigId = rig.id;
    save(); fire('rigAdded', rig); return rig;
  }
  function removeRig(id) {
    state.garage = state.garage.filter(r => r.id !== id);
    if (state.activeRigId === id) state.activeRigId = state.garage[0]?.id || null;
    save(); fire('rigRemoved', id);
  }
  function setActiveRig(id) { state.activeRigId = id; save(); fire('activeRigSet', id); }
  function activeRig() { return state.garage.find(r => r.id === state.activeRigId) || null; }

  // ---- fitment ----------------------------------------------------------
  // A part fits if it's universal, or its fit[] includes the active rig's fitKey.
  function fits(part, rig = activeRig()) {
    if (part.fit === 'universal') return true;
    if (!rig) return null;                       // unknown until a rig is chosen
    return part.fit.includes(rig.fitKey);
  }

  // ---- saved ------------------------------------------------------------
  function toggleSavedPart(id) {
    const i = state.savedParts.indexOf(id);
    i < 0 ? state.savedParts.push(id) : state.savedParts.splice(i, 1);
    save(); fire('savedPartSet', id, i < 0); return i < 0;
  }
  function toggleSavedTrack(id) {
    const i = state.savedTracks.indexOf(id);
    i < 0 ? state.savedTracks.push(id) : state.savedTracks.splice(i, 1);
    save(); fire('savedTrackSet', id, i < 0); return i < 0;
  }

  // ---- price-drop alerts ------------------------------------------------
  function addAlert(partId, current, target) {
    const a = { id: uid(), partId, target, current, createdAt: Date.now(), triggered: false };
    state.alerts = state.alerts.filter(x => x.partId !== partId).concat(a);
    save(); fire('alertAdded', a); return a;
  }
  function removeAlert(id) { const a = state.alerts.find(x => x.id === id); state.alerts = state.alerts.filter(a => a.id !== id); save(); fire('alertRemoved', id, a); }
  function alertFor(partId) { return state.alerts.find(a => a.partId === partId) || null; }
  // demo: simulate a market price drop so the alert flow is visible in the prototype
  function simulateDrop(id) {
    const a = state.alerts.find(x => x.id === id); if (!a) return;
    a.current = a.target; a.triggered = true; a.triggeredAt = Date.now(); save();
  }

  // ---- community route suggestions --------------------------------------
  function addSuggestion(t) {
    const s = { ...t, id: 's_' + uid(), status: 'pending', community: true, createdAt: Date.now() };
    state.suggestions.push(s);
    save(); fire('suggestionAdded', s); return s;
  }
  function removeSuggestion(id) {
    const s = state.suggestions.find(x => x.id === id);
    state.suggestions = state.suggestions.filter(x => x.id !== id);
    save(); fire('suggestionRemoved', id, s);
  }
  function suggestions() { return state.suggestions || []; }
  function suggestionById(id) { return (state.suggestions || []).find(s => s.id === id) || null; }

  // ---- preferences & track matching --------------------------------------
  function setPrefs(p) { state.prefs = p; save(); fire('prefsSet', p); }
  function prefs() { return state.prefs; }
  const DIFF_N = { easy: 1, medium: 2, hard: 3, extreme: 4 };
  // 0..100 match: terrain fit (45) + difficulty comfort (25) + proximity (30)
  function matchScore(track, loc = state.location, p = state.prefs) {
    if (!p) return null;
    let s = 0;
    if (p.types && p.types.length) s += p.types.includes(track.type) ? 45 : 12;
    else s += 30;
    const want = DIFF_N[p.maxDiff || 'medium'], got = DIFF_N[track.difficulty] || 2;
    if (got <= want) s += got === want ? 25 : 18;         // within comfort; sweet spot = at your level
    else s += Math.max(0, 25 - (got - want) * 12);         // above comfort: penalise
    if (loc) {
      const d = window.distanceKm(loc, track);
      const range = p.range || 300;
      s += Math.round(30 * Math.exp(-d / range));
    } else s += 15;
    return Math.min(100, Math.round(s));
  }

  // ---- community posts ----------------------------------------------------
  function addPost(p) {
    const post = { id: 'p_' + uid(), ...p, author: state.user ? state.user.name : 'Scout',
      createdAt: Date.now(), comments: [] };
    state.posts.unshift(post);
    save(); fire('postAdded', post); return post;
  }
  function removePost(id) { const p = state.posts.find(x=>x.id===id); state.posts = state.posts.filter(x => x.id !== id); save(); fire('postRemoved', id, p); }
  function addComment(postId, body) {
    const p = state.posts.find(x=>x.id===postId);
    if (!p) return null;
    if (!p.comments) p.comments = [];
    const c = { author: state.user ? state.user.name : 'Scout', body, createdAt: Date.now() };
    p.comments.push(c);
    save(); fire('commentAdded', postId, c); return c;
  }
  // kudos — Strava-style likes; likes[] holds display names
  function toggleLike(postId) {
    const p = state.posts.find(x=>x.id===postId);
    if (!p) return null;
    if (!p.likes) p.likes = [];
    const me = state.user ? state.user.name : 'Scout';
    const i = p.likes.indexOf(me);
    i < 0 ? p.likes.push(me) : p.likes.splice(i, 1);
    save(); fire('likeSet', postId, i < 0); return i < 0;
  }
  function posts() { return state.posts || []; }

  // ---- scouts (events / convoys) ------------------------------------------
  function addScout(sc) {
    const me = state.user ? state.user.name : 'Scout';
    const scout = { id: 'sc_' + uid(), ...sc, host: me, members: [me], guests: [], requests: [], createdAt: Date.now() };
    state.scouts.unshift(scout);
    save(); fire('scoutAdded', scout); return scout;
  }
  const goingCount = (sc) => (sc.members ? sc.members.length : 0) + (sc.guests ? sc.guests.length : 0);
  function toggleScoutJoin(id) {
    const sc = state.scouts.find(x => x.id === id); if (!sc) return false;
    const me = state.user ? state.user.name : 'Scout';
    const i = sc.members.indexOf(me);
    if (i < 0) return false;   // joining is request+approval only; hosts add directly
    sc.members.splice(i, 1);   // leaving is always allowed
    save(); fire('scoutJoinSet', id, false); return false;
  }
  // host adds a mate directly (works for people not on the app yet)
  function addScoutGuest(id, name) {
    const sc = state.scouts.find(x => x.id === id); if (!sc || !name) return false;
    if (!sc.guests) sc.guests = [];
    if (sc.members.includes(name) || sc.guests.includes(name)) return false;
    if (sc.capacity && goingCount(sc) >= sc.capacity) return null;
    sc.guests.push(name);
    save(); fire('scoutGuestAdded', id, name); return true;
  }
  function removeScoutGuest(id, name) {
    const sc = state.scouts.find(x => x.id === id); if (!sc || !sc.guests) return;
    sc.guests = sc.guests.filter(g => g !== name);
    save(); fire('scoutGuestRemoved', id, name);
  }
  function requestJoinScout(id) {
    const sc = state.scouts.find(x => x.id === id); if (!sc) return false;
    const me = state.user ? state.user.name : 'Scout';
    if (!sc.requests) sc.requests = [];
    if (!sc.requests.includes(me) && !sc.members.includes(me)) {
      sc.requests.push(me);
      save(); fire('scoutRequested', id, me); return true;
    }
    return false;
  }
  function approveScoutRequest(id, reqUser) {
    const sc = state.scouts.find(x => x.id === id); if (!sc) return false;
    if (sc.capacity && goingCount(sc) >= sc.capacity) return false;
    if (sc.requests && sc.requests.includes(reqUser)) {
      sc.requests = sc.requests.filter(u => u !== reqUser);
      if (!sc.members.includes(reqUser)) sc.members.push(reqUser);
      save(); fire('scoutApproved', id, reqUser); return true;
    }
    return false;
  }
  function removeScout(id) { const s = state.scouts.find(x=>x.id===id); state.scouts = state.scouts.filter(x => x.id !== id); save(); fire('scoutRemoved', id, s); }
  function scouts() { return state.scouts || []; }

  // ---- location ---------------------------------------------------------
  function setLocation(loc) { state.location = loc; save(); }
  // profile photo lookup (Google DPs etc.); falls back to your own auth avatar
  function avatarOf(name) {
    if (!name) return null;
    if (state.people && state.people[name]) return state.people[name];
    if (state.user && state.user.name === name && state.user.avatar) return state.user.avatar;
    return null;
  }
  function location() { return state.location; }

  function setOnboarded() { state.onboarded = true; save(); }
  function get() { return state; }

  return {
    get, subscribe, setAdapter, hydrate, reset,
    login, logout,
    addRig, removeRig, setActiveRig, activeRig, fits,
    toggleSavedPart, toggleSavedTrack,
    addAlert, removeAlert, alertFor, simulateDrop,
    addSuggestion, removeSuggestion, suggestions, suggestionById,
    setPrefs, prefs, matchScore,
    addPost, removePost, addComment, toggleLike, posts,
    addScout, toggleScoutJoin, requestJoinScout, approveScoutRequest, removeScout, scouts,
    addScoutGuest, removeScoutGuest, avatarOf,
    setLocation, location, setOnboarded
  };
})();

/* haversine distance in km — used to sort tracks by "near you" */
window.distanceKm = function (a, b) {
  const R = 6371, toR = d => d * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
};
