# Billiards Analysis Operations Runbook

## 1. Scope

이 runbook은 현재 저장소의 local, test, Docker, production profile 계약을 기준으로 합니다. 운영 계정·network·backup service가 아직 선택되지 않았으므로 실제 cloud provider 절차는 포함하지 않습니다.

운영 원칙은 다음과 같습니다.

- 비밀 값, access token, cookie, request body를 command history·문서·issue·로그에 남기지 않습니다.
- 장애를 숨기기 위해 rate limit, ticket validation, TLS 또는 production validator를 비활성화하지 않습니다.
- 데이터 변경 전 backup과 복구 가능성을 확인합니다.
- 적용된 Flyway migration을 수정하거나 삭제하지 않습니다.
- AI 비용이 의심되면 기능을 먼저 비활성화하고 원인을 조사합니다.

## 2. Environment Matrix

| Profile | Database | Redis | AI | Intended Use |
| --- | --- | --- | --- | --- |
| `local` | Local MySQL | Local Redis | 기본 off | IntelliJ·로컬 개발 |
| `test` | H2 + Flyway | In-memory adapters | off | 자동 테스트와 빠른 확인 |
| `docker` | Compose MySQL | Compose Redis | 기본 off | 전체 stack·E2E |
| `prod` | TLS MySQL 필수 | TLS+password Redis 필수 | 명시적 설정만 | 배포 계약 검증, 실제 배포 미완료 |

## 3. Standard Startup And Shutdown

### Full Local Stack

프로젝트 최상위 폴더에서 실행합니다.

```powershell
docker compose config
docker compose up -d --build
docker compose ps
```

준비 상태를 확인합니다.

```powershell
Invoke-RestMethod http://localhost:8080/actuator/health/liveness
Invoke-RestMethod http://localhost:8080/actuator/health/readiness
Invoke-WebRequest http://localhost:3000
```

일반 종료는 MySQL volume을 보존합니다.

```powershell
docker compose down
```

`docker compose down --volumes`는 저장된 local MySQL 데이터를 삭제하므로 disposable data임을 확인한 경우에만 별도 승인 후 사용합니다.

### Backend Quality Gate

```powershell
cd Backend
.\gradlew.bat clean check
```

성공 기준은 모든 test, ArchUnit, line coverage 85%, branch coverage 60% 통과입니다.

## 4. Health And Signals

| Signal | Access | Meaning |
| --- | --- | --- |
| `/actuator/health/liveness` | Public | JVM과 application process가 응답 가능한지 확인 |
| `/actuator/health/readiness` | Public | traffic을 받을 준비와 DB·Redis 상태 확인 |
| `/actuator/info` | Public | 제한된 application 정보 |
| `/actuator/metrics` | ADMIN JWT, when exposed | JVM, HTTP, Hikari, Redis, business metric 탐색 |
| `/actuator/prometheus` | ADMIN JWT, when exposed | Prometheus 형식 metric |
| `X-Request-Id` | Every HTTP response | client 오류와 backend log 연결 |
| `traceId`, `spanId` | Server log | 분산 trace와 log 연결 |

주요 business metric:

- `billiards.authentication.login.attempts`
- `billiards.rate.limit.rejections`
- `billiards.ai.report.requests`
- `billiards.websocket.connections.active`
- `resilience4j.circuitbreaker.calls`
- `resilience4j.circuitbreaker.state`
- `resilience4j.timelimiter.calls`

ID, 이메일, 주소, token 또는 prompt를 metric tag나 검색 조건에 복사하지 않습니다.

공통 local·docker 설정에서는 metrics와 Prometheus가 노출되고 Spring Security가 `ADMIN` role을 요구합니다. 현재 `prod` profile은 startup contract상 `health,info`만 노출하므로 production scraping은 아직 구성되지 않았습니다. 실제 배포 전에 private network 또는 authenticated collector 경계를 결정하고 production validator와 함께 변경해야 합니다.

## 5. First Response Checklist

1. 장애 시작 시각, 사용자 영향, HTTP status와 error code를 기록합니다.
2. 응답의 `X-Request-Id`로 backend log를 찾습니다.
3. Liveness와 readiness를 각각 확인합니다.
4. `docker compose ps` 또는 배포 플랫폼에서 backend, MySQL, Redis 상태를 확인합니다.
5. 최근 배포·환경 변수·migration 변경 여부를 확인합니다.
6. 장애 범위를 인증, DB, Redis, realtime, AI 또는 frontend로 분류합니다.
7. 복구 후 동일 요청과 quality gate를 재검증하고 원인·재발 방지를 기록합니다.

Local Docker log 확인:

```powershell
docker compose logs --tail=200 backend
docker compose logs --tail=100 mysql
docker compose logs --tail=100 redis
```

로그를 공유하기 전에 token, cookie, 이메일, database address와 secret이 포함되지 않았는지 확인합니다.

## 6. Incident Matrix

| Symptom | Likely Boundary | Check | Safe Action |
| --- | --- | --- | --- |
| Liveness down | Backend process | process/container status, startup exception | backend 재시작 전 마지막 변경과 stack trace 유형 확인 |
| Readiness down, liveness up | MySQL or Redis | dependency health, connection settings | 의존성 복구 후 readiness가 회복될 때까지 traffic 제외 |
| `401 AUTH_001` 증가 | JWT or token expiry | server time, JWT secret deployment, login flow | secret 불일치 수정, token 원문은 로그에 남기지 않음 |
| `403 AUTH_002` | Role or ownership | member role, resource participant | authorization을 우회하지 말고 DB 상태와 요청 주체 확인 |
| `429 RATE_LIMIT_001` | Expected protection | bounded `scope` metric, traffic pattern | 정상 제한이면 대기, 공격이면 upstream 제한 강화 검토 |
| `503 RATE_LIMIT_002` | Redis rate-limit store | Redis readiness and latency | Redis 복구, 보호를 memory fallback으로 우회하지 않음 |
| `503 REALTIME_001` | Redis ticket store | Redis, ticket issue endpoint | Redis 복구 후 새 ticket 발급, 기존 ticket 재사용 금지 |
| WebSocket 즉시 종료 | Ticket scope/expiry | 30초 내 연결, room membership, one-time use | 인증 REST endpoint에서 새 ticket 발급 |
| `409 ROOM_008` | Concurrent scoreboard update | 최신 live state version | 최신 state 조회 후 사용자 변경을 다시 적용 |
| `400 ROOM_009/010` | Invalid score/completion | participant, inning totals, high run | server validation을 유지하고 client payload 수정 |
| `503 AI_001` | AI disabled, open circuit, saturated executor | AI model setting, circuit state, executor load | 기본 off면 정상, 장애면 호출 중지 후 provider 확인 |
| `409 AI_003` | Concurrent generation | cache and lock wait | 잠시 후 cached report 조회, 중복 강제 호출 금지 |
| `503 AI_004` | Redis AI lock | Redis readiness | Redis 복구 전 provider 직접 호출 금지 |
| `504 AI_005` | Provider timeout | timeout metric, provider status | 자동 반복 호출 금지, circuit 회복 후 사용자 재시도 |

## 7. Database And Migration Failure

Startup이 Flyway 또는 Hibernate validation에서 실패하면 traffic을 받지 않는 것이 정상입니다.

1. 실패한 migration version과 SQL error를 확인합니다.
2. 대상 DB와 active profile이 맞는지 확인합니다.
3. 이미 적용된 migration 파일이 Git에서 변경됐는지 확인합니다.
4. Production data를 직접 수정하기 전에 backup과 복원 절차를 검증합니다.
5. 수정은 기존 migration 편집이 아니라 새 migration으로 작성합니다.
6. H2 test와 Docker MySQL에서 모두 적용한 후 다시 배포합니다.

DDL이 포함된 release는 이전 application version이 새 schema에서도 동작하는 backward-compatible 순서를 우선합니다. 그렇지 않으면 application rollback만으로 복구되지 않을 수 있습니다.

## 8. Redis And Realtime Failure

Redis는 영속 business record의 기준은 아니지만 보호와 realtime 인증에 필수입니다.

- Redis 장애 중 rate limit을 건너뛰지 않습니다.
- Ticket이나 AI lock을 local memory로 임시 대체하면 instance 간 보장이 깨지므로 production에서 사용하지 않습니다.
- Redis 복구 후 만료된 ticket은 살리지 않고 새로 발급합니다.
- Active WebSocket session은 backend process-local입니다. 여러 instance 환경에서는 sticky session이나 broker가 준비되지 않았다면 realtime 전달을 완전한 multi-instance 기능으로 간주하지 않습니다.

## 9. AI Cost Or Provider Incident

예상하지 못한 호출·비용 또는 provider 장애가 의심되면 다음 순서로 대응합니다.

1. `AI_CHAT_MODEL=none`으로 변경하고 backend를 재시작해 새 provider call을 차단합니다.
2. 외부 provider console에서 API key 사용량과 billing 상태를 확인합니다.
3. 노출 가능성이 있으면 key를 provider에서 폐기하고 새 key를 Git 밖의 secret store에만 설정합니다.
4. `billiards.ai.report.requests`, circuit breaker와 timeout metric을 확인합니다.
5. Cache miss, Redis lock 실패, rate limit 설정 변경 또는 retry 증가가 있었는지 확인합니다.
6. 원인을 해결하고 budget·alert를 확인한 뒤 제한된 test account에서만 다시 활성화합니다.

MCP는 model provider를 호출하지 않습니다. MCP traffic 증가는 Gemini 비용 증가의 직접 원인이 아닙니다.

## 10. Credential Incident

Credential이 Git, log 또는 screenshot에 노출됐다고 의심되면 값 삭제 커밋만으로 끝내지 않습니다.

1. 해당 credential을 발급한 시스템에서 즉시 폐기·회전합니다.
2. 외부 traffic을 제한하고 영향받은 backend를 새 secret으로 재시작합니다.
3. JWT secret 노출이면 access JWT를 모두 무효화하기 위해 secret을 회전하고, refresh session도 승인된 DB 변경 절차로 폐기합니다.
4. Git history, CI artifact, issue와 log의 노출 범위를 확인합니다.
5. Security scanner pattern과 review 절차를 보완합니다.

현재 애플리케이션에는 운영자용 전체 refresh session 폐기 API가 없습니다. 실제 배포 전에는 승인·감사 가능한 global session revocation 절차를 별도로 마련해야 합니다.

## 11. Disk Pressure

먼저 사용량을 확인합니다.

```powershell
docker system df
Get-PSDrive C
```

안전하게 재생성 가능한 project output은 Gradle로 정리합니다.

```powershell
cd Backend
.\gradlew.bat --stop
.\gradlew.bat clean
```

`docker compose down`은 container와 network를 내리지만 named MySQL volume은 보존합니다. Docker volume, image 또는 global cache 삭제는 다른 프로젝트와 DB에 영향을 줄 수 있으므로 대상과 backup을 확인한 뒤 별도 승인으로 수행합니다.

## 12. Rollback And Recovery

- Application-only 변경은 직전 검증 image로 되돌리고 readiness를 확인합니다.
- Migration이 포함되면 schema backward compatibility를 먼저 판단합니다.
- 적용된 migration을 삭제하거나 checksum을 맞추기 위해 편집하지 않습니다.
- Data rollback이 필요하면 검증된 backup에서 별도 환경에 복원해 무결성을 확인한 뒤 실행합니다.
- 복구 후 login, game record CRUD, room state, WebSocket ticket과 주요 metric을 확인합니다.

현재 저장소는 production backup provider와 restore drill을 포함하지 않습니다. 실제 배포 전 backup 주기, 보존 기간, 암호화, 복원 목표와 정기 복원 훈련을 결정해야 합니다.

## 13. Release Readiness Checklist

- `main`과 release commit이 일치합니다.
- `Backend`의 `.\gradlew.bat clean check`가 통과합니다.
- Frontend test, lint와 production build가 통과합니다.
- Secret scanner와 Docker Compose validation이 통과합니다.
- Docker full-stack readiness, k6 smoke와 Playwright E2E가 통과합니다.
- 새 Flyway migration은 순서·재실행·호환성을 검토했습니다.
- 실제 secret은 Git, image build argument와 frontend bundle에 없습니다.
- AI와 telemetry는 의도적으로 활성화한 경우만 켜져 있습니다.
- 변경 내용, 알려진 제한, rollback 조건과 관측 지표가 release note에 기록됐습니다.

## 14. Post-Incident Record

장애 종료 후 다음 내용을 남깁니다.

- 영향 시간과 사용자 영향
- 최초 증상, status, error code와 request ID
- 기술적 원인과 탐지 지연 원인
- 임시 조치와 영구 조치
- 누락된 test, metric, alert 또는 runbook 단계
- 담당자와 완료 기한

Token, password, email, request body와 provider prompt·response 원문은 사고 문서에도 기록하지 않습니다.
