package com.web.study_analysis.study_business.quiz.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QuizTakeOptionResponse {
    Long id;
    String code;
    String content;
}

