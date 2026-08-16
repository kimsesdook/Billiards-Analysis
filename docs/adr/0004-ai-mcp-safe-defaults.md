# ADR-0004: Keep AI And MCP Safe By Default

- Status: Accepted
- Date: 2026-08-16

## Context

AI 기능은 포트폴리오 가치를 높일 수 있지만 개인 식별 정보 전송, provider 장애, 중복 요청과 예측하지 못한 비용 위험이 있습니다. MCP는 AI client가 데이터를 조회하는 표준 경계를 제공하지만 회원 ID를 tool argument로 받으면 다른 회원 데이터 요청 위험이 생깁니다.

## Decision

### AI Report

- `AI_CHAT_MODEL=none`을 기본값으로 사용하고 scheduled generation을 두지 않습니다.
- 사용자의 명시적인 생성 요청만 provider call로 이어질 수 있습니다.
- Provider에는 회원 ID, 이메일, 상대 이름, 메모, 개별 경기 대신 주간·최근 집계만 전달합니다.
- 회원·종목·기준일 결과를 MySQL에 cache하고 Redis lock으로 동시 중복 생성을 조정합니다.
- 실제 provider 호출만 일일 rate limit에 포함합니다.
- 자동 retry는 한 번으로 제한하고 timeout, circuit breaker, bounded executor로 장애 범위를 제한합니다.
- Redis coordination failure, executor saturation과 open circuit에서 provider를 호출하지 않습니다.

### MCP

- `MCP_ENABLED=false`를 기본값으로 사용합니다.
- MCP endpoint는 REST와 동일한 JWT 인증을 요구합니다.
- Tool argument로 회원 ID를 받지 않고 SecurityContext의 회원만 조회합니다.
- 제공 도구는 read-only·non-destructive로 선언합니다.
- MCP module 자체는 LLM을 호출하지 않으므로 model key와 비용이 필요하지 않습니다.

## Consequences

### Positive

- 개발·테스트·일반 서버 시작만으로 model 비용이 발생하지 않습니다.
- AI provider에 전달되는 데이터와 호출 횟수를 최소화합니다.
- MCP client가 임의 회원 ID로 조회 범위를 바꿀 수 없습니다.
- Provider가 느리거나 실패해도 HTTP worker와 전체 서비스로 장애가 확산되는 것을 제한합니다.

### Tradeoffs

- 실제 AI 기능 검증에는 별도 key, provider 정책과 budget 결정이 필요합니다.
- Cached report는 같은 날짜의 새 경기 기록을 즉시 반영하지 않습니다.
- MCP를 외부에 공개하려면 TLS, client 설정과 token 전달 경계를 별도로 운영해야 합니다.

## Alternatives Considered

- AI always enabled: demo는 쉽지만 startup·화면 접근만으로 비용이 발생할 위험이 있습니다.
- 원본 경기 전체 전송: 풍부한 context 대신 개인정보와 prompt 크기가 증가합니다.
- Client-supplied member ID in MCP: tool은 유연하지만 authorization 실수의 영향이 커집니다.
- Unlimited retry: 일시 장애 복구 가능성보다 중복 비용과 요청 적체 위험이 큽니다.

## Evidence

- [Application defaults](../../Backend/src/main/resources/application.yaml)
- [AiWeeklyReportService](../../Backend/src/main/java/com/my/billiards/ai/service/AiWeeklyReportService.java)
- [AiProviderResilience](../../Backend/src/main/java/com/my/billiards/ai/service/AiProviderResilience.java)
- [BilliardsReportMcpTools](../../Backend/src/main/java/com/my/billiards/mcp/BilliardsReportMcpTools.java)
- [McpProtocolIntegrationTest](../../Backend/src/test/java/com/my/billiards/mcp/McpProtocolIntegrationTest.java)
