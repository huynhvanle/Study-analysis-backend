package com.web.study_analysis.study_business.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CourseRequest {
    @NotBlank
    private String title;
    private String description;
    private String category;
    private String level;
    @NotNull
    private Long createdByUserId;
}
