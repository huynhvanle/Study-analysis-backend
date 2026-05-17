package com.web.study_analysis.study_business.learningpath.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class StudyHistoryLessonResponse {
    private Long lessonId;
    private String title;
    /** VIDEO / QUIZ */
    private String kind;
    private Integer orderIndex;
    private Integer durationMinutes;
    private boolean completed;
    private LocalDateTime completedAt;
    private int totalStudyMinutes;
    private int studySessions;
    private LocalDateTime lastStudiedAt;
    private Float latestQuizScore;
    private LocalDateTime lastQuizSubmittedAt;
    private LocalDateTime lastActivityAt;
}
