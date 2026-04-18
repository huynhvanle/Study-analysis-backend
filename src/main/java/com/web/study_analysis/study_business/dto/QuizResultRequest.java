package com.web.study_analysis.study_business.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QuizResultRequest {
    @NotNull
    private Long userId;
    @NotNull
    private Long quizId;
    @NotNull
    private Float score;
}
