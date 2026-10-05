/* NOGO service layer. The UI calls ONLY NOGO.api. Interface:
 *   getUser() -> User            listAssets() -> Asset[]
 *   addAsset({name,type,deviceId}) -> Asset
 *   subscribe(fn(asset)) -> unsubscribe     (live location / status pushes)
 *   sendRing(assetId) -> RingCommand        stopRing(commandId) -> RingCommand
 */
(function () {
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  class MockProvider {
    constructor() {
      this.assets = clone(NOGO.seed.assets); this.subs = new Set(); this.rings = {};
      this.timer = setInterval(() => this.#tick(), 3000);
    }
    #emit(a) { this.subs.forEach((f) => f(clone(a))); }
    #tick() { // simulated GPS: online assets drift and refresh timestamps
      this.assets.forEach((a) => {
        if (!a.status.online || !a.location) return;
        const step = a.type === 'Vehicle' ? 0.0007 : 0.0002, now = Date.now();
        a.location.lat += (Math.random() - 0.5) * step * 2; a.location.lng += (Math.random() - 0.5) * step * 2;
        a.location.address = 'Near ' + a.location.lat.toFixed(4) + ', ' + a.location.lng.toFixed(4);
        a.location.updatedAt = a.status.lastSeen = now; this.#emit(a);
      });
    }
    async getUser() { return NOGO.auth.getSession(); }
    async listAssets() { await wait(50); return clone(this.assets); }
    async addAsset({ name, type, deviceId }) {
      if (!name || !deviceId || !NOGO.ASSET_TYPES.includes(type)) throw new Error('Name, type and device ID are required.');
      if (this.assets.some((a) => a.deviceId.toLowerCase() === deviceId.trim().toLowerCase())) throw new Error('That device ID is already registered.');
      await wait(200);
      const base = this.assets[0].location; // new devices appear near the map centre until a real fix arrives
      const a = NOGO.makeAsset({ name, type, deviceId, lat: base.lat + (Math.random() - .5) * .02, lng: base.lng + (Math.random() - .5) * .02, battery: 100 });
      this.assets.push(a); return clone(a);
    }
    subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); }
    // ---- RING: replace this pair with a real Android command later (FCM push / Traccar command) ----
    async sendRing(assetId) {
      const a = this.assets.find((x) => x.id === assetId);
      const cmd = { id: 'r_' + Date.now(), assetId, status: NOGO.RING_STATUS.SENDING, sentAt: Date.now() };
      if (!a || a.type !== 'Phone') throw Object.assign(new Error('Only phones can ring.'), { code: 'NOT_PHONE' });
      await wait(900);
      if (!a.status.online) { cmd.status = NOGO.RING_STATUS.FAILED; cmd.error = 'Phone is offline. Command not delivered.'; return cmd; }
      cmd.status = NOGO.RING_STATUS.RINGING; this.rings[cmd.id] = cmd;
      setTimeout(() => { if (this.rings[cmd.id]) this.rings[cmd.id].status = NOGO.RING_STATUS.STOPPED; }, 30000);
      return clone(cmd);
    }
    async stopRing(id) { await wait(300); const c = this.rings[id] || { id }; c.status = NOGO.RING_STATUS.STOPPED; delete this.rings[id]; return clone(c); }
  }

  /* Traccar mapping (to implement next; same interface, UI untouched):
   *  listAssets : GET /api/devices + GET /api/positions  -> Asset (device.status==='online' -> status.online)
   *  addAsset   : POST /api/devices {name, uniqueId:deviceId, category:type.toLowerCase()}
   *  subscribe  : WebSocket /api/socket -> {positions:[], devices:[]} -> fn(asset)
   *  sendRing   : POST /api/commands/send {deviceId, type:'custom', attributes:{data:'NOGO_RING'}}
   *               (needs an Android client app that handles the command) */
  class TraccarProvider {
    constructor(baseUrl) { this.baseUrl = baseUrl; }
    async getUser() { throw new Error('Not implemented'); }
    async listAssets() { throw new Error('Not implemented'); }
    async addAsset() { throw new Error('Not implemented'); }
    subscribe() { throw new Error('Not implemented'); }
    async sendRing() { throw new Error('Not implemented'); }
    async stopRing() { throw new Error('Not implemented'); }
  }

  NOGO.MockProvider = MockProvider; NOGO.TraccarProvider = TraccarProvider;
  NOGO.api = new MockProvider(); // swap here: new TraccarProvider('https://your-traccar-host')
})();
