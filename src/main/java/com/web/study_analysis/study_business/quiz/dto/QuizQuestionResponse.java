package com.web.study_analysis.study_business.quiz.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class QuizQuestionResponse {
    Long id;
    Long quizId;
    String prompt;
    Integer orderIndex;
    List<QuizOptionResponse> options;
}

