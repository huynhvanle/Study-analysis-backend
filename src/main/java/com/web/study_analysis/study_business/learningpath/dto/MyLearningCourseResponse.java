package com.web.study_analysis.study_business.learningpath.dto;

import com.web.study_analysis.study_business.tier.SubscriptionTier;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

/** Enrolled course with ordered lessons and progress (ERD: enrollment + course + lessons + progress). */
@Data
@Builder
public class MyLearningCourseResponse {
    private Long courseId;
    private String courseTitle;
    private SubscriptionTier accessTier;
    /** URL ảnh bìa (nullable). */
    private String coverImageUrl;
    private String description;
    private String category;
    private String level;
    private LocalDateTime enrolledAt;
    private int totalLessons;
    private int completedLessons;
    /** Tổng số quiz trong khóa (tính theo bảng quiz). */
    private int totalQuizzes;
    /** Số quiz đã có điểm (đã nộp) của học viên trong khóa. */
    private int submittedQuizzes;
    /**
     * Điểm khóa học theo công thức: sum(score) / (100 * totalQuizzes).
     * - null nếu khóa không có quiz
     * - range: 0..1
     */
    private Float courseQuizScoreRatio;
    /** courseQuizScoreRatio * 100 (0..100), null nếu không có quiz. */
    private Float courseQuizScorePercent;
    private List<LessonProgressItemResponse> lessons;
}
