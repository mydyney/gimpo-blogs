# koreasen — mytokyomate 프로토타입

한국인 대상 일본 여행 계획 컨시어지 서비스 **mytokyomate**의 전체 사용자 플로우 프로토타입.
Claude Design 핸드오프(`design_handoff_koreasen`)의 디자인을 모노레포 패턴(빌드 없는 정적 HTML/CSS/JS)으로 재구현했다.

## 플로우

1. 홈(`/`) → 여행 계획 요청 1단계: 관광지 선택(`/plan`) → 2단계: 여행 정보 입력(`/plan/info`) → 3단계: 결제(`/plan/pay`) → 접수 완료(`/plan/done`)
2. 이메일 OTP 로그인(`/login`) — 미로그인 상태로 결제/마이페이지 진입 시 로그인 후 원래 목적지로 복귀
3. 마이페이지(`/my`) → 가이드 상세(`/guide/:id`)
4. 관리자(`admin.mytokyomate.com`, 로컬: `admin.localhost:8000`) — 요청 선택 후 가이드 제목/일자별 일정 등록 → 사용자에게 알림(헤더 배지)

## 구조

```
koreasen/
├── wrangler.toml          # Cloudflare Pages 설정 (output: public/)
└── public/
    ├── index.html         # SPA 셸
    ├── _redirects         # /* → /index.html 200 (URL 라우팅 지원)
    ├── css/
    │   ├── tokens/        # mytokyomate 디자인 시스템 토큰 (핸드오프 원본)
    │   └── app.css        # 컴포넌트/레이아웃 (DS 번들 픽셀 값 기준)
    └── js/
        ├── data.js        # REGIONS / SPOTS / 결제수단 / 폼 옵션 / 가격(₩5,000)
        ├── store.js       # localStorage 상태 (mtm_proto_v1) + 포매터
        └── app.js         # 라우터 + 뷰 렌더링 + 이벤트
```

## 로컬 실행

```bash
cd apps/koreasen
npx wrangler pages dev        # http://localhost:8788 (SPA 라우팅 포함)
# 또는 간단히: python3 -m http.server -d public 8000  (딥링크 새로고침은 미지원)
```

## 배포 (Cloudflare Pages)

두 가지 방법 중 하나:

1. **wrangler 직접 배포** — `cd apps/koreasen && npx wrangler pages deploy` (Cloudflare 로그인 필요. 최초 실행 시 `koreasen` Pages 프로젝트가 생성됨)
2. **Git 연동(다른 앱들과 동일 패턴)** — Cloudflare 대시보드에서 Pages 프로젝트 생성 → 이 저장소 연결 → **Root directory를 `apps/koreasen`**, Build command 없음, **Build output directory `public`** 으로 설정

## 프로토타입 한계 / 실서비스 TODO

디자인 핸드오프 명세 그대로, 전부 클라이언트 상태 + localStorage(`mtm_proto_v1`)로 동작한다.

- **이메일 OTP**: 데모 코드를 화면에 노출 → 실서비스는 발송/검증 백엔드 필요 (Workers + Resend 등)
- **요청/가이드/알림 저장**: localStorage → D1(또는 KV)로 이전
- **결제**: 목업(카드 폼 + 간편결제 선택만) → PG 연동 필요
- **사진**: Wikimedia Commons 공개 라이선스 이미지 사용 — 운영 전 브랜드 사진으로 교체 여부 검토
- **관리자 화면**: 관리자 전용 호스트에서만 렌더링되지만 인증은 없음 → 접근 제어와 공용 데이터 저장소 필요

## 지도 출처

일본 지역 지도는 Wikimedia Commons의
[Regions and Prefectures of Japan-blank.svg](https://commons.wikimedia.org/wiki/File:Regions_and_Prefectures_of_Japan-blank.svg)를
서비스 색상과 표시 범위에 맞게 수정했으며, 원본과 수정본은 CC BY-SA 4.0 조건을 따릅니다.

관광지 사진은 Wikimedia Commons의 공개 라이선스 이미지를 사용합니다. 개별 저작자와 라이선스는
[사진 출처 목록](public/images/spots/ATTRIBUTION.md)에 정리되어 있습니다.
