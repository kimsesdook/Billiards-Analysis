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
- `test`: H2-based test profile for fast context and repository tests

## Current Stage

Stage 1 focuses on the foundation only:

- Spring Boot backend package structure
- Common API response wrapper
- Global exception handling
- Validation-ready error format
- CORS configuration for the React frontend
- JPA auditing base entity
- Local/test profile split
