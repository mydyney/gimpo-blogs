// Gate the admin host with HTTP Basic Auth — Cloudflare Pages Functions (Workers free plan).
// No Zero Trust / Access add-on: the free plan rate-limits past the daily quota instead of billing.
// The main site host passes straight through (next()), so normal traffic is unaffected.
//
// Required Pages env vars (Settings → Environment variables, mark as encrypted/Secret):
//   ADMIN_USER, ADMIN_PASS   — Basic Auth credentials for the admin console
// Optional:
//   ADMIN_HOST               — host to protect (default: admin.mytokyomate.com)

const DEFAULT_ADMIN_HOST = 'admin.mytokyomate.com';

function unauthorized() {
  return new Response('인증이 필요합니다. (mytokyomate 관리자)', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="mytokyomate admin", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
}

// Length-independent constant-time-ish comparison to avoid timing leaks.
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ (bb[i] || 0);
  return diff === 0;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const adminHost = env.ADMIN_HOST || DEFAULT_ADMIN_HOST;
  const host = new URL(request.url).hostname;

  // Not the admin host → serve the site normally.
  if (host !== adminHost) return next();

  // Admin host but no credentials configured → stay locked (fail closed).
  if (!env.ADMIN_USER || !env.ADMIN_PASS) return unauthorized();

  const header = request.headers.get('Authorization') || '';
  if (header.startsWith('Basic ')) {
    let decoded = '';
    try { decoded = atob(header.slice(6)); } catch (e) { decoded = ''; }
    const idx = decoded.indexOf(':');
    if (idx >= 0) {
      const user = decoded.slice(0, idx);
      const pass = decoded.slice(idx + 1);
      if (safeEqual(user, env.ADMIN_USER) && safeEqual(pass, env.ADMIN_PASS)) {
        return next();
      }
    }
  }
  return unauthorized();
}
