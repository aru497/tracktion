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
    const [g, a, sp, st, sug, prof, posts, likes, pcomments, scouts, members] = await Promise.all([
      sb.from('garage_vehicles').select('*').order('created_at'),
      sb.from('price_alerts').select('*'),
      sb.from('saved_parts').select('part_id'),
      sb.from('saved_tracks').select('track_id'),
      sb.from('track_suggestions').select('*').order('created_at', { ascending: false }),
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('community_posts').select('*').order('created_at', { ascending: false }).limit(100),
      sb.from('post_likes').select('post_id,user_name'),
      sb.from('post_comments').select('post_id,author,body,created_at').order('created_at'),
      sb.from('scouts').select('*').gte('date', new Date(Date.now() - 86400000).toISOString().slice(0, 10)).order('date'),
      sb.from('scout_members').select('scout_id,member_name')
    ]);
    const membersByScout = {};
    (members.data || []).forEach(m => (membersByScout[m.scout_id] = membersByScout[m.scout_id] || []).push(m.member_name));
    const likesByPost = {}, commentsByPost = {};
    (likes.data || []).forEach(l => (likesByPost[l.post_id] = likesByPost[l.post_id] || []).push(l.user_name));
    (pcomments.data || []).forEach(c => (commentsByPost[c.post_id] = commentsByPost[c.post_id] || []).push({ author: c.author, body: c.body, createdAt: Date.parse(c.created_at) }));
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
      })),
      prefs: prof.data?.prefs || null,
      onboarded: !!(prof.data?.prefs),
      posts: (posts.data || []).map(r => ({
        id: r.id, type: r.type, body: r.body, trackId: r.track_id, lat: r.lat, lng: r.lng,
        label: r.label, author: r.author || 'Scout', vehicle: r.vehicle, mine: r.user_id === uid,
        likes: likesByPost[r.id] || [], comments: commentsByPost[r.id] || [],
        createdAt: Date.parse(r.created_at)
      })),
      scouts: (scouts.data || []).map(r => ({
        id: r.id, title: r.title, trackId: r.track_id, date: r.date, capacity: r.capacity,
        notes: r.notes, host: r.host_name || 'Scout', hostIsMe: r.host_id === uid,
        members: membersByScout[r.id] || [], createdAt: Date.parse(r.created_at)
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
      },
      async prefsSet(p) {
        await sb.from('profiles').update({ prefs: p }).eq('id', uid);
      },
      async postAdded(p) {
        await sb.from('community_posts').insert({
          user_id: uid, author: p.author, vehicle: p.vehicle, type: p.type, body: p.body,
          track_id: p.trackId, lat: p.lat, lng: p.lng, label: p.label
        });
        resync();
      },
      async postRemoved(_id, p) {
        if (p) await sb.from('community_posts').delete().eq('user_id', uid).eq('body', p.body);
        resync();
      },
      async likeSet(postId, on) {
        const me = (await sb.from('profiles').select('name').eq('id', uid).maybeSingle()).data?.name || 'Scout';
        if (on) await sb.from('post_likes').upsert({ post_id: postId, user_id: uid, user_name: me });
        else await sb.from('post_likes').delete().eq('post_id', postId).eq('user_id', uid);
        // no resync — the UI already flipped optimistically
      },
      async commentAdded(postId, c) {
        await sb.from('post_comments').insert({ post_id: postId, user_id: uid, author: c.author, body: c.body });
        // local state already has it; resync would lose scroll position
      },
      async scoutAdded(sc) {
        const { data } = await sb.from('scouts').insert({
          host_id: uid, host_name: sc.host, title: sc.title, track_id: sc.trackId,
          date: sc.date, capacity: sc.capacity, notes: sc.notes
        }).select('id').single();
        if (data) await sb.from('scout_members').insert({ scout_id: data.id, user_id: uid, member_name: sc.host });
        resync();
      },
      async scoutJoinSet(id, joined) {
        const me = (await sb.from('profiles').select('name').eq('id', uid).maybeSingle()).data?.name || 'Scout';
        if (joined) await sb.from('scout_members').insert({ scout_id: id, user_id: uid, member_name: me });
        else await sb.from('scout_members').delete().eq('scout_id', id).eq('user_id', uid);
        resync();
      },
      async scoutRemoved(id) {
        await sb.from('scouts').delete().eq('id', id).eq('host_id', uid);
        resync();
      }
    };
  }

  return { init, isOn, client, currentUser, onAuth, signInEmail, signInOAuth, signOut, fetchState, adapter, uid: () => curUid };
})();
