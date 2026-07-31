# Billiards Backend

This backend is designed as a modular monolith first. The package boundaries are intentionally separated so that high-change domains can later move toward event-driven or microservice-style modules without rewriting the whole application.

## Package Map

- `common`: shared API response, exception handling, and base entity support
- `config`: application-wide configuration such as CORS, properties, and JPA auditing
- `auth`: authentication and token lifecycle
- `member`: member profile, account, and security preferences
- `game`: game records, match rooms, scoring, and analysis
- `friend`: friend relationships, requests, and rival search
- `notification`: notifications and future event delivery
- `notice`: public announcements
- `contact`: user inquiries and support board

## Profiles

- `local`: MySQL-based local development profile
- `docker`: MySQL-based Docker Compose profile
- `test`: H2-based test profile for fast context and repository tests

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

Run the backend locally:

```powershell
.\gradlew.bat bootRun
```

## H2 Test Run

Use the `test` profile when you want to run the server without MySQL. This uses an in-memory H2 database and still applies Flyway migrations.

```powershell
.\gradlew.bat bootRun --args="--spring.profiles.active=test"
```

Run automated tests:

```powershell
.\gradlew.bat test
```

## Docker Run

From the project root, run the full stack:

```powershell
docker compose up --build
```

The backend runs with `SPRING_PROFILES_ACTIVE=docker`, connects to the Docker MySQL service, applies Flyway migrations, and serves the API on http://localhost:8080.

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
- JWT-protected game record APIs scoped to the authenticated member
- JWT-protected member profile/password APIs
- JWT-protected friend list, friend request, and member search APIs
- Notification REST APIs and realtime WebSocket delivery
- Docker Compose development environment
- JWT-protected MCP analysis tools for AI clients
- Optional Gemini-backed weekly coaching report with aggregate-only data and report caching
