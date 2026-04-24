package com.web.study_analysis.study_business.quiz.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QuizQuestionRequest {
    @NotBlank
    String prompt;

    @NotNull
    @Min(1)
    @Max(1000000)
    Integer orderIndex;

    @NotBlank
    String optionA;

    @NotBlank
    String optionB;

    @NotBlank
    String optionC;

    @NotBlank
    String optionD;

    @NotBlank
    String correctCode; // A/B/C/D
}

