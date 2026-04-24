package com.web.study_analysis.study_business.quiz.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class QuizTakeQuestionResponse {
    Long id;
    Integer orderIndex;
    String prompt;
    List<QuizTakeOptionResponse> options;
}

