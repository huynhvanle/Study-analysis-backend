package com.web.study_analysis.study_business.quiz.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class QuizResponse {
    private Long id;
    private Long lessonId;
    private String title;
}
