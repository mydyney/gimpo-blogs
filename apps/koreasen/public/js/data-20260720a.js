// mytokyomate — region/spot data & service constants (card-only checkout)
(function (global) {
  'use strict';

  const REGIONS = [
    { id: 'tokyo', ko: '도쿄', en: 'TOKYO', desc: '골목 단위까지 상세 안내 가능한 중심 지역', main: true, note: '도쿄메이트의 홈그라운드 — 가장 상세한 안내가 가능해요', map: '/images/tokyo-city-map-ai.png' },
    { id: 'kanto', ko: '도쿄 근교', en: 'AROUND TOKYO', desc: '요코하마 · 가마쿠라 · 하코네 · 닛코', note: '도쿄에서 당일치기로 다녀올 수 있어요', map: '/images/tokyo-kanto-map-ai.png' },
    { id: 'kansai', ko: '간사이', en: 'KANSAI', desc: '오사카 · 교토 · 나라', note: '도쿄와 신칸센으로 연결되는 대표 서브 지역' },
    { id: 'kyushu', ko: '규슈', en: 'KYUSHU', desc: '후쿠오카 · 유후인 · 벳푸', note: '온천과 미식의 남쪽 지역' },
    { id: 'hokkaido', ko: '홋카이도', en: 'HOKKAIDO', desc: '삿포로 · 오타루 · 후라노', note: '설경과 자연이 좋은 북쪽 지역' },
    { id: 'okinawa', ko: '오키나와', en: 'OKINAWA', desc: '나하 · 츄라우미 · 만자모', note: '휴양형 일정에 좋은 섬 지역' },
  ];

  const SPOTS = {
    tokyo: [
      { id: 'shibuya', ko: '시부야', en: 'SHIBUYA', cat: '쇼핑 · 스크램블 교차로', mapPos: [44, 57], mapLabel: '시부야', labelSide: 'left' },
      { id: 'shinjuku', ko: '신주쿠', en: 'SHINJUKU', cat: '번화가 · 야경', mapPos: [43, 45], mapLabel: '신주쿠', labelSide: 'left' },
      { id: 'asakusa', ko: '아사쿠사 · 센소지', en: 'ASAKUSA', cat: '전통 · 사찰', mapPos: [62, 34], mapLabel: '아사쿠사', labelSide: 'top' },
      { id: 'ginza', ko: '긴자', en: 'GINZA', cat: '쇼핑 · 미식', mapPos: [57, 50], mapLabel: '긴자', labelSide: 'right' },
      { id: 'harajuku', ko: '하라주쿠 · 오모테산도', en: 'HARAJUKU', cat: '패션 · 카페', mapPos: [44, 51], mapLabel: '하라주쿠', labelSide: 'left' },
      { id: 'ueno', ko: '우에노', en: 'UENO', cat: '공원 · 박물관', mapPos: [58, 37], mapLabel: '우에노', labelSide: 'left' },
      { id: 'odaiba', ko: '오다이바', en: 'ODAIBA', cat: '베이 · 야경', mapPos: [61, 64], mapLabel: '오다이바', labelSide: 'right' },
      { id: 'skytree', ko: '도쿄 스카이트리', en: 'SKYTREE', cat: '전망 · 랜드마크', mapPos: [65, 40], mapLabel: '스카이트리', labelSide: 'right' },
      { id: 'tsukiji', ko: '쓰키지 장외시장', en: 'TSUKIJI', cat: '시장 · 미식', mapPos: [59, 54], mapLabel: '쓰키지', labelSide: 'right' },
      { id: 'kichijoji', ko: '기치조지 · 이노카시라', en: 'KICHIJOJI', cat: '공원 · 산책', mapPos: [12, 53], mapLabel: '기치조지', labelSide: 'right' },
      { id: 'tokyodome', ko: '도쿄돔 시티', en: 'TOKYO DOME CITY', cat: '테마파크 · 도심', mapPos: [53, 42], mapLabel: '도쿄돔', labelSide: 'left' },
      { id: 'disney', ko: '도쿄 디즈니 리조트', en: 'DISNEY RESORT', cat: '테마파크 · 마이하마', mapPos: [84, 61], mapLabel: '디즈니', labelSide: 'bottom' },
      { id: 'roppongi', ko: '롯폰기 · 도쿄타워', en: 'ROPPONGI', cat: '야경 · 미술관', mapPos: [52, 55], mapLabel: '롯폰기', labelSide: 'bottom' },
    ],
    kanto: [
      { id: 'yokohama', ko: '요코하마 미나토미라이', en: 'YOKOHAMA', cat: '항구 · 야경', mapPos: [56, 64], mapLabel: '요코하마', labelSide: 'left' },
      { id: 'kamakura', ko: '가마쿠라 · 에노시마', en: 'KAMAKURA', cat: '바다 · 사찰', mapPos: [50, 73], mapLabel: '가마쿠라', labelSide: 'left' },
      { id: 'hakone', ko: '하코네 온천', en: 'HAKONE', cat: '온천 · 후지산 뷰', mapPos: [30, 80], mapLabel: '하코네', labelSide: 'left' },
      { id: 'nikko', ko: '닛코 도쇼구', en: 'NIKKO', cat: '세계유산 · 자연', mapPos: [39, 20], mapLabel: '닛코', labelSide: 'right' },
    ],
    kansai: [
      { id: 'dotonbori', ko: '오사카 도톤보리', en: 'DOTONBORI', cat: '번화가 · 미식' },
      { id: 'osakajo', ko: '오사카성', en: 'OSAKA CASTLE', cat: '역사 · 공원' },
      { id: 'fushimi', ko: '교토 후시미이나리', en: 'FUSHIMI INARI', cat: '신사 · 토리이' },
      { id: 'kiyomizu', ko: '교토 기요미즈데라', en: 'KIYOMIZU', cat: '사찰 · 전통거리' },
      { id: 'arashiyama', ko: '아라시야마', en: 'ARASHIYAMA', cat: '대나무숲 · 자연' },
      { id: 'nara', ko: '나라 공원', en: 'NARA PARK', cat: '사슴 · 대불' },
    ],
    kyushu: [
      { id: 'canalcity', ko: '후쿠오카 캐널시티', en: 'CANAL CITY', cat: '쇼핑 · 야타이' },
      { id: 'dazaifu', ko: '다자이후 텐만구', en: 'DAZAIFU', cat: '신사 · 전통' },
      { id: 'yufuin', ko: '유후인', en: 'YUFUIN', cat: '온천 마을' },
      { id: 'beppu', ko: '벳푸 온천', en: 'BEPPU', cat: '온천 · 지옥순례' },
    ],
    hokkaido: [
      { id: 'odori', ko: '삿포로 오도리 공원', en: 'SAPPORO', cat: '도심 · 축제' },
      { id: 'otaru', ko: '오타루 운하', en: 'OTARU', cat: '운하 · 유리공예' },
      { id: 'furano', ko: '후라노 · 비에이', en: 'FURANO', cat: '라벤더 · 언덕' },
      { id: 'noboribetsu', ko: '노보리베츠 온천', en: 'NOBORIBETSU', cat: '온천 · 지옥계곡' },
    ],
    okinawa: [
      { id: 'churaumi', ko: '츄라우미 수족관', en: 'CHURAUMI', cat: '수족관 · 바다' },
      { id: 'kokusai', ko: '고쿠사이도리', en: 'KOKUSAI ST.', cat: '번화가 · 쇼핑' },
      { id: 'american', ko: '아메리칸 빌리지', en: 'AMERICAN VILLAGE', cat: '쇼핑 · 선셋' },
      { id: 'manzamo', ko: '만자모', en: 'MANZAMO', cat: '절경 · 해안' },
    ],
  };

  // Geographic anchors on the cropped 250 550 2000 2550 Japan map viewBox, in %.
  // Kanto destinations are intentionally separate because their real-world positions
  // are close together; label offsets keep the exact dots readable.
  const MAP_MARKERS = [
    { id: 'tokyo', regionId: 'tokyo', label: '도쿄', pos: [69.0, 65.1], kind: 'place', labelOffset: [12, -17] },
    { id: 'yokohama', regionId: 'kanto', label: '요코하마', pos: [68.1, 66.1], kind: 'place', labelOffset: [12, -3] },
    { id: 'kamakura', regionId: 'kanto', label: '가마쿠라', pos: [67.1, 67.1], kind: 'place', labelOffset: [12, 12] },
    { id: 'hakone', regionId: 'kanto', label: '하코네', pos: [63.7, 67.3], kind: 'place', labelOffset: [-53, 2] },
    { id: 'kansai', regionId: 'kansai', label: '간사이', pos: [42.0, 76.0], kind: 'region', labelOffset: [12, 0] },
    { id: 'kyushu', regionId: 'kyushu', label: '규슈', pos: [13.0, 88.0], kind: 'region', labelOffset: [12, 0] },
    { id: 'hokkaido', regionId: 'hokkaido', label: '홋카이도', pos: [71.0, 16.0], kind: 'region', labelOffset: [12, 0] },
    { id: 'okinawa', regionId: 'okinawa', label: '오키나와', pos: [90.0, 90.0], kind: 'region', labelOffset: [-20, -22] },
  ];

  const PAY_METHODS = [
    { id: 'card', payapp: 'card', ko: '신용·체크카드', en: 'CARD', ja: 'クレジットカード', zh: '信用卡', locales: ['ko', 'en', 'ja', 'zh'] },
  ];

  const option = (value, ko, en, ja, zh) => ({ value, ko, en, ja, zh });
  const FORM_OPTIONS = {
    count: [option('count_1', '1명', '1 person', '1名', '1人'), option('count_2', '2명', '2 people', '2名', '2人'), option('count_3', '3명', '3 people', '3名', '3人'), option('count_4', '4명', '4 people', '4名', '4人'), option('count_5', '5명', '5 people', '5名', '5人'), option('count_6_plus', '6명 이상', '6+ people', '6名以上', '6人以上')],
    group: [option('solo', '혼자', 'Solo', 'ひとり', '独自出行'), option('couple', '커플 · 부부', 'Couple', 'カップル・夫婦', '情侣·夫妻'), option('friends', '친구', 'Friends', '友人', '朋友'), option('family_children', '가족 (아이 동반)', 'Family with children', '家族（子ども同伴）', '家庭（带孩子）'), option('family_parents', '가족 (부모님 동반)', 'Family with parents', '家族（両親同伴）', '家庭（带父母）'), option('company', '회사 · 단체', 'Company/group', '会社・グループ', '公司·团体')],
    duration: [option('nights_2', '2박 3일', '3 days / 2 nights', '2泊3日', '3天2晚'), option('nights_3', '3박 4일', '4 days / 3 nights', '3泊4日', '4天3晚'), option('nights_4', '4박 5일', '5 days / 4 nights', '4泊5日', '5天4晚'), option('nights_5', '5박 6일', '6 days / 5 nights', '5泊6日', '6天5晚'), option('week_plus', '일주일 이상', '1 week or more', '1週間以上', '一周或以上')],
    budget: [option('under_500k', '~50만원', 'Under ₩500K', '50万ウォン以下', '50万韩元以下'), option('500k_1m', '50~100만원', '₩500K–1M', '50〜100万ウォン', '50–100万韩元'), option('1m_2m', '100~200만원', '₩1M–2M', '100〜200万ウォン', '100–200万韩元'), option('over_2m', '200만원 이상', 'Over ₩2M', '200万ウォン以上', '200万韩元以上'), option('undecided', '미정', 'Not decided', '未定', '待定')],
  };

  function optionLabel(group, value, locale) {
    const found = (FORM_OPTIONS[group] || []).find((item) => item.value === value || item.ko === value);
    return found ? (found[locale] || found.en || found.ko) : value;
  }

  function paymentMethods() {
    return PAY_METHODS.slice();
  }

  global.MTM_DATA = {
    REGIONS,
    SPOTS,
    MAP_MARKERS,
    PAY_METHODS,
    paymentMethods,
    FORM_OPTIONS,
    optionLabel,
    PRICE_WON: 5000,
    LS_KEY: 'mtm_proto_v1',
  };
})(window);
