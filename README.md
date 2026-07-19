# Billiards Project

Full-stack billiards analytics project with a Spring Boot backend, React frontend, MySQL, Flyway migrations, JWT authentication, friend APIs, notifications, and realtime WebSocket notifications.

## Docker Quick Start

Run the full local stack from the project root:

```powershell
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Backend health check: http://localhost:8080/actuator/health
- MySQL host port: `localhost:13306`

Docker service layout:

- `mysql`: MySQL 8.4 database with a persistent Docker volume
- `backend`: Spring Boot API running with the `docker` profile
- `frontend`: Vite production build served by Nginx

Stop containers:

```powershell
docker compose down
```

Stop containers and remove the MySQL volume:

```powershell
docker compose down -v
```

## Docker Database

The compose stack creates this database account automatically:

```text
database: billiards
username: billiards
password: billiards
root password: root
```

From your host machine, connect to Docker MySQL with:

```text
host: localhost
port: 13306
database: billiards
```

The backend applies Flyway migrations on startup and validates the schema with Hibernate.

## Local Development Without Docker

Backend:

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

Automated checks:

```powershell
cd Backend
.\gradlew.bat test
```

```powershell
cd Frontend
npm run lint
npm run build
```
