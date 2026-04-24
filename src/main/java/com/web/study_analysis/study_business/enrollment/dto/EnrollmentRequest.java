package com.web.study_analysis.study_business.enrollment.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class EnrollmentRequest {
    @NotNull
    private Long userId;
    @NotNull
    private Long courseId;
}
