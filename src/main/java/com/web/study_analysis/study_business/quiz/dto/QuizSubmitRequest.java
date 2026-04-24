package com.web.study_analysis.study_business.quiz.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class QuizSubmitRequest {
    @NotNull
    @Min(1)
    Long userId;

    @Valid
    List<QuizSubmitAnswer> answers;

    @Data
    public static class QuizSubmitAnswer {
        @NotNull
        @Min(1)
        Long questionId;

        @NotNull
        @Min(1)
        Long optionId;
    }
}

