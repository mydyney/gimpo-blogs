import { json, sameOrigin, readJson } from '../../../_lib/http.js';
import { requireUser, safeEqual } from '../../../_lib/auth.js';
import { validSelections, validForm } from '../../../_lib/catalog.js';
import { validLocale, statusLabel } from '../../../_lib/locale.js';

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';
const PRICE_WON = 5000;
const RETRYABLE_REQUEST_STATES = ['payment_pending', 'payment_failed', 'payment_canceled'];

const PAY_TYPES = {
  wechat: 'wechat',
  apple: 'applepay',
  card: 'card',
  kakao: 'kakaopay',
  naver: 'naverpay',
  payco: 'payco',
};

function subpath(url) {
  return new URL(url).pathname.replace(/^\/api\/payments\/payapp\/?/, '').split('/').filter(Boolean);
}

function formBody(data) {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') body.set(key, String(value));
  });
  return body;
}

function parsePayappResponse(text) {
  const params = new URLSearchParams(text);
  const result = {};
  params.forEach((value, key) => { result[key] = value; });
  return result;
}

async function readForm(request) {
  const form = await request.formData();
  const data = {};
  form.forEach((value, key) => { data[key] = String(value); });
  return data;
}

function envReady(env) {
  return Boolean(env.PAYAPP_USERID && env.PAYAPP_LINKKEY && env.PAYAPP_LINKVAL);
}

async function allowedPayMethod(env, requested, locale) {
  const byLocale = { ko: ['card', 'kakao', 'naver', 'payco', 'apple'], en: ['apple', 'card'], ja: ['apple', 'card'], zh: ['wechat', 'card'] };
  let enabled = Object.keys(PAY_TYPES);
  try {
    if (env.SITE_CONFIG) {
      const stored = await env.SITE_CONFIG.get('enabled_payment_methods', 'json');
      if (Array.isArray(stored)) enabled = stored;
    }
  } catch (error) { /* use defaults */ }
  const allowed = byLocale[locale] || byLocale.ko;
  return allowed.includes(requested) && enabled.includes(requested) ? requested : 'card';
}

function statusForPayState(payState) {
  if (payState === '4') return { payment: 'paid', code: 'guide_writing' };
  if (payState === '10') return { payment: 'waiting', code: 'payment_waiting' };
  if (['8', '9', '32', '64', '70', '71'].includes(payState)) return { payment: 'canceled', code: 'payment_canceled' };
  return { payment: 'pending', code: 'payment_pending' };
}

async function requestPayappCheckout({ request, env, email, requestId, paymentId, form, locale, payMethod }) {
  const url = new URL(request.url);
  const postData = formBody({
    cmd: 'payrequest',
    userid: env.PAYAPP_USERID,
    goodname: 'mytokyomate 여행 계획 요청',
    price: PRICE_WON,
    recvphone: form.phone,
    vccode: form.countryCode,
    recvemail: email,
    memo: 'mytokyomate 맞춤 여행 계획',
    reqaddr: '0',
    feedbackurl: `${url.origin}/api/payments/payapp/feedback`,
    var1: requestId,
    var2: paymentId,
    smsuse: 'n',
    returnurl: `${url.origin}/${locale}/plan/done`,
    openpaytype: PAY_TYPES[payMethod],
    checkretry: 'y',
  });

  try {
    const response = await fetch(PAYAPP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: postData.toString(),
    });
    return parsePayappResponse(await response.text());
  } catch (error) {
    return { state: '0', errorMessage: 'payapp_unreachable' };
  }
}

async function markCheckoutFailed(env, requestId, paymentId, result) {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare('UPDATE payments SET status = ?, raw_json = ?, updated_at = ? WHERE id = ?')
      .bind('failed', JSON.stringify(result), now, paymentId),
    env.DB.prepare(`UPDATE travel_requests SET status = ?, status_code = ?, updated_at = ?
      WHERE id = ? AND NOT EXISTS (
        SELECT 1 FROM payments WHERE request_id = ? AND status = 'paid'
      )`).bind(statusLabel('payment_failed', 'ko'), 'payment_failed', now, requestId, requestId),
  ]);
}

async function createPayment(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  if (!envReady(env)) return json({ ok: false, error: 'payapp_not_configured' }, { status: 503 });
  if (request.method !== 'POST' || !sameOrigin(request)) {
    return json({ ok: false, error: request.method === 'POST' ? 'forbidden' : 'method_not_allowed' }, { status: request.method === 'POST' ? 403 : 405 });
  }

  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  let data;
  try { data = await readJson(request, 16384); } catch (error) {
    return json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  const selections = validSelections(data.sel);
  const form = validForm(data.form);
  if (!selections || !form) return json({ ok: false, error: 'invalid_request' }, { status: 400 });

  const locale = validLocale(data.locale);
  const payMethod = await allowedPayMethod(env, PAY_TYPES[data.payMethod] ? data.payMethod : 'card', locale);
  const now = Date.now();
  const requestId = 'R-' + crypto.randomUUID();
  const paymentId = 'P-' + crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO travel_requests (id, user_id, selections_json, form_json, status, locale, status_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(requestId, auth.user.id, JSON.stringify(selections), JSON.stringify(form), statusLabel('payment_pending', 'ko'), locale, 'payment_pending', now, now),
    env.DB.prepare(
      'INSERT INTO payments (id, request_id, user_id, provider, amount, status, method_requested, country_code, locale, currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(paymentId, requestId, auth.user.id, 'payapp', PRICE_WON, 'pending', payMethod, form.countryCode, locale, 'KRW', now, now),
  ]);

  const result = await requestPayappCheckout({ request, env, email: auth.user.email, requestId, paymentId, form, locale, payMethod });

  if (result.state !== '1' || !result.payurl || !result.mul_no) {
    await markCheckoutFailed(env, requestId, paymentId, result);
    return json({ ok: false, error: result.errorMessage || 'payapp_request_failed' }, { status: 502 });
  }

  await env.DB.prepare(
    'UPDATE payments SET provider_payment_id = ?, pay_url = ?, raw_json = ?, updated_at = ? WHERE id = ?'
  ).bind(result.mul_no, result.payurl, JSON.stringify(result), Date.now(), paymentId).run();

  return json({
    ok: true,
    payurl: result.payurl,
    request: { id: requestId, email: auth.user.email, sel: selections, form, locale, statusCode: 'payment_pending', status: statusLabel('payment_pending', locale), guide: null, createdAt: now },
  }, { status: 201 });
}

async function retryPayment(context) {
  const { request, env } = context;
  if (!env.DB) return json({ ok: false, error: 'database_unavailable' }, { status: 503 });
  if (!envReady(env)) return json({ ok: false, error: 'payapp_not_configured' }, { status: 503 });
  if (request.method !== 'POST' || !sameOrigin(request)) {
    return json({ ok: false, error: request.method === 'POST' ? 'forbidden' : 'method_not_allowed' }, { status: request.method === 'POST' ? 403 : 405 });
  }

  const auth = await requireUser(request, env.DB);
  if (auth instanceof Response) return auth;

  let data;
  try { data = await readJson(request, 4096); } catch (error) {
    return json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  const requestId = String(data.requestId || '');
  const row = await env.DB.prepare(`SELECT r.id, r.form_json, r.locale, r.status_code, u.email
    FROM travel_requests r JOIN users u ON u.id = r.user_id
    WHERE r.id = ? AND r.user_id = ?`).bind(requestId, auth.user.id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, { status: 404 });
  if (!RETRYABLE_REQUEST_STATES.includes(row.status_code)) {
    return json({ ok: false, error: 'payment_not_retryable' }, { status: 409 });
  }

  let form;
  try { form = validForm(JSON.parse(row.form_json)); } catch (error) { form = null; }
  if (!form) return json({ ok: false, error: 'invalid_request' }, { status: 400 });

  const locale = validLocale(row.locale || data.locale);
  const requestedMethod = PAY_TYPES[data.payMethod] ? data.payMethod : 'card';
  const payMethod = await allowedPayMethod(env, requestedMethod, locale);
  const now = Date.now();

  const recent = await env.DB.prepare(`SELECT pay_url FROM payments
    WHERE request_id = ? AND provider = 'payapp' AND status = 'pending'
      AND pay_url IS NOT NULL AND created_at > ?
    ORDER BY created_at DESC LIMIT 1`).bind(requestId, now - 30000).first();
  if (recent && recent.pay_url) {
    return json({ ok: true, payurl: recent.pay_url, reused: true });
  }

  const paymentId = 'P-' + crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO payments
      (id, request_id, user_id, provider, amount, status, method_requested, country_code, locale, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
      paymentId, requestId, auth.user.id, 'payapp', PRICE_WON, 'pending', payMethod,
      form.countryCode, locale, 'KRW', now, now
    ),
    env.DB.prepare(`UPDATE travel_requests SET status = ?, status_code = ?, updated_at = ?
      WHERE id = ? AND NOT EXISTS (
        SELECT 1 FROM payments WHERE request_id = ? AND status = 'paid'
      )`).bind(statusLabel('payment_pending', 'ko'), 'payment_pending', now, requestId, requestId),
  ]);

  const result = await requestPayappCheckout({ request, env, email: row.email, requestId, paymentId, form, locale, payMethod });
  if (result.state !== '1' || !result.payurl || !result.mul_no) {
    await markCheckoutFailed(env, requestId, paymentId, result);
    return json({ ok: false, error: result.errorMessage || 'payapp_request_failed' }, { status: 502 });
  }

  await env.DB.prepare(
    'UPDATE payments SET provider_payment_id = ?, pay_url = ?, raw_json = ?, updated_at = ? WHERE id = ?'
  ).bind(result.mul_no, result.payurl, JSON.stringify(result), Date.now(), paymentId).run();

  return json({ ok: true, payurl: result.payurl, requestId, statusCode: 'payment_pending', status: statusLabel('payment_pending', locale) }, { status: 201 });
}

async function handleFeedback(context) {
  const { request, env } = context;
  if (!env.DB || !envReady(env)) return new Response('FAIL', { status: 503 });
  if (request.method !== 'POST') return new Response('FAIL', { status: 405 });

  let data;
  try { data = await readForm(request); } catch (error) {
    return new Response('FAIL', { status: 400 });
  }

  const requestId = data.var1 || '';
  const paymentId = data.var2 || '';
  const mulNo = data.mul_no || '';
  const row = await env.DB.prepare(
    'SELECT p.id, p.request_id, p.amount, p.provider_payment_id, p.method_requested, p.locale FROM payments p WHERE p.id = ? AND p.request_id = ? AND p.provider = ?'
  ).bind(paymentId, requestId, 'payapp').first();
  if (!row) return new Response('FAIL', { status: 404 });

  const authOk = safeEqual(data.userid || '', env.PAYAPP_USERID)
    && safeEqual(data.linkkey || '', env.PAYAPP_LINKKEY)
    && safeEqual(data.linkval || '', env.PAYAPP_LINKVAL)
    && String(row.amount) === String(data.price || '')
    && (!row.provider_payment_id || row.provider_payment_id === mulNo);
  if (!authOk) return new Response('FAIL', { status: 403 });

  const mapped = statusForPayState(String(data.pay_state || ''));
  const expectedPayTypes = { card: '1', kakao: '15', naver: '16', payco: '20', wechat: '22', apple: '23' };
  const payType = String(data.pay_type || '');
  const mismatch = Boolean(payType && expectedPayTypes[row.method_requested] && payType !== expectedPayTypes[row.method_requested]);
  const requestUpdate = mapped.payment === 'paid'
    ? env.DB.prepare('UPDATE travel_requests SET status = ?, status_code = ?, updated_at = ? WHERE id = ?')
      .bind(statusLabel(mapped.code, 'ko'), mapped.code, Date.now(), requestId)
    : env.DB.prepare(`UPDATE travel_requests SET status = ?, status_code = ?, updated_at = ?
        WHERE id = ? AND NOT EXISTS (
          SELECT 1 FROM payments WHERE request_id = ? AND status = 'paid'
        )`).bind(statusLabel(mapped.code, 'ko'), mapped.code, Date.now(), requestId, requestId);
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE payments SET provider_payment_id = COALESCE(provider_payment_id, ?), status = ?, pay_state = ?, pay_type = ?, method_mismatch = ?, receipt_url = ?, raw_json = ?, updated_at = ? WHERE id = ?'
    ).bind(mulNo, mapped.payment, String(data.pay_state || ''), payType, mismatch ? 1 : 0, data.csturl || '', JSON.stringify(data), Date.now(), row.id),
    requestUpdate,
  ]);

  return new Response('SUCCESS', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequest(context) {
  const rest = subpath(context.request.url);
  if (rest[0] === 'feedback') return handleFeedback(context);
  if (rest[0] === 'retry') return retryPayment(context);
  if (rest.length === 0) return createPayment(context);
  return json({ ok: false, error: 'not_found' }, { status: 404 });
}
