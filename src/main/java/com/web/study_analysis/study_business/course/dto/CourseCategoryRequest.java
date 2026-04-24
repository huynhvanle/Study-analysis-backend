package com.web.study_analysis.study_business.course.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CourseCategoryRequest {
    @NotBlank
    @Size(max = 255)
    private String name;
}
