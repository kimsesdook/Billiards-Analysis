# Architecture Decision Records

ADR은 중요한 설계 결정을 당시의 문제, 선택, 대안, 결과와 함께 기록합니다. 상태가 `Accepted`인 문서는 현재 코드의 설계 기준입니다. 결정을 바꿀 때 기존 문서를 삭제하거나 덮어쓰지 않고 새로운 ADR에서 대체 관계를 기록합니다.

| ADR | Status | Decision |
| --- | --- | --- |
| [ADR-0001](./0001-modular-monolith.md) | Accepted | 도메인 경계를 가진 Spring Boot 모듈형 모놀리스 사용 |
| [ADR-0002](./0002-jwt-refresh-session.md) | Accepted | Stateless access JWT와 서버 관리 refresh session 결합 |
| [ADR-0003](./0003-mysql-redis-state-boundaries.md) | Accepted | MySQL은 영속 기준, Redis는 만료 가능한 분산 조정 상태로 제한 |
| [ADR-0004](./0004-ai-mcp-safe-defaults.md) | Accepted | AI와 MCP를 기본 비활성화·최소 데이터·비용 제한 원칙으로 제공 |

## ADR Format

새 ADR은 다음 내용을 포함합니다.

- Status와 Date
- Context
- Decision
- Consequences
- Alternatives Considered
- Evidence
