// mytokyomate — region/spot data & service constants (from design handoff)
(function (global) {
  'use strict';

  const REGIONS = [
    { id: 'tokyo', ko: '도쿄', en: 'TOKYO', desc: '골목 단위까지 상세 안내 가능한 중심 지역', main: true, note: '도쿄메이트의 홈그라운드 — 가장 상세한 안내가 가능해요' },
    { id: 'kanto', ko: '도쿄 근교', en: 'AROUND TOKYO', desc: '요코하마 · 가마쿠라 · 하코네 · 닛코', note: '도쿄에서 당일치기로 다녀올 수 있어요' },
    { id: 'kansai', ko: '간사이', en: 'KANSAI', desc: '오사카 · 교토 · 나라', note: '도쿄와 신칸센으로 연결되는 대표 서브 지역' },
    { id: 'kyushu', ko: '규슈', en: 'KYUSHU', desc: '후쿠오카 · 유후인 · 벳푸', note: '온천과 미식의 남쪽 지역' },
    { id: 'hokkaido', ko: '홋카이도', en: 'HOKKAIDO', desc: '삿포로 · 오타루 · 후라노', note: '설경과 자연이 좋은 북쪽 지역' },
    { id: 'okinawa', ko: '오키나와', en: 'OKINAWA', desc: '나하 · 츄라우미 · 만자모', note: '휴양형 일정에 좋은 섬 지역' },
  ];

  const SPOTS = {
    tokyo: [
      { id: 'shibuya', ko: '시부야', en: 'SHIBUYA', cat: '쇼핑 · 스크램블 교차로' },
      { id: 'shinjuku', ko: '신주쿠', en: 'SHINJUKU', cat: '번화가 · 야경' },
      { id: 'asakusa', ko: '아사쿠사 · 센소지', en: 'ASAKUSA', cat: '전통 · 사찰' },
      { id: 'ginza', ko: '긴자', en: 'GINZA', cat: '쇼핑 · 미식' },
      { id: 'harajuku', ko: '하라주쿠 · 오모테산도', en: 'HARAJUKU', cat: '패션 · 카페' },
      { id: 'ueno', ko: '우에노', en: 'UENO', cat: '공원 · 박물관' },
      { id: 'odaiba', ko: '오다이바', en: 'ODAIBA', cat: '베이 · 야경' },
      { id: 'skytree', ko: '도쿄 스카이트리', en: 'SKYTREE', cat: '전망 · 랜드마크' },
      { id: 'tsukiji', ko: '쓰키지 장외시장', en: 'TSUKIJI', cat: '시장 · 미식' },
      { id: 'kichijoji', ko: '기치조지 · 이노카시라', en: 'KICHIJOJI', cat: '공원 · 산책' },
      { id: 'tokyodome', ko: '도쿄돔 시티', en: 'TOKYO DOME CITY', cat: '테마파크 · 도심' },
      { id: 'disney', ko: '도쿄 디즈니 리조트', en: 'DISNEY RESORT', cat: '테마파크 · 마이하마' },
      { id: 'roppongi', ko: '롯폰기 · 도쿄타워', en: 'ROPPONGI', cat: '야경 · 미술관' },
    ],
    kanto: [
      { id: 'yokohama', ko: '요코하마 미나토미라이', en: 'YOKOHAMA', cat: '항구 · 야경' },
      { id: 'kamakura', ko: '가마쿠라 · 에노시마', en: 'KAMAKURA', cat: '바다 · 사찰' },
      { id: 'hakone', ko: '하코네 온천', en: 'HAKONE', cat: '온천 · 후지산 뷰' },
      { id: 'nikko', ko: '닛코 도쇼구', en: 'NIKKO', cat: '세계유산 · 자연' },
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
    { id: 'card', ko: '신용·체크카드', en: 'CARD' },
    { id: 'kakao', ko: '카카오페이', en: 'KAKAO PAY' },
    { id: 'naver', ko: '네이버페이', en: 'NAVER PAY' },
    { id: 'toss', ko: '토스페이', en: 'TOSS PAY' },
  ];

  const FORM_OPTIONS = {
    count: ['1명', '2명', '3명', '4명', '5명', '6명 이상'],
    group: ['혼자', '커플 · 부부', '친구', '가족 (아이 동반)', '가족 (부모님 동반)', '회사 · 단체'],
    duration: ['2박 3일', '3박 4일', '4박 5일', '5박 6일', '일주일 이상'],
    budget: ['~50만원', '50~100만원', '100~200만원', '200만원 이상', '미정'],
  };

  global.MTM_DATA = {
    REGIONS,
    SPOTS,
    MAP_MARKERS,
    PAY_METHODS,
    FORM_OPTIONS,
    PRICE_WON: 5000,
    LS_KEY: 'mtm_proto_v1',
  };
})(window);
