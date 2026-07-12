# koreasen — mytokyomate 프로토타입

한국인 대상 일본 여행 계획 컨시어지 서비스 **mytokyomate**의 전체 사용자 플로우 프로토타입.
Claude Design 핸드오프(`design_handoff_koreasen`)의 디자인을 모노레포 패턴(빌드 없는 정적 HTML/CSS/JS)으로 재구현했다.

## 플로우

1. 홈(`/`) → 여행 계획 요청 1단계: 관광지 선택(`/plan`) → 2단계: 여행 정보 입력(`/plan/info`) → 3단계: 결제(`/plan/pay`) → 접수 완료(`/plan/done`)
2. 회원가입(`/signup`) 또는 로그인(`/login`) — 서버에서 비밀번호를 PBKDF2로 해시하고 HttpOnly 세션 쿠키 발급
3. 마이페이지(`/my`) → 가이드 상세(`/guide/:id`)
4. 관리자(`admin.mytokyomate.com`, 로컬: `admin.localhost:8000`) — 요청 선택 후 가이드 제목/일자별 일정 등록 → 사용자에게 알림(헤더 배지)

## 구조

```
koreasen/
├── wrangler.toml          # Cloudflare Pages 설정 (output: public/)
├── migrations/            # D1 데이터베이스 스키마
├── functions/
│   ├── _middleware.js     # 관리자 Basic Auth + 공통 보안 헤더
│   ├── _lib/              # 인증·HTTP·관광지 검증 공용 모듈
│   └── api/
│       ├── auth/          # 회원가입·로그인·로그아웃·세션 API
│       ├── requests/      # 사용자 여행 요청 API
│       ├── payments/      # 페이앱 결제요청·feedbackurl API
│       ├── notifications/ # 사용자 알림 API
│       ├── admin/         # 관리자 요청·가이드 API
│       └── regions.js     # 관리자 지역 노출 설정 API
└── public/
    ├── index.html         # SPA 셸
    ├── _redirects         # /* → /index.html 200 (URL 라우팅 지원)
    ├── css/
    │   ├── tokens/        # mytokyomate 디자인 시스템 토큰 (핸드오프 원본)
    │   └── app.css        # 컴포넌트/레이아웃 (DS 번들 픽셀 값 기준)
    └── js/
        ├── data.js        # REGIONS / SPOTS / 결제수단 / 폼 옵션 / 가격(₩5,000)
        ├── store.js       # 여행 요청 프로토타입 상태 + 포매터 (인증정보 저장 안 함)
        └── app.js         # 라우터 + 뷰 렌더링 + 이벤트
```

## 로컬 실행

```bash
cd apps/koreasen
npx wrangler pages dev        # http://localhost:8788 (SPA 라우팅 포함)
# 또는 간단히: python3 -m http.server -d public 8000  (딥링크 새로고침은 미지원)
```

D1 스키마 적용:

```bash
npx wrangler d1 migrations apply koreasen --local
npx wrangler d1 migrations apply koreasen --remote
```

페이앱 결제 환경변수:

```bash
npx wrangler pages secret put PAYAPP_USERID
npx wrangler pages secret put PAYAPP_LINKKEY
npx wrangler pages secret put PAYAPP_LINKVAL
```

### 이메일 인증번호 로그인

로그인과 회원가입은 비밀번호 대신 6자리 이메일 인증번호를 사용합니다. Resend에서 발신 도메인을 인증한 뒤 아래 값을 Pages Secret으로 등록하세요.

```bash
npx wrangler pages secret put RESEND_API_KEY
npx wrangler pages secret put AUTH_CODE_SECRET
```

`AUTH_FROM_EMAIL`은 Cloudflare Pages의 일반 환경 변수로 등록합니다. 예: `mytokyomate <login@mytokyomate.com>`. 인증번호는 10분 뒤 만료되고, 1분 이내 재발송 및 5회 초과 입력이 제한됩니다.

## 배포 (Cloudflare Pages)

두 가지 방법 중 하나:

1. **wrangler 직접 배포** — `cd apps/koreasen && npx wrangler pages deploy` (Cloudflare 로그인 필요. 최초 실행 시 `koreasen` Pages 프로젝트가 생성됨)
2. **Git 연동(다른 앱들과 동일 패턴)** — Cloudflare 대시보드에서 Pages 프로젝트 생성 → 이 저장소 연결 → **Root directory를 `apps/koreasen`**, Build command 없음, **Build output directory `public`** 으로 설정

## 프로토타입 한계 / 실서비스 TODO

회원·세션·여행 요청·가이드·알림은 Cloudflare D1을 사용한다. 지역 노출 설정은 Cloudflare KV를 사용한다.

- **회원 인증**: PBKDF2 해시, HttpOnly/Secure/SameSite 세션, 로그인 시도 제한 적용. 이메일 소유 확인과 비밀번호 재설정은 추후 메일 서비스 연동 필요
- **요청/가이드/알림 저장**: 인증된 D1 API 사용. 사용자는 본인 데이터만, 관리자는 보호된 관리자 호스트에서만 전체 데이터 접근
- **결제**: 페이앱 REST 결제요청 + feedbackurl 웹훅 연동. 결제 완료 웹훅 검증 후 관리자 요청 목록에 노출
- **사진**: Wikimedia Commons 공개 라이선스 이미지 사용 — 운영 전 브랜드 사진으로 교체 여부 검토
- **관리자 화면**: 관리자 전용 호스트 + HTTP Basic Auth 적용. 운영 전 Cloudflare Access 등 계정별 접근 제어 권장

## 지도 출처

일본 지역 지도는 Wikimedia Commons의
[Regions and Prefectures of Japan-blank.svg](https://commons.wikimedia.org/wiki/File:Regions_and_Prefectures_of_Japan-blank.svg)를
서비스 색상과 표시 범위에 맞게 수정했으며, 원본과 수정본은 CC BY-SA 4.0 조건을 따릅니다.

관광지 사진은 Wikimedia Commons의 공개 라이선스 이미지를 사용합니다. 개별 저작자와 라이선스는
[사진 출처 목록](public/images/spots/ATTRIBUTION.md)에 정리되어 있습니다.
