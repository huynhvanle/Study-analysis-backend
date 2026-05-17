package com.web.study_analysis.study_business.insight.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminOverviewResponse {
    private long totalUsers;
    private long totalCourses;
    private long pendingApprovalRequests;
    private long totalEnrollments;
    private long completedEnrollments;
    /** Percent 0..100 */
    private double courseCompletionRatePercent;
    private List<UserGrowthPoint> userGrowth;
    private List<CourseCategoryShare> courseComposition;
    private List<CourseMetricItem> topInterestedCourses;
    private List<CourseMetricItem> topCompletedCourses;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserGrowthPoint {
        private String label;
        private long value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseCategoryShare {
        private String label;
        private long value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CourseMetricItem {
        private Long courseId;
        private String courseTitle;
        private String category;
        private long enrollmentCount;
        private long completedEnrollmentCount;
        private int totalLessons;
        /** Percent 0..100 */
        private double completionRatePercent;
    }
}
