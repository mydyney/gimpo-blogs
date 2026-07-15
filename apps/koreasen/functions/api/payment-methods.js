import { json, sameOrigin, readJson } from '../_lib/http.js';

const KEY = 'enabled_payment_methods';
const VALID = ['wechat', 'apple', 'card', 'kakao', 'naver', 'payco'];
const DEFAULTS = VALID.slice();

function isAdminHost(request, env) {
  return new URL(request.url).hostname === (env.ADMIN_HOST || 'admin.mytokyomate.com');
}

export async function onRequestGet({ env }) {
  let enabled = DEFAULTS;
  try {
    if (env.SITE_CONFIG) {
      const stored = await env.SITE_CONFIG.get(KEY, 'json');
      if (Array.isArray(stored)) enabled = stored.filter((item) => VALID.includes(item));
    }
  } catch (error) { enabled = DEFAULTS; }
  return json({ enabled }, { headers: { 'Cache-Control': 'public, max-age=30' } });
}

export async function onRequestPut({ request, env }) {
  if (!isAdminHost(request, env) || !sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, { status: 403 });
  if (!env.SITE_CONFIG) return json({ ok: false, error: 'kv_not_configured' }, { status: 501 });
  let data;
  try { data = await readJson(request, 2048); } catch (error) {
    return json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
  const enabled = Array.isArray(data.enabled) ? [...new Set(data.enabled.filter((item) => VALID.includes(item)))] : [];
  if (!enabled.includes('card')) return json({ ok: false, error: 'card_required' }, { status: 400 });
  await env.SITE_CONFIG.put(KEY, JSON.stringify(enabled));
  return json({ ok: true, enabled }, { headers: { 'Cache-Control': 'no-store' } });
}
