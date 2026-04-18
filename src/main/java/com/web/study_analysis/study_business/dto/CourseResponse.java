package com.web.study_analysis.study_business.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class CourseResponse {
    private Long id;
    private String title;
    private String description;
    private String category;
    private String level;
    private Long createdByUserId;
    private LocalDateTime createdAt;
}
