import { json, sameOrigin, readJson, cleanText } from '../../_lib/http.js';
import {
  normalizeEmail, validEmail, sha256, safeEqual, createSession, getSession, sessionCookie,
} from '../../_lib/auth.js';
import { validLocale, authEmail } from '../../_lib/locale.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function validPurpose(value) {
  return value === 'login' || value === 'signup';
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const number = new DataView(bytes.buffer).getUint32(0) % 1000000;
  return String(number).padStart(6, '0');
}

async function codeHash(id, code, secret) {
  return sha256(id + '|' + code + '|' + secret);
}

async function sendCode(env, email, code, locale) {
  if (!env.RESEND_API_KEY || !env.AUTH_FROM_EMAIL) throw new Error('email_not_configured');
  const copy = authEmail(locale, code);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.AUTH_FROM_EMAIL,
      to: [email],
      subject: copy.subject,
      text: copy.text,
      html: copy.html,
    }),
  });
  if (!response.ok) throw new Error('resend_failed');
}

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  if (!db) return json({ ok: false, error: 'auth_unavailable' }, { status: 503 });
  const action = new URL(request.url).pathname.replace(/^\/api\/auth\/?/, '').split('/')[0];

  if (request.method === 'GET' && action === 'session') {
    const session = await getSession(request, db);
    return json({ user: session ? { email: session.user.email, name: session.user.name, preferredLocale: validLocale(session.user.preferred_locale) } : null });
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
  const purpose = String(data.purpose || '');
  const locale = validLocale(data.locale);
  if (!validEmail(email)) return json({ ok: false, error: 'invalid_email' }, { status: 400 });
  if (!validPurpose(purpose)) return json({ ok: false, error: 'invalid_request' }, { status: 400 });

  const existing = await db.prepare('SELECT id, email, name FROM users WHERE email = ?').bind(email).first();

  if (action === 'request-code') {
    const name = purpose === 'signup' ? cleanText(data.name, 40) : '';
    if (purpose === 'signup' && name.length < 2) return json({ ok: false, error: 'invalid_name' }, { status: 400 });
    if (purpose === 'signup' && existing) return json({ ok: false, error: 'account_exists' }, { status: 409 });

    const latest = await db.prepare('SELECT created_at FROM email_auth_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1').bind(email, purpose).first();
    if (latest && Number(latest.created_at) > Date.now() - RESEND_WAIT_MS) {
      return json({ ok: false, error: 'code_rate_limited' }, { status: 429 });
    }

    // Login requests use the same work and response even for unknown addresses,
    // preventing account discovery through response content or timing.
    if (!env.AUTH_CODE_SECRET) return json({ ok: false, error: 'auth_unavailable' }, { status: 503 });

    const id = crypto.randomUUID();
    const code = randomCode();
    const now = Date.now();
    await db.prepare('DELETE FROM email_auth_codes WHERE expires_at <= ? OR (email = ? AND purpose = ?)').bind(now, email, purpose).run();
    await db.prepare('INSERT INTO email_auth_codes (id, email, purpose, name, code_hash, attempts, locale, created_at, expires_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)')
      .bind(id, email, purpose, name || null, await codeHash(id, code, env.AUTH_CODE_SECRET), locale, now, now + CODE_TTL_MS).run();
    try {
      await sendCode(env, email, code, locale);
    } catch (error) {
      await db.prepare('DELETE FROM email_auth_codes WHERE id = ?').bind(id).run();
      return json({ ok: false, error: 'email_send_failed' }, { status: 502 });
    }
    return json({ ok: true });
  }

  if (action === 'verify-code') {
    const code = String(data.code || '');
    if (!/^\d{6}$/.test(code) || !env.AUTH_CODE_SECRET) return json({ ok: false, error: 'invalid_code' }, { status: 400 });
    const row = await db.prepare('SELECT id, name, code_hash, attempts, locale, expires_at FROM email_auth_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1').bind(email, purpose).first();
    if (!row || Number(row.expires_at) <= Date.now() || Number(row.attempts) >= MAX_ATTEMPTS) {
      return json({ ok: false, error: 'invalid_code' }, { status: 401 });
    }
    const valid = safeEqual(await codeHash(row.id, code, env.AUTH_CODE_SECRET), row.code_hash);
    if (!valid) {
      await db.prepare('UPDATE email_auth_codes SET attempts = attempts + 1 WHERE id = ?').bind(row.id).run();
      return json({ ok: false, error: 'invalid_code' }, { status: 401 });
    }

    let user = existing;
    if (purpose === 'signup') {
      if (existing) return json({ ok: false, error: 'account_exists' }, { status: 409 });
      user = { id: crypto.randomUUID(), email, name: row.name };
      await db.prepare('INSERT INTO users (id, email, name, password_hash, password_salt, password_iterations, preferred_locale, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(user.id, email, user.name, 'email-code-only', '', 0, validLocale(row.locale), Date.now()).run();
    } else if (!user) {
      return json({ ok: false, error: 'invalid_code' }, { status: 401 });
    }

    await db.prepare('DELETE FROM email_auth_codes WHERE email = ?').bind(email).run();
    await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(Date.now()).run();
    const session = await createSession(request, db, user);
    await db.prepare('UPDATE users SET preferred_locale = ? WHERE id = ?').bind(locale, user.id).run();
    return json({ ok: true, user: { email: user.email, name: user.name, preferredLocale: locale } }, { status: purpose === 'signup' ? 201 : 200, headers: { 'Set-Cookie': session.cookie } });
  }

  return json({ ok: false, error: 'not_found' }, { status: 404 });
}
