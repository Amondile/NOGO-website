NOGO.seed = {
  user: { id: 'u1', name: 'Demo User', email: 'demo@nogo.app' },
  assets: [
    NOGO.makeAsset({ id: 'a1', name: "John's Phone", type: 'Phone', deviceId: 'PH-1001', lat: -26.2041, lng: 28.0473, battery: 82, lastSeen: Date.now() - 5000 }),
    NOGO.makeAsset({ id: 'a2', name: 'Toyota Corolla', type: 'Vehicle', deviceId: 'VH-2002', lat: -26.1952, lng: 28.0340, battery: 100, lastSeen: Date.now() - 12000 }),
    NOGO.makeAsset({ id: 'a3', name: 'My Backpack', type: 'Tracker', deviceId: 'TR-3003', lat: -26.2150, lng: 28.0600, online: false, lastSeen: Date.now() - 8 * 60000 })
  ]
};
