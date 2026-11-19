# WhichOne — Quiz Application

WhichOne is a Spring Boot web application where users can create and take quizzes. There are two quiz types: **educational** quizzes, scored by points, and **personality** quizzes ("Which one are you?").

Final project for the Backend Programming course by Polina Emelianova.

- **Live app:** https://which-one-git-whichone.2.rahtiapp.fi/
- **API documentation (Swagger):** https://which-one-git-whichone.2.rahtiapp.fi/swagger-ui.html
- **Demo video:** _add YouTube link here_

## Features

- Register and log in (passwords are hashed with BCrypt, login returns a JWT token)
- Create a quiz as a private draft, edit it, then publish it to the public feed
- Published quizzes can't be changed, so old results always stay correct
- Take quizzes: the server calculates the score, so results can't be faked in the browser
- Correct answers are never sent to the browser
- See your own attempt history and statistics

## Technologies

Java 17, Spring Boot 3.5, Spring Web, Spring Data JPA, Spring Security (JWT), PostgreSQL, H2, Flyway, Swagger (springdoc-openapi), JUnit 5, Docker. Deployed on CSC Rahti with a CSC Pukki PostgreSQL database.

**Learned independently (not covered in lectures):** JWT authentication with OAuth2 Resource Server, Flyway database migrations, Swagger API documentation, Docker, and deployment to CSC Rahti and Pukki.

## Project structure

```text
src/main/java/com/whichone/
├── controller/   REST endpoints (auth, quizzes, my results)
├── service/      business logic (quiz rules, scoring, statistics)
├── repository/   database access with Spring Data JPA
├── domain/       JPA entities (users, quizzes, questions, attempts)
├── dto/          request and response objects
├── security/     Spring Security and JWT settings
├── exception/    error handling
└── config/       Swagger settings
```

## Running locally

You need JDK 17 or newer. Maven is included (`mvnw`).

```bash
./mvnw spring-boot:run
```

On Windows use `.\mvnw.cmd spring-boot:run`. Then open http://localhost:8080/.

Locally the app uses an H2 database, so nothing else needs to be installed. To run it with PostgreSQL instead, copy `.env.example` to `.env`, fill in the values and run `docker compose up --build`.

**Quick try:** register a user, click **Seed test data**, open **Java Basics**, choose `4` and `table`. The result is 3 / 5 points (60%).

## Tests

```bash
./mvnw clean verify
```

There are 29 tests: unit tests for the scoring logic and integration tests for the API (registration, login, permissions, publishing, scoring and hidden answers).

## Documentation

- [Developer guide](docs/DEVELOPER-GUIDE.md): architecture, security, API and deployment
- [Theory](docs/THEORY.md): scoring rules and design decisions
- [Demo walkthrough](docs/DEMO.md): what the demo video shows, with explanations
- [Course requirements](docs/REQUIREMENTS.md)
