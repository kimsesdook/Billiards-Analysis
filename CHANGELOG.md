# Changelog

All notable changes to Billiards Analysis are documented in this file.

The format follows Keep a Changelog, and release versions follow Semantic Versioning.

## [1.0.0] - 2026-08-17

### Added

- React 19 frontend for account, game record, statistics, friend, invitation, notification, notice, inquiry, and game-room workflows.
- Spring Boot 4 modular-monolith backend with JWT authentication and member-scoped APIs.
- Server-managed refresh sessions with HttpOnly cookies, hashed token storage, rotation, reuse detection, and logout revocation.
- MySQL schema ownership through 17 versioned Flyway migrations and JPA schema validation.
- Redis-backed distributed rate limits, single-use WebSocket tickets, and owner-safe AI generation locks.
- Notification and game-room WebSocket delivery with participant authorization and after-commit events.
- Versioned live score state, stale-write protection, transactional room completion, and idempotent participant record generation.
- Optional aggregate-only Gemini weekly coaching reports with cache, timeout, circuit breaker, bounded executor, and cost controls.
- JWT-protected Streamable HTTP MCP server with three read-only billiards analysis tools.
- Actuator health endpoints, business metrics, request IDs, OpenTelemetry trace correlation, and production fail-fast validation.
- OpenAPI and Swagger UI documentation.
- Docker Compose development stack, k6 performance gates, and Playwright full-stack E2E scenarios.
- Architecture guide, ADRs, operations runbook, and release documentation.

### Security

- Access tokens remain in browser memory; refresh tokens remain in scoped HttpOnly cookies.
- WebSocket URLs use short-lived, scoped, single-use tickets instead of JWT values.
- Production startup rejects weak credentials, insecure database or Redis transport, unsafe CORS, insecure cookies, mixed profiles, and excessive Actuator exposure.
- Offline CI scanning rejects likely secrets, private keys, sensitive filenames, and unpinned external GitHub Actions.
- AI and MCP are disabled by default; no scheduled model calls or telemetry exports run automatically.

### Quality

- 185 backend tests, including architecture, security, repository, WebSocket, MCP, production-contract, and integration coverage.
- JaCoCo quality gates require at least 85% line coverage and 60% branch coverage.
- Frontend unit and API-contract tests, TypeScript validation, production build, and three browser E2E scenarios.
- CI validates backend, frontend, Compose, security, performance smoke thresholds, and the Dockerized user workflows.

### Known Limitations

- No production cloud deployment or backup-restore drill has been completed.
- Production metrics scraping remains disabled until a protected collector path is designed.
- WebSocket session registries are process-local; multi-instance realtime broadcast requires sticky sessions or a message broker.
- A real Gemini provider request is intentionally deferred until API-key, provider-policy, and budget decisions are approved.

[1.0.0]: ./docs/releases/v1.0.0.md
