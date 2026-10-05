/* Map adapter. app.js only uses this interface, so the map engine is swappable:
 *   flyTo([lat,lng],zoom) panTo([lat,lng]) fitBounds([[lat,lng]..]) getZoom()
 *   setMarker(id,[lat,lng],html,onClick) showMe([lat,lng]) invalidate() */
(function () {
  const CENTER = [-26.2041, 28.0473];
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  const banner = (msg) => { const d = document.createElement('div'); d.className = 'note'; d.style.cssText = 'position:absolute;z-index:700;left:12px;right:12px;top:70px;background:#fff;padding:10px 14px;border-radius:14px;box-shadow:0 2px 12px #0003'; d.textContent = msg; document.getElementById('view-map').appendChild(d); };

  async function google(el, key, onDrag) {
    window.gm_authFailure = () => banner('Google Maps rejected the API key. Check the key, billing and that "Maps JavaScript API" is enabled.');
    await loadScript(`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&v=weekly`);
    const { Map } = await google_.importLibrary('maps'), { AdvancedMarkerElement } = await google_.importLibrary('marker');
    const map = new Map(el, { center: { lat: CENTER[0], lng: CENTER[1] }, zoom: 13, disableDefaultUI: true, gestureHandling: 'greedy', mapId: 'DEMO_MAP_ID' });
    map.addListener('dragstart', onDrag);
    const ll = (p) => ({ lat: p[0], lng: p[1] }), markers = {}; let me = null;
    return {
      flyTo: (p, z) => { map.panTo(ll(p)); if (z) map.setZoom(z); }, panTo: (p) => map.panTo(ll(p)), getZoom: () => map.getZoom(),
      fitBounds: (pts) => { const b = new google_.LatLngBounds(); pts.forEach((p) => b.extend(ll(p))); map.fitBounds(b, 80); },
      setMarker(id, p, html, onClick) {
        if (!markers[id]) { const c = document.createElement('div'); c.style.transform = 'translateY(50%)';
          markers[id] = new AdvancedMarkerElement({ map, position: ll(p), content: c }); markers[id].addListener('click', onClick); }
        markers[id].position = ll(p); markers[id].content.innerHTML = html;
      },
      showMe(p) { const d = document.createElement('div'); d.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 6px #0006';
        if (me) me.position = ll(p); else me = new AdvancedMarkerElement({ map, position: ll(p), content: d }); },
      invalidate() {}
    };
  }
  const google_ = { get importLibrary() { return window.google.maps.importLibrary; }, get LatLngBounds() { return window.google.maps.LatLngBounds; } };

  async function leaflet(el, onDrag) {
    const map = L.map(el, { zoomControl: false }).setView(CENTER, 13), markers = {}; let me = null;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    el.classList.add('mono'); map.on('dragstart', onDrag);
    return {
      flyTo: (p, z) => map.flyTo(p, z || map.getZoom()), panTo: (p) => map.panTo(p), getZoom: () => map.getZoom(),
      fitBounds: (pts) => map.fitBounds(pts, { padding: [60, 60] }),
      setMarker(id, p, html, onClick) {
        const icon = L.divIcon({ className: '', iconSize: [40, 40], iconAnchor: [20, 20], html });
        if (!markers[id]) markers[id] = L.marker(p, { icon }).addTo(map).on('click', onClick); else markers[id].setLatLng(p).setIcon(icon);
      },
      showMe(p) { if (me) me.setLatLng(p); else me = L.circleMarker(p, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map); },
      invalidate: () => map.invalidateSize()
    };
  }

  NOGO.createMap = async (el, { onDrag }) => {
    const key = (window.NOGO_CONFIG || {}).GOOGLE_MAPS_API_KEY;
    if (key) { try { return await google(el, key, onDrag); } catch (e) { banner('Could not load Google Maps. Using fallback map.'); } }
    return leaflet(el, onDrag);
  };
})();
