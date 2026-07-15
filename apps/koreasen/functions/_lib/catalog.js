const SPOTS = {
  tokyo: ['shibuya', 'shinjuku', 'asakusa', 'ginza', 'harajuku', 'ueno', 'odaiba', 'skytree', 'tsukiji', 'kichijoji', 'tokyodome', 'disney', 'roppongi'],
  kanto: ['yokohama', 'kamakura', 'hakone', 'nikko'],
  kansai: ['dotonbori', 'osakajo', 'fushimi', 'kiyomizu', 'arashiyama', 'nara'],
  kyushu: ['canalcity', 'dazaifu', 'yufuin', 'beppu'],
  hokkaido: ['odori', 'otaru', 'furano', 'noboribetsu'],
  okinawa: ['churaumi', 'kokusai', 'american', 'manzamo'],
};
const FORM_CODES = {
  count: ['count_1', 'count_2', 'count_3', 'count_4', 'count_5', 'count_6_plus', '1명', '2명', '3명', '4명', '5명', '6명 이상'],
  group: ['solo', 'couple', 'friends', 'family_children', 'family_parents', 'company', '혼자', '커플 · 부부', '친구', '가족 (아이 동반)', '가족 (부모님 동반)', '회사 · 단체'],
  duration: ['nights_2', 'nights_3', 'nights_4', 'nights_5', 'week_plus', '2박 3일', '3박 4일', '4박 5일', '5박 6일', '일주일 이상'],
  budget: ['under_500k', '500k_1m', '1m_2m', 'over_2m', 'undecided', '~50만원', '50~100만원', '100~200만원', '200만원 이상', '미정'],
};

export function validSelections(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null;
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const regionId = String(item && item.regionId || '');
    const spotId = String(item && item.spotId || '');
    if (!SPOTS[regionId] || !SPOTS[regionId].includes(spotId)) return null;
    const key = regionId + ':' + spotId;
    if (!seen.has(key)) { seen.add(key); result.push({ regionId, spotId }); }
  }
  return result;
}

export function validForm(value) {
  if (!value || typeof value !== 'object') return null;
  const date = String(value.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const phone = String(value.phone || '').replace(/\D/g, '');
  const countryCode = String(value.countryCode || '82').replace(/\D/g, '').slice(0, 4);
  const phoneValid = countryCode === '82'
    ? /^01[016789]\d{7,8}$/.test(phone) && (!phone.startsWith('010') || phone.length === 11)
    : countryCode === '86'
      ? /^1[3-9]\d{9}$/.test(phone)
      : countryCode === '81'
        ? /^0?[789]0\d{8}$/.test(phone)
        : phone.length >= 7 && phone.length <= 15;
  if (!countryCode || !phoneValid) return null;
  const field = (name, max) => String(value[name] || '').trim().slice(0, max);
  const coded = (name) => {
    const result = field(name, 40);
    return FORM_CODES[name].includes(result) ? result : '';
  };
  const local = phone.replace(/^0/, '');
  const count = coded('count');
  const group = coded('group');
  const duration = coded('duration');
  const budget = coded('budget');
  if (!count || !group || !duration || !budget) return null;
  return {
    count, group, phone, countryCode,
    e164Phone: '+' + countryCode + local, date,
    duration, budget,
    lodging: field('lodging', 120), notes: field('notes', 1000),
  };
}
