# Gemini Live Validation

- Validation date: 2026-08-22
- Environment: local Spring Boot, MySQL, Redis, Gemini free tier
- Model: `gemini-2.5-flash`

## Objective

실제 provider 호출을 통해 경기 집계 데이터가 구조화된 한국어 코칭 보고서로 변환되고, 결과 저장과 재사용까지 이어지는지 검증합니다. 테스트에는 임의로 생성한 계정과 경기 데이터만 사용하며 실제 사용자 정보는 사용하지 않습니다.

## Safety Conditions

- API key는 터미널 환경변수로만 주입하고 파일, DB, Git에 저장하지 않습니다.
- Provider에는 회원 ID, 이메일, 상대 이름, 메모, 개별 경기 기록을 보내지 않고 주간 및 최근 집계만 전달합니다.
- AI 기능은 기본적으로 비활성화하며 명시적인 `POST` 요청에서만 호출합니다.
- 자동 retry는 1회로 제한하고 일일 생성 제한, timeout, circuit breaker, bounded executor를 유지합니다.
- Gemini 2.5의 thinking budget은 이 단순 집계 변환 작업에서 `0`으로 두고, 구조화된 한국어 응답을 위해 최대 출력은 `1,024` tokens로 제한합니다.

## Procedure

1. 무료 등급 Gemini project와 API key를 준비했습니다.
2. model 목록 조회와 최소 `generateContent` 요청으로 key, network, `gemini-2.5-flash` 접근을 확인했습니다.
3. 검증 전용 회원을 생성하고 이번 주 3건, 이전 주 3건의 `3-Cushion` 경기 기록을 REST API로 저장했습니다.
4. `POST /api/ai-reports/weekly?type=3-Cushion`을 호출했습니다.
5. 동일한 요청을 다시 보내 저장 결과 재사용 여부를 확인했습니다.
6. MySQL에서 동일 회원, 종목, 기준일의 보고서 수와 생성 시각을 조회했습니다.

## Result

- 첫 애플리케이션 호출이 HTTP 200으로 완료됐습니다.
- 응답에 `summary`, `strengths`, `focusAreas`, `trainingRecommendations`, `dataNotice`가 포함된 구조화된 한국어 분석이 반환됐습니다.
- 보고서 기간 `2026-08-16`부터 `2026-08-22`까지의 결과가 MySQL에 `gemini-2.5-flash` 모델명과 함께 저장됐습니다.
- 동일 요청 후에도 해당 회원, 종목, 기준일의 DB 행은 1개이고 생성 시각은 하나로 유지되어 저장 보고서 재사용을 확인했습니다.
- 전체 백엔드 테스트 186개가 실패, 오류, 건너뜀 없이 통과했고 JaCoCo 보고서 생성도 완료됐습니다.

## Initial Failure And Correction

초기 live call은 짧은 `350` token 출력 제한을 사용한 상태에서 구조화 보고서를 만들지 못해 `502 AI_002`를 반환했습니다. 모델 목록 조회와 직접 API 요청은 성공했으므로 key, network, model 접근과 애플리케이션의 구조화 출력 경로를 분리해 진단했습니다.

구조화된 한국어 보고서가 중간에 잘릴 위험을 줄이기 위해 출력 제한을 `1,024` tokens로 조정하고, 단순 통계 변환에 불필요한 Gemini 2.5 thinking을 비활성화했습니다. 변경 후 동일한 애플리케이션 경로에서 실제 보고서 생성과 저장에 성공했습니다.

## Evidence Boundary

이 검증은 로컬 환경의 제한된 합성 데이터와 단일 provider를 대상으로 한 기능 검증입니다. 운영 트래픽, 장기 안정성, 모델 품질 평가 또는 유료 환경 운영을 의미하지 않습니다. API key, JWT, 이메일, 비밀번호, 생성 응답 원문은 저장소에 기록하지 않습니다.
