package com.web.study_analysis.study_business.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudySummaryResponse {
    private int enrolledCourses;
    private long lessonsCompleted;
    private Double averageQuizScore;
    private long totalStudyMinutes;
}
