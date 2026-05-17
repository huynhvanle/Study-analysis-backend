package com.web.study_analysis.study_business.learningpath.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class StudyHistoryCourseResponse {
    private Long courseId;
    private String courseTitle;
    private String coverImageUrl;
    private String category;
    private String level;
    private LocalDateTime enrolledAt;
    private boolean completed;
    private LocalDateTime completedAt;
    private LocalDateTime lastActivityAt;
    private int totalLessons;
    private int completedLessons;
    private int participatedLessons;
    private List<StudyHistoryLessonResponse> lessons;
}
