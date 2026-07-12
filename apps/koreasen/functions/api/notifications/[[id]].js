import { json, sameOrigin } from '../../_lib/http.js';
import { requireUser } from '../../_lib/auth.js';

function notificationId(url) {
  return new URL(url).pathname.replace(/^\/api\/notifications\/?/, '').split('/')[0] || '';
}

function mapRow(row) {
  return { id: row.id, reqId: row.request_id, text: row.text, read: Boolean(row.is_read), ts: row.created_at };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT id, request_id, text, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
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

