"use strict";

// The demo keeps a token in memory only. No passwords or tokens go to localStorage.
let token = "";
let username = "";
let currentQuiz = null;
let authEpoch = 0;
let showingMine = false;
let feedRequest = 0;
let feedBusy = false;
let ownPublished = false;
let cardDeleteButtons = [];
class StaleResponseError extends Error { }
function checkEpoch(epoch) {
  if (epoch !== authEpoch) throw new StaleResponseError();
}
const byId = id => document.getElementById(id);
const protectedButtons = ["statistics", "history", "mine", "create-draft",
  "update-draft", "publish-draft", "delete-draft", "submit-attempt"];

function showStatus(message, error = false) {
  byId("status").textContent = message;
  byId("status").dataset.error = String(error);
}

function showFeedStatus(message, error = false) {
  byId("feed-status").textContent = message;
  byId("feed-status").dataset.error = String(error);
}

function updateFeedButtons() {
  byId("seed").disabled = !token || feedBusy;
  byId("delete-all").disabled = !token || !ownPublished || feedBusy;
  cardDeleteButtons.forEach(button => { button.disabled = feedBusy; });
}

function closeQuiz() {
  currentQuiz = null;
  byId("questions").replaceChildren();
  byId("play-panel").hidden = true;
  byId("quiz-title").textContent = "";
  byId("quiz-description").textContent = "";
  byId("result").textContent = "";
  byId("submit-attempt").disabled = true;
}

function setAccount(auth = null) {
  authEpoch++;
  token = auth ? auth.accessToken : "";
  username = auth ? auth.user.username : "";
  showingMine = false;
  feedBusy = false;
  ownPublished = false;
  cardDeleteButtons = [];
  byId("feed").replaceChildren();
  closeQuiz();
  showFeedStatus("");
  byId("feed-note").textContent = auth
    ? "Deleting from the feed preserves attempt history."
    : "Log in to add examples or delete your quizzes from the feed.";
  updateFeedButtons();
  byId("draft-id").value = "";
  fillEditor(educationalTemplate());
  byId("personal-output").textContent = "Request the current account's results.";
  showStatus(auth ? "Account switched. Loading the shared feed." : "Page session ended.");
  byId("password").value = "";
  byId("username").value = auth ? auth.user.username : "";
  byId("account").textContent = auth ? "Signed in as: " + auth.user.username : "Not signed in yet.";
  byId("logout").hidden = !auth;
  protectedButtons.forEach(id => { byId(id).disabled = !auth; });
  byId("submit-attempt").disabled = !auth || !currentQuiz || !currentQuiz.published;
  if (!auth) {
    byId("password").value = "";
    byId("personal-output").textContent = "Log in to see your results.";
    byId("result").textContent = "";
  }
  // Clear private DOM immediately, then fetch only the current account's public feed.
  action(refreshFeed);
}

async function api(path, method = "GET", body = undefined, epoch = authEpoch) {
  checkEpoch(epoch);
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = response.status === 204 ? null : await response.json();
  // A late Alice response must not render data or log Bob out after an account switch.
  checkEpoch(epoch);
  if (!response.ok) {
    if (response.status === 401 && token) {
      setAccount(null);
      showStatus("Session expired. Please log in again.", true);
    }
    const fields = data.errors ? " " + JSON.stringify(data.errors) : "";
    throw new Error("HTTP " + response.status + ": " + (data.detail || "Request rejected.") + fields);
  }
  return data;
}

async function action(work, reportError = showStatus) {
  const epoch = authEpoch;
  try { await work(epoch); } catch (error) {
    if (!(error instanceof StaleResponseError) && epoch === authEpoch) reportError(error.message, true);
  }
}

const educationalTemplate = () => ({
  title: "Java Basics",
  description: "Two questions. Maximum — 5 points.",
  type: "EDUCATIONAL", outcomes: [],
  questions: [
    {
      text: "What is 2 + 2?", points: 3, options: [
        { text: "4", correct: true, weight: 0 }, { text: "5", correct: false, weight: 0 }
      ]
    },
    {
      text: "Which keyword declares a class?", points: 2, options: [
        { text: "class", correct: true, weight: 0 }, { text: "table", correct: false, weight: 0 }
      ]
    }
  ]
});

const personalityTemplate = () => ({
  title: "How do you learn?",
  description: "Educational example with two outcomes. In a tie, the first declared outcome wins.",
  type: "PERSONALITY",
  outcomes: [
    { code: "PLANNER", label: "Planner", description: "You like to make a plan first." },
    { code: "EXPLORER", label: "Explorer", description: "You like to explore through practice." }
  ],
  questions: [
    {
      text: "How do you start a new topic?", points: 0, options: [
        { text: "I make a plan", correct: false, outcomeCode: "PLANNER", weight: 2 },
        { text: "I try an example", correct: false, outcomeCode: "EXPLORER", weight: 2 }
      ]
    },
    {
      text: "How do you prefer to reinforce knowledge?", points: 0, options: [
        { text: "On a schedule", correct: false, outcomeCode: "PLANNER", weight: 2 },
        { text: "Through experiments", correct: false, outcomeCode: "EXPLORER", weight: 2 }
      ]
    }
  ]
});

function fillEditor(definition) { byId("definition").value = JSON.stringify(definition, null, 2); }

function element(tag, text, className) {
  const item = document.createElement(tag);
  if (text !== undefined) item.textContent = text;
  if (className) item.className = className;
  return item;
}

function quizCards(quizzes, target, isMine = false) {
  target.replaceChildren();
  cardDeleteButtons = [];
  ownPublished = quizzes.some(quiz => quiz.published && quiz.author === username);
  if (!quizzes.length) { target.append(element("p", "No quizzes yet. Create your own or add test data.")); }
  for (const quiz of quizzes) {
    const card = element("article", undefined, "quiz-card");
    card.append(element("p", quiz.type === "EDUCATIONAL" ? "Educational" : "Personality", "tag"));
    card.append(element("h3", quiz.title));
    card.append(element("p", quiz.description));
    card.append(element("p", quiz.questionCount + " questions · author " + quiz.author));
    const open = element("button", quiz.published ? "Open quiz" : "View draft");
    open.addEventListener("click", () => action(async epoch => {
      await openQuiz(quiz.id, epoch);
      checkEpoch(epoch);
      if (isMine && !quiz.published) {
        byId("draft-id").value = quiz.id;
        showStatus("Selected draft #" + quiz.id + ". To edit, enter the full quiz definition JSON.");
      }
    }));
    const actions = element("div", undefined, "card-actions");
    actions.append(open);
    if (username && quiz.author === username) {
      const remove = element("button", "Delete", "danger");
      remove.type = "button";
      remove.setAttribute("aria-label", "Delete quiz «" + quiz.title + "»");
      remove.addEventListener("click", () => {
        const message = "Delete quiz «" + quiz.title + "»?" +
          (quiz.published ? " Saved attempts will remain in history." : "");
        if (window.confirm(message)) manageFeed(epoch => deleteQuiz(quiz, epoch));
      });
      cardDeleteButtons.push(remove);
      actions.append(remove);
    }
    card.append(actions);
    if (isMine) card.append(element("p", "ID " + quiz.id + " · " + (quiz.published ? "published" : "draft")));
    target.append(card);
  }
  updateFeedButtons();
}

async function refreshFeed(epoch = authEpoch, mine = showingMine) {
  const request = ++feedRequest;
  const quizzes = await api(mine ? "/api/quizzes/mine" : "/api/quizzes", "GET", undefined, epoch);
  checkEpoch(epoch);
  if (request !== feedRequest) return false;
  showingMine = mine;
  quizCards(quizzes, byId("feed"), mine);
  return true;
}

function manageFeed(work) {
  if (!token || feedBusy) return;
  return action(async epoch => {
    feedBusy = true;
    updateFeedButtons();
    showFeedStatus("");
    try { await work(epoch); } finally {
      if (epoch === authEpoch) {
        feedBusy = false;
        updateFeedButtons();
      }
    }
  }, showFeedStatus);
}

async function deleteQuiz(quiz, epoch) {
  const path = "/api/quizzes/" + quiz.id;
  await api(quiz.published ? path + "/archive" : path, quiz.published ? "POST" : "DELETE", undefined, epoch);
  if (currentQuiz?.id === quiz.id) closeQuiz();
  if (byId("draft-id").value === String(quiz.id)) byId("draft-id").value = "";
  await refreshFeed(epoch);
  showFeedStatus(quiz.published ? "Quiz removed from the feed." : "Draft deleted.");
}

async function openQuiz(id, epoch = authEpoch) {
  const quiz = await api("/api/quizzes/" + id, "GET", undefined, epoch);
  checkEpoch(epoch);
  currentQuiz = quiz;
  byId("quiz-title").textContent = currentQuiz.title;
  byId("quiz-description").textContent = currentQuiz.description;
  byId("questions").replaceChildren();
  byId("result").textContent = "";
  for (const [index, question] of currentQuiz.questions.entries()) {
    const fieldset = element("fieldset");
    fieldset.append(element("legend", (index + 1) + ". " + question.text));
    for (const option of question.options) {
      const label = element("label", undefined, "option");
      const radio = element("input");
      radio.type = "radio";
      radio.name = "question-" + question.id;
      radio.value = String(option.id);
      radio.required = true;
      label.append(radio, element("span", option.text));
      fieldset.append(label);
    }
    byId("questions").append(fieldset);
  }
  byId("play-panel").hidden = false;
  byId("submit-attempt").disabled = !token || !currentQuiz.published;
  byId("play-panel").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function authenticate(path, epoch = authEpoch) {
  const auth = await api(path, "POST", {
    username: byId("username").value, password: byId("password").value
  }, epoch);
  checkEpoch(epoch);
  setAccount(auth);
  byId("password").value = "";
  showStatus("Done. You are signed in as " + auth.user.username + ".");
}

byId("auth-form").addEventListener("submit", event => {
  event.preventDefault();
  action(epoch => authenticate("/api/auth/login", epoch));
});
byId("register").addEventListener("click", () => action(epoch => authenticate("/api/auth/register", epoch)));
byId("logout").addEventListener("click", () => {
  setAccount(null);
  showStatus("Token removed from page memory. You can log in again for a new request.");
});
byId("seed").addEventListener("click", () => manageFeed(async epoch => {
  const { count } = await api("/api/quizzes/demo", "POST", undefined, epoch);
  await refreshFeed(epoch);
  showFeedStatus(count ? "Test quizzes added: " + count + "." : "Both test quizzes are already in the feed.");
}));
byId("delete-all").addEventListener("click", () => {
  if (!window.confirm("Remove all your published quizzes from the feed? Drafts and attempt history will be preserved.")) return;
  manageFeed(async epoch => {
    const { count } = await api("/api/quizzes/mine/archive", "POST", undefined, epoch);
    if (currentQuiz?.published && currentQuiz.author === username) closeQuiz();
    await refreshFeed(epoch);
    showFeedStatus(count ? "Removed from the feed: " + count + "." : "You have no published quizzes.");
  });
});
byId("refresh").addEventListener("click", () => action(epoch => refreshFeed(epoch, false), showFeedStatus));
byId("statistics").addEventListener("click", () => action(async epoch => {
  const result = await api("/api/me/statistics", "GET", undefined, epoch);
  checkEpoch(epoch);
  byId("personal-output").textContent = JSON.stringify(result, null, 2);
  showStatus("Retrieved statistics for your saved attempts.");
}));
byId("history").addEventListener("click", () => action(async epoch => {
  const result = await api("/api/me/attempts", "GET", undefined, epoch);
  checkEpoch(epoch);
  byId("personal-output").textContent = JSON.stringify(result, null, 2);
  showStatus("Retrieved your attempt history.");
}));
byId("attempt-form").addEventListener("submit", event => {
  event.preventDefault();
  action(async epoch => {
    const quiz = currentQuiz;
    if (!quiz) throw new Error("Open a quiz for the current account first.");
    const answers = quiz.questions.map(question => {
      const selected = document.querySelector('input[name="question-' + question.id + '"]:checked');
      if (!selected) throw new Error("Select one answer for each question.");
      return { questionId: question.id, optionId: Number(selected.value) };
    });
    const result = await api("/api/quizzes/" + quiz.id + "/attempts", "POST", { answers }, epoch);
    checkEpoch(epoch);
    byId("result").textContent = result.type === "EDUCATIONAL"
      ? "Your score: " + result.score + " out of " + result.maxScore + " points."
      : result.outcomeLabel + ". " + result.outcomeDescription;
    showStatus("Attempt #" + result.id + " saved. Statistics will refresh on request.");
  });
});
byId("educational-template").addEventListener("click", () => fillEditor(educationalTemplate()));
byId("personality-template").addEventListener("click", () => fillEditor(personalityTemplate()));
byId("mine").addEventListener("click", () => action(async epoch => {
  if (await refreshFeed(epoch, true)) showStatus("Showing your drafts and published quizzes.");
}));
byId("create-draft").addEventListener("click", () => action(async epoch => {
  const quiz = await api("/api/quizzes", "POST", JSON.parse(byId("definition").value), epoch);
  checkEpoch(epoch);
  byId("draft-id").value = quiz.id;
  showStatus("Draft #" + quiz.id + " created. You can edit it, then publish.");
}));
function draftId() {
  const id = Number(byId("draft-id").value);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Enter a positive ID of your draft.");
  return id;
}
byId("update-draft").addEventListener("click", () => action(async epoch => {
  await api("/api/quizzes/" + draftId(), "PUT", JSON.parse(byId("definition").value), epoch);
  checkEpoch(epoch);
  showStatus("Draft replaced. Question and option IDs have been updated.");
}));
byId("publish-draft").addEventListener("click", () => action(async epoch => {
  await api("/api/quizzes/" + draftId() + "/publish", "POST", undefined, epoch);
  await refreshFeed(epoch);
  checkEpoch(epoch);
  showStatus("Quiz published permanently. To make changes, create a new quiz.");
}));
byId("delete-draft").addEventListener("click", () => action(async epoch => {
  await api("/api/quizzes/" + draftId(), "DELETE", undefined, epoch);
  checkEpoch(epoch);
  byId("draft-id").value = "";
  await refreshFeed(epoch);
  checkEpoch(epoch);
  showStatus("Your draft has been deleted.");
}));

fillEditor(educationalTemplate());
action(refreshFeed);