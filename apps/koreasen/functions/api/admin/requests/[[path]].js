import { json, sameOrigin, readJson, cleanText } from '../../../_lib/http.js';
import { validLocale, statusLabel, notificationText } from '../../../_lib/locale.js';

function isAdminHost(request, env) {
  return new URL(request.url).hostname === (env.ADMIN_HOST || 'admin.mytokyomate.com');
}

function mapRow(row) {
  return {
    id: row.id, email: row.email, name: row.name,
    sel: JSON.parse(row.selections_json), form: JSON.parse(row.form_json),
    locale: validLocale(row.locale), statusCode: row.status_code,
    status: statusLabel(row.status_code, row.locale), createdAt: row.created_at,
    guide: row.guide_title ? { title: row.guide_title, body: row.guide_body, locale: validLocale(row.guide_locale || row.locale), registeredAt: row.guide_created_at } : null,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!isAdminHost(request, env)) return json({ ok: false, error: 'forbidden' }, { status: 403 });
  if (!env.DB) return json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  const rest = new URL(request.url).pathname.replace(/^\/api\/admin\/requests\/?/, '').split('/').filter(Boolean);

  if (request.method === 'GET' && rest.length === 0) {
    const localeParam = new URL(request.url).searchParams.get('locale');
    const locale = localeParam && localeParam !== 'all' ? validLocale(localeParam) : null;
    const sql = `SELECT r.*, u.email, u.name, g.title AS guide_title, g.body AS guide_body, g.locale AS guide_locale, g.created_at AS guide_created_at
      FROM travel_requests r JOIN users u ON u.id = r.user_id LEFT JOIN guides g ON g.request_id = r.id
      WHERE r.status_code NOT IN ('payment_pending', 'payment_waiting', 'payment_failed', 'payment_canceled')${locale ? ' AND r.locale = ?' : ''}
      ORDER BY r.created_at DESC LIMIT 200`;
    const result = locale ? await env.DB.prepare(sql).bind(locale).all() : await env.DB.prepare(sql).all();
    return json({ requests: (result.results || []).map(mapRow) });
  }

  if (request.method === 'PUT' && rest.length === 2 && rest[1] === 'guide') {
    if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, { status: 403 });
    let data;
    try { data = await readJson(request, 16384); } catch (error) {
      return json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    const title = cleanText(data.title, 120);
    const body = String(data.body || '').trim().slice(0, 12000);
    const locale = validLocale(data.locale);
    if (!title || !body) return json({ ok: false, error: 'invalid_guide' }, { status: 400 });
    const target = await env.DB.prepare('SELECT id, user_id, locale FROM travel_requests WHERE id = ?').bind(rest[0]).first();
    if (!target) return json({ ok: false, error: 'not_found' }, { status: 404 });
    if (await env.DB.prepare('SELECT request_id FROM guides WHERE request_id = ?').bind(rest[0]).first()) {
      return json({ ok: false, error: 'guide_exists' }, { status: 409 });
    }
    const now = Date.now();
    const notificationId = 'N-' + crypto.randomUUID();
    const guideLocale = validLocale(target.locale || locale);
    const params = { title };
    await env.DB.batch([
      env.DB.prepare('INSERT INTO guides (request_id, title, body, locale, created_at) VALUES (?, ?, ?, ?, ?)').bind(rest[0], title, body, guideLocale, now),
      env.DB.prepare('UPDATE travel_requests SET status = ?, status_code = ?, updated_at = ? WHERE id = ?').bind(statusLabel('guide_arrived', 'ko'), 'guide_arrived', now, rest[0]),
      env.DB.prepare('INSERT INTO notifications (id, user_id, request_id, text, event_code, event_params_json, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)')
        .bind(notificationId, target.user_id, rest[0], notificationText('guide_arrived', params, guideLocale), 'guide_arrived', JSON.stringify(params), now),
    ]);
    return json({ ok: true, status: statusLabel('guide_arrived', guideLocale), guide: { title, body, locale: guideLocale, registeredAt: now } });
  }

  return json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
}
