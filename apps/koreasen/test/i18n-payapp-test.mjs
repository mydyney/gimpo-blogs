import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { validForm } from '../functions/_lib/catalog.js';
import { statusLabel, validLocale } from '../functions/_lib/locale.js';
import { payappCheckoutCopy } from '../functions/_lib/payment-copy.js';

const base = { count: 'count_2', group: 'couple', date: '2026-10-10', duration: 'nights_3', budget: '1m_2m', lodging: '', notes: '' };

const kr = validForm({ ...base, countryCode: '82', phone: '010-1234-5678' });
assert.equal(kr.e164Phone, '+821012345678');
const cn = validForm({ ...base, countryCode: '86', phone: '13800138000' });
assert.equal(cn.e164Phone, '+8613800138000');
const jp = validForm({ ...base, countryCode: '81', phone: '090-1234-5678' });
assert.equal(jp.e164Phone, '+819012345678');
assert.equal(validForm({ ...base, countryCode: '86', phone: '1000' }), null);

assert.equal(validLocale('zh'), 'zh');
assert.equal(validLocale('fr'), 'ko');
assert.equal(statusLabel('guide_arrived', 'ja'), 'ガイド完成');
assert.equal(payappCheckoutCopy('ko').goodname, 'mytokyomate 여행 계획 요청');
assert.equal(payappCheckoutCopy('en').goodname, 'mytokyomate travel itinerary request');
assert.equal(payappCheckoutCopy('ja').goodname, 'mytokyomate 旅行プラン依頼');
assert.equal(payappCheckoutCopy('zh').goodname, 'mytokyomate 日本旅行行程定制');
assert.deepEqual(payappCheckoutCopy('fr'), payappCheckoutCopy('ko'));

const paymentSource = await readFile(new URL('../functions/api/payments/payapp/[[path]].js', import.meta.url), 'utf8');
assert.match(paymentSource, /apple:\s*'applepay'/);
assert.match(paymentSource, /wechat:\s*'wechat'/);
assert.match(paymentSource, /en:\s*\['apple',\s*'card'\]/);
assert.match(paymentSource, /ja:\s*\['apple',\s*'card'\]/);
assert.match(paymentSource, /zh:\s*\['wechat',\s*'card'\]/);
assert.doesNotMatch(paymentSource, /kakaopay|naverpay|payco/);
assert.match(paymentSource, /openpaytype:\s*PAY_TYPES\[payMethod\]/);
assert.match(paymentSource, /goodname:\s*checkoutCopy\.goodname/);
assert.match(paymentSource, /memo:\s*checkoutCopy\.memo/);
assert.match(paymentSource, /vccode:\s*form\.countryCode/);
assert.match(paymentSource, /pay_type/);
assert.match(paymentSource, /method_mismatch/);
assert.match(paymentSource, /RETRYABLE_REQUEST_STATES/);
assert.match(paymentSource, /rest\[0\] === 'retry'/);
assert.match(paymentSource, /NOT EXISTS \(\s*SELECT 1 FROM payments WHERE request_id = \? AND status = 'paid'/);

const retryMigration = await readFile(new URL('../migrations/0005_payment_retries.sql', import.meta.url), 'utf8');
assert.match(retryMigration, /DROP INDEX IF EXISTS idx_payments_request_provider/);
assert.match(retryMigration, /CREATE INDEX IF NOT EXISTS idx_payments_request_provider/);
assert.doesNotMatch(retryMigration, /CREATE UNIQUE INDEX[\s\S]*idx_payments_request_provider/);

const appSource = await readFile(new URL('../public/js/app-20260720b.js', import.meta.url), 'utf8');
assert.match(appSource, /data-act="retry-payment"/);
assert.match(appSource, /api\/payments\/payapp\/retry/);

const dataSource = await readFile(new URL('../public/js/data-20260720b.js', import.meta.url), 'utf8');
assert.match(dataSource, /id:\s*'card'/);
assert.match(dataSource, /id:\s*'apple'/);
assert.match(dataSource, /id:\s*'wechat'/);
assert.doesNotMatch(dataSource, /id:\s*'(kakao|naver|payco)'/);
const browserContext = { window: {} };
vm.runInNewContext(dataSource, browserContext);
const methodIds = (locale, appleAvailable) => Array.from(browserContext.window.MTM_DATA.paymentMethods(locale, appleAvailable), (method) => method.id);
assert.deepEqual(methodIds('ko', true), ['card']);
assert.deepEqual(methodIds('en', true), ['apple', 'card']);
assert.deepEqual(methodIds('en', false), ['card']);
assert.deepEqual(methodIds('ja', true), ['apple', 'card']);
assert.deepEqual(methodIds('zh', false), ['wechat', 'card']);

const middlewareSource = await readFile(new URL('../functions/_middleware.js', import.meta.url), 'utf8');
for (const locale of ['ko', 'en', 'ja', 'zh']) {
  assert.match(middlewareSource, new RegExp(`/og-${locale}\\.jpg`));
}
assert.match(middlewareSource, /twitter:image/);

console.log('PASS i18n + PayApp: stable codes, international phones, localized statuses, payment retry and callback tracking');
