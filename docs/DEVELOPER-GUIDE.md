# WhichOne Developer Guide

This document explains how the WhichOne application is built: its architecture, security, API and deployment.

## 1. Architecture

The application uses the standard Spring Boot layered architecture. Every request goes through the same layers:

```text
Browser / Swagger  ──HTTP + JWT token──►  Spring Security  (checks the token)
                                                │
                                                ▼
                                          Controller  (URL mapping, reads and validates the request)
                                                │
                                                ▼
                                          Service     (business rules: ownership, drafts, scoring)
                                                │
                                                ▼
                                          Repository  (database queries with Spring Data JPA)
                                                │
                                                ▼
                                          Database    (tables created by Flyway)
```

| Package | What it does |
|---|---|
| `controller` | `AuthController` (register, login), `QuizController` (quizzes and attempts), `MeController` (your own profile, history and statistics) |
| `service` | `AuthService`, `QuizService` (validation, drafts, publishing), `AttemptService` (checks answers, saves attempts, statistics), `ScoringService` (scoring math) |
| `repository` | Spring Data JPA interfaces for users, quizzes and attempts |
| `domain` | JPA entities: `AppUser`, `Quiz`, `Question`, `AnswerOption`, `PersonalityOutcome`, `QuizAttempt`, `AttemptAnswer` |
| `dto` | Java records for requests and responses (`ApiDtos`) |
| `security` | Security rules, JWT token creation and JSON error responses for 401/403 |
| `exception` | `ApiException` and a global error handler |
| `config` | Swagger / OpenAPI settings |

**Entities are never returned directly.** The API always answers with DTOs, so fields such as password hashes or correct answers can't leak.

## 2. Security and authentication

The application is stateless and uses **JWT (JSON Web Tokens)**.

- **Password hashing:** passwords are stored as BCrypt hashes (`BCryptPasswordEncoder`), never as plain text.
- **Token creation:** after register or login, `TokenService` creates a signed JWT (HS256). It contains the username, the issuer (`whichone`), the audience (`whichone-api`) and an expiry time of 1 hour.
- **Token checking:** `SecurityConfig` sets up a `JwtDecoder` that checks the signature, issuer, audience and expiry of every token.
- **Access rules:** the web page, Swagger, register/login and reading published quizzes are public. Everything else needs a valid token.
- **Ownership:** only the author of a quiz can edit, publish or delete it. The author is always taken from the token, never from the request body.
- **Roles:** there are no admin roles. Every user can create and take quizzes.

## 3. Business rules

- **Drafts vs. published:** a quiz starts as a draft that only its author can see, edit or delete.
- **Published quizzes can't be changed.** Otherwise, changing a correct answer would silently change the meaning of saved results. To change a published quiz, create a new one.
- **Server-side scoring:** the browser only sends the IDs of the chosen answers. The server calculates the score.
  - *Educational:* the points of the correctly answered questions are added up. Example: 3 points + 0 points = 3 / 5 = 60%.
  - *Personality:* the weights of the chosen answers are added up per outcome, and the highest total wins.
- **Tie-breaking:** if two personality outcomes have the same total, the outcome declared first by the author wins. This is a fixed rule, not random.
- **Removing from the feed:** an author can remove a published quiz from the feed. Saved attempts of other users are kept.

## 4. Technical details

- **Global error handling:** `ApiExceptionHandler` (`@RestControllerAdvice`) catches errors and returns clean `ProblemDetail` JSON responses (400, 403, 404, 409) instead of stack traces.
- **Flyway migrations:** the database tables are created by SQL files in `src/main/resources/db/migration/`. Hibernate is set to `validate`, so the app refuses to start if the Java entities don't match the tables.
- **Hidden answers:** when someone opens a quiz to take it, each option is sent as an `OptionView` record with only `id` and `text`. The `correct` flag and personality weights stay on the server, so nobody can cheat by looking at the network traffic.
- **Database locking:** when a draft is edited, published or deleted, the quiz row is locked with `@Lock(PESSIMISTIC_WRITE)`, so two requests can't change the same quiz at the same time. The `@Version` field on `Quiz` adds an extra check against lost updates.
- **One transaction per attempt:** checking the answers, calculating the result and saving the attempt happen in one `@Transactional` method. If one answer is invalid, nothing is saved.

## 5. Database

| Environment | Database |
|---|---|
| Local development | H2 file database in `data/` (no installation needed) |
| Tests | H2 in-memory database |
| Docker Compose | PostgreSQL 16 container |
| Production | PostgreSQL on CSC Pukki |

## 6. API overview

The full interactive documentation is in Swagger at `/swagger-ui.html`. To call protected endpoints there, click **Authorize** and paste the `accessToken` from the register or login response.

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

## 7. Tests

`./mvnw clean verify` runs 29 tests on an in-memory H2 database:

- `ScoringServiceTest` (5 unit tests): educational scoring and the personality tie-break rule.
- `WhichOneApiTest` (24 integration tests): calls the real API with real tokens. For example: passwords are stored as BCrypt hashes, other users can't edit your quiz, published quizzes can't be changed, an answer from another question is rejected, fake or expired tokens are rejected, and correct answers are never returned.

## 8. Deployment (CSC Rahti + Pukki)

The app runs as a Docker container on **CSC Rahti** (OpenShift), built from the `Dockerfile` in this repository. The database is a PostgreSQL instance on **CSC Pukki**.

The deployment uses the `rahti` Spring profile (`application-rahti.properties`) and these environment variables:

| Variable | Meaning |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `rahti` |
| `POSTGRESQL_SERVICE_HOST` / `POSTGRESQL_SERVICE_PORT` | Public IP address and port of the Pukki database |
| `DB_NAME` | Database name |
| `DB_USER` / `DB_PASSWORD` | Database username and password (stored in an OpenShift Secret) |
| `JWT_SECRET` | Random secret of at least 32 characters for signing tokens |

Pukki only accepts connections from allowed IP addresses, so Rahti's outgoing IP address is added to the database's allowed list. Real passwords and secrets are never committed to GitHub.

## 9. How the project was created

The project skeleton was generated with [Spring Initializr](https://start.spring.io/) (Maven, Java, with Web, Data JPA, Validation, Security, OAuth2 Resource Server, H2, PostgreSQL and Flyway). Initializr only offered Spring Boot 4, so `pom.xml` was changed to Spring Boot 3.5 / Java 17 to match the course, and springdoc-openapi was added for Swagger. Nothing was copied from the Bookstore exercise.

## 10. Known limitations

- No password reset and no refresh tokens. A token is valid for 1 hour.
- The token is only kept in the page's memory, so refreshing the page logs you out.
- No pagination in the quiz feed.
- Quizzes are created by editing JSON instead of a form.
