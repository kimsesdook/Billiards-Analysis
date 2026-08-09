# Billiards Backend

This backend is designed as a modular monolith first. The package boundaries are intentionally separated so that high-change domains can later move toward event-driven or microservice-style modules without rewriting the whole application.

## Package Map

- `common`: shared API response, exception handling, and base entity support
- `config`: application-wide configuration such as CORS, properties, and JPA auditing
- `auth`: authentication and token lifecycle
- `member`: member profile, account, and security preferences
- `game`: game records, match rooms, scoring, and analysis
- `friend`: friend relationships, requests, and rival search
- `invitation`: friend-to-friend game invitation lifecycle and invitation status transitions
- `notification`: notifications and future event delivery
- `notice`: public announcements
- `contact`: public and private user inquiries with owner-based access control

## Profiles

- `local`: MySQL-based local development profile
- `docker`: MySQL and Redis-based Docker Compose profile
- `test`: H2-based test profile for fast context and repository tests

## API Documentation

Springdoc generates OpenAPI documentation from the controllers at runtime.

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Signup, login, refresh, and logout are public authentication endpoints. Other REST API groups are marked with the `bearerAuth` JWT scheme in Swagger UI.

## Refresh Token Sessions

- `POST /api/auth/login` returns an access token and sets `billiards_refresh_token` as an `HttpOnly`, `SameSite=Strict` cookie.
- `POST /api/auth/refresh` rotates the cookie token and returns a new access token.
- `POST /api/auth/logout` revokes the complete login-session family and expires the cookie.
- Refresh token values are never returned in JSON and only SHA-256 hashes are stored in the database.
- Reuse of an already rotated token revokes every active token in the same session family.
- The cookie is limited to `/api/auth`. Set `JWT_REFRESH_COOKIE_SECURE=true` when the API is served over HTTPS.
- `JWT_REFRESH_TOKEN_EXPIRATION_DAYS` controls session lifetime and defaults to 30 days.

## Actuator Access

- `GET /actuator/health` and `GET /actuator/info` are public for health checks.
- Other Actuator endpoints, including `/actuator/metrics`, require an `ADMIN` JWT role.

## Request Tracing

- Every HTTP response includes an `X-Request-Id` header, including authentication failures.
- A valid inbound `X-Request-Id` is reused; otherwise, the backend generates a UUID.
- The request ID is included in server logs to connect a client error with its backend log entries.

## Error Observability

- Expected business and validation errors are logged at `WARN` with error codes and error counts only.
- Unexpected errors are logged at `ERROR` with their exception type and source location.
- Request bodies, JWT values, passwords, and custom exception messages are intentionally excluded from these logs.

## Database Migration

The backend uses Flyway to manage database schema changes.

- Migration files live in `src/main/resources/db/migration`
- `V1__create_game_record_tables.sql` creates the first game record tables
- `V2__create_members_table.sql` creates the member account table
- `V3__add_member_to_game_records.sql` connects game records to members
- `V4__add_member_profile_fields.sql` adds member profile and billiards handicap settings
- `V5__create_friendships_table.sql` creates friend request and friendship relationships
- `V6__create_notifications_table.sql` creates user notifications
- `V7__create_weekly_ai_reports_table.sql` stores one AI analysis per member, game type, and report date
- `V12__create_game_invitations_table.sql` creates friend-to-friend game invitations with expiration and response status
- `V13__create_game_room_tables.sql` creates server-managed game rooms and room participants
- `V14__link_game_invitations_to_game_rooms.sql` links accepted invitations to persisted game rooms
- `V15__add_game_room_live_state.sql` adds versioned live scores, inning, and active-player state
- `V16__link_game_records_to_game_rooms.sql` links automatically generated records to their source room and prevents duplicate records per member
- `V17__create_refresh_tokens_table.sql` stores hashed, rotatable refresh sessions with member and family indexes
- JPA uses `ddl-auto=validate`, so Hibernate validates the schema instead of creating tables
- Flyway records applied migrations in the `flyway_schema_history` table

This keeps DDL changes reviewable in Git and repeatable across local, test, and future deployment environments.

## Local MySQL Setup

Create the local database and user before running the `local` profile:

```sql
CREATE DATABASE billiards CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'billiards'@'localhost' IDENTIFIED BY 'billiards';
GRANT ALL PRIVILEGES ON billiards.* TO 'billiards'@'localhost';
FLUSH PRIVILEGES;
```

If you already have a MySQL user, set these environment variables instead of using the default account:

```powershell
$env:DB_URL="jdbc:mysql://localhost:3306/billiards?serverTimezone=Asia/Seoul&characterEncoding=UTF-8"
$env:DB_USERNAME="your_username"
$env:DB_PASSWORD="your_password"
$env:JWT_SECRET="change-this-to-a-long-random-secret-value"
```

WebSocket ticket issuance also requires Redis. Start only the ephemeral Redis service from the project root before running the backend locally:

```powershell
docker compose up -d redis
```

The default connection is `localhost:6379`; override it with `REDIS_HOST` and `REDIS_PORT` when needed. The `test` profile uses an in-memory ticket store and does not require Redis.

Run the backend locally:

```powershell
.\gradlew.bat bootRun
```

### Local Administrator Demo

There is no public API or default administrator account. For local UI testing only, first sign up with the account you want to use, then set these terminal-only variables and restart the backend:

```powershell
$env:ADMIN_BOOTSTRAP_ENABLED="true"
$env:ADMIN_BOOTSTRAP_EMAIL="your_registered_email@example.com"
.\gradlew.bat bootRun
```

This bootstrap runs only with the `local` profile, is disabled by default, and does not run in the `docker`, `test`, or future production profiles. It contains no password and does not store an email in Git.

## H2 Test Run

Use the `test` profile when you want to run the server without MySQL. This uses an in-memory H2 database and still applies Flyway migrations.

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=test"
```

Run automated tests:

```powershell
.\gradlew.bat test
```

`UserFlowIntegrationTest` verifies one complete API flow in H2: signup, JWT login, profile lookup, game record creation, statistics lookup, and member-to-member game record isolation.

## Docker Run

From the project root, run the full stack:

```powershell
docker compose up --build
```

The backend runs with `SPRING_PROFILES_ACTIVE=docker`, connects to Docker MySQL and ephemeral Redis services, applies Flyway migrations, and serves the API on http://localhost:8080.

## MCP Analysis Tools

The backend includes a Streamable HTTP MCP server for read-only billiards analysis tools.

- The server is disabled by default. Set `MCP_ENABLED=true` to expose it at `http://localhost:8080/mcp`.
- Every MCP request must include the same JWT Bearer token used by the REST APIs.
- The tools resolve the member from the JWT instead of accepting a member ID, so one member cannot request another member's records.
- Available tools: `get_weekly_game_report`, `get_recent_game_statistics`, and `get_opponent_statistics`.
- This module does not call an LLM or configure an AI provider, so it does not require an API key or incur model usage costs.

## Gemini Weekly AI Report

The optional AI report feature generates a Korean-language coaching report from aggregate game statistics only. It does not send member IDs, email addresses, opponent names, notes, or individual game records to Gemini.

- AI chat is disabled by default with `AI_CHAT_MODEL=none`, so starting the backend does not call an AI model.
- `POST /api/ai-reports/weekly?type=3-Cushion` creates a report only when the authenticated user explicitly requests it.
- A report is cached by member, game type, and report date. Repeating the same request returns the stored report without another model call.
- Concurrent duplicate requests are serialized inside one backend process before a report is generated.
- `GET /api/ai-reports/weekly?type=3-Cushion` retrieves today's cached report.
- Without an API key, an AI request returns `503 AI_001`; the rest of the backend continues to work normally.

To enable it locally after creating a Gemini API key, set terminal-only environment variables before starting the backend. Do not put the key in YAML files, React code, or Git.

```powershell
$env:AI_CHAT_MODEL="google-genai"
$env:GEMINI_API_KEY="your_gemini_api_key"
$env:GEMINI_MODEL="gemini-2.5-flash"
.\gradlew.bat bootRun
```

The configured output cap is 350 tokens and no scheduled job invokes the model. Keep the Gemini account on its free tier and do not enable Google Cloud billing unless a later deployment plan explicitly requires it.

## Notice APIs

- `GET /api/notices` and `GET /api/notices/{noticeId}` are public and return notices with important notices first.
- `POST /api/admin/notices`, `PATCH /api/admin/notices/{noticeId}`, and `DELETE /api/admin/notices/{noticeId}` require an `ADMIN` JWT role.
- Deletion is a soft delete: the notice remains in the database with the deletion timestamp and administrator, but public and administrator lists no longer expose it.

## Game Invitation APIs

- `POST /api/game-invitations` creates a 10-minute invitation for an accepted friend only. An optional `gameRoomId` links the invitation to a waiting room hosted by the requester.
- `GET /api/game-invitations` returns the authenticated member's pending incoming and outgoing invitations.
- `PATCH /api/game-invitations/{invitationId}/accept` and `PATCH /api/game-invitations/{invitationId}/decline` can be called only by the receiver.
- A linked invitation validates the host, room status, game type, and capacity. Accepting it adds the receiver as a game room participant.
- Invitation creation and acceptance create `MATCH` notifications through the existing real-time notification flow.
- The service checks the member's current database role again before publishing, editing, or deleting, so a stale administrator token cannot modify notices.

## Game Room APIs

- `POST /api/game-rooms` creates a waiting game room with the authenticated member as its host and first participant.
- `GET /api/game-rooms` returns rooms the authenticated member participates in.
- `GET /api/game-rooms/{roomId}` returns a room only to one of its participants.
- `PATCH /api/game-rooms/{roomId}/cancel` lets only the host cancel a waiting room.
- `PATCH /api/game-rooms/{roomId}/ready` lets a participant set their ready state while the room is waiting.
- `PATCH /api/game-rooms/{roomId}/start` lets only the host start a full room after every participant is ready.
- `GET /api/game-rooms/{roomId}/live-state` returns the versioned scoreboard to room participants.
- `PUT /api/game-rooms/{roomId}/live-state` lets only the host replace the in-progress scoreboard with the expected `stateVersion`.
- `PATCH /api/game-rooms/{roomId}/finish` lets only the host atomically finish the current state version and create one game record per participant.
- A repeated finish request returns the existing completion result without creating duplicate records. Invalid participant or inning data rolls back the entire transaction.
- A stale `stateVersion` returns `409 ROOM_008` instead of overwriting a newer score update.
- `POST /api/game-rooms/{roomId}/websocket-ticket` issues a 30-second, single-use Redis ticket only to a room participant.
- `GET /ws/game-rooms/{roomId}?ticket=...` consumes the room-bound ticket and broadcasts join, ready, start, finish, cancel, and live-state events after database commit.

## Current Stage

The backend currently includes:

- Spring Boot backend package structure
- Common API response wrapper
- Global exception handling
- Validation-ready error format
- CORS configuration for the React frontend
- JPA auditing base entity
- Local/test profile split
- Game record CRUD API
- Frontend API integration support
- Flyway-managed game record schema
- Member signup foundation with BCrypt password hashing
- Login API with JWT access token issuance
- Server-managed refresh token rotation, reuse detection, and logout revocation
- JWT-protected game record APIs scoped to the authenticated member
- JWT-protected member profile/password APIs
- JWT-protected friend list, friend request, and member search APIs
- JWT-protected game invitation APIs with friend-only authorization and expiration handling
- Notification REST APIs and single-use-ticket WebSocket delivery
- Redis-backed game room WebSocket tickets scoped to each room's participants
- Versioned live game state with host-only updates and stale-write conflict detection
- Transactional game-room completion with participant record generation and idempotent retries
- Docker Compose development environment
- JWT-protected MCP analysis tools for AI clients
- Optional Gemini-backed weekly coaching report with aggregate-only data and report caching
- Public and private contact inquiry API with authenticated inquiry creation
- Public notice API with administrator-only publishing and editing
