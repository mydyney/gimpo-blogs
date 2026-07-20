const PAYAPP_CHECKOUT_COPY = {
  ko: {
    goodname: 'mytokyomate 여행 계획 요청',
    memo: 'mytokyomate 맞춤 여행 계획',
  },
  en: {
    goodname: 'mytokyomate travel itinerary request',
    memo: 'Personal Japan itinerary by mytokyomate',
  },
  ja: {
    goodname: 'mytokyomate 旅行プラン依頼',
    memo: 'mytokyomate オーダーメイド旅行プラン',
  },
  zh: {
    goodname: 'mytokyomate 日本旅行行程定制',
    memo: 'mytokyomate 定制旅行行程',
  },
};

export function payappCheckoutCopy(locale) {
  return PAYAPP_CHECKOUT_COPY[locale] || PAYAPP_CHECKOUT_COPY.ko;
}
