package com.web.study_analysis.study_business.lesson.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LessonRequest {
    @NotBlank
    private String title;
    private String contentUrl;
    @NotNull
    private Integer duration;
    @NotNull
    private Integer orderIndex;

    // Optional: VIDEO (mặc định) hoặc QUIZ
    private String kind;
}
