# mytokyomate 다국어 운영 구조

## URL과 locale

- 지원 locale: `ko`, `en`, `ja`, `zh`(중국어 간체)
- 공개 URL: `/{locale}/`, `/{locale}/plan`, `/{locale}/my` 등
- 접두사가 없는 기존 공개 URL은 같은 경로의 `/ko/` 주소로 302 이동한다.
- API와 정적 자산 URL에는 locale 접두사를 붙이지 않는다.
- HTML 응답과 클라이언트 렌더 모두 `lang`, canonical, Open Graph locale을 현재 locale에 맞춘다.

## 데이터 원칙

- 화면에 보이는 번역 문구를 상태나 폼 값으로 저장하지 않는다.
- 신청 상태는 `payment_pending`, `payment_waiting`, `payment_failed`, `payment_canceled`, `guide_writing`, `guide_arrived` 코드를 사용한다.
- 인원·동반자·기간·예산도 `count_2`, `couple`, `nights_3`, `1m_2m` 같은 코드를 저장한다.
- 신청과 가이드에는 각각 locale을 저장하고 관리자는 신청 locale로 가이드를 작성한다.
- 알림은 `event_code`와 JSON 매개변수를 저장하고 API 응답 시 요청 locale로 번역한다.

## 결제

- 실제 청구 통화는 1차 출시에서 `KRW`로 고정한다.
- 한국어: 카드, 카카오페이, 네이버페이, 페이코, 지원 기기의 Apple Pay
- 중국어: WeChat Pay 우선, 카드 대체 수단
- 영어·일본어: 지원 기기의 Apple Pay 우선, 카드 대체 수단
- Apple Pay는 `ApplePaySession.canMakePayments()`를 통과한 브라우저에서만 노출한다.
- PayApp 판매자 설정이 API 요청보다 우선하므로 관리자 도메인의 결제수단 설정과 PayApp 판매자 설정을 동일하게 유지한다.

## 배포 순서

1. `npx wrangler d1 migrations apply koreasen --remote`
2. Pages Functions와 정적 자산 배포
3. `/ko/`, `/en/`, `/ja/`, `/zh/` smoke test
4. 계정 소유자가 WeChat Pay·Apple Pay 최소 금액 결제와 즉시 취소를 검증

Functions를 먼저 배포하면 새 D1 컬럼을 찾지 못하므로 반드시 원격 마이그레이션을 먼저 적용한다.
