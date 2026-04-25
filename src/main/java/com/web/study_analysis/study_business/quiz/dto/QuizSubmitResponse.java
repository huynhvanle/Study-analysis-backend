package com.web.study_analysis.study_business.quiz.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QuizSubmitResponse {
    Long quizId;
    int totalQuestions;
    int correctAnswers;
    float score; // 0..100

    java.util.List<QuestionResult> results;

    @Data
    @Builder
    public static class QuestionResult {
        Long questionId;
        Long chosenOptionId;
        Long correctOptionId;
        boolean correct;
    }
}

