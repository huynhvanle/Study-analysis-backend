package com.web.study_analysis.study_business.learningpath.dto;

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
    private String description;
    private String category;
    private String level;
    private LocalDateTime enrolledAt;
    private int totalLessons;
    private int completedLessons;
    private List<LessonProgressItemResponse> lessons;
}
