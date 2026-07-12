import { json } from './http.js';

export const SESSION_COOKIE = 'mtm_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const PBKDF2_ITERATIONS = 210000;

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validPassword(value) {
  return typeof value === 'string' && value.length >= 10 && value.length <= 128 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password, saltBytes, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations }, key, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

export function safeEqual(a, b) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

function cookieValue(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const pair = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(name + '='));
  return pair ? pair.slice(name.length + 1) : '';
}

export function sessionCookie(request, token, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export async function createSession(request, db, user) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const now = Date.now();
  await db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, user.id, now, now + SESSION_TTL_SECONDS * 1000).run();
  return { token, cookie: sessionCookie(request, token, SESSION_TTL_SECONDS) };
}

export async function getSession(request, db) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash = await sha256(token);
  const row = await db.prepare(
    'SELECT s.token_hash, s.user_id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'
  ).bind(tokenHash, Date.now()).first();
  return row ? { tokenHash, user: { id: row.user_id, email: row.email, name: row.name } } : null;
}

export async function requireUser(request, db) {
  const session = await getSession(request, db);
  return session || json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

