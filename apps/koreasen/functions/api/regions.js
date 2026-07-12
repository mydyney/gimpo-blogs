// Shared "which regions are visible" config, backed by Cloudflare KV.
//   GET  /api/regions            → { visible: string[] | null }  (public, edge-cached)
//   PUT  /api/regions {visible}   → { ok, visible }              (admin host only)
//
// null "visible" means "not configured → show all" (fail-open) so a KV/config
// hiccup never blanks the site. Writes are allowed only on the admin host, which
// _middleware.js already guards with Basic Auth.

const KEY = 'visible_regions';
const VALID = ['tokyo', 'kanto', 'kansai', 'kyushu', 'hokkaido', 'okinawa'];

function json(body, init) {
  init = init || {};
  const headers = Object.assign(
    { 'Content-Type': 'application/json; charset=UTF-8' },
    init.headers || {}
  );
  return new Response(JSON.stringify(body), { status: init.status || 200, headers });
}

export async function onRequestGet(context) {
  const { env } = context;
  let visible = null;
  try {
    if (env.SITE_CONFIG) {
      const raw = await env.SITE_CONFIG.get(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) visible = parsed.filter((x) => VALID.includes(x));
      }
    }
  } catch (e) { visible = null; }
  // Short edge cache keeps KV reads well within the free tier; admin changes
  // propagate to visitors within ~30s.
  return json({ visible }, { headers: { 'Cache-Control': 'public, max-age=30' } });
}

export async function onRequestPut(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const adminHost = env.ADMIN_HOST || 'admin.mytokyomate.com';
  if (url.hostname !== adminHost) {
    return json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  if ((origin && origin !== url.origin) || (fetchSite && fetchSite !== 'same-origin')) {
    return json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return json({ ok: false, error: 'invalid_content_type' }, { status: 415 });
  }
  if (Number(request.headers.get('Content-Length') || 0) > 2048) {
    return json({ ok: false, error: 'payload_too_large' }, { status: 413 });
  }
  if (!env.SITE_CONFIG) {
    return json({ ok: false, error: 'kv_not_configured' }, { status: 501 });
  }
  let data;
  try { data = await request.json(); } catch (e) {
    return json({ ok: false, error: 'bad_json' }, { status: 400 });
  }
  const visible = Array.isArray(data && data.visible)
    ? [...new Set(data.visible.filter((x) => VALID.includes(x)))]
    : [];
  if (visible.length === 0) return json({ ok: false, error: 'at_least_one_region' }, { status: 400 });
  await env.SITE_CONFIG.put(KEY, JSON.stringify(visible));
  return json({ ok: true, visible }, { headers: { 'Cache-Control': 'no-store' } });
}
