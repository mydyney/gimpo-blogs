// mytokyomate — locale routing, translations and locale-aware formatting.
(function (global) {
  'use strict';

  const LOCALES = ['ko', 'en', 'ja', 'zh'];
  const META = {
    ko: { name: '한국어', html: 'ko', og: 'ko_KR', title: 'mytokyomate | 일본 여행 계획 컨시어지', description: '도쿄메이트가 동선까지 계산한 맞춤 일본 여행 일정을 만들어 드립니다.', image: '/og-ko.jpg', imageAlt: 'mytokyomate — 도쿄메이트가 짜 주는 일본 여행 일정' },
    en: { name: 'English', html: 'en', og: 'en_US', title: 'mytokyomate | Personal Japan Travel Planning', description: 'Get a personalized Japan itinerary planned by a Tokyo local, including efficient routes and selected destinations.', image: '/og-en.jpg', imageAlt: 'mytokyomate — a Tokyo local plans your Japan itinerary' },
    ja: { name: '日本語', html: 'ja', og: 'ja_JP', title: 'mytokyomate | 日本旅行プランコンシェルジュ', description: '東京を知り尽くしたメイトが、移動動線まで考えたあなただけの日本旅行プランを作成します。', image: '/og-ja.jpg', imageAlt: 'mytokyomate — 東京を知り尽くしたメイトが作る日本旅行プラン' },
    zh: { name: '简体中文', html: 'zh-CN', og: 'zh_CN', title: 'mytokyomate | 日本旅行行程定制', description: '由熟悉东京的当地旅行达人为您定制日本行程，并优化每日路线。', image: '/og-zh.jpg', imageAlt: 'mytokyomate — 熟悉东京的当地达人为您定制日本行程' },
  };

  const UI = {
    home: { ko: '홈', en: 'Home', ja: 'ホーム', zh: '首页' },
    plan: { ko: '여행 계획 요청', en: 'Plan a trip', ja: '旅行プラン依頼', zh: '定制行程' },
    my: { ko: '마이페이지', en: 'My page', ja: 'マイページ', zh: '我的页面' },
    login: { ko: '로그인', en: 'Sign in', ja: 'ログイン', zh: '登录' },
    signup: { ko: '가입하기', en: 'Sign up', ja: '会員登録', zh: '注册' },
    logout: { ko: '로그아웃', en: 'Sign out', ja: 'ログアウト', zh: '退出' },
    notifications: { ko: '알림', en: 'Notifications', ja: 'お知らせ', zh: '通知' },
    requestTrip: { ko: '여행 계획 요청하기', en: 'Request my itinerary', ja: '旅行プランを依頼', zh: '开始定制行程' },
    previous: { ko: '이전 단계', en: 'Back', ja: '前のステップ', zh: '上一步' },
    paymentMethod: { ko: '결제 수단', en: 'Payment method', ja: '決済方法', zh: '付款方式' },
    payerPhone: { ko: '결제자 휴대전화', en: 'Payer phone number', ja: '決済者の携帯番号', zh: '付款人手机号' },
    arrivalDate: { ko: '입국 날짜', en: 'Arrival date', ja: '入国日', zh: '入境日期' },
    tripDuration: { ko: '여행 기간', en: 'Trip duration', ja: '旅行期間', zh: '旅行天数' },
    notes: { ko: '요청사항', en: 'Requests', ja: 'ご要望', zh: '其他需求' },
    pay: { ko: '결제하기', en: 'Pay', ja: '決済する', zh: '立即付款' },
    retryPayment: { ko: '다시 결제', en: 'Retry payment', ja: '再決済', zh: '重新付款' },
    preparingPayment: { ko: '결제창 준비 중…', en: 'Preparing checkout…', ja: '決済画面を準備中…', zh: '正在准备付款…' },
    countryCode: { ko: '국가', en: 'Country', ja: '国', zh: '国家/地区' },
    krwCharge: { ko: '실제 결제는 원화(KRW)로 청구됩니다.', en: 'The final charge is processed in Korean won (KRW).', ja: '実際の決済通貨は韓国ウォン（KRW）です。', zh: '实际付款将以韩元（KRW）结算。' },
  };

  const PHRASES = {
    en: {
      '로그인이 만료되었습니다. 다시 로그인해 주세요.': 'Your session has expired. Please sign in again.', '이미 결제가 완료되었거나 다시 결제할 수 없는 요청입니다.': 'This request has already been paid or cannot be retried.', '결제 설정을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.': 'Payment is temporarily unavailable. Please try again shortly.', 'PayApp에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.': 'Could not connect to PayApp. Please try again shortly.', '결제창을 다시 열지 못했습니다. 잠시 후 다시 시도해 주세요.': 'Could not reopen checkout. Please try again shortly.',
      '도쿄를 가장 잘 아는 도쿄메이트가': 'A Tokyo local who knows the city best', '당신의 일본 여행 일정을 짜 드립니다': 'will plan your personal Japan itinerary',
      '가고 싶은 지역과 관광지를 고르고, 여행 정보를 알려 주세요.': 'Choose where you want to go and tell us about your trip.', '도쿄메이트가 동선까지 계산한 맞춤 일정을 만들어': 'Your mate will optimize the route and create your itinerary,', '마이페이지로 보내 드립니다.': 'then deliver it to your account.',
      '여행 계획 요청하기': 'Request my itinerary', '도쿄를 중심으로, 가고 싶은 곳을 자유롭게 골라 주세요.': 'Choose any places you want to visit, starting with Tokyo.', '동반자, 입국 날짜, 기간, 예산을 알려 주세요.': 'Tell us your party, arrival date, duration and budget.', '요청 1건당 ₩5,000 결제. 커피 한잔의 비용으로 편하게 여행하세요.': 'Pay ₩5,000 per request—about the price of a coffee.', '일정이 완성되면 알림이 오고, 마이페이지에서 확인합니다.': 'We will notify you when the guide is ready.',
      '도쿄는 골목 단위까지 안내해 드릴 수 있어요': 'We can guide you through Tokyo street by street', '도쿄와 함께, 또는 도쿄 다음으로 좋은 지역들': 'Great places to combine with Tokyo or visit next', '나만의 일본 여행 일정,': 'Your personal Japan itinerary,', '이제 메이트에게 맡겨 보세요': 'planned by your local mate', 'Tokyomate가 추천하는 일본 여행 가이드 · mytokyomate.com': 'A Japan travel guide recommended by Tokyomate · mytokyomate.com',
      '요코하마 · 가마쿠라 · 하코네 · 닛코': 'Yokohama · Kamakura · Hakone · Nikko', '스크램블 교차로': 'Scramble crossing',
      '도쿄를 가장 잘 아는 도쿄메이트가\n당신의 일본 여행 일정을 짜 드립니다': 'A Tokyo local plans your personal Japan itinerary',
      '가고 싶은 지역과 관광지를 고르고, 여행 정보를 알려 주세요.\n도쿄메이트가 동선까지 계산한 맞춤 일정을 만들어\n마이페이지로 보내 드립니다.': 'Choose where you want to go and tell us about your trip. Your Tokyo mate will build an efficient itinerary and deliver it to your account.',
      '커피 한잔으로 만드는 일본 여행 계획': 'A personal Japan itinerary for the price of a coffee',
      '지역·관광지 선택': 'Choose places', '여행 정보 입력': 'Tell us about your trip', '커피 한잔 결제': 'Pay for one coffee', '가이드 도착 알림': 'Receive your guide',
      '지역을 고른 뒤, 가고 싶은 관광지를 선택해 주세요': 'Choose an area, then select the places you want to visit',
      '일정을 짜는 데 필요한 정보를 알려 주세요': 'Tell us what we need to plan your trip', '요청 내용을 확인하고 결제해 주세요': 'Review your request and complete payment',
      '실제 휴대전화번호를 입력해 주세요.': 'Enter a real mobile number for the PayApp checkout.', '요청사항': 'Requests', '이전 단계': 'Back', '결제 수단': 'Payment method',
      '로그인': 'Sign in', '가입하기': 'Sign up', '회원가입': 'Create account', '로그아웃': 'Sign out', '마이페이지': 'My page', '알림': 'Notifications',
      '아직 알림이 없습니다.': 'No notifications yet.', '사진·지도 출처': 'Photo & map credits', '네이버 블로그': 'Naver blog',
      '중심 지역': 'Main area', '도쿄 관광지 보기': 'View Tokyo spots', '서브 지역': 'More regions', '선택한 관광지': 'Selected spots',
      '아직 선택된 곳이 없습니다. 카드를 눌러 주세요.': 'Choose at least one place.', '여행 정보 입력하기': 'Enter trip details',
      '동반 인원': 'Travelers', '동반자 구성': 'Travel party', '예산 (1인 기준, 항공 제외)': 'Budget per person, excluding flights', '숙소 선호 지역': 'Preferred accommodation area',
      '요청 확인 및 결제': 'Review and pay', '요청 요약': 'Request summary', '관광지': 'Places', '동반자': 'Travel party', '예산': 'Budget', '숙소 선호': 'Accommodation',
      '여행 계획 요청 1건': 'One itinerary request', '요청이 접수되었습니다': 'Request received', '홈으로': 'Home', '이메일': 'Email', '인증번호': 'Verification code', '인증번호 받기': 'Send verification code',
      '이름': 'Name', '회원가입': 'Create account', '가이드 보기': 'View guide', '메이트가 작성 중입니다': 'Your mate is working on it', '선택 관광지': 'Selected places', '여행 정보': 'Trip details',
      'PayApp 결제창에 사용할 실제 휴대전화번호를 입력해 주세요.': 'Enter the mobile number you will use in PayApp.', '입국 날짜': 'Arrival date', '여행 기간': 'Trip duration', '연락처와 입국 날짜를 입력하면 다음으로 넘어갈 수 있어요': 'Enter your phone number and arrival date to continue.',
      '예: 신주쿠 · 시부야 인근': 'e.g. near Shinjuku or Shibuya', '아이 동반 여부, 못 먹는 음식, 꼭 하고 싶은 것 등을 자유롭게 적어 주세요': 'Tell us about children, dietary needs, and anything you want to include.', '네이버 블로그': 'Naver blog',
      '도쿄에서 당일치기로 다녀올 수 있어요': 'Easy day trips from Tokyo', '골목 단위까지 상세 안내 가능한 중심 지역': 'Detailed guidance down to individual streets'
      , '도쿄메이트의 홈그라운드 — 가장 상세한 안내가 가능해요': 'Tokyomate’s home ground — our most detailed guidance', '관광지 위치': 'Place locations', '눌러서 선택 · 해제': 'Select or deselect', '눌러서 제거': 'Remove',
      '미정': 'Not decided', '특별한 선호 없음': 'No preference', '없음': 'None', '결제창 준비 중…': 'Preparing checkout…', '페이앱 결제창에서 안전하게 결제합니다': 'Secure payment through PayApp',
      '메이트가 여행 가이드를 작성하는 중입니다.': 'Your mate is creating your travel guide.', '완성되면 알림을 보내 드리고, 마이페이지에서 확인하실 수 있습니다.': 'We will notify you when it is ready, and you can view it in your account.', '마이페이지로 가기': 'Go to my page',
      '메일로 받은 6자리 인증번호를 입력해 주세요': 'Enter the 6-digit code sent to your email', '가입한 이메일로 인증번호를 받아 로그인해요': 'Sign in with a code sent to your email', '이메일 인증만으로 간편하게 가입해요': 'Create an account with email verification', '인증번호는 10분 동안 유효합니다.': 'The code is valid for 10 minutes.',
      '처리 중…': 'Processing…', '인증하고 로그인': 'Verify and sign in', '인증번호 받기': 'Send verification code', '이메일 다시 입력': 'Use another email', '아직 계정이 없나요?': 'No account yet?', '인증하고 가입': 'Verify and sign up', '정보 다시 입력': 'Edit information', '이미 계정이 있나요?': 'Already have an account?',
      '아직 요청한 여행 계획이 없습니다': 'You have no itinerary requests yet', '첫 번째 일본 여행 일정을 요청해 보세요.': 'Request your first Japan itinerary.', '가이드가 아직 준비 중입니다': 'Your guide is not ready yet', '메이트가 열심히 일정을 짜고 있어요. 완성되면 알림으로 알려 드릴게요.': 'Your mate is working on the itinerary. We will notify you when it is ready.',
      '인증번호가 올바르지 않거나 만료되었습니다.': 'The verification code is invalid or expired.', '인증번호를 이미 보냈습니다. 1분 후 다시 요청해 주세요.': 'A code was already sent. Try again in one minute.', '이미 가입된 이메일입니다. 로그인해 주세요.': 'This email is already registered. Please sign in.', '올바른 이메일 주소를 입력해 주세요.': 'Enter a valid email address.', '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.': 'We could not send the email. Please try again shortly.'
    },
    ja: {
      '로그인이 만료되었습니다. 다시 로그인해 주세요.': 'セッションの有効期限が切れました。もう一度ログインしてください。', '이미 결제가 완료되었거나 다시 결제할 수 없는 요청입니다.': '決済済み、または再決済できない依頼です。', '결제 설정을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.': '現在決済をご利用いただけません。しばらくしてからお試しください。', 'PayApp에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.': 'PayAppに接続できませんでした。しばらくしてからお試しください。', '결제창을 다시 열지 못했습니다. 잠시 후 다시 시도해 주세요.': '決済画面を開けませんでした。しばらくしてからお試しください。',
      '도쿄를 가장 잘 아는 도쿄메이트가': '東京を知り尽くしたメイトが', '당신의 일본 여행 일정을 짜 드립니다': 'あなただけの日本旅行を作成します', '가고 싶은 지역과 관광지를 고르고, 여행 정보를 알려 주세요.': '行きたいエリアとスポットを選び、旅行情報を教えてください。', '도쿄메이트가 동선까지 계산한 맞춤 일정을 만들어': '移動動線まで考えたプランを作成し、', '마이페이지로 보내 드립니다.': 'マイページへお届けします。', '여행 계획 요청하기': '旅行プランを依頼',
      '도쿄를 중심으로, 가고 싶은 곳을 자유롭게 골라 주세요.': '東京を中心に行きたい場所を自由に選んでください。', '동반자, 입국 날짜, 기간, 예산을 알려 주세요.': '人数、入国日、旅行期間、予算を教えてください。', '일정이 완성되면 알림이 오고, 마이페이지에서 확인합니다.': '完成後に通知し、マイページで確認できます。', '나만의 일본 여행 일정,': 'あなただけの日本旅行、', '이제 메이트에게 맡겨 보세요': 'メイトに任せてみませんか',
      '도쿄를 가장 잘 아는 도쿄메이트가\n당신의 일본 여행 일정을 짜 드립니다': '東京を知り尽くしたメイトが、あなただけの日本旅行を作成します',
      '커피 한잔으로 만드는 일본 여행 계획': 'コーヒー1杯の価格で作る日本旅行プラン', '지역·관광지 선택': 'エリア・スポット選択', '여행 정보 입력': '旅行情報入力', '커피 한잔 결제': 'コーヒー1杯分を決済', '가이드 도착 알림': 'ガイド完成通知',
      '지역을 고른 뒤, 가고 싶은 관광지를 선택해 주세요': 'エリアを選び、行きたいスポットを選択してください', '일정을 짜는 데 필요한 정보를 알려 주세요': '旅行プラン作成に必要な情報を教えてください', '요청 내용을 확인하고 결제해 주세요': '依頼内容を確認して決済してください',
      '로그인': 'ログイン', '가입하기': '会員登録', '회원가입': '会員登録', '마이페이지': 'マイページ', '알림': 'お知らせ', '결제 수단': '決済方法', '요청사항': 'ご要望', '이전 단계': '前へ',
      '아직 알림이 없습니다.': 'お知らせはまだありません。', '사진·지도 출처': '写真・地図の出典', '선택한 관광지': '選択したスポット',
      '아직 선택된 곳이 없습니다. 카드를 눌러 주세요.': 'カードを押して行きたい場所を選んでください。', '여행 정보 입력하기': '旅行情報を入力',
      '동반 인원': '人数', '동반자 구성': '同行者', '숙소 선호 지역': '宿泊希望エリア', '요청 확인 및 결제': '内容確認・決済', '요청 요약': '依頼内容',
      '관광지': '観光スポット', '동반자': '同行者', '예산': '予算', '숙소 선호': '宿泊希望', '여행 계획 요청 1건': '旅行プラン1件',
      '요청이 접수되었습니다': 'ご依頼を受け付けました', '홈으로': 'ホームへ', '이메일': 'メール', '인증번호': '認証コード', '이름': 'お名前', '가이드 보기': 'ガイドを見る',
      'PayApp 결제창에 사용할 실제 휴대전화번호를 입력해 주세요.': 'PayApp決済で使用する携帯番号を入力してください。', '입국 날짜': '入国日', '여행 기간': '旅行期間', '예산 (1인 기준, 항공 제외)': '予算（1名・航空券を除く）', '연락처와 입국 날짜를 입력하면 다음으로 넘어갈 수 있어요': '連絡先と入国日を入力すると次へ進めます。',
      '예: 신주쿠 · 시부야 인근': '例：新宿・渋谷周辺', '아이 동반 여부, 못 먹는 음식, 꼭 하고 싶은 것 등을 자유롭게 적어 주세요': 'お子様の同行、食事制限、必ずしたいことなどをご記入ください。', 'Tokyomate가 추천하는 일본 여행 가이드 · mytokyomate.com': 'Tokyomateがおすすめする日本旅行ガイド · mytokyomate.com', '네이버 블로그': 'Naverブログ',
      '도쿄는 골목 단위까지 안내해 드릴 수 있어요': '東京を街角まで詳しくご案内します', '도쿄에서 당일치기로 다녀올 수 있어요': '東京から日帰りで楽しめます', '골목 단위까지 상세 안내 가능한 중심 지역': '街角まで詳しくご案内できる中心エリア'
      , '요코하마 · 가마쿠라 · 하코네 · 닛코': '横浜 · 鎌倉 · 箱根 · 日光', '도쿄메이트의 홈그라운드 — 가장 상세한 안내가 가능해요': '東京メイトのホームエリア — 最も詳しいご案内が可能です', '관광지 위치': '観光スポットの位置', '눌러서 선택 · 해제': '選択・解除', '눌러서 제거': '削除',
      '미정': '未定', '특별한 선호 없음': '特になし', '없음': 'なし', '결제창 준비 중…': '決済画面を準備中…', '페이앱 결제창에서 안전하게 결제합니다': 'PayAppで安全に決済します',
      '메이트가 여행 가이드를 작성하는 중입니다.': 'メイトが旅行ガイドを作成中です。', '완성되면 알림을 보내 드리고, 마이페이지에서 확인하실 수 있습니다.': '完成後に通知し、マイページで確認できます。', '마이페이지로 가기': 'マイページへ',
      '메일로 받은 6자리 인증번호를 입력해 주세요': 'メールで届いた6桁の認証コードを入力してください', '가입한 이메일로 인증번호를 받아 로그인해요': 'メール認証コードでログインします', '이메일 인증만으로 간편하게 가입해요': 'メール認証だけで簡単に登録できます', '인증번호는 10분 동안 유효합니다.': '認証コードは10分間有効です。',
      '처리 중…': '処理中…', '인증하고 로그인': '認証してログイン', '인증번호 받기': '認証コードを送信', '이메일 다시 입력': 'メールを再入力', '아직 계정이 없나요?': 'アカウントをお持ちでないですか？', '인증하고 가입': '認証して登録', '정보 다시 입력': '情報を再入力', '이미 계정이 있나요?': 'アカウントをお持ちですか？',
      '아직 요청한 여행 계획이 없습니다': '旅行プランの依頼はまだありません', '첫 번째 일본 여행 일정을 요청해 보세요.': '最初の日本旅行プランを依頼しましょう。', '가이드가 아직 준비 중입니다': 'ガイドはまだ準備中です', '메이트가 열심히 일정을 짜고 있어요. 완성되면 알림으로 알려 드릴게요.': 'メイトがプランを作成中です。完成後にお知らせします。',
      '인증번호가 올바르지 않거나 만료되었습니다.': '認証コードが正しくないか、有効期限が切れています。', '인증번호를 이미 보냈습니다. 1분 후 다시 요청해 주세요.': '認証コードは送信済みです。1分後に再度お試しください。', '이미 가입된 이메일입니다. 로그인해 주세요.': '登録済みのメールです。ログインしてください。', '올바른 이메일 주소를 입력해 주세요.': '正しいメールアドレスを入力してください。', '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.': '認証メールを送信できませんでした。しばらくしてからお試しください。'
    },
    zh: {
      '로그인이 만료되었습니다. 다시 로그인해 주세요.': '登录已过期，请重新登录。', '이미 결제가 완료되었거나 다시 결제할 수 없는 요청입니다.': '该申请已付款或无法重新付款。', '결제 설정을 확인하는 중입니다. 잠시 후 다시 시도해 주세요.': '付款服务暂时不可用，请稍后重试。', 'PayApp에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.': '无法连接 PayApp，请稍后重试。', '결제창을 다시 열지 못했습니다. 잠시 후 다시 시도해 주세요.': '无法重新打开付款页面，请稍后重试。',
      '도쿄를 가장 잘 아는 도쿄메이트가': '熟悉东京的当地旅行达人', '당신의 일본 여행 일정을 짜 드립니다': '为您定制日本旅行行程', '가고 싶은 지역과 관광지를 고르고, 여행 정보를 알려 주세요.': '选择想去的地区和景点，并告诉我们您的旅行信息。', '도쿄메이트가 동선까지 계산한 맞춤 일정을 만들어': '我们将优化路线并制作定制行程，', '마이페이지로 보내 드립니다.': '完成后发送至您的账户。', '여행 계획 요청하기': '开始定制行程',
      '도쿄를 중심으로, 가고 싶은 곳을 자유롭게 골라 주세요.': '以东京为中心，自由选择想去的地方。', '동반자, 입국 날짜, 기간, 예산을 알려 주세요.': '请告诉我们同行人、入境日期、天数和预算。', '일정이 완성되면 알림이 오고, 마이페이지에서 확인합니다.': '行程完成后我们会通知您，可在账户中查看。', '나만의 일본 여행 일정,': '属于您的日本行程，', '이제 메이트에게 맡겨 보세요': '交给熟悉当地的旅行达人',
      '도쿄를 가장 잘 아는 도쿄메이트가\n당신의 일본 여행 일정을 짜 드립니다': '熟悉东京的当地旅行达人为您定制日本行程',
      '커피 한잔으로 만드는 일본 여행 계획': '用一杯咖啡的价格定制日本行程', '지역·관광지 선택': '选择地区·景点', '여행 정보 입력': '填写旅行信息', '커피 한잔 결제': '支付一杯咖啡的费用', '가이드 도착 알림': '收到行程通知',
      '지역을 고른 뒤, 가고 싶은 관광지를 선택해 주세요': '选择地区后，请勾选想去的景点', '일정을 짜는 데 필요한 정보를 알려 주세요': '请填写制作行程所需的信息', '요청 내용을 확인하고 결제해 주세요': '请确认申请内容并完成付款',
      '로그인': '登录', '가입하기': '注册', '회원가입': '注册', '마이페이지': '我的页面', '알림': '通知', '결제 수단': '付款方式', '요청사항': '其他需求', '이전 단계': '上一步',
      '아직 알림이 없습니다.': '暂无通知。', '사진·지도 출처': '图片与地图来源', '선택한 관광지': '已选景点',
      '아직 선택된 곳이 없습니다. 카드를 눌러 주세요.': '请点击卡片选择想去的地方。', '여행 정보 입력하기': '填写旅行信息',
      '동반 인원': '出行人数', '동반자 구성': '同行人', '숙소 선호 지역': '住宿偏好区域', '요청 확인 및 결제': '确认并付款', '요청 요약': '申请摘要',
      '관광지': '景点', '동반자': '同行人', '예산': '预算', '숙소 선호': '住宿偏好', '여행 계획 요청 1건': '一份定制行程',
      '요청이 접수되었습니다': '申请已提交', '홈으로': '返回首页', '이메일': '邮箱', '인증번호': '验证码', '이름': '姓名', '가이드 보기': '查看行程',
      'PayApp 결제창에 사용할 실제 휴대전화번호를 입력해 주세요.': '请输入用于 PayApp 付款的真实手机号码。', '입국 날짜': '入境日期', '여행 기간': '旅行天数', '예산 (1인 기준, 항공 제외)': '预算（每人，不含机票）', '연락처와 입국 날짜를 입력하면 다음으로 넘어갈 수 있어요': '填写手机号和入境日期后即可继续。',
      '예: 신주쿠 · 시부야 인근': '例如：新宿或涩谷附近', '아이 동반 여부, 못 먹는 음식, 꼭 하고 싶은 것 등을 자유롭게 적어 주세요': '请填写是否带儿童、饮食禁忌及特别想体验的项目。', 'Tokyomate가 추천하는 일본 여행 가이드 · mytokyomate.com': 'Tokyomate 推荐的日本旅行指南 · mytokyomate.com', '네이버 블로그': 'Naver 博客',
      '도쿄는 골목 단위까지 안내해 드릴 수 있어요': '东京可提供细致到街巷的旅行指南', '도쿄에서 당일치기로 다녀올 수 있어요': '从东京出发可轻松一日往返', '골목 단위까지 상세 안내 가능한 중심 지역': '可提供细致到街巷指南的核心地区'
      , '요코하마 · 가마쿠라 · 하코네 · 닛코': '横滨 · 镰仓 · 箱根 · 日光', '도쿄메이트의 홈그라운드 — 가장 상세한 안내가 가능해요': '东京旅行达人的主场 — 可提供最详细的指南', '관광지 위치': '景点位置', '눌러서 선택 · 해제': '选择或取消', '눌러서 제거': '移除',
      '미정': '待定', '특별한 선호 없음': '无特别偏好', '없음': '无', '결제창 준비 중…': '正在准备付款页面…', '페이앱 결제창에서 안전하게 결제합니다': '通过 PayApp 安全付款',
      '메이트가 여행 가이드를 작성하는 중입니다.': '旅行达人正在制作您的行程。', '완성되면 알림을 보내 드리고, 마이페이지에서 확인하실 수 있습니다.': '完成后我们会通知您，您可在账户中查看。', '마이페이지로 가기': '前往我的页面',
      '메일로 받은 6자리 인증번호를 입력해 주세요': '请输入邮件中的6位验证码', '가입한 이메일로 인증번호를 받아 로그인해요': '使用发送到邮箱的验证码登录', '이메일 인증만으로 간편하게 가입해요': '通过邮箱验证即可注册', '인증번호는 10분 동안 유효합니다.': '验证码10分钟内有效。',
      '처리 중…': '处理中…', '인증하고 로그인': '验证并登录', '인증번호 받기': '获取验证码', '이메일 다시 입력': '重新填写邮箱', '아직 계정이 없나요?': '还没有账户？', '인증하고 가입': '验证并注册', '정보 다시 입력': '重新填写信息', '이미 계정이 있나요?': '已有账户？',
      '아직 요청한 여행 계획이 없습니다': '暂无定制行程申请', '첫 번째 일본 여행 일정을 요청해 보세요.': '开始定制您的第一份日本行程。', '가이드가 아직 준비 중입니다': '行程仍在制作中', '메이트가 열심히 일정을 짜고 있어요. 완성되면 알림으로 알려 드릴게요.': '旅行达人正在制作行程，完成后会通知您。',
      '인증번호가 올바르지 않거나 만료되었습니다.': '验证码错误或已过期。', '인증번호를 이미 보냈습니다. 1분 후 다시 요청해 주세요.': '验证码已发送，请1分钟后重试。', '이미 가입된 이메일입니다. 로그인해 주세요.': '该邮箱已注册，请登录。', '올바른 이메일 주소를 입력해 주세요.': '请输入有效的邮箱地址。', '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.': '验证邮件发送失败，请稍后重试。'
    }
  };

  function localeFromPath(pathname) {
    const match = String(pathname || '').match(/^\/(ko|en|ja|zh)(?:\/|$)/);
    return match ? match[1] : 'ko';
  }

  let locale = localeFromPath(location.pathname);
  function routePath(pathname) {
    const clean = String(pathname || '/').replace(/^\/(ko|en|ja|zh)(?=\/|$)/, '') || '/';
    return clean.replace(/\/+$/, '') || '/';
  }
  function href(pathname, targetLocale) {
    const raw = String(pathname || '/');
    if (!raw.startsWith('/') || raw === '/attribution.html' || raw.startsWith('/api/') || raw.startsWith('/images/') || raw.startsWith('/css/') || raw.startsWith('/js/')) return raw;
    return '/' + (targetLocale || locale) + (routePath(raw) === '/' ? '/' : routePath(raw));
  }
  function t(key) { return (UI[key] && UI[key][locale]) || key; }
  function phrase(text) {
    const value = String(text || '');
    if (locale === 'ko') return value;
    const step = value.match(/^여행 계획 요청 · ([123])단계$/);
    if (step) return ({ en: `Trip request · Step ${step[1]}`, ja: `旅行プラン依頼 · ステップ${step[1]}`, zh: `定制行程 · 第${step[1]}步` })[locale];
    const selected = value.match(/^선택한 관광지 (\d+)곳$/);
    if (selected) return ({ en: `${selected[1]} selected`, ja: `選択したスポット ${selected[1]}件`, zh: `已选 ${selected[1]} 个景点` })[locale];
    const ariaSelected = value.match(/^(.+) 선택$/);
    if (ariaSelected) return ({ en: `Select ${ariaSelected[1]}`, ja: `${ariaSelected[1]}を選択`, zh: `选择${ariaSelected[1]}` })[locale];
    const payButton = value.match(/^(.+) 결제하기$/);
    if (payButton) return ({ en: `Pay ${payButton[1]}`, ja: `${payButton[1]}を決済`, zh: `支付 ${payButton[1]}` })[locale];
    const myPlans = value.match(/^(.+) 님의 여행 계획$/);
    if (myPlans) return ({ en: `${myPlans[1]}'s itineraries`, ja: `${myPlans[1]}様の旅行プラン`, zh: `${myPlans[1]}的旅行行程` })[locale];
    return (PHRASES[locale] && PHRASES[locale][value]) || value;
  }
  const CATEGORY = {
    en: { '스크램블 교차로': 'Scramble crossing', '쇼핑': 'Shopping', '번화가': 'Downtown', '도심': 'Central city', '야경': 'Night view', '전통': 'Tradition', '사찰': 'Temple', '미식': 'Food', '패션': 'Fashion', '카페': 'Cafes', '공원': 'Park', '박물관': 'Museum', '미술관': 'Art museum', '베이': 'Bay', '전망': 'View', '랜드마크': 'Landmark', '시장': 'Market', '산책': 'Walk', '테마파크': 'Theme park', '마이하마': 'Maihama', '항구': 'Harbor', '바다': 'Sea', '온천': 'Hot spring', '자연': 'Nature', '세계유산': 'World heritage' },
    ja: { '스크램블 교차로': 'スクランブル交差点', '쇼핑': 'ショッピング', '번화가': '繁華街', '도심': '都心', '야경': '夜景', '전통': '伝統', '사찰': '寺院', '미식': 'グルメ', '패션': 'ファッション', '카페': 'カフェ', '공원': '公園', '박물관': '博物館', '미술관': '美術館', '베이': 'ベイ', '전망': '展望', '랜드마크': 'ランドマーク', '시장': '市場', '산책': '散歩', '테마파크': 'テーマパーク', '마이하마': '舞浜', '항구': '港', '바다': '海', '온천': '温泉', '자연': '自然', '세계유산': '世界遺産' },
    zh: { '스크램블 교차로': '全向十字路口', '쇼핑': '购物', '번화가': '繁华街区', '도심': '市中心', '야경': '夜景', '전통': '传统', '사찰': '寺庙', '미식': '美食', '패션': '时尚', '카페': '咖啡店', '공원': '公园', '박물관': '博物馆', '미술관': '美术馆', '베이': '海湾', '전망': '观景', '랜드마크': '地标', '시장': '市场', '산책': '散步', '테마파크': '主题乐园', '마이하마': '舞滨', '항구': '港口', '바다': '海滨', '온천': '温泉', '자연': '自然', '세계유산': '世界遗产' }
  };
  function category(text) {
    if (locale === 'ko') return text;
    return String(text || '').split(' · ').map((part) => (CATEGORY[locale] && CATEGORY[locale][part]) || part).join(' · ');
  }
  function formatDate(ts) {
    return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ts));
  }
  function formatMoney(amount, currency) {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : locale, { style: 'currency', currency: currency || 'KRW', maximumFractionDigits: 0 }).format(Number(amount));
  }
  function updateMeta() {
    const meta = META[locale];
    document.documentElement.lang = meta.html;
    document.title = meta.title;
    const canonical = 'https://mytokyomate.com' + href(routePath(location.pathname));
    const image = 'https://mytokyomate.com' + meta.image;
    const set = (selector, attr, value) => { const el = document.querySelector(selector); if (el) el.setAttribute(attr, value); };
    set('meta[name="description"]', 'content', meta.description);
    set('link[rel="canonical"]', 'href', canonical);
    set('meta[property="og:locale"]', 'content', meta.og);
    set('meta[property="og:url"]', 'content', canonical);
    set('meta[property="og:title"]', 'content', meta.title);
    set('meta[property="og:description"]', 'content', meta.description);
    set('meta[property="og:image"]', 'content', image);
    set('meta[property="og:image:secure_url"]', 'content', image);
    set('meta[property="og:image:alt"]', 'content', meta.imageAlt);
    set('meta[name="twitter:title"]', 'content', meta.title);
    set('meta[name="twitter:description"]', 'content', meta.description);
    set('meta[name="twitter:image"]', 'content', image);
  }
  function localizeDocument(root) {
    updateMeta();
    const scope = root || document;
    scope.querySelectorAll('a[href]').forEach((a) => {
      const value = a.getAttribute('href');
      if (value && value.startsWith('/')) a.setAttribute('href', href(value));
    });
    if (locale === 'ko') return;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const raw = node.nodeValue;
      const trimmed = raw.trim();
      if (!trimmed) return;
      const translated = phrase(trimmed);
      if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
    });
    scope.querySelectorAll('[placeholder],[title],[aria-label]').forEach((el) => {
      ['placeholder', 'title', 'aria-label'].forEach((attr) => {
        if (el.hasAttribute(attr)) el.setAttribute(attr, phrase(el.getAttribute(attr)));
      });
    });
  }

  function setLocale(next) {
    if (!LOCALES.includes(next) || next === locale) return;
    location.href = href(routePath(location.pathname), next) + location.search + location.hash;
  }

  global.MTM_I18N = { LOCALES, META, get locale() { return locale; }, routePath, href, t, phrase, category, formatDate, formatMoney, localizeDocument, setLocale };
})(window);
