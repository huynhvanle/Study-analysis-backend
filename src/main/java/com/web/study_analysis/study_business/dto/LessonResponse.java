package com.web.study_analysis.study_business.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LessonResponse {
    private Long id;
    private Long courseId;
    private String title;
    private String contentUrl;
    private Integer duration;
    private Integer orderIndex;
}
