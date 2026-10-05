/* NOGO UI. Talks to data ONLY through NOGO.api. */
(function () {
  const { api, ASSET_TYPES, RING_STATUS } = NOGO;
  const $ = (s) => document.querySelector(s);
  const ICON = { Phone: '📱', Vehicle: '🚗', Tracker: '📍', Bag: '🎒', Other: '📦' };
  let assets = [], selId = null, follow = false, ring = null, me = null;
  const markers = {};

  // ---------- helpers ----------
  const ago = (ts) => { const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    return s < 5 ? 'just now' : s < 60 ? s + ' seconds ago' : s < 3600 ? Math.round(s / 60) + ' minutes ago' : Math.round(s / 3600) + ' hours ago'; };
  const stamp = (a) => (a.status.online ? 'Updated ' : 'Last seen ') + ago(a.status.lastSeen);
  const pill = (a) => `<span class="pill ${a.status.online ? 'on' : ''}"><span class="dot"></span>${a.status.online ? 'Online' : 'Offline'}</span>`;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const get = (id) => assets.find((a) => a.id === id);

  // ---------- MAP (engine lives in js/map.js) ----------
  let M = null;
  const pinHtml = (a) => `<div class="pin ${a.status.online ? '' : 'off'} ${a.id === selId ? 'sel' : ''}">${ICON[a.type] || ICON.Other}</div>`;
  function syncMarkers() {
    if (!M) return;
    assets.forEach((a) => { if (a.location) M.setMarker(a.id, [a.location.lat, a.location.lng], pinHtml(a), () => select(a.id, false)); });
  }
  $('#locate').onclick = () => navigator.geolocation
    ? navigator.geolocation.getCurrentPosition((p) => { const ll = [p.coords.latitude, p.coords.longitude]; M.showMe(ll); M.flyTo(ll, 16); }, () => alert('Location permission denied.'))
    : alert('Geolocation not supported.');

  // ---------- SELECTED ASSET CARD ----------
  function select(id, fly = true) {
    selId = id; follow = false; const a = get(id);
    if (fly && a && a.location) M.flyTo([a.location.lat, a.location.lng], Math.max(M.getZoom(), 16));
    syncMarkers(); renderCard();
  }
  function renderCard() {
    const el = $('#card'), a = get(selId); if (!a) { el.hidden = true; return; }
    const loc = a.location;
    let ringBtn = '', note = '';
    if (a.type === 'Phone') {
      const mine = ring && ring.assetId === a.id ? ring : null, st = mine && mine.status;
      ringBtn = st === RING_STATUS.SENDING ? `<button class="btn primary ring" disabled>Sending ring command…</button>`
        : st === RING_STATUS.RINGING ? `<button class="btn primary ring" data-act="stop">🔔 Ringing… tap to stop</button>`
        : `<button class="btn primary ring" data-act="ring">🔔 Ring phone</button>`;
      if (st === RING_STATUS.FAILED) note = `<p class="note">${esc(mine.error || 'Failed')}</p>`;
    }
    el.hidden = false;
    el.innerHTML = `<div class="row"><div><div class="name">${esc(a.name)}</div><div class="sub">${a.type}</div></div>${pill(a)}</div>
      <div class="loc">📍 ${loc ? esc(loc.address) : 'No location yet'}<div class="sub" data-ts="${a.status.lastSeen}" data-on="${a.status.online}">${stamp(a)}</div></div>
      <div class="btns">${ringBtn}
        <button class="btn ${follow ? 'active' : ''}" data-act="live">${follow ? '● Following live' : 'Live Location'}</button>
        <button class="btn" data-act="dir">Directions</button></div>${note}`;
  }
  $('#card').onclick = async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act, a = get(selId); if (!act || !a) return;
    if (act === 'live') { follow = !follow; if (follow && a.location) M.flyTo([a.location.lat, a.location.lng], 17); renderCard(); }
    if (act === 'dir' && a.location) window.open(`https://www.google.com/maps/dir/?api=1&destination=${a.location.lat},${a.location.lng}`, '_blank');
    if (act === 'ring') {
      ring = { assetId: a.id, status: RING_STATUS.SENDING }; renderCard();
      try { ring = await api.sendRing(a.id); } catch (err) { ring = { assetId: a.id, status: RING_STATUS.FAILED, error: err.message }; }
      renderCard();
    }
    if (act === 'stop' && ring) { ring = await api.stopRing(ring.id); renderCard(); }
  };

  // ---------- LIVE UPDATES ----------
  api.subscribe((u) => {
    const i = assets.findIndex((a) => a.id === u.id); if (i < 0) return; assets[i] = u;
    syncMarkers(); if (follow && u.id === selId && u.location) M.panTo([u.location.lat, u.location.lng]);
    if (u.id === selId) { const t = $('#card .loc div'); if (t) { t.dataset.ts = u.status.lastSeen; } }
    renderList();
  });
  setInterval(() => { document.querySelectorAll('[data-ts]').forEach((n) => {
    n.textContent = (n.dataset.on === 'true' ? 'Updated ' : 'Last seen ') + ago(+n.dataset.ts); }); }, 1000);

  // ---------- SEARCH ----------
  $('#search').oninput = (e) => {
    const q = e.target.value.trim().toLowerCase(), box = $('#results');
    const hits = q ? assets.filter((a) => (a.name + ' ' + a.type).toLowerCase().includes(q)) : [];
    box.hidden = !q; box.innerHTML = hits.length ? hits.map((a) => `<button data-id="${a.id}">${ICON[a.type]} ${esc(a.name)} · ${a.type}</button>`).join('') : '<button disabled>No assets found</button>';
  };
  $('#results').onclick = (e) => { const id = e.target.dataset.id; if (!id) return; $('#search').value = ''; $('#results').hidden = true; select(id); };

  // ---------- ASSETS LIST ----------
  function renderList() {
    const el = $('#list'); if (!assets.length) { el.innerHTML = '<p class="empty">No assets yet. Tap Add.</p>'; return; }
    el.innerHTML = assets.map((a) => `<div class="item" data-id="${a.id}"><div class="ico">${ICON[a.type]}</div>
      <div style="flex:1"><div class="name">${esc(a.name)}</div><div class="sub">${a.type}</div>
      <div class="sub" data-ts="${a.status.lastSeen}" data-on="${a.status.online}">${stamp(a)}</div></div>${pill(a)}</div>`).join('');
  }
  $('#list').onclick = (e) => { const id = e.target.closest('.item')?.dataset.id; if (id) { tab('map'); select(id); } };

  // ---------- ADD ASSET ----------
  $('#f-type').innerHTML = ASSET_TYPES.map((t) => `<option>${t}</option>`).join('');
  $('#f-submit').onclick = async () => {
    const btn = $('#f-submit'), err = $('#f-err'); err.textContent = ''; btn.disabled = true;
    try {
      const a = await api.addAsset({ name: $('#f-name').value, type: $('#f-type').value, deviceId: $('#f-device').value });
      assets.push(a); syncMarkers(); renderList(); renderAccount();
      $('#f-name').value = $('#f-device').value = ''; tab('map'); select(a.id);
    } catch (e) { err.textContent = e.message; }
    btn.disabled = false;
  };

  // ---------- ACCOUNT ----------
  let user = null;
  function renderAccount() {
    if (!user) return;
    $('#account').innerHTML = `<div class="item" style="cursor:default"><div class="ico">◯</div><div><div class="name">${esc(user.name)}</div><div class="sub">${esc(user.email)}</div></div></div>
      <div class="item" style="cursor:default"><div><div class="name">${assets.length} assets</div><div class="sub">${assets.filter((a) => a.status.online).length} online</div></div></div>
      <button class="btn" id="logout" style="width:100%">Sign out</button><p class="note">Data source: ${api.constructor.name}</p>`;
  }

  $('#account').onclick = async (e) => { if (e.target.id === 'logout') { await NOGO.auth.logout(); location.href = 'index.html'; } };

  // ---------- NAVIGATION ----------
  function tab(name) {
    document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
    document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    if (name === 'map') setTimeout(() => M && M.invalidate(), 50);
  }
  document.querySelectorAll('nav button').forEach((b) => (b.onclick = () => tab(b.dataset.tab)));

  // ---------- BOOT ----------
  (async () => {
    M = await NOGO.createMap($('#map'), { onDrag: () => { if (follow) { follow = false; renderCard(); } } });
    [user, assets] = await Promise.all([api.getUser(), api.listAssets()]);
    syncMarkers(); renderList(); renderAccount();
    const pts = assets.filter((a) => a.location).map((a) => [a.location.lat, a.location.lng]);
    if (pts.length) M.fitBounds(pts);
  })();
})();
