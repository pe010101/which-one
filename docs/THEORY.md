# Project Logic & Design Choices

This document explains the thought process, business logic, and mathematical rules behind the WhichOne application. 

## 1. The Two Types of Quizzes
I designed the app to support two completely different quiz models, which required separate scoring algorithms:
1. **Educational Quizzes:** Designed for testing knowledge.
2. **Personality Quizzes:** Designed for self-discovery (similar to a Myers-Briggs test).

## 2. Educational Scoring Logic
The logic for educational quizzes is strict and objective:
- Each question has a specific point value (from 1 to 10).
- Each question must have exactly **one** correct answer.
- The server calculates the score by summing the points of the questions the user answered correctly.
- **The Math:** If a quiz has 3 questions worth 3, 2, and 1 points (max 6), and the user gets the first two right, their score is 5/6. The percentage is calculated as `(score / maxScore) * 100`.

## 3. Personality Scoring Logic
The logic for personality quizzes is subjective and weighted:
- Each question has multiple options, but **none** are marked as "correct" or "incorrect".
- Instead, every option is linked to a specific "Outcome" (e.g., PLANNER or EXPLORER) and has a weight (e.g., 2 points).
- When a user submits answers, the server adds up the weights for each outcome.
- **The Tie-Breaking Rule:** What happens if the user gets exactly 4 points for PLANNER and 4 points for EXPLORER? I made a strict design choice: **the outcome that was declared first by the quiz author wins.** The code iterates through the outcomes in the exact order the author saved them and uses a strict `>` comparison, ensuring the first one stays the winner in a tie. 

## 4. Statistics & Averages (The Math)
For the user statistics page, I had to make a decision about how to calculate averages without mixing the two quiz types:
- **Educational Average:** I only look at attempts where the user actually received a score (filtering out personality quizzes, where `maxScore` is null). I calculate the percentage for *each* attempt, and then take the average of those percentages. 
  - *Example:* If a user scores 60% on Quiz A and 100% on Quiz B, their average is (60 + 100) / 2 = **80%**.
- **Personality Results:** I do not average these. Instead, I group them by a composite key `quizId:outcomeCode`. This ensures that if two different quizzes both have an outcome called "EXPLORER", the stats don't mix them together. They are counted as separate results.

## 5. Validation Rules (Preventing Bad Data)
I implemented strict server-side validation to ensure data integrity:
- **No Duplicates:** A quiz cannot have two outcomes with the same code (e.g., you can't have two "PLANNER" outcomes).
- **No Mixed Types:** An Educational quiz must have an empty outcomes list. A Personality quiz must have at least two outcomes.
- **No Ambiguity:** In an Educational quiz, if a question has 0 correct answers or 2 correct answers, the server rejects the entire quiz with a `400 Bad Request`.

## 6. Immutability & Ownership Rules
- **Drafts:** When a user creates a quiz, it is a draft. Only the author can see it, update it, or delete it. If a stranger tries to access it, the server returns `404 Not Found` (to prevent them from even knowing the draft exists).
- **Publishing:** Once a quiz is published, it becomes **immutable**. The author can never edit or delete it. 
- **Why?** If a user takes a quiz and gets 100%, and then the author changes the questions or deletes the quiz, the user's history becomes corrupted or meaningless. Publishing locks the quiz in time.

## 7. Security & Data Protection
- **No Client-Side Scoring:** The client (browser) never sends a score. It only sends the selected option IDs. The server looks up the correct answers in the database and calculates the score. This prevents users from hacking the frontend to give themselves a perfect score.
- **Hidden Answers:** When a user fetches a quiz to take it, the API deliberately strips out the `correct` boolean and the `weight` integer. The DTOs (`OptionView`) only contain the text and the ID. A user cannot inspect the network request to find the answers.