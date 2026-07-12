import { onRequestPut } from '../functions/api/regions.js';

class FakeKV {
  constructor() { this.map = new Map(); }
  async put(key, value) { this.map.set(key, value); }
}

const env = { SITE_CONFIG: new FakeKV(), ADMIN_HOST: 'admin.mytokyomate.com' };
const makeRequest = (host, visible, origin = `https://${host}`) => new Request(`https://${host}/api/regions`, {
  method: 'PUT',
  headers: { Origin: origin, 'Sec-Fetch-Site': origin === `https://${host}` ? 'same-origin' : 'cross-site', 'Content-Type': 'application/json' },
  body: JSON.stringify({ visible }),
});
const call = (host, visible, origin) => onRequestPut({ request: makeRequest(host, visible, origin), env });
const assert = (value, message) => { if (!value) throw new Error(message); };

assert((await call('mytokyomate.com', ['tokyo'])).status === 403, 'public host write accepted');
assert((await call('admin.mytokyomate.com', ['tokyo'], 'https://evil.example')).status === 403, 'cross-origin write accepted');
assert((await call('admin.mytokyomate.com', [])).status === 400, 'empty region list accepted');
const saved = await call('admin.mytokyomate.com', ['tokyo', 'kansai', 'kansai', 'invalid']);
assert(saved.status === 200, 'valid region update failed');
assert(env.SITE_CONFIG.map.get('visible_regions') === JSON.stringify(['tokyo', 'kansai']), 'region list was not sanitized');
console.log('PASS regions: host/origin guard, minimum one, dedupe and allowlist');
