// mytokyomate — SPA router + views (vanilla JS, reimplemented from the design handoff prototype)
(function () {
  'use strict';

  const D = window.MTM_DATA;
  const S = window.MTM_STORE;
  const store = S.store;

  // Ephemeral UI state (not persisted — mirrors the prototype's non-saved state)
  const ui = {
    region: 'tokyo',
    sel: [],                                   // [{regionId, spotId}]
    form: { count: '2명', group: '커플 · 부부', date: '', duration: '3박 4일', budget: '100~200만원', lodging: '', notes: '' },
    payMethod: 'card', cardNum: '', cardExp: '', cardCvc: '',
    loginStep: 'email', emailInput: '', codeInput: '', demoCode: '', loginErr: '', afterLogin: null,
    notifOpen: false,
    adminSel: null, adminTitle: '', adminBody: '',
  };

  const viewEl = document.getElementById('view');
  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function ph(i, label) {
    return '<div class="ph ph-' + (i % 3) + '">' + esc(label) + '</div>';
  }

  // ===== Router =====
  function path() {
    return location.pathname.replace(/\/+$/, '') || '/';
  }

  function navigate(to) {
    if (path() !== to) history.pushState({}, '', to);
    ui.notifOpen = false;
    render();
    window.scrollTo(0, 0);
  }

  window.addEventListener('popstate', () => { ui.notifOpen = false; render(); });

  function currentRoute() {
    const p = path();
    if (p === '/') return { name: 'home' };
    if (p === '/plan') return { name: 'planner' };
    if (p === '/plan/info') return { name: 'info' };
    if (p === '/plan/pay') return { name: 'pay' };
    if (p === '/plan/done') return { name: 'done' };
    if (p === '/login') return { name: 'login' };
    if (p === '/my') return { name: 'mypage' };
    if (p === '/admin') return { name: 'admin' };
    const guide = p.match(/^\/guide\/([\w-]+)$/);
    if (guide) return { name: 'guide', reqId: guide[1] };
    return { name: 'home' };
  }

  // Route guards — return a redirect path or null
  function guard(route) {
    if (route.name === 'info' && ui.sel.length === 0) return '/plan';
    if (route.name === 'pay') {
      if (ui.sel.length === 0) return '/plan';
      if (!ui.form.date) return '/plan/info';
      if (!store.user) { ui.afterLogin = '/plan/pay'; resetLogin(); return '/login'; }
    }
    if (route.name === 'mypage' && !store.user) { ui.afterLogin = '/my'; resetLogin(); return '/login'; }
    if (route.name === 'guide' && !store.requests.some((q) => q.id === route.reqId)) return '/my';
    return null;
  }

  function resetLogin() {
    ui.loginStep = 'email';
    ui.codeInput = '';
    ui.loginErr = '';
  }

  // ===== Header / footer =====
  function navClass(route, name) {
    const map = { home: ['home'], planner: ['planner', 'info', 'pay', 'done'], mypage: ['mypage', 'guide'] };
    return (map[name] || []).indexOf(route.name) >= 0 ? 'active' : '';
  }

  function renderHeader(route) {
    const user = store.user;
    const myNotifs = user ? store.notifications.filter((n) => n.email === user.email) : [];
    const unread = myNotifs.filter((n) => !n.read).length;

    let right = '';
    if (user) {
      right =
        '<button class="notif-btn" data-act="toggle-notif">알림' +
        (unread > 0 ? '<span class="notif-badge">' + unread + '</span>' : '') +
        '</button>' +
        '<span class="header-email">' + esc(user.email) + '</span>' +
        '<button class="logout-btn" data-act="logout">로그아웃</button>';
      if (ui.notifOpen) {
        const items = myNotifs.slice().reverse().map((n) =>
          '<button class="notif-item' + (n.read ? '' : ' unread') + '" data-act="open-notif" data-id="' + esc(n.id) + '">' +
          '<span class="ni-text">' + esc(n.text) + '</span>' +
          '<span class="ni-when">' + S.fmtWhen(n.ts) + '</span>' +
          '</button>'
        ).join('');
        right +=
          '<div class="notif-panel">' +
          '<div class="np-head">알림</div>' +
          (myNotifs.length === 0 ? '<div class="np-empty">아직 알림이 없습니다.</div>' : items) +
          '</div>';
      }
    } else {
      right = '<a class="btn btn-outline" href="/login" data-nav>로그인</a>';
    }

    headerEl.innerHTML =
      '<div class="container bar">' +
      '<a class="logo" href="/" data-nav>' +
      '<span class="logo-main">mytokyomate</span>' +
      '<span class="logo-sub">TOKYOMATE JAPAN TRAVEL GUIDE</span>' +
      '</a>' +
      '<nav class="site-nav">' +
      '<a href="/" data-nav class="' + navClass(route, 'home') + '">홈</a>' +
      '<a href="/plan" data-nav class="' + navClass(route, 'planner') + '">여행 계획 요청</a>' +
      '<a href="/my" data-nav-my class="' + navClass(route, 'mypage') + '">마이페이지</a>' +
      '</nav>' +
      '<div class="header-right">' + right + '</div>' +
      '</div>';
  }

  function renderFooter() {
    footerEl.innerHTML =
      '<div class="inner">' +
      '<div>' +
      '<div class="ft-brand">mytokyomate</div>' +
      '<div class="ft-sub">Tokyomate가 추천하는 일본 여행 가이드 · mytokyomate.com</div>' +
      '</div>' +
      '<div class="ft-links">' +
      '<a href="https://blog.naver.com/tokyomate">네이버 블로그</a>' +
      '<a href="https://tripmate.news/">tripmate.news</a>' +
      (D.SHOW_ADMIN_LINK ? '<button class="admin-link-btn" data-act="go-admin">관리자 화면</button>' : '') +
      '</div>' +
      '</div>';
  }

  function sectionTitle(index, en, ko) {
    return (
      '<div class="section-title">' +
      (index ? '<div class="st-index">' + esc(index) + '</div>' : '') +
      '<h2>' + esc(en) + '</h2>' +
      (ko ? '<div class="st-ko">' + esc(ko) + '</div>' : '') +
      '</div>'
    );
  }

  // ===== Views =====
  function viewHome() {
    const steps = [
      ['01', '지역·관광지 선택', '도쿄를 중심으로, 가고 싶은 곳을 자유롭게 골라 주세요.'],
      ['02', '여행 정보 입력', '동반자, 입국 날짜, 기간, 예산을 알려 주세요.'],
      ['03', '₩5,000 결제', '요청 1건당 정액 결제. 숨은 비용이 없습니다.'],
      ['04', '가이드 도착 알림', '일정이 완성되면 알림이 오고, 마이페이지에서 확인합니다.'],
    ];
    const highlights = D.SPOTS.tokyo.slice(0, 4);
    const subRegions = D.REGIONS.filter((r) => !r.main).slice(0, 5);

    return (
      '<main>' +
      '<section class="hero">' +
      '<div>' +
      '<div class="eyebrow">TOKYO FIRST, JAPAN NEXT</div>' +
      '<h1>TOKYO MATE</h1>' +
      '<div class="hero-sub">도쿄를 가장 잘 아는 도쿄메이트가<br>당신의 일본 여행 일정을 짜 드립니다</div>' +
      '<p class="hero-desc">가고 싶은 지역과 관광지를 고르고, 여행 정보를 알려 주세요.<br>도쿄메이트가 동선까지 계산한 맞춤 일정을 만들어<br>마이페이지로 보내 드립니다.</p>' +
      '<div class="hero-cta">' +
      '<a class="btn btn-pill" href="/plan" data-nav><span class="arrow">▶</span>여행 계획 요청하기</a>' +
      '<span class="hero-note">커피 한잔으로 만드는 일본 여행 계획</span>' +
      '</div>' +
      '</div>' +
      '<div class="hero-img">' + ph(0, 'TOKYO') + '</div>' +
      '</section>' +

      '<section class="steps-band"><div class="steps">' +
      steps.map((s) =>
        '<div><div class="num">' + s[0] + '</div><div class="tt">' + s[1] + '</div><div class="dd">' + s[2] + '</div></div>'
      ).join('') +
      '</div></section>' +

      '<section class="highlights">' +
      '<div class="hl-head">' +
      sectionTitle('중심 지역', 'TOKYO', '도쿄는 골목 단위까지 안내해 드릴 수 있어요') +
      '<a class="btn btn-outline" href="/plan" data-nav-tokyo>도쿄 관광지 보기</a>' +
      '</div>' +
      '<div class="hl-grid">' +
      highlights.map((s, i) =>
        '<div class="hl-card">' +
        '<div class="hl-img">' + ph(i, s.ko + ' 사진') + '</div>' +
        '<button class="hl-body" data-act="go-plan-tokyo">' +
        '<span class="hl-name">' + esc(s.ko) + '</span>' +
        '<span class="hl-cat">' + esc(s.cat) + '</span>' +
        '</button>' +
        '</div>'
      ).join('') +
      '</div>' +
      '</section>' +

      '<section class="subregions-band"><div class="inner">' +
      sectionTitle('서브 지역', 'MORE REGIONS', '도쿄와 함께, 또는 도쿄 다음으로 좋은 지역들') +
      '<div class="sr-grid">' +
      subRegions.map((r) =>
        '<button class="sr-card" data-act="go-plan-region" data-region="' + r.id + '">' +
        '<div class="sr-en">' + esc(r.en) + '</div>' +
        '<div class="sr-ko">' + esc(r.ko) + '</div>' +
        '<div class="sr-desc">' + esc(r.desc) + '</div>' +
        '</button>'
      ).join('') +
      '</div>' +
      '</div></section>' +

      '<section class="cta-band"><div class="inner">' +
      '<div>' +
      '<div class="cb-en">START PLANNING</div>' +
      '<div class="cb-ko">나만의 일본 여행 일정,<br>이제 메이트에게 맡겨 보세요</div>' +
      '</div>' +
      '<a class="btn btn-pill" href="/plan" data-nav><span class="arrow">▶</span>여행 계획 요청하기</a>' +
      '</div></section>' +
      '</main>'
    );
  }

  const JP_MAP_SVG =
    '<svg viewBox="0 0 280 340">' +
    '<g fill="#ffffff" stroke="#c3d3da" stroke-width="1.5" stroke-linejoin="round">' +
    '<path d="M205 55 L215 25 L245 18 L264 42 L250 70 L226 78 L206 68 Z"></path>' +
    '<path d="M232 92 L248 108 L246 138 L232 168 L210 192 L182 208 L150 220 L118 232 L92 244 L72 252 L64 242 L86 228 L112 216 L144 203 L174 190 L196 170 L214 146 L222 116 Z"></path>' +
    '<path d="M148 250 L178 243 L188 255 L168 264 L146 259 Z"></path>' +
    '<path d="M92 258 L114 253 L122 272 L114 296 L94 302 L82 282 Z"></path>' +
    '<circle cx="44" cy="322" r="4"></circle>' +
    '<circle cx="34" cy="330" r="3"></circle>' +
    '</g>' +
    '</svg>';

  function viewPlanner() {
    const activeRegion = D.REGIONS.find((r) => r.id === ui.region) || D.REGIONS[0];

    const markers = D.REGIONS.map((r) => {
      const active = ui.region === r.id;
      const cnt = ui.sel.filter((x) => x.regionId === r.id).length;
      const pos = D.MAP_POS[r.id] || [50, 50];
      return (
        '<button class="map-marker' + (active ? ' active' : '') + (cnt > 0 ? ' picked' : '') + '"' +
        ' style="left:' + pos[0] + '%;top:' + pos[1] + '%" data-act="pick-region" data-region="' + r.id + '">' +
        '<span class="dot"></span><span class="lbl">' + esc(r.ko) + '</span>' +
        '</button>'
      );
    }).join('');

    const tiles = D.REGIONS.map((r) => {
      const active = ui.region === r.id;
      const count = ui.sel.filter((x) => x.regionId === r.id).length;
      return (
        '<button class="region-tile' + (r.main ? ' main' : '') + (active ? ' active' : '') + '" data-act="pick-region" data-region="' + r.id + '">' +
        '<span class="rt-en">' + esc(r.en) + '</span>' +
        '<span class="rt-ko">' + esc(r.ko) + '</span>' +
        '<span class="rt-desc">' + esc(r.desc) + '</span>' +
        (count > 0 ? '<span class="rt-count">' + count + '</span>' : '') +
        '</button>'
      );
    }).join('');

    const cards = (D.SPOTS[ui.region] || []).map((sp, i) => {
      const idx = ui.sel.findIndex((x) => x.regionId === ui.region && x.spotId === sp.id);
      const selected = idx >= 0;
      return (
        '<div class="spot-card' + (selected ? ' selected' : '') + '">' +
        (selected ? '<span class="sp-order">' + (idx + 1) + '</span>' : '') +
        '<div class="sp-img">' + ph(i, sp.en) + '</div>' +
        '<button class="sp-body" title="눌러서 선택 · 해제" data-act="toggle-spot" data-spot="' + sp.id + '">' +
        '<span class="sp-name">' + esc(sp.ko) + '</span>' +
        '<span class="sp-cat">' + esc(sp.cat) + '</span>' +
        '</button>' +
        '</div>'
      );
    }).join('');

    const chips = ui.sel.map((x, i) =>
      '<button class="sel-chip" title="눌러서 제거" data-act="remove-sel" data-i="' + i + '">' +
      esc((i + 1) + '. ' + S.spotName(x.regionId, x.spotId)) + '<span class="x">×</span>' +
      '</button>'
    ).join('');

    const none = ui.sel.length === 0;

    return (
      '<main class="page page-planner">' +
      sectionTitle('여행 계획 요청 · 1단계', 'PICK YOUR SPOTS', '지역을 고른 뒤, 가고 싶은 관광지를 선택해 주세요') +
      '<div class="planner-grid">' +
      '<div class="region-rail">' +
      '<div class="jp-map">' + JP_MAP_SVG + markers + '</div>' +
      tiles +
      '</div>' +
      '<div>' +
      '<div class="spots-head">' +
      '<span class="sh-en">' + esc(activeRegion.en) + '</span>' +
      '<span class="sh-note">' + esc(activeRegion.note) + '</span>' +
      '</div>' +
      '<div class="spots-grid">' + cards + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="select-bar">' +
      '<div class="sb-info">' +
      '<div class="sb-label">선택한 관광지 ' + ui.sel.length + '곳</div>' +
      (none
        ? '<div class="sb-empty">아직 선택된 곳이 없습니다. 카드를 눌러 주세요.</div>'
        : '<div class="sb-chips">' + chips + '</div>') +
      '</div>' +
      '<button class="btn btn-pill" data-act="go-info"' + (none ? ' disabled' : '') + '><span class="arrow">▶</span>여행 정보 입력하기</button>' +
      '</div>' +
      '</main>'
    );
  }

  function selectField(label, key, options) {
    return (
      '<div class="field"><label>' + esc(label) + '</label>' +
      '<select data-form="' + key + '">' +
      options.map((o) => '<option value="' + esc(o) + '"' + (ui.form[key] === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') +
      '</select></div>'
    );
  }

  function viewInfo() {
    const incomplete = !ui.form.date;
    return (
      '<main class="page page-narrow">' +
      sectionTitle('여행 계획 요청 · 2단계', 'YOUR TRIP DETAILS', '일정을 짜는 데 필요한 정보를 알려 주세요') +
      '<div class="info-form">' +
      '<div class="form-row">' +
      selectField('동반 인원', 'count', D.FORM_OPTIONS.count) +
      selectField('동반자 구성', 'group', D.FORM_OPTIONS.group) +
      '</div>' +
      '<div class="form-row">' +
      '<div class="field"><label>입국 날짜</label><input type="date" data-form="date" value="' + esc(ui.form.date) + '"></div>' +
      selectField('여행 기간', 'duration', D.FORM_OPTIONS.duration) +
      '</div>' +
      '<div class="form-row">' +
      selectField('예산 (1인 기준, 항공 제외)', 'budget', D.FORM_OPTIONS.budget) +
      '<div class="field"><label>숙소 선호 지역</label><input type="text" data-form="lodging" placeholder="예: 신주쿠 · 시부야 인근" value="' + esc(ui.form.lodging) + '"></div>' +
      '</div>' +
      '<div class="field"><label>요청사항</label><textarea rows="4" data-form="notes" placeholder="아이 동반 여부, 못 먹는 음식, 꼭 하고 싶은 것 등을 자유롭게 적어 주세요">' + esc(ui.form.notes) + '</textarea></div>' +
      '<div class="form-actions">' +
      '<a class="btn btn-outline" href="/plan" data-nav>이전 단계</a>' +
      '<button class="btn btn-pill" id="info-next" data-act="go-pay"' + (incomplete ? ' disabled' : '') + '><span class="arrow">▶</span>요청 확인 및 결제</button>' +
      '<span class="form-hint" id="info-hint">' + (incomplete ? '입국 날짜를 선택하면 다음으로 넘어갈 수 있어요' : '') + '</span>' +
      '</div>' +
      '</div>' +
      '</main>'
    );
  }

  function cardIncomplete() {
    return ui.cardNum.replace(/\D/g, '').length < 12 || ui.cardExp.length < 5 || ui.cardCvc.length < 3;
  }

  function viewPay() {
    const f = ui.form;
    const price = S.priceLabel();
    const rows = [
      ['관광지', S.selLabel(ui.sel) || '—'],
      ['동반자', f.count + ' · ' + f.group],
      ['입국 날짜', f.date || '미정'],
      ['여행 기간', f.duration],
      ['예산', f.budget],
      ['숙소 선호', f.lodging || '특별한 선호 없음'],
      ['요청사항', f.notes || '없음'],
    ];
    const methodObj = D.PAY_METHODS.find((m) => m.id === ui.payMethod) || D.PAY_METHODS[0];
    const isCard = ui.payMethod === 'card';
    const disabled = isCard && cardIncomplete();

    return (
      '<main class="page page-narrow">' +
      sectionTitle('여행 계획 요청 · 3단계', 'CONFIRM & PAY', '요청 내용을 확인하고 결제해 주세요') +
      '<div class="pay-summary">' +
      '<div class="ps-title">요청 요약</div>' +
      '<div class="ps-rows">' +
      rows.map((r) => '<div class="ps-row"><span class="k">' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>').join('') +
      '</div>' +
      '</div>' +
      '<div class="pay-methods">' +
      '<div class="pm-title">결제 수단</div>' +
      '<div class="pm-grid">' +
      D.PAY_METHODS.map((m) =>
        '<button class="pm-card' + (ui.payMethod === m.id ? ' on' : '') + '" data-act="pick-method" data-method="' + m.id + '">' +
        '<span class="pm-en">' + esc(m.en) + '</span>' +
        '<span class="pm-ko">' + esc(m.ko) + '</span>' +
        '</button>'
      ).join('') +
      '</div>' +
      (isCard
        ? '<div class="card-fields">' +
          '<div class="field"><label>카드 번호</label><input type="text" inputmode="numeric" data-card="num" placeholder="0000 0000 0000 0000" value="' + esc(ui.cardNum) + '"></div>' +
          '<div class="field"><label>유효기간</label><input type="text" inputmode="numeric" data-card="exp" placeholder="MM/YY" value="' + esc(ui.cardExp) + '"></div>' +
          '<div class="field"><label>CVC</label><input type="text" inputmode="numeric" data-card="cvc" placeholder="123" value="' + esc(ui.cardCvc) + '"></div>' +
          '</div>'
        : '<div class="easy-note">결제하기를 누르면 ' + esc(methodObj.ko) + ' 결제창으로 이동합니다. 프로토타입에서는 바로 완료 처리됩니다.</div>') +
      '</div>' +
      '<div class="price-band">' +
      '<span class="pb-label">여행 계획 요청 1건</span>' +
      '<span class="pb-price">' + price + '</span>' +
      '</div>' +
      '<div class="pay-actions">' +
      '<a class="btn btn-outline" href="/plan/info" data-nav>이전 단계</a>' +
      '<button class="btn btn-pill" id="pay-btn" data-act="do-pay"' + (disabled ? ' disabled' : '') + '><span class="arrow">▶</span>' + price + ' 결제하기</button>' +
      '<span class="form-hint">프로토타입 결제입니다 — 실제 결제가 이루어지지 않습니다</span>' +
      '</div>' +
      '</main>'
    );
  }

  function viewDone() {
    return (
      '<main class="page page-narrow done">' +
      '<div class="dn-en">RECEIVED</div>' +
      '<div class="dn-ko">요청이 접수되었습니다</div>' +
      '<p>메이트가 여행 가이드를 작성하는 중입니다.<br>완성되면 알림을 보내 드리고, 마이페이지에서 확인하실 수 있습니다.</p>' +
      '<div class="dn-actions">' +
      '<a class="btn btn-pill" href="/my" data-nav-my>마이페이지로 가기</a>' +
      '<a class="btn btn-outline" href="/" data-nav>홈으로</a>' +
      '</div>' +
      '</main>'
    );
  }

  function emailValid() {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ui.emailInput);
  }

  function viewLogin() {
    let body = '';
    if (ui.loginStep === 'email') {
      body =
        '<div class="field"><label>이메일</label><input type="email" data-login="email" placeholder="you@example.com" value="' + esc(ui.emailInput) + '"></div>' +
        '<button class="btn btn-pill btn-full" id="send-code" data-act="send-code"' + (emailValid() ? '' : ' disabled') + '>인증번호 받기</button>';
    } else {
      body =
        '<div class="login-sent"><b>' + esc(ui.emailInput) + '</b> 주소로 인증번호를 보냈습니다.<br>메일함을 확인해 주세요.</div>' +
        '<div class="demo-code">프로토타입 데모 — 인증번호: <b>' + esc(ui.demoCode) + '</b></div>' +
        '<div class="field"><label>인증번호 6자리</label><input type="text" inputmode="numeric" maxlength="6" data-login="code" placeholder="123456" value="' + esc(ui.codeInput) + '"></div>' +
        '<div class="login-err" id="login-err"' + (ui.loginErr ? '' : ' hidden') + '>' + esc(ui.loginErr) + '</div>' +
        '<button class="btn btn-pill btn-full" id="verify-code" data-act="verify-code"' + (ui.codeInput.length === 6 ? '' : ' disabled') + '>로그인</button>' +
        '<button class="link-btn" data-act="back-to-email">다른 이메일로 받기</button>';
    }
    return (
      '<main class="page page-login">' +
      sectionTitle('로그인', 'SIGN IN', '이메일로 받은 인증번호로 간편하게 로그인해요') +
      '<div class="login-form">' + body + '</div>' +
      '</main>'
    );
  }

  function viewMypage() {
    const user = store.user;
    const myReqs = store.requests.filter((q) => q.email === user.email).slice().reverse();

    let list = '';
    if (myReqs.length === 0) {
      list =
        '<div class="empty-box">' +
        '<div class="eb-title">아직 요청한 여행 계획이 없습니다</div>' +
        '<div class="eb-desc">첫 번째 일본 여행 일정을 요청해 보세요.</div>' +
        '<div class="eb-cta"><a class="btn btn-pill" href="/plan" data-nav><span class="arrow">▶</span>여행 계획 요청하기</a></div>' +
        '</div>';
    } else {
      list =
        '<div class="req-list">' +
        myReqs.map((q) =>
          '<div class="req-card">' +
          '<div class="rq-main">' +
          '<div class="rq-head">' +
          '<span class="rq-id">' + esc(q.id) + '</span>' +
          '<span class="status-badge' + (q.status === '가이드 도착' ? ' arrived' : '') + '">' + esc(q.status) + '</span>' +
          '</div>' +
          '<div class="rq-spots">' + esc(S.selLabel(q.sel)) + '</div>' +
          '<div class="rq-meta">' + esc(S.metaLabel(q.form) + ' · ' + S.fmtWhen(q.createdAt) + ' 접수') + '</div>' +
          '</div>' +
          (q.guide
            ? '<a class="btn btn-square" href="/guide/' + esc(q.id) + '" data-nav><span class="arrow">▶</span>가이드 보기</a>'
            : '<span class="rq-waiting">메이트가 작성 중입니다</span>') +
          '</div>'
        ).join('') +
        '</div>';
    }

    return (
      '<main class="page">' +
      sectionTitle('마이페이지', 'MY PAGE', user.email + ' 님의 여행 계획') +
      list +
      '</main>'
    );
  }

  function viewGuide(reqId) {
    const q = store.requests.find((x) => x.id === reqId);
    const g = q && q.guide;
    return (
      '<main class="page page-narrow">' +
      '<button class="back-btn" data-act="go-my">◀ 마이페이지로</button>' +
      sectionTitle(q ? q.id : '여행 가이드', 'YOUR TRAVEL GUIDE', g ? g.title : '가이드가 아직 준비 중입니다') +
      '<div class="guide-meta"><b>선택 관광지</b> · ' + esc(q ? S.selLabel(q.sel) : '—') + '<br><b>여행 정보</b> · ' + esc(q ? S.metaLabel(q.form) : '—') + '</div>' +
      '<div class="guide-body">' + esc(g ? g.body : '메이트가 열심히 일정을 짜고 있어요. 완성되면 알림으로 알려 드릴게요.') + '</div>' +
      (g ? '<div class="guide-band">가이드에 대해 궁금한 점이 있으면 언제든 문의해 주세요. · ' + S.fmtWhen(g.registeredAt) + ' 등록</div>' : '') +
      '</main>'
    );
  }

  function viewAdmin() {
    const reqs = store.requests.slice().reverse();
    const aq = store.requests.find((q) => q.id === ui.adminSel);

    const list = reqs.map((q) =>
      '<button class="admin-req' + (ui.adminSel === q.id ? ' on' : '') + '" data-act="admin-open" data-id="' + esc(q.id) + '">' +
      '<div class="ar-head">' +
      '<span class="ar-id">' + esc(q.id) + '</span>' +
      '<span class="status-badge' + (q.status === '가이드 도착' ? ' arrived' : '') + '">' + esc(q.status) + '</span>' +
      '</div>' +
      '<div class="ar-spots">' + esc(S.selLabel(q.sel)) + '</div>' +
      '<div class="ar-meta">' + esc(q.email + ' · ' + S.fmtWhen(q.createdAt)) + '</div>' +
      '</button>'
    ).join('');

    let detail = '';
    if (aq) {
      let guidePart = '';
      if (aq.guide) {
        guidePart =
          '<div class="ad-guide-done">' +
          '<div class="gt">' + esc(aq.guide.title) + '</div>' +
          '<div class="gb">' + esc(aq.guide.body) + '</div>' +
          '<div class="gn">이미 등록된 가이드입니다 — 사용자에게 알림이 발송되었습니다.</div>' +
          '</div>';
      } else {
        guidePart =
          '<div class="ad-form">' +
          '<div class="field"><label>가이드 제목</label><input type="text" data-admin="title" placeholder="예: 도쿄 3박 4일 — 시부야·아사쿠사 중심 코스" value="' + esc(ui.adminTitle) + '"></div>' +
          '<div class="field"><label>일자별 일정</label><textarea rows="10" data-admin="body" placeholder="Day 1 — 나리타 도착, 아사쿠사 센소지…\nDay 2 — 시부야 · 하라주쿠…">' + esc(ui.adminBody) + '</textarea></div>' +
          '<div class="ad-actions">' +
          '<button class="btn btn-pill" id="register-guide" data-act="register-guide"' + (ui.adminTitle.trim() && ui.adminBody.trim() ? '' : ' disabled') + '>가이드 등록하기</button>' +
          '<span class="form-hint">등록하면 사용자에게 알림이 갑니다</span>' +
          '</div>' +
          '</div>';
      }
      detail =
        '<div class="admin-detail">' +
        '<div class="ad-title">' + esc(aq.id) + ' · 가이드 작성</div>' +
        '<div class="ad-info">' +
        '<b>요청자</b> · ' + esc(aq.email) + '<br>' +
        '<b>관광지</b> · ' + esc(S.selLabel(aq.sel)) + '<br>' +
        '<b>여행 정보</b> · ' + esc(S.metaLabel(aq.form)) + '<br>' +
        '<b>요청사항</b> · ' + esc(aq.form.notes || '없음') +
        '</div>' +
        guidePart +
        '</div>';
    } else if (reqs.length > 0) {
      detail = '<div class="admin-placeholder">왼쪽 목록에서 요청을 선택해 주세요.</div>';
    }

    return (
      '<main class="page">' +
      '<div class="admin-head">' +
      sectionTitle('관리자', 'ADMIN', '접수된 요청에 여행 가이드를 등록합니다') +
      '<span class="admin-tag">내부용 화면</span>' +
      '</div>' +
      (reqs.length === 0
        ? '<div class="admin-empty">아직 접수된 요청이 없습니다. 사용자가 결제를 완료하면 이곳에 표시됩니다.</div>'
        : '<div class="admin-grid"><div class="admin-list">' + list + '</div>' + detail + '</div>') +
      '</main>'
    );
  }

  // ===== Render + event wiring =====
  function render() {
    const route = currentRoute();
    const redirect = guard(route);
    if (redirect) {
      history.replaceState({}, '', redirect);
      return render();
    }

    renderHeader(route);
    renderFooter();

    switch (route.name) {
      case 'home': viewEl.innerHTML = viewHome(); break;
      case 'planner': viewEl.innerHTML = viewPlanner(); break;
      case 'info': viewEl.innerHTML = viewInfo(); break;
      case 'pay': viewEl.innerHTML = viewPay(); break;
      case 'done': viewEl.innerHTML = viewDone(); break;
      case 'login': viewEl.innerHTML = viewLogin(); break;
      case 'mypage': viewEl.innerHTML = viewMypage(); break;
      case 'guide': viewEl.innerHTML = viewGuide(route.reqId); break;
      case 'admin': viewEl.innerHTML = viewAdmin(); break;
    }

    document.title = 'mytokyomate | 일본 여행 계획 컨시어지';
  }

  // --- actions (event delegation) ---
  function goMypageGuarded() {
    if (!store.user) {
      ui.afterLogin = '/my';
      resetLogin();
      navigate('/login');
    } else {
      navigate('/my');
    }
  }

  function doPay() {
    const id = 'R-' + String(Date.now()).slice(-6);
    const req = {
      id,
      email: store.user.email,
      sel: ui.sel,
      form: Object.assign({}, ui.form),
      status: '가이드 작성 중',
      guide: null,
      createdAt: Date.now(),
    };
    store.requests = store.requests.concat([req]);
    S.persist();
    ui.sel = [];
    ui.cardNum = ''; ui.cardExp = ''; ui.cardCvc = '';
    navigate('/plan/done');
  }

  function registerGuide() {
    const aq = store.requests.find((q) => q.id === ui.adminSel);
    if (!aq || aq.guide) return;
    const guide = { title: ui.adminTitle.trim(), body: ui.adminBody.trim(), registeredAt: Date.now() };
    if (!guide.title || !guide.body) return;
    store.requests = store.requests.map((q) => (q.id === aq.id ? Object.assign({}, q, { guide, status: '가이드 도착' }) : q));
    store.notifications = store.notifications.concat([{
      id: 'N-' + Date.now(),
      email: aq.email,
      reqId: aq.id,
      text: "요청하신 여행 가이드 '" + guide.title + "'가 도착했습니다. 지금 확인해 보세요.",
      read: false,
      ts: Date.now(),
    }]);
    S.persist();
    ui.adminTitle = '';
    ui.adminBody = '';
    render();
  }

  document.addEventListener('click', (e) => {
    const navEl = e.target.closest('[data-nav]');
    if (navEl) { e.preventDefault(); navigate(navEl.getAttribute('href')); return; }

    const navMy = e.target.closest('[data-nav-my]');
    if (navMy) { e.preventDefault(); goMypageGuarded(); return; }

    const navTokyo = e.target.closest('[data-nav-tokyo]');
    if (navTokyo) { e.preventDefault(); ui.region = 'tokyo'; navigate('/plan'); return; }

    const el = e.target.closest('[data-act]');
    if (!el) {
      // click outside the notification panel closes it
      if (ui.notifOpen && !e.target.closest('.notif-panel')) { ui.notifOpen = false; render(); }
      return;
    }

    switch (el.getAttribute('data-act')) {
      case 'toggle-notif':
        ui.notifOpen = !ui.notifOpen;
        render();
        break;
      case 'open-notif': {
        const id = el.getAttribute('data-id');
        const n = store.notifications.find((m) => m.id === id);
        if (!n) break;
        store.notifications = store.notifications.map((m) => (m.id === id ? Object.assign({}, m, { read: true }) : m));
        S.persist();
        ui.notifOpen = false;
        navigate('/guide/' + n.reqId);
        break;
      }
      case 'logout':
        store.user = null;
        S.persist();
        ui.notifOpen = false;
        navigate('/');
        break;
      case 'go-admin': navigate('/admin'); break;
      case 'go-my': navigate('/my'); break;
      case 'go-plan-tokyo': ui.region = 'tokyo'; navigate('/plan'); break;
      case 'go-plan-region': ui.region = el.getAttribute('data-region'); navigate('/plan'); break;
      case 'pick-region': ui.region = el.getAttribute('data-region'); render(); break;
      case 'toggle-spot': {
        const spotId = el.getAttribute('data-spot');
        const idx = ui.sel.findIndex((x) => x.regionId === ui.region && x.spotId === spotId);
        if (idx >= 0) ui.sel = ui.sel.filter((_, j) => j !== idx);
        else ui.sel = ui.sel.concat([{ regionId: ui.region, spotId }]);
        render();
        break;
      }
      case 'remove-sel': {
        const i = Number(el.getAttribute('data-i'));
        ui.sel = ui.sel.filter((_, j) => j !== i);
        render();
        break;
      }
      case 'go-info': if (ui.sel.length > 0) navigate('/plan/info'); break;
      case 'go-pay':
        if (!ui.form.date) break;
        if (!store.user) { ui.afterLogin = '/plan/pay'; resetLogin(); navigate('/login'); }
        else navigate('/plan/pay');
        break;
      case 'pick-method': ui.payMethod = el.getAttribute('data-method'); render(); break;
      case 'do-pay':
        if (ui.payMethod === 'card' && cardIncomplete()) break;
        doPay();
        break;
      case 'send-code':
        if (!emailValid()) break;
        ui.demoCode = String(Math.floor(100000 + Math.random() * 900000));
        ui.loginStep = 'code';
        ui.codeInput = '';
        ui.loginErr = '';
        render();
        break;
      case 'verify-code': {
        if (ui.codeInput !== ui.demoCode) {
          ui.loginErr = '인증번호가 일치하지 않습니다. 다시 확인해 주세요.';
          const err = document.getElementById('login-err');
          if (err) { err.hidden = false; err.textContent = ui.loginErr; }
          break;
        }
        store.user = { email: ui.emailInput };
        S.persist();
        const next = ui.afterLogin || '/my';
        ui.afterLogin = null;
        navigate(next);
        break;
      }
      case 'back-to-email': resetLogin(); render(); break;
      case 'admin-open':
        ui.adminSel = el.getAttribute('data-id');
        ui.adminTitle = '';
        ui.adminBody = '';
        render();
        break;
      case 'register-guide': registerGuide(); break;
    }
  });

  // --- live input handling (no full re-render → keeps focus/caret) ---
  document.addEventListener('input', (e) => {
    const t = e.target;

    if (t.matches('[data-form]')) {
      ui.form[t.getAttribute('data-form')] = t.value;
      const next = document.getElementById('info-next');
      const hint = document.getElementById('info-hint');
      if (next) next.disabled = !ui.form.date;
      if (hint) hint.textContent = ui.form.date ? '' : '입국 날짜를 선택하면 다음으로 넘어갈 수 있어요';
      return;
    }

    if (t.matches('[data-card]')) {
      const kind = t.getAttribute('data-card');
      if (kind === 'num') {
        ui.cardNum = t.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
        t.value = ui.cardNum;
      } else if (kind === 'exp') {
        const d = t.value.replace(/\D/g, '').slice(0, 4);
        ui.cardExp = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
        t.value = ui.cardExp;
      } else if (kind === 'cvc') {
        ui.cardCvc = t.value.replace(/\D/g, '').slice(0, 3);
        t.value = ui.cardCvc;
      }
      const payBtn = document.getElementById('pay-btn');
      if (payBtn) payBtn.disabled = ui.payMethod === 'card' && cardIncomplete();
      return;
    }

    if (t.matches('[data-login]')) {
      if (t.getAttribute('data-login') === 'email') {
        ui.emailInput = t.value;
        const btn = document.getElementById('send-code');
        if (btn) btn.disabled = !emailValid();
      } else {
        ui.codeInput = t.value.replace(/\D/g, '').slice(0, 6);
        t.value = ui.codeInput;
        ui.loginErr = '';
        const err = document.getElementById('login-err');
        if (err) err.hidden = true;
        const btn = document.getElementById('verify-code');
        if (btn) btn.disabled = ui.codeInput.length !== 6;
      }
      return;
    }

    if (t.matches('[data-admin]')) {
      if (t.getAttribute('data-admin') === 'title') ui.adminTitle = t.value;
      else ui.adminBody = t.value;
      const btn = document.getElementById('register-guide');
      if (btn) btn.disabled = !ui.adminTitle.trim() || !ui.adminBody.trim();
    }
  });

  // ===== Boot =====
  S.load();
  render();
})();
