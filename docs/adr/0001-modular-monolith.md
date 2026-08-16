# ADR-0001: Use A Modular Monolith

- Status: Accepted
- Date: 2026-08-16

## Context

프로젝트에는 인증, 회원, 경기, 친구, 초대, 알림, 문의, 공지, AI와 MCP처럼 변경 이유가 다른 기능이 있습니다. 기능별 경계는 필요하지만 현재 사용자 규모와 한 명의 개발자가 관리하는 포트폴리오 단계에서 독립 배포, 서비스 간 인증, 분산 추적과 장애 복구를 모두 감당하는 microservice는 복잡성이 더 큽니다.

## Decision

하나의 Spring Boot 애플리케이션 안에서 최상위 도메인 패키지로 경계를 나누는 모듈형 모놀리스를 사용합니다.

- HTTP controller는 service를 통해서만 비즈니스와 persistence에 접근합니다.
- Domain은 controller, service, repository, DTO, WebSocket 계층에 의존하지 않습니다.
- 비즈니스 모듈 사이의 순환 의존성을 허용하지 않습니다.
- Spring bean은 constructor injection을 사용합니다.
- 규칙은 문서에만 두지 않고 ArchUnit test로 CI에서 검증합니다.

## Consequences

### Positive

- 단일 트랜잭션으로 게임방 완료와 참가자별 기록 생성을 원자적으로 처리할 수 있습니다.
- 로컬 실행, 디버깅, 배포와 장애 범위가 단순합니다.
- 도메인 경계와 계층 위반을 자동 검사하므로 향후 분리 가능성을 유지합니다.

### Tradeoffs

- 한 모듈의 높은 CPU·memory 사용이 전체 애플리케이션에 영향을 줄 수 있습니다.
- 전체 애플리케이션을 함께 배포하고 확장합니다.
- 모듈 간 호출이 Java method call이므로 원격 서비스 경계를 미리 가정하지 않습니다.

## Alternatives Considered

- Microservices: 현재 규모에서는 network failure, deployment, service discovery, distributed transaction 비용이 이점보다 큽니다.
- 계층형 단일 package: 시작은 빠르지만 도메인 소유권과 변경 영향 범위가 흐려집니다.
- 완전한 hexagonal architecture: 유용한 원칙은 적용하지만 모든 경계에 port·adapter를 추가할 정도의 외부 구현 교체 요구는 아직 없습니다.

## Evidence

- [LayerArchitectureTest](../../Backend/src/test/java/com/my/billiards/architecture/LayerArchitectureTest.java)
- [BusinessModuleArchitectureTest](../../Backend/src/test/java/com/my/billiards/architecture/BusinessModuleArchitectureTest.java)
- [Backend packages](../../Backend/src/main/java/com/my/billiards)
