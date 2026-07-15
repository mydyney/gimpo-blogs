PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN preferred_locale TEXT NOT NULL DEFAULT 'ko';
ALTER TABLE email_auth_codes ADD COLUMN locale TEXT NOT NULL DEFAULT 'ko';

ALTER TABLE travel_requests ADD COLUMN locale TEXT NOT NULL DEFAULT 'ko';
ALTER TABLE travel_requests ADD COLUMN status_code TEXT NOT NULL DEFAULT 'guide_writing';
UPDATE travel_requests SET status_code = CASE status
  WHEN '결제 대기' THEN 'payment_pending'
  WHEN '입금 대기' THEN 'payment_waiting'
  WHEN '결제 실패' THEN 'payment_failed'
  WHEN '결제 취소' THEN 'payment_canceled'
  WHEN '가이드 도착' THEN 'guide_arrived'
  ELSE 'guide_writing'
END;

UPDATE travel_requests SET form_json = json_set(
  form_json,
  '$.count', CASE json_extract(form_json, '$.count')
    WHEN '1명' THEN 'count_1' WHEN '2명' THEN 'count_2' WHEN '3명' THEN 'count_3'
    WHEN '4명' THEN 'count_4' WHEN '5명' THEN 'count_5' WHEN '6명 이상' THEN 'count_6_plus'
    ELSE json_extract(form_json, '$.count') END,
  '$.group', CASE json_extract(form_json, '$.group')
    WHEN '혼자' THEN 'solo' WHEN '커플 · 부부' THEN 'couple' WHEN '친구' THEN 'friends'
    WHEN '가족 (아이 동반)' THEN 'family_children' WHEN '가족 (부모님 동반)' THEN 'family_parents'
    WHEN '회사 · 단체' THEN 'company' ELSE json_extract(form_json, '$.group') END,
  '$.duration', CASE json_extract(form_json, '$.duration')
    WHEN '2박 3일' THEN 'nights_2' WHEN '3박 4일' THEN 'nights_3' WHEN '4박 5일' THEN 'nights_4'
    WHEN '5박 6일' THEN 'nights_5' WHEN '일주일 이상' THEN 'week_plus' ELSE json_extract(form_json, '$.duration') END,
  '$.budget', CASE json_extract(form_json, '$.budget')
    WHEN '~50만원' THEN 'under_500k' WHEN '50~100만원' THEN '500k_1m' WHEN '100~200만원' THEN '1m_2m'
    WHEN '200만원 이상' THEN 'over_2m' WHEN '미정' THEN 'undecided' ELSE json_extract(form_json, '$.budget') END
);

ALTER TABLE guides ADD COLUMN locale TEXT NOT NULL DEFAULT 'ko';

ALTER TABLE notifications ADD COLUMN event_code TEXT;
ALTER TABLE notifications ADD COLUMN event_params_json TEXT;

ALTER TABLE payments ADD COLUMN method_requested TEXT;
ALTER TABLE payments ADD COLUMN pay_type TEXT;
ALTER TABLE payments ADD COLUMN country_code TEXT NOT NULL DEFAULT '82';
ALTER TABLE payments ADD COLUMN locale TEXT NOT NULL DEFAULT 'ko';
ALTER TABLE payments ADD COLUMN currency TEXT NOT NULL DEFAULT 'KRW';
ALTER TABLE payments ADD COLUMN method_mismatch INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_requests_locale_status ON travel_requests(locale, status_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method_requested, pay_type, created_at DESC);
