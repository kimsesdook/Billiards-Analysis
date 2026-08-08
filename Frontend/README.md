# Billiards Analysis Frontend

React 기반 당구 경기 기록과 분석 화면입니다. Spring Boot API와 JWT 인증으로 연동됩니다.

## Stack

- React 19, TypeScript, Vite 6
- Tailwind CSS 4, React Router, Recharts
- JWT-authenticated WebSocket clients for notifications and game room events
- Host-authoritative live scoreboard sync with version-conflict recovery
- Transactional room completion with final-score flushing and `GAME_FINISHED` participant navigation
- Vitest API contract tests

## Environment

Create `.env.local` from `.env.example` when the backend address differs from the default.

```text
VITE_API_BASE_URL="http://localhost:8080"
```

Only the API base URL belongs in frontend environment files. Gemini API keys are never used or exposed by the frontend.

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

The full project setup, architecture, Docker commands, and backend configuration are documented in the [root README](../README.md).
