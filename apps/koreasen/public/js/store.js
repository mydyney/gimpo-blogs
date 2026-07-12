// mytokyomate — persisted store (user / requests / notifications) + shared formatters.
// In-memory client cache. Durable data lives behind authenticated D1 APIs.
(function (global) {
  'use strict';

  const D = global.MTM_DATA;

  const store = {
    user: null,          // { email }
    requests: [],        // { id, email, sel[{regionId,spotId}], form, status, guide, createdAt }
    notifications: [],   // { id, email, reqId, text, read, ts }
  };

  function load() {
    store.user = null;
    store.requests = [];
    store.notifications = [];
  }

  function persist() { /* compatibility no-op: D1 APIs own persistence */ }

  function spotName(regionId, spotId) {
    const sp = (D.SPOTS[regionId] || []).find((s) => s.id === spotId);
    return sp ? sp.ko : spotId;
  }

  function selLabel(sel) {
    return sel.map((x, i) => (i + 1) + '. ' + spotName(x.regionId, x.spotId)).join('  ·  ');
  }

  function metaLabel(form) {
    return [
      form.count + ' (' + form.group + ')',
      form.phone ? '연락처 ' + form.phone : null,
      '입국 ' + (form.date || '미정'),
      form.duration,
      '예산 ' + form.budget,
      form.lodging ? '숙소 ' + form.lodging : null,
    ].filter(Boolean).join(' · ');
  }

  function fmtWhen(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function priceLabel() {
    return '₩' + Number(D.PRICE_WON).toLocaleString('ko-KR');
  }

  global.MTM_STORE = { store, load, persist, spotName, selLabel, metaLabel, fmtWhen, priceLabel };
})(window);
