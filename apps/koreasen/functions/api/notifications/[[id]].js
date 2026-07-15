import { json, sameOrigin } from '../../_lib/http.js';
import { requireUser } from '../../_lib/auth.js';
import { notificationText, validLocale } from '../../_lib/locale.js';

function notificationId(url) {
  return new URL(url).pathname.replace(/^\/api\/notifications\/?/, '').split('/')[0] || '';
}

function mapRow(row) {
  let params = {};
  try { params = JSON.parse(row.event_params_json || '{}'); } catch (error) { params = {}; }
  const locale = validLocale(row.request_locale || row.preferred_locale);
  const text = row.event_code ? notificationText(row.event_code, params, locale) : row.text;
  return { id: row.id, reqId: row.request_id, eventCode: row.event_code || null, params, text, read: Boolean(row.is_read), ts: row.created_at };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT n.id, n.request_id, n.text, n.event_code, n.event_params_json, n.is_read, n.created_at,
        r.locale AS request_locale, u.preferred_locale
       FROM notifications n JOIN users u ON u.id = n.user_id
       LEFT JOIN travel_requests r ON r.id = n.request_id
       WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 100`
    ).bind(auth.user.id).all();
    return json({ notifications: (result.results || []).map(mapRow) });
  }

  const id = notificationId(request.url);
  if (request.method === 'PUT' && id) {
    if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, { status: 403 });
    const result = await env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').bind(id, auth.user.id).run();
    if (!result.meta || result.meta.changes < 1) return json({ ok: false, error: 'not_found' }, { status: 404 });
    return json({ ok: true });
  }

  return json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
}
