package com.web.study_analysis.study_business.insight.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RecommendationResponse {
    private Long lessonId;
    private Long courseId;
    private String courseTitle;
    private String lessonTitle;
    private Integer orderIndex;
    /** Higher means you should study this sooner to improve scores */
    private double priorityScore;
    private String reason;
}
