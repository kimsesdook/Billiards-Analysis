# Project Documentation

이 디렉터리는 코드만으로 파악하기 어려운 설계 의도와 운영 절차를 기록합니다.

## Documents

- [Architecture](./architecture.md): 시스템 경계, 모듈 구조, 데이터 일관성, 보안, 확장 한계
- [Architecture Decision Records](./adr/README.md): 주요 기술 선택과 대안, 트레이드오프
- [Operations Runbook](./operations-runbook.md): 실행, 관측, 장애 대응, 복구와 비용 통제 절차
- [Gemini Live Validation](./ai-live-validation.md): 합성 경기 데이터 기반 실제 AI 생성, 저장, 재사용 검증

## Reading Order

1. 프로젝트를 처음 검토할 때는 Architecture를 읽습니다.
2. 특정 기술을 선택한 이유는 ADR에서 확인합니다.
3. 실행 실패나 운영 장애를 다룰 때는 Operations Runbook을 사용합니다.
4. 실제 Gemini 연동 결과와 검증 범위는 Gemini Live Validation에서 확인합니다.

문서의 명령은 로컬 개발과 현재 저장소의 검증 환경을 기준으로 합니다. 실제 운영 환경의 계정, 주소, 비밀번호, 토큰은 이 저장소에 기록하지 않습니다.
