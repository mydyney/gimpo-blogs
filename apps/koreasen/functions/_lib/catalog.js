const SPOTS = {
  tokyo: ['shibuya', 'shinjuku', 'asakusa', 'ginza', 'harajuku', 'ueno', 'odaiba', 'skytree', 'tsukiji', 'kichijoji', 'tokyodome', 'disney', 'roppongi'],
  kanto: ['yokohama', 'kamakura', 'hakone', 'nikko'],
  kansai: ['dotonbori', 'osakajo', 'fushimi', 'kiyomizu', 'arashiyama', 'nara'],
  kyushu: ['canalcity', 'dazaifu', 'yufuin', 'beppu'],
  hokkaido: ['odori', 'otaru', 'furano', 'noboribetsu'],
  okinawa: ['churaumi', 'kokusai', 'american', 'manzamo'],
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
  if (!/^\d{10,11}$/.test(phone)) return null;
  const field = (name, max) => String(value[name] || '').trim().slice(0, max);
  return {
    count: field('count', 20), group: field('group', 40), phone, date,
    duration: field('duration', 40), budget: field('budget', 40),
    lodging: field('lodging', 120), notes: field('notes', 1000),
  };
}
