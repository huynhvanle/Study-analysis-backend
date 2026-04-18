package com.web.study_analysis.study_business.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LessonRequest {
    @NotBlank
    private String title;
    @NotBlank
    private String contentUrl;
    @NotNull
    private Integer duration;
    @NotNull
    private Integer orderIndex;
}
