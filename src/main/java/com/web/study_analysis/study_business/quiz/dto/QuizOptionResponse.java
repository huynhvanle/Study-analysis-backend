package com.web.study_analysis.study_business.quiz.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QuizOptionResponse {
    Long id;
    String code;
    String content;
    Boolean correct; // admin only; student take endpoint will not return this
}

