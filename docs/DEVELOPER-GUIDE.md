# WhichOne Developer Guide

This document explains the architecture, security model, and technical logic of the WhichOne application.

## 1. Architecture & Layers
The application follows a standard Spring Boot layered architecture:
- **Controllers (`com.whichone.controller`):** Handle HTTP requests, validate input, and return HTTP responses.
- **Services (`com.whichone.service`):** Contain the business logic (scoring, ownership validation, quiz immutability).
- **Repositories (`com.whichone.repository`):** Spring Data JPA interfaces for database access.
- **Entities (`com.whichone.domain`):** JPA classes mapped to PostgreSQL tables.
- **DTOs (`com.whichone.dto`):** Java Records used for incoming requests and outgoing responses. **Entities are never returned directly** to prevent data leaks.

## 2. Security & Authentication
The application is stateless and uses **JWT (JSON Web Tokens)**.
- **Password Hashing:** Passwords are hashed using `BCryptPasswordEncoder`.
- **Token Generation:** When a user logs in, `TokenService` generates an HS256 signed JWT containing the username as the subject, the issuer (`whichone`), and the audience (`whichone-api`).
- **Token Validation:** The `SecurityConfig` configures a `JwtDecoder` that validates the signature, issuer, and audience.
- **Roles:** There are no roles. Every registered user is an ordinary user who can create quizzes and take quizzes.

## 3. Business Logic Rules
- **Drafts vs. Published:** Quizzes are created as drafts. A draft can be updated or deleted by its author. 
- **Immutability:** Once a quiz is published, it cannot be modified or deleted. This ensures that users' attempt history remains valid and unbroken.
- **Server-Side Scoring:** The client never sends a score. The server calculates educational scores based on correct options and points, and personality outcomes based on weighted votes.
- **Tie-breaking:** In personality quizzes, if two outcomes have the same total weight, the first outcome declared in the author's list wins.

## 4. Technical Deep Dive (What makes this project unique)
This project uses several advanced Spring Boot features that go beyond basic CRUD operations:

- **Optimistic & Pessimistic Locking:** When a user publishes a quiz, the database uses `@Lock(LockModeType.PESSIMISTIC_WRITE)` to prevent race conditions. If two requests try to edit a draft at the exact same time, the `@Version` field (optimistic locking) throws an error, ensuring data integrity.
- **Global Exception Handling:** Instead of returning messy stack traces, the `ApiExceptionHandler` (using `@RestControllerAdvice`) catches errors and returns clean, standardized RFC 7807 `ProblemDetail` JSON responses (e.g., 400 Bad Request, 403 Forbidden, 409 Conflict).
- **Flyway Migrations:** The database schema is strictly version-controlled. Hibernate is set to `validate`, meaning it will refuse to start if the Java Entities do not perfectly match the SQL schema created by Flyway.
- **Data Transfer Objects (DTOs):** The API deliberately strips sensitive data. For example, when fetching a quiz to take it, the `OptionView` record only contains the option text and ID. It completely hides the `correct` boolean and the personality `weight`, so a user cannot cheat by inspecting the network request.

## 5. Database & Migrations
- **Production:** PostgreSQL 16 (via Docker Compose).
- **Local:** H2 file-based database (requires no installation).
- **Migrations:** Flyway manages the database schema in `src/main/resources/db/migration/V1__initial_schema.sql`.

## 6. API Overview
The full API is documented via Swagger at `/swagger-ui.html`. 

### Auth
- `POST /api/auth/register` — Create an account.
- `POST /api/auth/login` — Get a JWT.

### Quizzes
- `GET /api/quizzes` — Public feed of published quizzes.
- `POST /api/quizzes` — Create a draft (requires JWT).
- `PUT /api/quizzes/{id}` — Replace a draft (requires JWT, author only).
- `POST /api/quizzes/{id}/publish` — Publish a quiz (requires JWT, author only).
- `DELETE /api/quizzes/{id}` — Delete a draft (requires JWT, author only).

### Attempts & Stats
- `POST /api/quizzes/{id}/attempts` — Submit answers (requires JWT).
- `GET /api/me/attempts` — View your history (requires JWT).
- `GET /api/me/statistics` — View your stats (requires JWT).

## 7. Demo Walkthrough (For Presentation)
If you are demonstrating this project, follow these steps to show the core functionality:

1. **Start the app:** Run `docker compose up --build` and open `http://localhost:8080/`.
2. **Register:** Create a new user (e.g., `demo_user` / `password12345`).
3. **Create a Quiz (Draft):** Scroll to section 4, click "Educational template", and click "Create draft". Note the Draft ID.
4. **Edit a Draft:** Change the title in the JSON, enter the Draft ID, and click "Replace draft". Show that it updates.
5. **Publish:** Click "Publish permanently". (Point out that after this, the quiz is immutable).
6. **Take the Quiz:** Scroll to the feed, open your new quiz, select the correct answers, and submit. Show the calculated score.
7. **View Stats:** Click "Statistics" and "History" to show the saved attempt.
8. **Security Demo:** Click "Sign out", log in as a different user, and try to delete or edit the first user's quiz. (Show that the API returns `403 Forbidden` or `404 Not Found`).
9. **Swagger:** Open `http://localhost:8080/swagger-ui.html` to show the API documentation.