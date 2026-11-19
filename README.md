# WhichOne — Quiz Application
 
WhichOne is a Spring Boot web application for creating and taking quizzes. Users can register, write their own **educational** quizzes (scored by points) or **personality** quizzes ("Which one are you?"), publish them to a public feed, take other people's quizzes, and track their own results.
 
Final project for the Backend Programming course.
 
| | |
|---|---|
| **Live app** | https://which-one-git-whichone.2.rahtiapp.fi/ |
| **API documentation (Swagger)** | https://which-one-git-whichone.2.rahtiapp.fi/swagger-ui.html |
| **Demo video** | _add your YouTube link here_ |
 
 
---
 
## Features
 
- **Register and sign in** with a username and password. Passwords are stored as BCrypt hashes, and the server issues a JWT token after sign-in.
- **Two quiz types**:
  - *Educational*: each question has exactly one correct answer and is worth 1–10 points. The result is a score, for example 3 / 5.
  - *Personality*: each answer gives weighted points to an outcome (for example PLANNER or EXPLORER). The outcome with the most points wins.
- **Drafts and publishing**: a new quiz starts as a private draft that only its author can see, edit or delete. Publishing makes it public and **permanent**, so nobody's saved results can change later.
- **Server-side scoring**: the browser only sends the IDs of the chosen answers. The server looks up the correct answers and calculates the result, so results can't be faked from the browser.
- **Hidden answers**: when a quiz is opened, the API sends only question and option texts, never which answer is correct.
- **Personal results**: attempt history and statistics (average and best percentage, personality outcome counts).
- **Feed management**: authors can remove their published quizzes from the feed. Saved attempts are kept.
- **Demo data**: the "Seed test data" button adds two example quizzes.
## Technologies
 
| Area | Used |
|---|---|
| Language / framework | Java 17, Spring Boot 3.5 |
| Web / REST | Spring Web, Bean Validation, Spring Data JPA |
| Security | Spring Security, OAuth2 Resource Server (JWT), BCrypt |
| Database | PostgreSQL (production, CSC Pukki), H2 (local development and tests) |
| Database migrations | Flyway |
| API documentation | springdoc-openapi (Swagger UI) |
| Frontend | Plain HTML, CSS and JavaScript (served by Spring Boot) |
| Testing | JUnit 5, Spring Boot Test, MockMvc |
| Deployment | Docker, CSC Rahti (OpenShift) |
 
## Course requirements
 
| Requirement | Where it is in this project |
|---|---|
| New project from Spring Initializr | See [How the project was created](#how-the-project-was-created) |
| Recommended package structure | `controller`, `service`, `repository`, `domain`, `dto`, `security`, `exception`, `config` |
| Database connection | H2 locally, **PostgreSQL** in production |
| Authentication | Register and log in with JWT tokens and BCrypt password hashing |
| Multiple test cases | 29 JUnit tests (24 API integration tests and 5 scoring unit tests) |
| RESTful service | JSON REST API under `/api/...`, documented with Swagger |
| Deployed to the internet | CSC Rahti + CSC Pukki PostgreSQL (links above) |
| Things learned independently (not covered in lectures) | JWT with OAuth2 Resource Server, Flyway migrations, OpenAPI/Swagger, Docker and Docker Compose, deployment to Rahti, RFC 7807 `ProblemDetail` error responses, database locking (`@Lock`, `@Version`) |
 
## How it works
 
Every request goes through the same layers:
 
```text
Browser / Swagger  ──HTTP + Bearer JWT──►  Spring Security  (checks token signature, issuer, audience, expiry)
                                                 │
                                                 ▼
                                           Controller  (URL mapping, reads request DTO, @Valid)
                                                 │
                                                 ▼
                                           Service     (business rules: ownership, drafts, scoring)
                                                 │
                                                 ▼
                                           Repository  (Spring Data JPA queries)
                                                 │
                                                 ▼
                                           Database    (tables created by Flyway)
```
 
The response goes back as a **DTO** (a Java record), never as a database entity, so private fields such as password hashes or correct answers can't leak.
 
| Package | What it does |
|---|---|
| `controller` | `AuthController` (register, login), `QuizController` (quizzes and attempts), `MeController` (your own profile, history and statistics) |
| `service` | `AuthService`, `QuizService` (validation, drafts, publishing), `AttemptService` (checks answers, saves attempts, statistics), `ScoringService` (pure scoring math) |
| `repository` | Spring Data JPA interfaces for users, quizzes and attempts |
| `domain` | JPA entities: `AppUser`, `Quiz`, `Question`, `AnswerOption`, `PersonalityOutcome`, `QuizAttempt`, `AttemptAnswer` |
| `dto` | Request and response records (`ApiDtos`) |
| `security` | Security rules, JWT creation (`TokenService`) and JSON error responses for 401/403 |
| `exception` | `ApiException` and a global handler that returns clean error JSON (400/403/404/409) |
| `config` | Swagger / OpenAPI settings |
 
The scoring rules, validation rules and design decisions are explained in [docs/THEORY.md](docs/THEORY.md).
 
## Running locally
 
**Requirements:** JDK 17 or newer. Maven doesn't need to be installed, because the project includes the Maven Wrapper (`mvnw`).
 
### Option 1: quick start with H2 (no database installation)
 
macOS / Linux:
 
```bash
./mvnw spring-boot:run
```
 
Windows PowerShell:
 
```powershell
.\mvnw.cmd spring-boot:run
```
 
Then open http://localhost:8080/. The data is saved in a local H2 file in the `data/` folder.
 
### Option 2: with PostgreSQL using Docker Compose
 
```bash
cp .env.example .env      # then edit .env: set a database password and a JWT secret
docker compose up --build
```
 
You can generate a JWT secret with `openssl rand -hex 32`.
 
### Try it in one minute
 
1. Register a new user (username 3–30 letters/digits/_, password at least 10 characters).
2. Click **Seed test data**. Two example quizzes appear in the feed.
3. Open **Java Basics**, choose `4` and `table`, and submit. The first question is worth 3 points and the second 2, so the result is **3 / 5 (60%)**.
4. Open **How do you learn?** and choose one "plan" answer and one "experiment" answer. Both outcomes get 2 points. On a tie the first declared outcome wins, so the result is **Planner**.
5. Click **Statistics** to see your saved results.
To create your own quiz, click **Educational template** or **Personality template**, edit the JSON, click **Create draft**, then **Publish permanently**. More examples are in the [`examples/`](examples) folder.
 
## Tests
 
```bash
./mvnw clean verify
```
 
This runs 29 tests against an in-memory H2 database:
 
- `ScoringServiceTest`: unit tests for the educational score and the personality tie-break rule.
- `WhichOneApiTest`: integration tests that call the real API, for example: registration stores a BCrypt hash, users can't edit other people's quizzes, published quizzes can't be changed, an answer from another question is rejected, and quiz responses don't reveal correct answers.
There is also a small JavaScript test for the web page (requires Node.js):
 
```bash
node scripts/ui-regression.cjs
```
 
## Deployment (CSC Rahti + Pukki)
 
The application runs as a Docker container on **CSC Rahti** (OpenShift). The container is built from the `Dockerfile` in this repository. The database is a PostgreSQL instance on **CSC Pukki** (Database-as-a-Service).
 
The deployment uses the `rahti` Spring profile (`application-rahti.properties`) and these environment variables:
 
| Variable | Meaning |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `rahti` |
| `POSTGRESQL_SERVICE_HOST` / `POSTGRESQL_SERVICE_PORT` | Public IP and port of the Pukki database |
| `DB_NAME` | Database name |
| `DB_USER` / `DB_PASSWORD` | Database credentials (stored in an OpenShift Secret) |
| `JWT_SECRET` | Random secret, at least 32 characters, for signing tokens (stored in a Secret) |
 
Pukki only accepts connections from allowed IP addresses, so Rahti's outgoing IP address is added to the database's allowed CIDRs. Real secrets are never committed to GitHub.
 
## API overview
 
Full interactive documentation is in Swagger. The main endpoints:
 
| Method | Endpoint | Description | Login needed |
|---|---|---|---|
| POST | `/api/auth/register` | Create an account and get a token | no |
| POST | `/api/auth/login` | Log in and get a token | no |
| GET | `/api/quizzes` | Public feed of published quizzes | no |
| GET | `/api/quizzes/{id}` | Get a quiz (without correct answers) | no |
| POST | `/api/quizzes` | Create a draft | yes |
| PUT | `/api/quizzes/{id}` | Replace your draft | yes (author) |
| POST | `/api/quizzes/{id}/publish` | Publish your draft permanently | yes (author) |
| DELETE | `/api/quizzes/{id}` | Delete your draft | yes (author) |
| POST | `/api/quizzes/{id}/attempts` | Submit answers and get the result | yes |
| GET | `/api/me/attempts` | Your attempt history | yes |
| GET | `/api/me/statistics` | Your statistics | yes |
 
In Swagger, use **Authorize** and paste the `accessToken` from the register or login response.
 
## How the project was created
 
The project skeleton was generated with [Spring Initializr](https://start.spring.io/) (Maven, Java, dependencies: Web, Data JPA, Validation, Security, OAuth2 Resource Server, H2, PostgreSQL, Flyway). Initializr only offered Spring Boot 4, so the generated `pom.xml` was changed to Spring Boot 3.5 / Java 17 to match the course environment, and springdoc-openapi was added. All application classes, the database schema, the tests and the web page were written for this project. Nothing was copied from the Bookstore exercise.
 
## Known limitations
 
- No password reset, no refresh tokens, and no way to cancel a token before it expires (tokens are valid for 1 hour).
- The token is kept only in the page's memory, so refreshing the page signs you out.
- No pagination in the quiz feed.
- Quizzes are created by editing JSON in the browser instead of a form.
## Documentation
 
- [docs/THEORY.md](docs/THEORY.md): scoring math, validation rules and design decisions
- [docs/DEVELOPER-GUIDE.md](docs/DEVELOPER-GUIDE.md): architecture, security and a demo walkthrough
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md): the original course requirements
## Author
 
Polina Emelianova
 