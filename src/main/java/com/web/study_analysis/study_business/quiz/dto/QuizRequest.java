package com.web.study_analysis.study_business.quiz.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class QuizRequest {
    @NotBlank
    private String title;
}
