/* Tracktion — Supabase backend adapter.
 * If config + the supabase-js CDN are present, this turns on real auth and
 * cloud persistence. Otherwise Backend.isOn() is false and app.js stays on the
 * localStorage path. The app only ever talks to Store; Store talks to this.
 */
window.Backend = (function () {
  let sb = null, configured = false, curUid = null;

  function init() {
    const c = window.TRACKTION_CONFIG || {};
    if (!c.supabaseUrl || !c.supabaseAnonKey || !window.supabase) return false;
    sb = window.supabase.createClient(c.supabaseUrl, c.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    configured = true;
    return true;
  }
  const isOn = () => configured;
  const client = () => sb;

  // ---- auth -------------------------------------------------------------
  async function currentUser() { const { data } = await sb.auth.getUser(); return data.user || null; }
  function onAuth(cb) { sb.auth.onAuthStateChange((_e, session) => cb(session ? session.user : null)); }
  function signInEmail(email) {
    return sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href.split('#')[0] } });
  }
  function signInOAuth(provider) {
    return sb.auth.signInWithOAuth({ provider, options: { redirectTo: location.href.split('#')[0] } });
  }
  function signOut() { return sb.auth.signOut(); }

  // ---- read: hydrate Store from the user's rows -------------------------
  async function fetchState(uid) {
    curUid = uid;
    const [g, a, sp, st, sug, prof] = await Promise.all([
      sb.from('garage_vehicles').select('*').order('created_at'),
      sb.from('price_alerts').select('*'),
      sb.from('saved_parts').select('part_id'),
      sb.from('saved_tracks').select('track_id'),
      sb.from('track_suggestions').select('*').order('created_at', { ascending: false }),
      sb.from('profiles').select('*').eq('id', uid).maybeSingle()
    ]);
    const garage = (g.data || []).map(r => ({
      id: r.id, make: r.make, model: r.model, fitKey: r.fit_key,
      variant: r.variant || '', years: r.years || '',
      name: `${r.make} ${r.model}`.trim()
    }));
    const activeRow = (g.data || []).find(r => r.is_active);
    return {
      user: { name: prof.data?.name || 'Mate', email: prof.data?.email || '', provider: 'supabase' },
      garage,
      activeRigId: activeRow ? activeRow.id : (garage[0]?.id || null),
      alerts: (a.data || []).map(r => ({
        id: r.id, partId: r.part_id, target: +r.target,
        current: +(r.baseline ?? r.target), triggered: r.triggered,
        createdAt: Date.parse(r.created_at)
      })),
      savedParts: (sp.data || []).map(r => r.part_id),
      savedTracks: (st.data || []).map(r => r.track_id),
      suggestions: (sug.data || []).map(r => ({
        id: r.id, name: r.name, region: r.region, state: r.state, lat: r.lat, lng: r.lng,
        difficulty: r.difficulty, type: r.type, lengthKm: r.length_km, hours: +r.hours,
        blurb: r.blurb, needs: r.needs || [], season: r.season, permit: r.permit, dog: r.dog,
        status: r.status, community: true, createdAt: Date.parse(r.created_at)
      }))
    };
  }

  async function ensureSingleActive(uid) {
    const { data } = await sb.from('garage_vehicles').select('id,is_active,created_at')
      .eq('user_id', uid).order('created_at');
    if (!data || !data.length) return;
    const actives = data.filter(r => r.is_active);
    const keep = (actives[actives.length - 1] || data[data.length - 1]).id;
    await sb.from('garage_vehicles').update({ is_active: false }).eq('user_id', uid).neq('id', keep);
    await sb.from('garage_vehicles').update({ is_active: true }).eq('id', keep);
  }

  // ---- write adapter (Store fires these; we persist + re-sync) ----------
  function adapter(uid) {
    const resync = () => window.App && App.resync && App.resync();
    return {
      async rigAdded(rig) {
        await sb.from('garage_vehicles').insert({
          user_id: uid, fit_key: rig.fitKey, make: rig.make, model: rig.model,
          variant: rig.variant, years: rig.years, is_active: true
        });
        await ensureSingleActive(uid); resync();
      },
      async rigRemoved(id) {
        await sb.from('garage_vehicles').delete().eq('id', id);
        await ensureSingleActive(uid); resync();
      },
      async activeRigSet(id) {
        await sb.from('garage_vehicles').update({ is_active: false }).eq('user_id', uid);
        await sb.from('garage_vehicles').update({ is_active: true }).eq('id', id);
        resync();
      },
      async alertAdded(al) {
        await sb.from('price_alerts').upsert(
          { user_id: uid, part_id: al.partId, target: al.target, baseline: al.current, triggered: false, notified: false },
          { onConflict: 'user_id,part_id' });
        resync();
      },
      async alertRemoved(_id, al) {
        if (al) await sb.from('price_alerts').delete().eq('user_id', uid).eq('part_id', al.partId);
        resync();
      },
      async savedPartSet(id, on) {
        on ? await sb.from('saved_parts').upsert({ user_id: uid, part_id: id })
           : await sb.from('saved_parts').delete().eq('user_id', uid).eq('part_id', id);
      },
      async savedTrackSet(id, on) {
        on ? await sb.from('saved_tracks').upsert({ user_id: uid, track_id: id })
           : await sb.from('saved_tracks').delete().eq('user_id', uid).eq('track_id', id);
      },
      async suggestionAdded(s) {
        await sb.from('track_suggestions').insert({
          user_id: uid, name: s.name, region: s.region, state: s.state, lat: s.lat, lng: s.lng,
          difficulty: s.difficulty, type: s.type, length_km: s.lengthKm, hours: s.hours,
          blurb: s.blurb, needs: s.needs, season: s.season, permit: s.permit, dog: s.dog, status: 'pending'
        });
        resync();
      },
      async suggestionRemoved(_id, s) {
        // local ids are temporary; match the user's most recent matching row
        if (s) await sb.from('track_suggestions').delete().eq('user_id', uid).eq('name', s.name).eq('lat', s.lat).eq('lng', s.lng);
        resync();
      }
    };
  }

  return { init, isOn, client, currentUser, onAuth, signInEmail, signInOAuth, signOut, fetchState, adapter, uid: () => curUid };
})();
