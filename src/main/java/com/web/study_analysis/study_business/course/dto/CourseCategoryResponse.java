package com.web.study_analysis.study_business.course.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CourseCategoryResponse {
    private Long id;
    private String name;
}
