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

const META = {
  ko: { lang: 'ko', og: 'ko_KR', title: 'mytokyomate | 일본 여행 계획 컨시어지', description: '도쿄메이트가 동선까지 계산한 맞춤 일본 여행 일정을 만들어 드립니다.' },
  en: { lang: 'en', og: 'en_US', title: 'mytokyomate | Personal Japan Travel Planning', description: 'Get a personalized Japan itinerary planned by a Tokyo local, including efficient routes and selected destinations.' },
  ja: { lang: 'ja', og: 'ja_JP', title: 'mytokyomate | 日本旅行プランコンシェルジュ', description: '東京を知り尽くしたメイトが、あなただけの日本旅行プランを作成します。' },
  zh: { lang: 'zh-CN', og: 'zh_CN', title: 'mytokyomate | 日本旅行行程定制', description: '由熟悉东京的当地旅行达人为您定制日本行程。' },
};

async function harden(response, request) {
  let hardened;
  const type = response.headers.get('Content-Type') || '';
  if (type.includes('text/html')) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/(ko|en|ja|zh)(?:\/|$)/);
    const locale = match ? match[1] : 'ko';
    const meta = META[locale];
    const canonical = url.origin + '/' + locale + (url.pathname.replace(/^\/(ko|en|ja|zh)(?=\/|$)/, '') || '/');
    let html = await response.text();
    html = html.replace(/<html lang="[^"]+">/, '<html lang="' + meta.lang + '">')
      .replace(/<title>[^<]*<\/title>/, '<title>' + meta.title + '</title>')
      .replace(/<meta name="description" content="[^"]*"\/>/, '<meta name="description" content="' + meta.description + '"/>')
      .replace(/<link rel="canonical" href="[^"]*"\/>/, '<link rel="canonical" href="' + canonical + '"/>')
      .replace(/<meta property="og:locale" content="[^"]*"\/>/, '<meta property="og:locale" content="' + meta.og + '"/>')
      .replace(/<meta property="og:url" content="[^"]*"\/>/, '<meta property="og:url" content="' + canonical + '"/>')
      .replace(/<meta property="og:title" content="[^"]*"\/>/, '<meta property="og:title" content="' + meta.title + '"/>')
      .replace(/<meta property="og:description" content="[^"]*"\/>/, '<meta property="og:description" content="' + meta.description + '"/>');
    hardened = new Response(html, response);
  } else {
    hardened = new Response(response.body, response);
  }
  hardened.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  hardened.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  hardened.headers.set('X-Content-Type-Options', 'nosniff');
  hardened.headers.set('X-Frame-Options', 'DENY');
  hardened.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return hardened;
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const adminHost = env.ADMIN_HOST || DEFAULT_ADMIN_HOST;
  const host = new URL(request.url).hostname;

  // Not the admin host → serve the site normally, with baseline browser hardening.
  if (host !== adminHost) {
    const url = new URL(request.url);
    const isDocumentRoute = request.method === 'GET' && /^(\/|\/plan(?:\/info|\/pay|\/done)?|\/login|\/signup|\/my|\/guide\/[\w-]+)$/.test(url.pathname);
    if (isDocumentRoute && !/^\/(ko|en|ja|zh)(?:\/|$)/.test(url.pathname)) {
      return Response.redirect(url.origin + '/ko' + (url.pathname === '/' ? '/' : url.pathname) + url.search, 302);
    }
    return harden(await next(), request);
  }

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
        return harden(await next(), request);
      }
    }
  }
  return unauthorized();
}
