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

  // ---- location ---------------------------------------------------------
  function setLocation(loc) { state.location = loc; save(); }
  function location() { return state.location; }

  function setOnboarded() { state.onboarded = true; save(); }
  function get() { return state; }

  return {
    get, subscribe, setAdapter, hydrate, reset,
    login, logout,
    addRig, removeRig, setActiveRig, activeRig, fits,
    toggleSavedPart, toggleSavedTrack,
    addAlert, removeAlert, alertFor, simulateDrop,
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
