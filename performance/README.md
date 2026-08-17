# Performance Tests

The k6 suite exercises an authenticated user flow against a disposable local or CI stack:

1. Sign up one isolated account per virtual user
2. Log in and obtain a JWT access token
3. Create a game record
4. Read paginated records, statistics, and the weekly report in parallel

The test never calls Gemini, requires no API key, and uses only k6 OSS. Test accounts and game records are created in the target database, so do not point this script at production.

## Profiles

- `smoke`: two virtual users execute five iterations each; used as a short CI regression gate with enough samples to reduce p95 noise
- `load`: ramps to 10 virtual users, holds for 30 seconds, and ramps down

The load profile can be adjusted with `K6_TARGET_VUS`, `K6_RAMP_UP`, `K6_STEADY`, and `K6_RAMP_DOWN`.

## Quality Gates

- Failed HTTP requests: below 1%
- Failed business flow checks: below 1%
- Authentication p95: below 2,000 ms
- Game record write p95: below 800 ms
- Game record read p95: below 500 ms
- End-to-end game record flow p95: below 1,500 ms

k6 exits with a non-zero status when any threshold fails, making performance regressions visible in CI.
These values are regression budgets for the Dockerized project stack, not a production SLA. Recalibrate them with representative infrastructure and traffic before a production launch.

## Run Locally With Docker

Stop the regular development stack first, then start an isolated performance stack from the project root. The separate Compose project name gives the test its own MySQL volume:

```powershell
docker compose -p billiards-perf up -d --build mysql redis backend
```

After `http://localhost:8080/actuator/health/readiness` reports `UP`, run the load profile on the Compose network:

```powershell
docker run --rm --network billiards-perf_default `
  -e BASE_URL=http://backend:8080 `
  -e K6_PROFILE=load `
  -v "${PWD}/performance:/scripts:ro" `
  grafana/k6:2.1.0 run /scripts/game-record-flow.js
```

Use `K6_PROFILE=smoke` for the short profile. No Grafana Cloud account or token is used.

Remove the disposable database and Redis state after testing:

```powershell
docker compose -p billiards-perf down --volumes --remove-orphans
```
