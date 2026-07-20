import { json, sameOrigin } from '../_lib/http.js';

const KEY = 'enabled_payment_methods';
const CARD_ONLY = ['card'];

function isAdminHost(request, env) {
  return new URL(request.url).hostname === (env.ADMIN_HOST || 'admin.mytokyomate.com');
}

export async function onRequestGet({ env }) {
  return json({ enabled: CARD_ONLY }, { headers: { 'Cache-Control': 'public, max-age=30' } });
}

export async function onRequestPut({ request, env }) {
  if (!isAdminHost(request, env) || !sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, { status: 403 });
  if (!env.SITE_CONFIG) return json({ ok: false, error: 'kv_not_configured' }, { status: 501 });
  await env.SITE_CONFIG.put(KEY, JSON.stringify(CARD_ONLY));
  return json({ ok: true, enabled: CARD_ONLY }, { headers: { 'Cache-Control': 'no-store' } });
}
