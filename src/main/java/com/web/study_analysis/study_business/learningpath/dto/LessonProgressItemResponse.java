package com.web.study_analysis.study_business.learningpath.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/** One lesson row inside an enrolled course (maps to ERD: lesson + progress + quiz count). */
@Data
@Builder
public class LessonProgressItemResponse {
    private Long lessonId;
    private String title;
    /** VIDEO / QUIZ (matches LessonKind). */
    private String kind;
    private String contentUrl;
    private Integer orderIndex;
    private Integer durationMinutes;
    private boolean completed;
    private LocalDateTime completedAt;
    private int quizCount;
    /** Sequential rule: first lesson always unlocked; next unlocks when previous is completed. */
    private boolean unlocked;
}
