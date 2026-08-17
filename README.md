# Billiards Analysis

개인 당구 경기 기록을 데이터로 전환해 통계, 상대 전적, 주간 리포트, AI 코칭 제안까지 제공하는 풀스택 웹 애플리케이션입니다.

단순 기록 저장을 넘어, 인증된 사용자별 데이터 경계를 지키고 반복 가능한 DB 마이그레이션과 자동 검증 파이프라인을 갖춘 서비스 구조를 목표로 구현했습니다.

Current release: [`v1.0.0`](./docs/releases/v1.0.0.md)

## Problem And Value

- 경기 결과와 이닝별 점수는 남아 있지만, 실력 변화와 연습 방향을 한눈에 보기 어렵습니다.
- 사용자는 경기 기록을 등록하고, 종목별 통계와 상대 전적을 확인하며, 최근 한 주의 변화를 비교할 수 있습니다.
- 선택적으로 AI 리포트를 생성하면 집계 통계만 사용해 강점, 집중할 점, 연습 제안을 제공합니다.

## Key Features

- Server-managed refresh sessions with hashed token storage, rotation, reuse detection, and HttpOnly cookies

- 회원가입, 로그인, JWT 기반 인증과 프로필 관리
- 3쿠션과 4구 경기 기록 생성, 조회, 수정, 삭제, 검색, 페이지네이션
- 종목별 통계, 평균 추세, 상대 전적, 주간 경기 리포트
- 친구 요청과 친구 관리
- 친구 기반 경기 초대와 수락·거절 상태 관리
- 알림 REST API와 WebSocket 기반 실시간 알림
- 게임방 참가자 전용 WebSocket 기반 참가, 준비, 시작, 취소 이벤트
- 버전 충돌 검사가 적용된 실시간 점수, 이닝, 현재 차례 상태 관리
- 방장 저장 큐와 WebSocket을 이용한 참가자 점수판 실시간 동기화
- 명시적 요청 기반 Gemini 주간 AI 코칭 리포트
- JWT로 보호된 읽기 전용 MCP 경기 분석 도구
- k6 기반 인증·경기 기록 부하 테스트와 CI 성능 임계값

## Architecture

```mermaid
flowchart LR
    Browser["React 19 SPA\nTypeScript + Vite"]
    API["Spring Boot API\nModular Monolith"]
    DB[("MySQL 8.4\nFlyway")]
    Redis[("Redis 7.4\nTickets + Limits + AI Locks")]
    Metrics["Actuator + Micrometer\nMetrics + OpenTelemetry Traces"]
    Socket["WebSocket\nRealtime Events"]
    MCP["Streamable HTTP MCP\nRead-only tools"]
    Gemini["Google Gemini\nOptional"]
    CI["GitHub Actions\nCI"]

    Browser -->|"REST + JWT"| API
    Browser <-->|"WebSocket + short-lived ticket"| Socket
    Socket --> API
    API -->|"JPA"| DB
    API -->|"atomic tickets, counters, and locks"| Redis
    API -->|"health and metrics"| Metrics
    MCP -->|"JWT"| API
    API -. "manual AI request only" .-> Gemini
    CI -->|"test, lint, build, performance smoke"| API
    CI -->|"test, lint, build"| Browser
```

### Domain Boundaries

`auth`, `member`, `game`, `friend`, `invitation`, `notification`, `contact`, `ai`, `mcp`를 중심으로 패키지를 나눈 모듈형 모놀리스입니다. 현재는 단일 애플리케이션의 단순성을 유지하면서도, 변경 빈도가 높은 도메인은 독립적으로 확장할 수 있게 경계를 분리했습니다.

## Data Model

```mermaid
erDiagram
    MEMBERS ||--o{ GAME_RECORDS : owns
    GAME_RECORDS ||--o{ GAME_RECORD_INNING_SCORES : contains
    MEMBERS ||--o{ FRIENDSHIPS : requests
    MEMBERS ||--o{ FRIENDSHIPS : receives
    MEMBERS ||--o{ GAME_INVITATIONS : sends
    MEMBERS ||--o{ GAME_INVITATIONS : receives
    MEMBERS ||--o{ GAME_ROOMS : hosts
    GAME_ROOMS ||--o{ GAME_ROOM_PARTICIPANTS : contains
    MEMBERS ||--o{ GAME_ROOM_PARTICIPANTS : joins
    MEMBERS ||--o{ NOTIFICATIONS : receives
    MEMBERS ||--o{ WEEKLY_AI_REPORTS : owns
    MEMBERS ||--o{ CONTACT_INQUIRIES : writes

    MEMBERS {
        bigint id PK
        string email UK
        string nickname
        string password_hash
        string role
        string status
    }
    GAME_RECORDS {
        bigint id PK
        bigint member_id FK
        datetime played_at
        string game_type
        decimal average
        boolean is_win
    }
    GAME_RECORD_INNING_SCORES {
        bigint game_record_id FK
        int score_order
        int score
    }
    FRIENDSHIPS {
        bigint id PK
        bigint requester_id FK
        bigint receiver_id FK
        string status
    }
    GAME_INVITATIONS {
        bigint id PK
        bigint requester_id FK
        bigint receiver_id FK
        string game_type
        string invitation_status
        datetime expires_at
    }
    GAME_ROOMS {
        bigint id PK
        bigint host_member_id FK
        bigint active_member_id FK
        string join_code UK
        string room_status
        int current_inning
        bigint state_version
    }
    GAME_ROOM_PARTICIPANTS {
        bigint id PK
        bigint game_room_id FK
        bigint member_id FK
        string participant_role
        int target_score
        int current_score
        int cushion_score
        int high_run
    }
    NOTIFICATIONS {
        bigint id PK
        bigint member_id FK
        string notification_type
        boolean is_read
    }
    WEEKLY_AI_REPORTS {
        bigint id PK
        bigint member_id FK
        string game_type
        date report_end_date
        string model_name
    }
    CONTACT_INQUIRIES {
        bigint id PK
        bigint member_id FK
        string title
        boolean is_private
        string inquiry_status
    }
```

## Technical Decisions

### Authentication And Data Isolation

- Access tokens are short-lived API credentials, while refresh tokens are opaque random values stored only in an `HttpOnly`, `SameSite=Strict` cookie.
- The database stores only SHA-256 refresh-token hashes. Every refresh rotates the token, and reuse of an older token revokes its complete login-session family.
- Logout revokes the server-side session before expiring the browser cookie.
- The browser keeps access tokens in memory, restores sessions through the HttpOnly cookie after reload, and never persists access tokens in `localStorage`.
- Concurrent API `401` responses share one refresh request before retrying each original request once.
- WebSocket URLs never contain access tokens. The browser requests a 30-second, single-use ticket before each notification or game-room connection.
- Redis stores only SHA-256 ticket hashes and consumes them atomically, preventing replay and binding game-room tickets to one room.
- Redis Lua scripts enforce shared limits across backend instances: 5 login attempts per account and 30 per address in 5 minutes, 30 WebSocket tickets per minute, and 3 actual AI generations per day.
- Rate-limit identities are SHA-256 hashed, and rejected requests return `429 Too Many Requests` with a browser-readable `Retry-After` header.
- AI report generation uses a Redis distributed lock, so multiple backend instances cannot intentionally call Gemini for the same member, game type, and report date at the same time.
- Resilience4j protects Gemini with a bounded executor, a 20-second timeout, and a circuit breaker. Automatic retries are disabled to avoid duplicate model charges.

- Spring Security와 JWT로 보호 API를 구성했습니다.
- API와 MCP 도구 모두 JWT에서 현재 사용자를 식별합니다.
- 요청에 회원 ID를 받지 않아 다른 사용자의 기록을 조회할 수 없게 했습니다.

### Request Tracing

- Every HTTP response returns `X-Request-Id`, and the same value is written to backend logs.
- A valid request ID from a gateway or client is preserved; malformed or missing values are replaced with a generated UUID.
- The header is exposed through CORS so browser clients can connect an error response to its server-side log entries.
- OpenTelemetry continues inbound W3C `traceparent` context and writes `traceId` and `spanId` beside the request ID in every backend log line.
- Gemini provider execution is recorded as `billiards.ai.provider`, and its trace context is propagated into the bounded AI executor.
- Trace sampling defaults to 10%. OTLP trace, metric, and log export are disabled until a collector is intentionally configured, so local startup sends no telemetry to an external service.

### Operational Observability

- Micrometer exposes JVM, HTTP, database-pool, Redis, and custom business metrics in Prometheus format.
- Public liveness and readiness probes are available at `/actuator/health/liveness` and `/actuator/health/readiness`; readiness includes application state, MySQL, and Redis.
- When exposed in local and Docker profiles, `/actuator/metrics` and `/actuator/prometheus` are restricted to the `ADMIN` role. The current `prod` profile exposes only `health` and `info` until a protected collector path is designed.
- Custom low-cardinality metrics cover login outcomes, rate-limit rejections by scope, AI report generation/cache/failure outcomes, and active WebSocket connections by channel.
- Resilience4j exports Gemini circuit-breaker state, call outcomes, and timeout outcomes through the same administrator-only metrics endpoints.
- Metrics never use member IDs, emails, room IDs, client addresses, or request IDs as tags.

### Transactional Game Completion

- Only the room host can finish an in-progress game, and the request must match the latest scoreboard `stateVersion`.
- Room completion and all participant records are committed in one transaction, so partial record creation cannot remain in the database.
- Each generated record is linked to its source room with a database uniqueness constraint, making finish retries idempotent.
- The `GAME_FINISHED` WebSocket event is published only after the completion transaction commits.
- The host UI flushes its final scoreboard update before requesting completion, while every participant leaves the live board after the committed event arrives.

### Contact Inquiry Privacy

- Public inquiries can be read without signing in, but private inquiries are visible only to their author or an `ADMIN` role.
- Inquiry creation and a member's full inquiry history require JWT authentication.
- Administrator inquiry management returns paginated summaries with optional status filtering, and checks both the JWT role and the current database role.

### Contact Inquiry Answer Notifications

- The first administrator answer publishes an application event, and the owner notification is created only after the inquiry transaction commits.
- An active inquiry owner receives one `SYSTEM` notification through the existing real-time notification flow; answer edits do not create duplicates.

### Error Observability

- Expected business and validation errors are logged at `WARN` without request values or custom exception messages.
- Unexpected errors are logged at `ERROR` with an exception type and source location, not the exception message.

### Repository Supply Chain Security

- The root `.gitignore` excludes local environment files, private keys, keystores, and common cloud credential files from every project directory.
- A dependency-free Node.js scanner checks tracked and unignored files for high-confidence API key, token, and private-key formats without printing matched secret values.
- The same scanner rejects external GitHub Actions that are not pinned to a full 40-character commit SHA.
- All current workflow actions are SHA-pinned, while version comments keep the workflow readable and allow Dependabot to propose reviewed updates.
- Dependabot checks Gradle, npm, GitHub Actions, and Docker dependencies weekly. Minor and patch updates are grouped, open version-update pull requests are limited to one per ecosystem, and nothing is auto-merged.
- These checks require no external scanner account or scanner API key.

### Production Configuration Safety

- The `prod` profile has no fallback database credentials, Redis password, JWT secret, or frontend origin.
- Startup validation requires verified MySQL TLS, encrypted Redis transport with authentication, a strong JWT secret, HTTPS-only CORS, and secure refresh cookies.
- Development profiles cannot be combined with `prod`, administrator bootstrap remains disabled, and Actuator exposure is restricted to `health` and `info`.
- SQL output and detailed server errors are disabled, reverse-proxy headers are honored, and shutdown waits for in-flight work.
- Validation failures report property names without echoing passwords, tokens, or connection values.

### Database Change Management

- Flyway SQL 마이그레이션으로 테이블, 인덱스, 제약조건 변경 이력을 Git에서 관리합니다.
- Hibernate는 `ddl-auto=validate`로 스키마를 검증만 하므로, 런타임에 의도하지 않은 DDL이 실행되지 않습니다.
- `member_id + played_at` 인덱스와 친구 쌍 유니크 제약조건처럼 조회와 데이터 무결성에 필요한 제약을 DB에 둡니다.

### AI Cost And Privacy Controls

- AI 기능은 기본 비활성화 상태이며, 화면 진입이나 주기 작업만으로 모델을 호출하지 않습니다.
- 사용자가 생성 버튼을 눌렀을 때만 AI 요청을 보냅니다.
- 회원 ID, 이메일, 상대 이름, 메모, 개별 경기 기록은 전송하지 않고 주간 집계 통계만 전달합니다.
- 리포트는 회원, 종목, 기준일 조합으로 저장하고 같은 요청은 캐시를 반환해 중복 호출을 줄입니다.
- Redis `SET NX` 잠금은 여러 서버의 동시 생성 요청을 하나로 조정하고, 소유자 확인 Lua 해제와 TTL로 잘못된 잠금 삭제 및 장애 후 영구 잠금을 방지합니다.
- Redis 조정 기능이 실패하면 모델을 호출하지 않고 `503 AI_004`를 반환하며, DB 유니크 제약조건이 마지막 중복 저장 방어선으로 동작합니다.
- Gemini API 키는 백엔드의 로컬 환경 변수에서만 관리하며 React 코드, Docker 빌드 인자, Git에 넣지 않습니다.

### MCP Integration

- Streamable HTTP MCP 서버는 기본 비활성화 상태입니다.
- 활성화해도 JWT 인증이 필요하고, 주간 리포트, 최근 통계, 상대 전적을 조회하는 읽기 전용 도구만 제공합니다.
- MCP 모듈 자체는 LLM 호출을 하지 않으므로 API 키나 모델 비용이 필요하지 않습니다.
- 공식 MCP 클라이언트 통합 테스트가 초기화, 도구 목록, 세 도구 호출, JWT 차단, 회원별 데이터 격리를 실제 HTTP 통신으로 검증합니다.

### Frontend Performance

- React lazy loading으로 화면별 코드를 분리했습니다.
- React, 애니메이션, 날짜 처리 라이브러리를 공통 청크로 분리해 초기 앱 청크를 약 1.13MB에서 126KB로 줄였습니다.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router, Recharts, Vitest |
| Backend | Java 17, Spring Boot 4, Spring MVC, Spring Data JPA, Spring Security, WebSocket, Actuator, Micrometer, OpenTelemetry, Resilience4j |
| Data | MySQL 8.4, Redis 7.4, H2 for tests, Flyway |
| AI And Protocol | Spring AI, Google Gemini, Streamable HTTP MCP |
| DevOps | Docker Compose, Nginx, GitHub Actions, Dependabot, k6 |

## Quality Gates

GitHub Actions runs on every pull request to `main` and every push to `main`.

- Backend: Java 17, Gradle, Spring Boot tests, and JaCoCo gates of 85% line and 60% branch coverage
- Architecture: ArchUnit layer, naming, constructor-injection, and business-module cycle rules
- Security: scanner self-tests, secret and private-key detection, sensitive filename checks, and full-SHA GitHub Action enforcement
- Production: fail-fast profile contract and security validation tests for credentials, TLS, CORS, cookies, profiles, and Actuator exposure
- Frontend: Vitest API contract tests, TypeScript lint, production build
- Infrastructure: Docker Compose configuration validation
- Full stack: Playwright authentication, game-record CRUD, and two-user realtime game-room E2E against Dockerized MySQL, Redis, backend, and frontend
- MCP: official client protocol handshake, JWT authorization, tool schema, invocation, and member data isolation
- Performance: k6 authenticated game-record flow with error-rate and endpoint-specific p95 thresholds

The E2E job runs only after the backend, frontend, and Compose checks pass. It executes a short k6 performance smoke gate before Playwright. Failed runs upload Playwright traces and screenshots, print Docker logs, and always remove the temporary database volume.

The frontend AI report tests verify the selected game type, explicit `POST` generation request, and error propagation without calling Gemini, a database, or an external API.

## Run Locally

### Docker Compose

From the project root:

```powershell
docker compose up --build
```

| Service | Address |
| --- | --- |
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| Health check | http://localhost:8080/actuator/health |
| Liveness | http://localhost:8080/actuator/health/liveness |
| Readiness | http://localhost:8080/actuator/health/readiness |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |
| MySQL host port | localhost:13306 |
| Redis host port | localhost:6379 |

Stop the local stack:

```powershell
docker compose down
```

### Run Each App

Backend requires Java 17 and a local MySQL configuration. See [Backend README](./Backend/README.md) for profiles and database setup.

```powershell
cd Backend
.\gradlew.bat bootRun
```

Frontend:

```powershell
cd Frontend
npm install
npm run dev
```

## Verification Commands

```powershell
cd Backend
.\gradlew.bat check
```

```powershell
cd Frontend
npm run test
npm run lint
npm run build
```

## Project Documents

- [Changelog](./CHANGELOG.md): release history and notable capabilities
- [v1.0.0 release notes](./docs/releases/v1.0.0.md): release scope, verification gates, and known limitations
- [Architecture guide](./docs/architecture.md): system boundaries, module responsibilities, consistency, security, and scaling limits
- [Architecture decision records](./docs/adr/README.md): accepted decisions, alternatives, and tradeoffs
- [Operations runbook](./docs/operations-runbook.md): health checks, incident response, recovery, security, and cost controls
- [Backend README](./Backend/README.md): profiles, API modules, Flyway, MCP, optional Gemini configuration
- [Frontend README](./Frontend/README.md): frontend environment variables and commands
- [Performance README](./performance/README.md): k6 profiles, thresholds, and local execution
- [CI workflow](./.github/workflows/ci.yml): automated quality gates
- [Security scanner](./scripts/security/check-secrets.mjs): offline repository secret and workflow pin checks
- [Production environment contract](./.env.example): required deployment variables without real secret values

## Current Scope

The project is ready for local Docker-based development, automated CI validation, and fail-fast production configuration. A production deployment and a real Gemini request are intentionally deferred until a separate budget, provider policy, and operational plan are agreed on.
