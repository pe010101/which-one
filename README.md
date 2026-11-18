# WhichOne — Quiz Application

A Spring Boot REST API for creating and taking educational and personality quizzes. 

## Features
- **Authentication:** Stateless JWT (JSON Web Tokens) with BCrypt password hashing.
- **Quizzes:** Create drafts, publish them (making them immutable), and view a public feed.
- **Two Quiz Types:** 
  - *Educational:* Calculates a score based on correct answers and points.
  - *Personality:* Calculates an outcome based on weighted votes.
- **Statistics:** Users can view their attempt history and stats.
- **Database:** PostgreSQL (via Docker) for production, Flyway for migrations. Local H2 for quick testing.
- **API Docs:** Fully documented with Swagger / OpenAPI UI.

## How to Run Locally (Docker)
The easiest way to run the application with a real PostgreSQL database is using Docker.

1. Copy the environment variables:
   cp .env.example .env
2. Open .env and fill in your desired database password and a random 32-byte JWT secret (you can generate one with `openssl rand -hex 32`).
3. Start the application:
   docker compose up --build
4. Open your browser:
   - Web Interface: http://localhost:8080/
   - Swagger API Docs: http://localhost:8080/swagger-ui.html

## How to Run Tests
To run the full test suite (29 tests using an in-memory H2 database):
bash ./mvnw clean verify

## Documentation
To understand how this project was built and the logic behind it, please read the following documents:
- [Project Logic & Theory](docs/THEORY.md) — Explains the math, scoring rules, and business logic.
- [Developer Guide](docs/DEVELOPER-GUIDE.md) — Explains the architecture, security, and API endpoints.
- [Original Course Requirements](docs/materials/homework-2026-10-03/assignments/final-backend-whichone.md)

## Live Deployment
* **Live URL:** [INSERT YOUR LIVE URL HERE]
* **Swagger UI:** [INSERT YOUR SWAGGER URL HERE]