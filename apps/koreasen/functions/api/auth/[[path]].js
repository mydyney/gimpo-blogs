import { json, sameOrigin, readJson, cleanText } from '../../_lib/http.js';
import {
  PBKDF2_ITERATIONS, normalizeEmail, validEmail, validPassword,
  bytesToBase64Url, base64UrlToBytes, sha256, hashPassword, safeEqual,
  createSession, getSession, sessionCookie,
} from '../../_lib/auth.js';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

async function rateKey(request, email) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  return sha256(ip + '|' + email);
}

async function registerFailure(db, key, current) {
  const expiresAt = Date.now() + LOGIN_WINDOW_MS;
  await db.prepare(
    'INSERT INTO login_attempts (attempt_key, failures, expires_at) VALUES (?, ?, ?) ON CONFLICT(attempt_key) DO UPDATE SET failures = excluded.failures, expires_at = excluded.expires_at'
  ).bind(key, current + 1, expiresAt).run();
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return json({ ok: false, error: 'auth_unavailable' }, { status: 503 });
  const action = new URL(request.url).pathname.replace(/^\/api\/auth\/?/, '').split('/')[0];

  if (request.method === 'GET' && action === 'session') {
    const session = await getSession(request, db);
    return json({ user: session ? { email: session.user.email, name: session.user.name } : null });
  }
  if (request.method !== 'POST' || !sameOrigin(request)) {
    return json({ ok: false, error: request.method === 'POST' ? 'forbidden' : 'method_not_allowed' }, { status: request.method === 'POST' ? 403 : 405 });
  }

  if (action === 'logout') {
    const session = await getSession(request, db);
    if (session) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(session.tokenHash).run();
    return json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie(request, '', 0) } });
  }

  let data;
  try { data = await readJson(request, 4096); } catch (error) {
    return json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }
  const email = normalizeEmail(data.email);
  if (!validEmail(email)) return json({ ok: false, error: 'invalid_email' }, { status: 400 });

  if (action === 'signup') {
    const name = cleanText(data.name, 40);
    if (name.length < 2) return json({ ok: false, error: 'invalid_name' }, { status: 400 });
    if (!validPassword(data.password)) return json({ ok: false, error: 'weak_password' }, { status: 400 });
    if (await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first()) {
      return json({ ok: false, error: 'account_exists' }, { status: 409 });
    }
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const passwordHash = await hashPassword(data.password, salt);
    const user = { id: crypto.randomUUID(), email, name };
    try {
      await db.prepare(
        'INSERT INTO users (id, email, name, password_hash, password_salt, password_iterations, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(user.id, email, name, passwordHash, bytesToBase64Url(salt), PBKDF2_ITERATIONS, Date.now()).run();
    } catch (error) {
      return json({ ok: false, error: 'account_exists' }, { status: 409 });
    }
    const session = await createSession(request, db, user);
    return json({ ok: true, user: { email, name } }, { status: 201, headers: { 'Set-Cookie': session.cookie } });
  }

  if (action === 'login') {
    if (typeof data.password !== 'string' || data.password.length > 128) return json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
    const attemptKey = await rateKey(request, email);
    const attempt = await db.prepare('SELECT failures, expires_at FROM login_attempts WHERE attempt_key = ?').bind(attemptKey).first();
    const failures = attempt && attempt.expires_at > Date.now() ? Number(attempt.failures) : 0;
    if (failures >= MAX_FAILURES) return json({ ok: false, error: 'too_many_attempts' }, { status: 429 });
    const user = await db.prepare(
      'SELECT id, email, name, password_hash, password_salt, password_iterations FROM users WHERE email = ?'
    ).bind(email).first();
    let valid = false;
    if (user) {
      const candidate = await hashPassword(data.password, base64UrlToBytes(user.password_salt), Number(user.password_iterations));
      valid = safeEqual(candidate, user.password_hash);
    } else {
      await hashPassword(data.password || 'invalid-password', crypto.getRandomValues(new Uint8Array(16)));
    }
    if (!valid) {
      await registerFailure(db, attemptKey, failures);
      return json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
    }
    await db.prepare('DELETE FROM login_attempts WHERE attempt_key = ?').bind(attemptKey).run();
    await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now()).run();
    const session = await createSession(request, db, user);
    return json({ ok: true, user: { email: user.email, name: user.name } }, { headers: { 'Set-Cookie': session.cookie } });
  }

  return json({ ok: false, error: 'not_found' }, { status: 404 });
}
