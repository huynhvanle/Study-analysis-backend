package com.web.study_analysis.study_business.quiz.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class QuizSubmitResponse {
    Long quizId;
    Integer totalQuestions;
    Integer correctAnswers;
    Float score; // 0..100
    LocalDateTime submittedAt;
    boolean reviewAllowed;
    boolean detailsAvailable;

    java.util.List<QuestionResult> results;

    @Data
    @Builder
    public static class QuestionResult {
        Long questionId;
        String prompt;
        String explanation;
        Long chosenOptionId;
        String chosenOptionCode;
        String chosenOptionContent;
        Long correctOptionId;
        String correctOptionCode;
        String correctOptionContent;
        boolean correct;
    }
}

