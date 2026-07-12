// mytokyomate — SPA router + views (vanilla JS, reimplemented from the design handoff prototype)
(function () {
  'use strict';

  const D = window.MTM_DATA;
  const S = window.MTM_STORE;
  const store = S.store;
  const IS_ADMIN_HOST = location.hostname === 'admin.mytokyomate.com' || location.hostname === 'admin.localhost';

  // Which regions are exposed on the site. null = show all (until the shared
  // config loads / when unset). Seeded from a localStorage cache for an instant
  // correct first paint, then refreshed from /api/regions (KV-backed).
  let visibleRegionIds = null;
  try {
    const cached = JSON.parse(localStorage.getItem('mtm_visible_regions') || 'null');
    if (Array.isArray(cached)) visibleRegionIds = cached;
  } catch (e) { /* ignore */ }

  function isRegionVisible(id) {
    return visibleRegionIds === null || visibleRegionIds.indexOf(id) >= 0;
  }
  function visibleRegions() {
    return D.REGIONS.filter((r) => isRegionVisible(r.id));
  }

  // Ephemeral UI state (not persisted — mirrors the prototype's non-saved state)
  const ui = {
    region: 'tokyo',
    sel: [],                                   // [{regionId, spotId}]
    form: { count: '2명', group: '커플 · 부부', phone: '', date: '', duration: '3박 4일', budget: '100~200만원', lodging: '', notes: '' },
    payMethod: 'card',
    emailInput: '', authName: '', authCode: '', authStep: 'email', authPurpose: '', authErr: '', authBusy: false, afterLogin: null,
    requestBusy: false, requestErr: '', adminBusy: false, adminErr: '',
    notifOpen: false,
    adminSel: null, adminTitle: '', adminBody: '',
    adminRegions: null, adminRegionsSaved: false,
  };

  const viewEl = document.getElementById('view');
  const headerEl = document.getElementById('site-header');
  const footerEl = document.getElementById('site-footer');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function spotPhoto(id, label, eager) {
    return '<img class="place-photo" src="/images/spots/' + esc(id) + '.jpg" alt="' + esc(label) + '"' +
      ' loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async">';
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
    if (IS_ADMIN_HOST) return { name: 'admin' };
    if (p === '/') return { name: 'home' };
    if (p === '/plan') return { name: 'planner' };
    if (p === '/plan/info') return { name: 'info' };
    if (p === '/plan/pay') return { name: 'pay' };
    if (p === '/plan/done') return { name: 'done' };
    if (p === '/login') return { name: 'login' };
    if (p === '/signup') return { name: 'signup' };
    if (p === '/my') return { name: 'mypage' };
    if (p === '/admin') return { name: 'admin' };
    const guide = p.match(/^\/guide\/([\w-]+)$/);
    if (guide) return { name: 'guide', reqId: guide[1] };
    return { name: 'home' };
  }

  // Route guards — return a redirect path or null
  function guard(route) {
    if (route.name === 'admin' && !IS_ADMIN_HOST) return '/';
    if ((route.name === 'login' || route.name === 'signup') && store.user) {
      const next = ui.afterLogin || '/my';
      ui.afterLogin = null;
      return next;
    }
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
    ui.authCode = '';
    ui.authStep = 'email';
    ui.authPurpose = '';
    ui.authErr = '';
    ui.authBusy = false;
  }

  // ===== Header / footer =====
  function navClass(route, name) {
    const map = { home: ['home'], planner: ['planner', 'info', 'pay', 'done'], mypage: ['mypage', 'guide'] };
    return (map[name] || []).indexOf(route.name) >= 0 ? 'active' : '';
  }

  function renderHeader(route) {
    if (IS_ADMIN_HOST) {
      headerEl.innerHTML =
        '<div class="container bar">' +
        '<a class="logo" href="/">' +
        '<span class="logo-main">mytokyomate</span>' +
        '<span class="logo-sub">ADMIN CONSOLE</span>' +
        '</a>' +
        '<span class="admin-host-badge">관리자 전용</span>' +
        '</div>';
      return;
    }

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
      right =
        '<a class="header-signup" href="/signup" data-nav>가입하기</a>' +
        '<a class="btn btn-outline" href="/login" data-nav>로그인</a>';
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
    if (IS_ADMIN_HOST) {
      footerEl.hidden = true;
      footerEl.innerHTML = '';
      return;
    }
    footerEl.hidden = false;
    footerEl.innerHTML =
      '<div class="inner">' +
      '<div>' +
      '<div class="ft-brand">mytokyomate</div>' +
      '<div class="ft-sub">Tokyomate가 추천하는 일본 여행 가이드 · mytokyomate.com</div>' +
      '</div>' +
      '<div class="ft-links">' +
      '<a href="/attribution" target="_blank" rel="noopener">사진·지도 출처</a>' +
      '<a href="https://blog.naver.com/tokyomate">네이버 블로그</a>' +
      '<a href="https://tripmate.news/">tripmate.news</a>' +
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
    const subRegions = visibleRegions().filter((r) => !r.main).slice(0, 5);

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
      '<div class="hero-img">' + spotPhoto('shibuya', '도쿄 시부야 스크램블 교차로', true) + '</div>' +
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
        '<div class="hl-img">' + spotPhoto(s.id, s.ko + ' 대표 사진') + '</div>' +
        '<button class="hl-body" data-act="go-plan-tokyo">' +
        '<span class="hl-name">' + esc(s.ko) + '</span>' +
        '<span class="hl-cat">' + esc(s.cat) + '</span>' +
        '</button>' +
        '</div>'
      ).join('') +
      '</div>' +
      '</section>' +

      (subRegions.length > 0
        ? '<section class="subregions-band"><div class="inner">' +
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
          '</div></section>'
        : '') +

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

  function viewPlanner() {
    // Keep the active region within the visible set.
    if (!isRegionVisible(ui.region)) {
      const first = visibleRegions()[0];
      ui.region = first ? first.id : 'tokyo';
    }
    const activeRegion = D.REGIONS.find((r) => r.id === ui.region) || visibleRegions()[0] || D.REGIONS[0];

    // Label anchor per side keeps neighbouring markers from colliding.
    const LABEL_SIDES = {
      right: { x: 2.2, y: 0.9, anchor: 'start' },
      left: { x: -2.2, y: 0.9, anchor: 'end' },
      top: { x: 0, y: -2.4, anchor: 'middle' },
      bottom: { x: 0, y: 3.6, anchor: 'middle' },
    };
    const markers = (D.SPOTS[activeRegion.id] || []).filter((spot) => spot.mapPos).map((spot) => ({
      id: spot.id, regionId: activeRegion.id, label: spot.mapLabel || spot.ko, pos: spot.mapPos,
      side: LABEL_SIDES[spot.labelSide] || LABEL_SIDES.right,
    })).map((marker) => {
      const active = ui.region === marker.regionId;
      const picked = ui.sel.some((x) => x.regionId === marker.regionId && x.spotId === marker.id);
      const pos = marker.pos;
      return (
        '<g class="map-marker place' + (active ? ' active' : '') + (picked ? ' picked' : '') + '" transform="translate(' + pos[0] + ' ' + pos[1] + ')"' +
        ' data-act="map-spot" data-region="' + marker.regionId + '" data-spot="' + marker.id + '" role="button" tabindex="0" aria-label="' + esc(marker.label) + ' 선택">' +
        '<circle class="dot" r="1.35"></circle>' +
        '<text class="lbl" x="' + marker.side.x + '" y="' + marker.side.y + '" text-anchor="' + marker.side.anchor + '">' + esc(marker.label) + '</text>' +
        '</g>'
      );
    }).join('');
    const markerLayer = '<svg class="map-overlay" viewBox="0 0 100 100" aria-label="관광지 위치">' + markers + '</svg>';

    const tiles = visibleRegions().map((r) => {
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
        '<div class="sp-img">' + spotPhoto(sp.id, sp.ko + ' 대표 사진') + '</div>' +
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
      '<div class="jp-map tokyo-map"><img src="' + esc(activeRegion.map || '/images/tokyo-kanto-map-ai.png') + '" alt="' + esc(activeRegion.ko) + ' 상세 지도">' + markerLayer + '</div>' +
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
    const incomplete = phoneIncomplete() || !ui.form.date;
    return (
      '<main class="page page-narrow">' +
      sectionTitle('여행 계획 요청 · 2단계', 'YOUR TRIP DETAILS', '일정을 짜는 데 필요한 정보를 알려 주세요') +
      '<div class="info-form">' +
      '<div class="form-row">' +
      selectField('동반 인원', 'count', D.FORM_OPTIONS.count) +
      selectField('동반자 구성', 'group', D.FORM_OPTIONS.group) +
      '</div>' +
      '<div class="form-row">' +
      '<div class="field"><label>연락처</label><input type="tel" inputmode="tel" data-form="phone" placeholder="01012345678" value="' + esc(ui.form.phone) + '"></div>' +
      '<div class="field"><label>입국 날짜</label><input type="date" data-form="date" value="' + esc(ui.form.date) + '"></div>' +
      '</div>' +
      '<div class="form-row">' +
      selectField('여행 기간', 'duration', D.FORM_OPTIONS.duration) +
      selectField('예산 (1인 기준, 항공 제외)', 'budget', D.FORM_OPTIONS.budget) +
      '</div>' +
      '<div class="form-row">' +
      '<div class="field"><label>숙소 선호 지역</label><input type="text" data-form="lodging" placeholder="예: 신주쿠 · 시부야 인근" value="' + esc(ui.form.lodging) + '"></div>' +
      '</div>' +
      '<div class="field"><label>요청사항</label><textarea rows="4" data-form="notes" placeholder="아이 동반 여부, 못 먹는 음식, 꼭 하고 싶은 것 등을 자유롭게 적어 주세요">' + esc(ui.form.notes) + '</textarea></div>' +
      '<div class="form-actions">' +
      '<a class="btn btn-outline" href="/plan" data-nav>이전 단계</a>' +
      '<button class="btn btn-pill" id="info-next" data-act="go-pay"' + (incomplete ? ' disabled' : '') + '><span class="arrow">▶</span>요청 확인 및 결제</button>' +
      '<span class="form-hint" id="info-hint">' + (incomplete ? '연락처와 입국 날짜를 입력하면 다음으로 넘어갈 수 있어요' : '') + '</span>' +
      '</div>' +
      '</div>' +
      '</main>'
    );
  }

  function phoneIncomplete() {
    const digits = String(ui.form.phone || '').replace(/\D/g, '');
    return digits.length < 10 || digits.length > 11;
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
    const disabled = ui.requestBusy || phoneIncomplete();

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
      '<div class="easy-note">결제하기를 누르면 페이앱의 ' + esc(methodObj.ko) + ' 결제창으로 이동합니다. 결제가 완료된 요청만 관리자에게 접수됩니다.</div>' +
      '</div>' +
      '<div class="price-band">' +
      '<span class="pb-label">여행 계획 요청 1건</span>' +
      '<span class="pb-price">' + price + '</span>' +
      '</div>' +
      '<div class="pay-actions">' +
      '<a class="btn btn-outline" href="/plan/info" data-nav>이전 단계</a>' +
      '<button class="btn btn-pill" id="pay-btn" data-act="do-pay"' + (disabled ? ' disabled' : '') + '><span class="arrow">▶</span>' + (ui.requestBusy ? '결제창 준비 중…' : price + ' 결제하기') + '</button>' +
      '<span class="form-hint">' + esc(ui.requestErr || '페이앱 결제창에서 안전하게 결제합니다') + '</span>' +
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

  function authErrorMessage(code) {
    const messages = {
      invalid_code: '인증번호가 올바르지 않거나 만료되었습니다.',
      too_many_attempts: '인증 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
      code_rate_limited: '인증번호를 이미 보냈습니다. 1분 후 다시 요청해 주세요.',
      account_exists: '이미 가입된 이메일입니다. 로그인해 주세요.',
      invalid_email: '올바른 이메일 주소를 입력해 주세요.',
      invalid_name: '이름은 2자 이상 40자 이하로 입력해 주세요.',
      email_send_failed: '인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
      auth_unavailable: '인증 서비스를 잠시 사용할 수 없습니다.',
    };
    return messages[code] || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  function authRequest(action, body) {
    return fetch('/api/auth/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body || {}),
    }).then((response) => response.json().catch(() => ({})).then((data) => {
      if (!response.ok) throw new Error(data.error || 'request_failed');
      return data;
    }));
  }

  function apiRequest(url, options) {
    const init = Object.assign({ headers: { Accept: 'application/json' }, credentials: 'same-origin' }, options || {});
    return fetch(url, init).then((response) => response.json().catch(() => ({})).then((data) => {
      if (!response.ok) throw new Error(data.error || 'request_failed');
      return data;
    }));
  }

  function loadUserData() {
    if (!store.user) {
      store.requests = [];
      store.notifications = [];
      return Promise.resolve();
    }
    return Promise.all([
      apiRequest('/api/requests'),
      apiRequest('/api/notifications'),
    ]).then(([requestData, notificationData]) => {
      store.requests = (requestData.requests || []).slice().reverse();
      store.notifications = (notificationData.notifications || []).slice().reverse();
    });
  }

  function loadAdminRequests() {
    if (!IS_ADMIN_HOST) return Promise.resolve();
    ui.adminBusy = true;
    ui.adminErr = '';
    return apiRequest('/api/admin/requests')
      .then((data) => { store.requests = (data.requests || []).slice().reverse(); })
      .catch(() => { ui.adminErr = '요청 목록을 불러오지 못했습니다.'; })
      .finally(() => { ui.adminBusy = false; render(); });
  }

  function viewLogin() {
    const codeStep = ui.authStep === 'code' && ui.authPurpose === 'login';
    return (
      '<main class="page page-login">' +
      sectionTitle('로그인', 'SIGN IN', codeStep ? '메일로 받은 6자리 인증번호를 입력해 주세요' : '가입한 이메일로 인증번호를 받아 로그인해요') +
      '<div class="login-form">' +
      '<div class="field"><label>이메일</label><input type="email" autocomplete="email" data-auth="email" placeholder="you@example.com" value="' + esc(ui.emailInput) + '"' + (codeStep ? ' readonly' : '') + '></div>' +
      (codeStep ? '<div class="field"><label>인증번호</label><input class="auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" data-auth="code" maxlength="6" placeholder="000000" value="' + esc(ui.authCode) + '"><span class="field-help">인증번호는 10분 동안 유효합니다.</span></div>' : '') +
      '<div class="login-err" id="auth-err"' + (ui.authErr ? '' : ' hidden') + '>' + esc(ui.authErr) + '</div>' +
      '<button class="btn btn-pill btn-full" id="login-submit" data-act="login-submit"' + ((codeStep ? /^\d{6}$/.test(ui.authCode) : emailValid()) && !ui.authBusy ? '' : ' disabled') + '>' + (ui.authBusy ? '처리 중…' : (codeStep ? '인증하고 로그인' : '인증번호 받기')) + '</button>' +
      (codeStep ? '<button class="auth-back" data-act="auth-back">이메일 다시 입력</button>' : '') +
      '<div class="auth-switch">아직 계정이 없나요? <a href="/signup" data-nav>가입하기</a></div>' +
      '</div>' +
      '</main>'
    );
  }

  function viewSignup() {
    const codeStep = ui.authStep === 'code' && ui.authPurpose === 'signup';
    const ready = codeStep ? /^\d{6}$/.test(ui.authCode) : ui.authName.trim().length >= 2 && emailValid();
    return (
      '<main class="page page-login">' +
      sectionTitle('회원가입', 'CREATE ACCOUNT', codeStep ? '메일로 받은 6자리 인증번호를 입력해 주세요' : '이메일 인증만으로 간편하게 가입해요') +
      '<div class="login-form">' +
      '<div class="field"><label>이름</label><input type="text" autocomplete="name" data-auth="name" maxlength="40" placeholder="홍길동" value="' + esc(ui.authName) + '"' + (codeStep ? ' readonly' : '') + '></div>' +
      '<div class="field"><label>이메일</label><input type="email" autocomplete="email" data-auth="email" placeholder="you@example.com" value="' + esc(ui.emailInput) + '"' + (codeStep ? ' readonly' : '') + '></div>' +
      (codeStep ? '<div class="field"><label>인증번호</label><input class="auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" data-auth="code" maxlength="6" placeholder="000000" value="' + esc(ui.authCode) + '"></div>' : '') +
      '<div class="login-err" id="auth-err"' + (ui.authErr ? '' : ' hidden') + '>' + esc(ui.authErr) + '</div>' +
      '<button class="btn btn-pill btn-full" id="signup-submit" data-act="signup-submit"' + (ready && !ui.authBusy ? '' : ' disabled') + '>' + (ui.authBusy ? '처리 중…' : (codeStep ? '인증하고 가입' : '인증번호 받기')) + '</button>' +
      (codeStep ? '<button class="auth-back" data-act="auth-back">정보 다시 입력</button>' : '') +
      '<div class="auth-switch">이미 계정이 있나요? <a href="/login" data-nav>로그인</a></div>' +
      '</div>' +
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

  function viewRegionSettings() {
    if (ui.adminRegions === null) {
      ui.adminRegions = (visibleRegionIds === null) ? D.REGIONS.map((r) => r.id) : visibleRegionIds.slice();
    }
    const active = D.REGIONS.filter((r) => ui.adminRegions.indexOf(r.id) >= 0).map((r) => {
      return (
        '<div class="rv-item on">' +
        '<span class="rv-state">공개</span>' +
        '<span class="rv-copy">' +
        '<span class="rv-ko">' + esc(r.ko) + '</span>' +
        '<span class="rv-en">' + esc(r.en) + '</span>' +
        '</span>' +
        '<button class="rv-action remove" data-act="region-remove" data-region="' + r.id + '"' + (ui.adminRegions.length === 1 ? ' disabled' : '') + '>제거</button>' +
        '</div>'
      );
    }).join('');
    const inactive = D.REGIONS.filter((r) => ui.adminRegions.indexOf(r.id) < 0).map((r) => (
      '<div class="rv-item">' +
      '<span class="rv-state off">비공개</span>' +
      '<span class="rv-copy"><span class="rv-ko">' + esc(r.ko) + '</span><span class="rv-en">' + esc(r.en) + '</span></span>' +
      '<button class="rv-action add" data-act="region-add" data-region="' + r.id + '">추가</button>' +
      '</div>'
    )).join('');
    const count = ui.adminRegions.length;
    const hint = count === 0
      ? '최소 한 지역은 선택해야 합니다'
      : (ui.adminRegionsSaved ? '저장되었습니다 ✓ (방문자 화면에는 최대 30초 이내 반영)' : '');
    return (
      '<div class="admin-regions">' +
      '<div class="ar-title">지역 추가·제거</div>' +
      '<div class="ar-desc">공개 목록에 추가한 지역만 홈과 여행 계획 화면에 표시됩니다. 변경 후 저장해야 방문자에게 적용됩니다.</div>' +
      '<div class="rv-group"><div class="rv-heading">공개 지역 <b>' + count + '</b></div><div class="rv-grid">' + active + '</div></div>' +
      '<div class="rv-group"><div class="rv-heading">추가 가능한 지역</div>' +
      (inactive ? '<div class="rv-grid">' + inactive + '</div>' : '<div class="rv-empty">모든 지역이 공개 목록에 추가되어 있습니다.</div>') + '</div>' +
      '<div class="ad-actions">' +
      '<button class="btn btn-pill" id="save-regions" data-act="save-regions"' + (count === 0 ? ' disabled' : '') + '>노출 지역 저장</button>' +
      '<span class="form-hint" id="rv-hint">' + esc(hint) + '</span>' +
      '</div>' +
      '</div>'
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
          '<button class="btn btn-pill" id="register-guide" data-act="register-guide"' + (ui.adminTitle.trim() && ui.adminBody.trim() && !ui.adminBusy ? '' : ' disabled') + '>' + (ui.adminBusy ? '등록 중…' : '가이드 등록하기') + '</button>' +
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
      sectionTitle('관리자', 'ADMIN', '노출 지역을 설정하고, 접수된 요청에 가이드를 등록합니다') +
      '<span class="admin-tag">내부용 화면</span>' +
      '</div>' +
      viewRegionSettings() +
      '<div class="admin-section-title">여행 계획 요청</div>' +
      (ui.adminErr ? '<div class="login-err">' + esc(ui.adminErr) + '</div>' : '') +
      (ui.adminBusy && reqs.length === 0
        ? '<div class="admin-empty">요청 목록을 불러오는 중입니다…</div>'
        : reqs.length === 0
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
      case 'signup': viewEl.innerHTML = viewSignup(); break;
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

  function finishAuth(user) {
    store.user = user;
    ui.authCode = '';
    ui.authErr = '';
    ui.authBusy = false;
    const next = ui.afterLogin || '/my';
    ui.afterLogin = null;
    loadUserData().catch(() => null).then(() => navigate(next));
  }

  function submitLogin() {
    const verify = ui.authStep === 'code' && ui.authPurpose === 'login';
    if (!emailValid() || (verify && !/^\d{6}$/.test(ui.authCode)) || ui.authBusy) return;
    ui.authBusy = true;
    ui.authErr = '';
    render();
    authRequest(verify ? 'verify-code' : 'request-code', { email: ui.emailInput, purpose: 'login', code: ui.authCode })
      .then((data) => { if (verify) finishAuth(data.user); else { ui.authBusy = false; ui.authStep = 'code'; ui.authPurpose = 'login'; render(); } })
      .catch((error) => {
        ui.authBusy = false;
        ui.authErr = authErrorMessage(error.message);
        ui.authCode = '';
        render();
      });
  }

  function submitSignup() {
    const verify = ui.authStep === 'code' && ui.authPurpose === 'signup';
    if (ui.authBusy || ui.authName.trim().length < 2 || !emailValid() || (verify && !/^\d{6}$/.test(ui.authCode))) return;
    ui.authBusy = true;
    ui.authErr = '';
    render();
    authRequest(verify ? 'verify-code' : 'request-code', { name: ui.authName.trim(), email: ui.emailInput, purpose: 'signup', code: ui.authCode })
      .then((data) => { if (verify) finishAuth(data.user); else { ui.authBusy = false; ui.authStep = 'code'; ui.authPurpose = 'signup'; render(); } })
      .catch((error) => {
        ui.authBusy = false;
        ui.authErr = authErrorMessage(error.message);
        ui.authCode = '';
        render();
      });
  }

  function logout() {
    authRequest('logout', {}).catch(() => null).then(() => {
      store.user = null;
      store.requests = [];
      store.notifications = [];
      ui.notifOpen = false;
      navigate('/');
    });
  }

  function refreshSession() {
    return fetch('/api/auth/session', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        store.user = data && data.user ? data.user : null;
        return loadUserData().catch(() => null).then(() => render());
      })
      .catch(() => { store.user = null; });
  }

  function doPay() {
    if (!store.user || ui.requestBusy) return;
    ui.requestBusy = true;
    ui.requestErr = '';
    render();
    apiRequest('/api/payments/payapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sel: ui.sel, form: ui.form, payMethod: ui.payMethod }),
    }).then((data) => {
      store.requests = store.requests.concat([data.request]);
      ui.requestBusy = false;
      ui.sel = [];
      location.href = data.payurl;
    }).catch((error) => {
      ui.requestBusy = false;
      ui.requestErr = error.message === 'unauthorized' ? '로그인이 만료되었습니다. 다시 로그인해 주세요.' : '결제창을 열지 못했습니다. 연락처와 결제 정보를 확인해 주세요.';
      if (error.message === 'unauthorized') { store.user = null; ui.afterLogin = '/plan/pay'; navigate('/login'); }
      else render();
    });
  }

  function registerGuide() {
    const aq = store.requests.find((q) => q.id === ui.adminSel);
    if (!aq || aq.guide || ui.adminBusy) return;
    const guide = { title: ui.adminTitle.trim(), body: ui.adminBody.trim(), registeredAt: Date.now() };
    if (!guide.title || !guide.body) return;
    ui.adminBusy = true;
    ui.adminErr = '';
    render();
    apiRequest('/api/admin/requests/' + encodeURIComponent(aq.id) + '/guide', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ title: guide.title, body: guide.body }),
    }).then((data) => {
      store.requests = store.requests.map((q) => (q.id === aq.id ? Object.assign({}, q, { guide: data.guide, status: '가이드 도착' }) : q));
      ui.adminTitle = '';
      ui.adminBody = '';
      ui.adminBusy = false;
      render();
    }).catch(() => {
      ui.adminBusy = false;
      ui.adminErr = '가이드 등록에 실패했습니다. 다시 시도해 주세요.';
      render();
    });
  }

  // ===== Shared region-visibility config (KV via /api/regions) =====
  function applyRegionConfig(visible) {
    const next = Array.isArray(visible)
      ? visible.filter((id) => D.REGIONS.some((r) => r.id === id))
      : null;
    const changed = JSON.stringify(next) !== JSON.stringify(visibleRegionIds);
    visibleRegionIds = next;
    try { localStorage.setItem('mtm_visible_regions', JSON.stringify(next)); } catch (e) { /* ignore */ }
    if (!isRegionVisible(ui.region)) {
      const first = visibleRegions()[0];
      ui.region = first ? first.id : 'tokyo';
    }
    return changed;
  }

  function fetchRegionConfig() {
    return fetch('/api/regions', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Object.prototype.hasOwnProperty.call(data, 'visible')) {
          const changed = applyRegionConfig(data.visible);
          if (changed) { ui.adminRegions = null; render(); }
        }
      })
      .catch(() => { /* offline / not deployed — keep cached/default */ });
  }

  function saveRegions() {
    if (!ui.adminRegions || ui.adminRegions.length === 0) return;
    const btn = document.getElementById('save-regions');
    const hint = document.getElementById('rv-hint');
    if (btn) btn.disabled = true;
    if (hint) hint.textContent = '저장 중…';
    fetch('/api/regions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible: ui.adminRegions }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('save_failed'))))
      .then((data) => {
        applyRegionConfig(data.visible);
        ui.adminRegionsSaved = true;
        render();
      })
      .catch(() => {
        if (btn) btn.disabled = false;
        if (hint) hint.textContent = '저장에 실패했습니다. 다시 시도해 주세요.';
      });
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
        apiRequest('/api/notifications/' + encodeURIComponent(id), { method: 'PUT' }).catch(() => null);
        ui.notifOpen = false;
        navigate('/guide/' + n.reqId);
        break;
      }
      case 'logout':
        logout();
        break;
      case 'go-my': navigate('/my'); break;
      case 'go-plan-tokyo': ui.region = 'tokyo'; navigate('/plan'); break;
      case 'go-plan-region': ui.region = el.getAttribute('data-region'); navigate('/plan'); break;
      case 'pick-region': ui.region = el.getAttribute('data-region'); render(); break;
      case 'map-spot': {
        const regionId = el.getAttribute('data-region');
        const spotId = el.getAttribute('data-spot');
        ui.region = regionId;
        const idx = ui.sel.findIndex((x) => x.regionId === regionId && x.spotId === spotId);
        if (idx >= 0) ui.sel.splice(idx, 1);
        else ui.sel = ui.sel.concat([{ regionId, spotId }]);
        render();
        break;
      }
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
        if (phoneIncomplete() || !ui.form.date) break;
        if (!store.user) { ui.afterLogin = '/plan/pay'; resetLogin(); navigate('/login'); }
        else navigate('/plan/pay');
        break;
      case 'pick-method': ui.payMethod = el.getAttribute('data-method'); render(); break;
      case 'do-pay':
        if (phoneIncomplete()) break;
        doPay();
        break;
      case 'login-submit': submitLogin(); break;
      case 'signup-submit': submitSignup(); break;
      case 'auth-back': ui.authStep = 'email'; ui.authPurpose = ''; ui.authCode = ''; ui.authErr = ''; render(); break;
      case 'admin-open':
        ui.adminSel = el.getAttribute('data-id');
        ui.adminTitle = '';
        ui.adminBody = '';
        render();
        break;
      case 'register-guide': registerGuide(); break;
      case 'save-regions': saveRegions(); break;
      case 'region-add': {
        const id = el.getAttribute('data-region');
        if (D.REGIONS.some((r) => r.id === id) && ui.adminRegions.indexOf(id) < 0) ui.adminRegions = ui.adminRegions.concat([id]);
        ui.adminRegionsSaved = false;
        render();
        break;
      }
      case 'region-remove': {
        const id = el.getAttribute('data-region');
        if (ui.adminRegions.length > 1) ui.adminRegions = ui.adminRegions.filter((item) => item !== id);
        ui.adminRegionsSaved = false;
        render();
        break;
      }
    }
  });

  // --- live input handling (no full re-render → keeps focus/caret) ---
  document.addEventListener('input', (e) => {
    const t = e.target;

    if (t.matches('[data-form]')) {
      ui.form[t.getAttribute('data-form')] = t.value;
      const next = document.getElementById('info-next');
      const hint = document.getElementById('info-hint');
      const incomplete = phoneIncomplete() || !ui.form.date;
      if (next) next.disabled = incomplete;
      if (hint) hint.textContent = incomplete ? '연락처와 입국 날짜를 입력하면 다음으로 넘어갈 수 있어요' : '';
      const payBtn = document.getElementById('pay-btn');
      if (payBtn) payBtn.disabled = phoneIncomplete();
      return;
    }

    if (t.matches('[data-auth]')) {
      const field = t.getAttribute('data-auth');
      if (field === 'email') ui.emailInput = t.value.trimStart();
      else if (field === 'name') ui.authName = t.value;
      else if (field === 'code') ui.authCode = t.value.replace(/\D/g, '').slice(0, 6);
      ui.authErr = '';
      const err = document.getElementById('auth-err');
      if (err) err.hidden = true;
      const loginBtn = document.getElementById('login-submit');
      if (loginBtn) loginBtn.disabled = ui.authStep === 'code' ? !/^\d{6}$/.test(ui.authCode) || ui.authBusy : !emailValid() || ui.authBusy;
      const signupBtn = document.getElementById('signup-submit');
      if (signupBtn) signupBtn.disabled = ui.authStep === 'code' ? !/^\d{6}$/.test(ui.authCode) || ui.authBusy : ui.authName.trim().length < 2 || !emailValid() || ui.authBusy;
      return;
    }

    if (t.matches('[data-admin]')) {
      if (t.getAttribute('data-admin') === 'title') ui.adminTitle = t.value;
      else ui.adminBody = t.value;
      const btn = document.getElementById('register-guide');
      if (btn) btn.disabled = !ui.adminTitle.trim() || !ui.adminBody.trim() || ui.adminBusy;
    }
  });

  // ===== Boot =====
  S.load();
  render();
  if (IS_ADMIN_HOST) loadAdminRequests();
  else refreshSession();
  fetchRegionConfig();
})();
