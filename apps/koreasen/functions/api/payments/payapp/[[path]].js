import { json, sameOrigin, readJson } from '../../../_lib/http.js';
import { requireUser, safeEqual } from '../../../_lib/auth.js';
import { validSelections, validForm } from '../../../_lib/catalog.js';

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';
const PRICE_WON = 5000;

const PAY_TYPES = {
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

function statusForPayState(payState) {
  if (payState === '4') return { payment: 'paid', request: '가이드 작성 중' };
  if (payState === '10') return { payment: 'waiting', request: '입금 대기' };
  if (['8', '9', '32', '64', '70', '71'].includes(payState)) return { payment: 'canceled', request: '결제 취소' };
  return { payment: 'pending', request: '결제 대기' };
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

  const payMethod = PAY_TYPES[data.payMethod] ? data.payMethod : 'card';
  const openpaytype = PAY_TYPES[payMethod];
  const now = Date.now();
  const requestId = 'R-' + crypto.randomUUID();
  const paymentId = 'P-' + crypto.randomUUID();
  const url = new URL(request.url);
  const returnUrl = `${url.origin}/plan/done`;
  const feedbackUrl = `${url.origin}/api/payments/payapp/feedback`;

  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO travel_requests (id, user_id, selections_json, form_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(requestId, auth.user.id, JSON.stringify(selections), JSON.stringify(form), '결제 대기', now, now),
    env.DB.prepare(
      'INSERT INTO payments (id, request_id, user_id, provider, amount, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(paymentId, requestId, auth.user.id, 'payapp', PRICE_WON, 'pending', now, now),
  ]);

  const postData = formBody({
    cmd: 'payrequest',
    userid: env.PAYAPP_USERID,
    goodname: 'mytokyomate 여행 계획 요청',
    price: PRICE_WON,
    recvphone: form.phone,
    recvemail: auth.user.email,
    memo: 'mytokyomate 맞춤 여행 계획',
    reqaddr: '0',
    feedbackurl: feedbackUrl,
    var1: requestId,
    var2: paymentId,
    smsuse: 'n',
    returnurl: returnUrl,
    openpaytype,
    checkretry: 'y',
  });

  let result;
  try {
    const response = await fetch(PAYAPP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: postData.toString(),
    });
    result = parsePayappResponse(await response.text());
  } catch (error) {
    result = { state: '0', errorMessage: 'payapp_unreachable' };
  }

  if (result.state !== '1' || !result.payurl || !result.mul_no) {
    await env.DB.batch([
      env.DB.prepare('UPDATE payments SET status = ?, raw_json = ?, updated_at = ? WHERE id = ?')
        .bind('failed', JSON.stringify(result), Date.now(), paymentId),
      env.DB.prepare('UPDATE travel_requests SET status = ?, updated_at = ? WHERE id = ?')
        .bind('결제 실패', Date.now(), requestId),
    ]);
    return json({ ok: false, error: result.errorMessage || 'payapp_request_failed' }, { status: 502 });
  }

  await env.DB.prepare(
    'UPDATE payments SET provider_payment_id = ?, pay_url = ?, raw_json = ?, updated_at = ? WHERE id = ?'
  ).bind(result.mul_no, result.payurl, JSON.stringify(result), Date.now(), paymentId).run();

  return json({
    ok: true,
    payurl: result.payurl,
    request: { id: requestId, email: auth.user.email, sel: selections, form, status: '결제 대기', guide: null, createdAt: now },
  }, { status: 201 });
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
    'SELECT p.id, p.request_id, p.amount, p.provider_payment_id FROM payments p WHERE p.id = ? AND p.request_id = ? AND p.provider = ?'
  ).bind(paymentId, requestId, 'payapp').first();
  if (!row) return new Response('FAIL', { status: 404 });

  const authOk = safeEqual(data.userid || '', env.PAYAPP_USERID)
    && safeEqual(data.linkkey || '', env.PAYAPP_LINKKEY)
    && safeEqual(data.linkval || '', env.PAYAPP_LINKVAL)
    && String(row.amount) === String(data.price || '')
    && (!row.provider_payment_id || row.provider_payment_id === mulNo);
  if (!authOk) return new Response('FAIL', { status: 403 });

  const mapped = statusForPayState(String(data.pay_state || ''));
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE payments SET provider_payment_id = COALESCE(provider_payment_id, ?), status = ?, pay_state = ?, receipt_url = ?, raw_json = ?, updated_at = ? WHERE id = ?'
    ).bind(mulNo, mapped.payment, String(data.pay_state || ''), data.csturl || '', JSON.stringify(data), Date.now(), row.id),
    env.DB.prepare('UPDATE travel_requests SET status = ?, updated_at = ? WHERE id = ?')
      .bind(mapped.request, Date.now(), requestId),
  ]);

  return new Response('SUCCESS', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=UTF-8', 'Cache-Control': 'no-store' },
  });
}

export async function onRequest(context) {
  const rest = subpath(context.request.url);
  if (rest[0] === 'feedback') return handleFeedback(context);
  if (rest.length === 0) return createPayment(context);
  return json({ ok: false, error: 'not_found' }, { status: 404 });
}
