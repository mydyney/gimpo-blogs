export const LOCALES = ['ko', 'en', 'ja', 'zh'];

export function validLocale(value) {
  return LOCALES.includes(String(value || '')) ? String(value) : 'ko';
}

export function statusLabel(code, locale) {
  const labels = {
    payment_pending: { ko: '결제 대기', en: 'Payment pending', ja: '決済待ち', zh: '等待付款' },
    payment_waiting: { ko: '입금 대기', en: 'Awaiting payment', ja: '入金待ち', zh: '等待入账' },
    payment_failed: { ko: '결제 실패', en: 'Payment failed', ja: '決済失敗', zh: '付款失败' },
    payment_canceled: { ko: '결제 취소', en: 'Payment canceled', ja: '決済キャンセル', zh: '付款已取消' },
    guide_writing: { ko: '가이드 작성 중', en: 'Guide in progress', ja: 'ガイド作成中', zh: '行程制作中' },
    guide_arrived: { ko: '가이드 도착', en: 'Guide ready', ja: 'ガイド完成', zh: '行程已完成' },
  };
  const item = labels[code] || labels.guide_writing;
  return item[validLocale(locale)];
}

export function authEmail(locale, code) {
  const copy = {
    ko: { subject: '[mytokyomate] 이메일 인증번호', heading: 'mytokyomate 이메일 인증', intro: '아래 인증번호를 10분 안에 입력해 주세요.', ignore: '본인이 요청하지 않았다면 이 메일을 무시해 주세요.' },
    en: { subject: '[mytokyomate] Your verification code', heading: 'Verify your mytokyomate email', intro: 'Enter this code within 10 minutes.', ignore: 'If you did not request this email, you can ignore it.' },
    ja: { subject: '[mytokyomate] メール認証コード', heading: 'mytokyomate メール認証', intro: '以下の認証コードを10分以内に入力してください。', ignore: '心当たりがない場合は、このメールを無視してください。' },
    zh: { subject: '[mytokyomate] 邮箱验证码', heading: 'mytokyomate 邮箱验证', intro: '请在10分钟内输入以下验证码。', ignore: '如果不是您本人操作，请忽略此邮件。' },
  }[validLocale(locale)];
  return {
    subject: copy.subject,
    text: copy.intro + ' ' + code + ' ' + copy.ignore,
    html: '<div style="font-family:sans-serif;line-height:1.7"><h2>' + copy.heading + '</h2><p>' + copy.intro + '</p><p style="font-size:30px;font-weight:800;letter-spacing:8px">' + code + '</p><p style="color:#667">' + copy.ignore + '</p></div>',
  };
}

export function notificationText(code, params, locale) {
  const title = params && params.title ? String(params.title) : '';
  if (code === 'guide_arrived') {
    return {
      ko: `요청하신 여행 가이드 '${title}'가 도착했습니다.`,
      en: `Your travel guide '${title}' is ready.`,
      ja: `ご依頼の旅行ガイド「${title}」が完成しました。`,
      zh: `您的旅行行程“${title}”已完成。`,
    }[validLocale(locale)];
  }
  return title;
}
