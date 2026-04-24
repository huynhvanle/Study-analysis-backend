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
}

