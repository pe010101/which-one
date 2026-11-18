package com.whichone.service;

import java.util.List;

import com.whichone.domain.QuizType;
import com.whichone.dto.ApiDtos.*;
import com.whichone.dto.ApiDtos.OptionInput;
import com.whichone.dto.ApiDtos.OutcomeInput;
import com.whichone.dto.ApiDtos.QuestionInput;
import com.whichone.dto.ApiDtos.QuizInput;

final class DemoQuizzes {
    private DemoQuizzes() { }

    static List<QuizInput> definitions() {
        var educational = new QuizInput("Java Basics", "Two questions. Maximum 5 points.",
                QuizType.EDUCATIONAL, List.of(
                knowledge("What is 2 + 2?", 3, "4", "5"),
                knowledge("Which keyword declares a class?", 2, "class", "table")), List.of());
        var personality = new QuizInput("How do you learn?",
                "A demo example with two outcomes. On a tie, the first declared outcome wins.",
                QuizType.PERSONALITY, List.of(
                preference("How do you start a new topic?", "I make a plan", "I try an example"),
                preference("How do you prefer to reinforce knowledge?", "By schedule", "Through experiments")),
                List.of(new OutcomeInput("PLANNER", "Planner", "You like to plan first."),
                        new OutcomeInput("EXPLORER", "Explorer", "You like to learn through practice.")));
        return List.of(educational, personality);
    }

    private static QuestionInput knowledge(String text, int points, String correct, String incorrect) {
        return new QuestionInput(text, points, List.of(
                new OptionInput(correct, true, null, 0), new OptionInput(incorrect, false, null, 0)));
    }

    private static QuestionInput preference(String text, String plan, String explore) {
        return new QuestionInput(text, 0, List.of(
                new OptionInput(plan, false, "PLANNER", 2), new OptionInput(explore, false, "EXPLORER", 2)));
    }
}