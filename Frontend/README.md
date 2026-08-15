# Billiards Analysis Frontend

React 기반 당구 경기 기록과 분석 화면입니다. Spring Boot API와 JWT 인증으로 연동됩니다.

## Stack

- React 19, TypeScript, Vite 6
- Tailwind CSS 4, React Router, Recharts
- Redis-backed, single-use WebSocket ticket clients for notifications and game room events
- Host-authoritative live scoreboard sync with version-conflict recovery
- Transactional room completion with final-score flushing and `GAME_FINISHED` participant navigation
- Vitest API contract tests

## Environment

Create `.env.local` from `.env.example` when the backend address differs from the default.

```text
VITE_API_BASE_URL="http://localhost:8080"
```

Only the API base URL belongs in frontend environment files. Gemini API keys are never used or exposed by the frontend.

## Authentication Session

- Access tokens are kept in memory and are never written to `localStorage`.
- The backend refresh cookie is `HttpOnly`; browser requests include it with `credentials: include`, but frontend JavaScript cannot read it.
- A non-secret `billiards_has_refresh_session` hint decides whether startup session restoration is needed.
- A protected API `401` triggers one shared refresh request, then retries the original request once with the new access token.
- Concurrent `401` responses share the same refresh promise to avoid refresh-token reuse detection.
- Logout revokes the backend session before clearing frontend authentication state.
- WebSocket clients request a 30-second ticket through the authenticated REST API before every connection and reconnection, so access tokens never appear in WebSocket URLs.

## Account Settings

- `AccountSettingsModal` owns profile and password form state instead of adding those responsibilities to the application shell.
- Automatic handicap calculation is a pure, unit-tested domain function in `src/lib/handicap.ts`.
- The settings UI exposes only server-backed account operations. Device-session management, account deletion, and nickname availability are not shown until matching backend APIs exist.
- Deterministic record-based handicap calculation is labeled separately from the optional Gemini coaching report.

## Game Room UI

- `GameRoomCreateForm` owns the room creation controls while `CreateGamePage` coordinates API calls and screen transitions.
- `GameRoomLobby` renders participants, invitations, room events, and ready/start controls while realtime requests remain in the parent coordinator.
- Lobby participants, friends, and event logs use explicit TypeScript models instead of `any[]` state.
- Team assignments follow the shared server participant order; local-only team movement is not exposed as though it were synchronized.
- Player capacity and four-ball finish rules use explicit union types instead of unchecked numeric casts.
- Live-scoreboard extraction remains a separate change so scoring behavior stays independently testable.

## Commands

```powershell
npm install
npm run dev
```

```powershell
npm run test
npm run lint
npm run build
```

## End-to-End Tests

Start the full stack from the repository root, then run Playwright from `Frontend`.

```powershell
docker compose up -d --build
cd Frontend
npm run test:e2e
```

Local E2E uses the installed Chrome channel, so it does not download another browser. Set `PLAYWRIGHT_CHANNEL` to another installed Playwright channel when needed. CI installs an isolated Chromium build, starts MySQL, the backend, and the frontend with Docker Compose, verifies cookie-based session restoration after a page reload, and retains failure traces and screenshots for seven days.

The full project setup, architecture, Docker commands, and backend configuration are documented in the [root README](../README.md).
