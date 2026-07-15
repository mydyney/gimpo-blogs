// mytokyomate — persisted store (user / requests / notifications) + shared formatters.
// In-memory client cache. Durable data lives behind authenticated D1 APIs.
(function (global) {
  'use strict';

  const D = global.MTM_DATA;
  const I = global.MTM_I18N;

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
    return sp ? (sp[I.locale] || (I.locale === 'ko' ? sp.ko : sp.en) || sp.ko) : spotId;
  }

  function selLabel(sel) {
    return sel.map((x, i) => (i + 1) + '. ' + spotName(x.regionId, x.spotId)).join('  ·  ');
  }

  function metaLabel(form) {
    return [
      D.optionLabel('count', form.count, I.locale) + ' (' + D.optionLabel('group', form.group, I.locale) + ')',
      form.e164Phone || form.phone ? I.phrase('연락처') + ' ' + (form.e164Phone || form.phone) : null,
      I.phrase('입국') + ' ' + (form.date || I.phrase('미정')),
      D.optionLabel('duration', form.duration, I.locale),
      I.t('notes') === '요청사항' ? '예산 ' + D.optionLabel('budget', form.budget, I.locale) : I.phrase('예산') + ' ' + D.optionLabel('budget', form.budget, I.locale),
      form.lodging ? I.phrase('숙소') + ' ' + form.lodging : null,
    ].filter(Boolean).join(' · ');
  }

  function fmtWhen(ts) {
    return I.formatDate(ts);
  }

  function priceLabel() {
    return I.formatMoney(D.PRICE_WON, 'KRW');
  }

  global.MTM_STORE = { store, load, persist, spotName, selLabel, metaLabel, fmtWhen, priceLabel };
})(window);
