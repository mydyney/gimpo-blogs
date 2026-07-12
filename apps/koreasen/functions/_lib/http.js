export function json(body, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json; charset=UTF-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status: init.status || 200, headers });
}

export function sameOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return false;
  const site = request.headers.get('Sec-Fetch-Site');
  return !site || site === 'same-origin';
}

export async function readJson(request, maxBytes = 8192) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) throw new Error('content_type');
  if (Number(request.headers.get('Content-Length') || 0) > maxBytes) throw new Error('too_large');
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('too_large');
  return JSON.parse(text);
}

export function cleanText(value, maxLength) {
  return String(value == null ? '' : value).trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

