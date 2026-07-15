# PayApp 해외 결제 확인 체크리스트

PayApp 개발 문서는 `wechat`, `applepay` 결제수단과 콜백의 `pay_type=22`, `pay_type=23`을 명시한다. 반면 REST 예제에는 해외결제에서 카드만 가능하고 `openpaytype`이 무시된다는 주석이 있어, 다음 항목은 운영 전 PayApp 고객센터와 실제 계정에서 확인해야 한다.

- 중국 본토에서 개설한 WeChat 계정으로 한국 판매자의 KRW 결제가 가능한가?
- 구매자는 CNY로 승인하고 판매자는 KRW로 정산받는가? 적용 환율과 환전 수수료의 주체는 누구인가?
- WeChat Pay 승인 취소·부분 취소와 환불 수수료는 국내 카드와 동일한가?
- `recvphone`에 중국 번호를 넣을 때 `vccode=86`과 앞자리 `0` 없는 현지 번호 조합이 맞는가?
- Apple Pay는 해외 발급 Visa/Mastercard를 허용하는가?
- PayApp 호스팅 결제창이 Apple Pay 도메인 검증을 담당하는가?
- Apple Pay·WeChat Pay에서 콜백 재전송, 매출전표 URL, 취소 API의 동작이 카드와 동일한가?
- 판매자 관리 페이지에서 활성화한 수단이 REST `openpaytype`보다 우선 적용되는가?

## 사용자 승인 후 수행할 실결제 테스트

1. 중국 본토 WeChat 계정과 중국 휴대전화번호로 최소 금액 결제
2. 콜백의 `pay_state=4`, `pay_type=22`, 주문번호, 금액 확인
3. 즉시 전체 취소 후 취소 콜백 확인
4. iPhone Safari에서 Apple Pay 최소 금액 결제
5. 콜백의 `pay_type=23` 확인 후 즉시 전체 취소

실결제와 취소는 계정 소유자가 명시적으로 승인하고 직접 사용할 테스트 지갑·카드를 준비한 경우에만 수행한다.
