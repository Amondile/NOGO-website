/* NOGO data model. Plain objects + JSDoc, so any backend can map into these shapes.
 * User          {id, name, email}
 * Location      {lat, lng, address, updatedAt:ms}
 * DeviceStatus  {online:boolean, lastSeen:ms, battery:0-100|null}
 * Asset         {id, name, type, deviceId, location:Location|null, status:DeviceStatus}
 * RingCommand   {id, assetId, status:'sending'|'ringing'|'stopped'|'failed', sentAt:ms, error?:string}
 */
window.NOGO = window.NOGO || {};
NOGO.ASSET_TYPES = ['Phone', 'Vehicle', 'Tracker', 'Bag', 'Other'];
NOGO.RING_STATUS = { SENDING: 'sending', RINGING: 'ringing', STOPPED: 'stopped', FAILED: 'failed' };
NOGO.makeAsset = ({ id, name, type, deviceId, lat, lng, online = true, lastSeen = Date.now(), battery = null }) => ({
  id: id || 'a_' + Math.random().toString(36).slice(2, 9),
  name: String(name).trim(), type, deviceId: String(deviceId).trim(),
  location: lat == null ? null : { lat, lng, address: 'Near ' + lat.toFixed(4) + ', ' + lng.toFixed(4), updatedAt: lastSeen },
  status: { online, lastSeen, battery }
});
