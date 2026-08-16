# ADR-0002: Combine Access JWT With Server-Managed Refresh Sessions

- Status: Accepted
- Date: 2026-08-16

## Context

SPA의 REST 요청에는 수평 확장이 쉬운 인증 방식이 필요하지만, 장기간 유효한 self-contained token만 사용하면 탈취·로그아웃·재사용 대응이 어렵습니다. WebSocket 연결 주소에 access JWT를 넣으면 browser history, proxy log와 monitoring 도구에 token이 노출될 위험도 있습니다.

## Decision

- REST API는 짧은 수명의 signed access JWT로 인증합니다.
- Refresh token 원문은 `HttpOnly`, `SameSite=Strict`, auth path 범위 cookie로만 전달합니다.
- 서버는 refresh token의 SHA-256 hash와 session family, 만료·회전·폐기 상태를 MySQL에 저장합니다.
- Refresh rotation은 DB row lock 안에서 실행하고, 사용된 token 재사용 시 같은 family를 폐기합니다.
- 로그아웃은 현재 refresh family를 폐기하고 cookie를 만료시킵니다.
- WebSocket은 access JWT 대신 짧은 수명, 목적·게임방 범위, 일회용 Redis ticket을 사용합니다.
- Production에서는 secure refresh cookie와 HTTPS origin을 startup validator가 강제합니다.

## Consequences

### Positive

- 일반 REST 요청은 서버 session lookup 없이 인증할 수 있습니다.
- Refresh session을 서버에서 회전·폐기하고 재사용을 감지할 수 있습니다.
- WebSocket URL과 handshake log에 장기 credential이 포함되지 않습니다.
- Ticket 탈취 피해 범위를 30초와 한 번의 연결로 제한합니다.

### Tradeoffs

- Access JWT는 만료 전까지 개별 즉시 폐기할 수 없습니다.
- Refresh와 WebSocket 연결은 각각 MySQL과 Redis 가용성에 의존합니다.
- Cookie와 CORS 설정을 production origin에 맞게 관리해야 합니다.

## Alternatives Considered

- Access JWT만 사용: 단순하지만 장기 로그인과 탈취 대응이 약합니다.
- Server HTTP session: 폐기는 쉽지만 모든 REST 요청이 session store에 의존합니다.
- WebSocket query JWT: 구현은 간단하지만 token이 URL 계층에 노출될 가능성이 큽니다.

## Evidence

- [JwtAuthenticationFilter](../../Backend/src/main/java/com/my/billiards/security/JwtAuthenticationFilter.java)
- [RefreshTokenService](../../Backend/src/main/java/com/my/billiards/auth/service/RefreshTokenService.java)
- [RefreshTokenCookieFactory](../../Backend/src/main/java/com/my/billiards/auth/token/RefreshTokenCookieFactory.java)
- [WebSocketTicketService](../../Backend/src/main/java/com/my/billiards/common/websocket/WebSocketTicketService.java)
- [ProductionConfigurationValidator](../../Backend/src/main/java/com/my/billiards/config/ProductionConfigurationValidator.java)
