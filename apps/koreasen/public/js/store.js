// mytokyomate — persisted store (user / requests / notifications) + shared formatters.
// Prototype parity: everything lives in localStorage under mtm_proto_v1.
// Production TODO: replace with a real backend (Cloudflare D1/KV + email OTP + PG).
(function (global) {
  'use strict';

  const D = global.MTM_DATA;

  const store = {
    user: null,          // { email }
    requests: [],        // { id, email, sel[{regionId,spotId}], form, status, guide, createdAt }
    notifications: [],   // { id, email, reqId, text, read, ts }
  };

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(D.LS_KEY) || 'null');
      if (saved) {
        store.user = saved.user || null;
        store.requests = saved.requests || [];
        store.notifications = saved.notifications || [];
      }
    } catch (e) { /* corrupted storage — start fresh */ }
  }

  function persist() {
    try {
      localStorage.setItem(D.LS_KEY, JSON.stringify({
        user: store.user,
        requests: store.requests,
        notifications: store.notifications,
      }));
    } catch (e) { /* storage unavailable — session-only */ }
  }

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
