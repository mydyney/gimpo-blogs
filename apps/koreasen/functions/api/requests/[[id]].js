import { json, sameOrigin, readJson } from '../../_lib/http.js';
import { requireUser } from '../../_lib/auth.js';
import { validSelections, validForm } from '../../_lib/catalog.js';

function requestId(url) {
  const rest = new URL(url).pathname.replace(/^\/api\/requests\/?/, '');
  return rest ? rest.split('/')[0] : '';
}

function mapRow(row) {
  return {
    id: row.id,
    email: row.email,
    sel: JSON.parse(row.selections_json),
    form: JSON.parse(row.form_json),
    status: row.status,
    guide: row.guide_title ? { title: row.guide_title, body: row.guide_body, registeredAt: row.guide_created_at } : null,
    createdAt: row.created_at,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;
  const id = requestId(request.url);

  if (request.method === 'GET') {
    const base = `SELECT r.*, u.email, g.title AS guide_title, g.body AS guide_body, g.created_at AS guide_created_at
      FROM travel_requests r JOIN users u ON u.id = r.user_id LEFT JOIN guides g ON g.request_id = r.id
      WHERE r.user_id = ?`;
    if (id) {
      const row = await env.DB.prepare(base + ' AND r.id = ?').bind(auth.user.id, id).first();
      return row ? json({ request: mapRow(row) }) : json({ ok: false, error: 'not_found' }, { status: 404 });
    }
    const result = await env.DB.prepare(base + ' ORDER BY r.created_at DESC LIMIT 100').bind(auth.user.id).all();
    return json({ requests: (result.results || []).map(mapRow) });
  }

  if (request.method === 'POST' && !id) {
    if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, { status: 403 });
    let data;
    try { data = await readJson(request, 16384); } catch (error) {
      return json({ ok: false, error: 'invalid_request' }, { status: 400 });
    }
    const selections = validSelections(data.sel);
    const form = validForm(data.form);
    if (!selections || !form) return json({ ok: false, error: 'invalid_request' }, { status: 400 });
    const now = Date.now();
    const newId = 'R-' + crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO travel_requests (id, user_id, selections_json, form_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(newId, auth.user.id, JSON.stringify(selections), JSON.stringify(form), '가이드 작성 중', now, now).run();
    return json({ ok: true, request: { id: newId, email: auth.user.email, sel: selections, form, status: '가이드 작성 중', guide: null, createdAt: now } }, { status: 201 });
  }

  return json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
}

