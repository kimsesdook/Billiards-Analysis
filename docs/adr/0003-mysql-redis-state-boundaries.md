# ADR-0003: Separate Durable State From Ephemeral Coordination

- Status: Accepted
- Date: 2026-08-16

## Context

회원, 경기와 게임방 결과는 손실되면 안 되지만 WebSocket ticket, 요청 제한 counter와 AI generation lock은 짧은 시간 동안 여러 backend instance가 공유하면 되고 만료 후 복구할 수 있습니다. 모든 데이터를 MySQL에 넣으면 atomic expiration과 짧은 수명 counter가 무거워지고, 모든 데이터를 Redis에 넣으면 영속성과 관계 무결성이 약해집니다.

## Decision

- MySQL을 영속 business state의 source of truth로 사용합니다.
- Flyway migration이 DDL의 기준이고 Hibernate는 schema를 생성하지 않고 검증합니다.
- Redis는 TTL이 있는 일회용 WebSocket ticket, 분산 rate limit counter, AI report generation lock에만 사용합니다.
- Redis Lua script와 atomic operation으로 increment+expiry, ticket consume, lock owner compare-and-delete를 하나의 연산으로 처리합니다.
- Redis 보호 기능 실패 시 요청을 우회하지 않고 `503`을 반환합니다.
- AI report는 Redis lock 외에도 MySQL unique constraint로 중복 저장을 방어합니다.
- Test profile은 Redis 역할의 in-memory 구현을 사용하고, Docker E2E에서 실제 Redis·MySQL 구성을 검증합니다.

## Consequences

### Positive

- 데이터 수명과 일관성 요구에 맞는 저장소를 사용합니다.
- 여러 backend instance가 rate limit과 AI generation 결정을 공유할 수 있습니다.
- Redis 데이터가 사라져도 영속 business record는 MySQL에 남습니다.
- 실패 시 보호 기능을 조용히 비활성화하지 않습니다.

### Tradeoffs

- Production backend는 MySQL과 Redis가 모두 준비돼야 readiness를 통과합니다.
- 두 저장소의 연결, TLS, credential과 monitoring을 운영해야 합니다.
- Redis를 business event broker로 사용하지 않으므로 현재 WebSocket broadcast는 instance-local입니다.

## Alternatives Considered

- MySQL only: 영속성은 단순하지만 짧은 TTL, high-frequency counter와 single-use consume 구현 부담이 큽니다.
- Redis as primary database: 관계 무결성, migration과 장기 기록 요구에 맞지 않습니다.
- Local memory coordination: 단일 instance에서는 쉽지만 재시작과 수평 확장에서 일관성이 깨집니다.

## Evidence

- [Flyway migrations](../../Backend/src/main/resources/db/migration)
- [RedisRateLimitStore](../../Backend/src/main/java/com/my/billiards/common/ratelimit/RedisRateLimitStore.java)
- [RedisWebSocketTicketStore](../../Backend/src/main/java/com/my/billiards/common/websocket/RedisWebSocketTicketStore.java)
- [RedisAiReportLockStore](../../Backend/src/main/java/com/my/billiards/ai/lock/RedisAiReportLockStore.java)
- [Docker Compose](../../docker-compose.yml)
