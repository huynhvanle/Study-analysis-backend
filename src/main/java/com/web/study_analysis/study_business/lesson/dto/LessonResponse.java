package com.web.study_analysis.study_business.lesson.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LessonResponse {
    private Long id;
    private Long courseId;
    private String title;
    private String kind;
    private String contentUrl;
    private Integer duration;
    private Integer orderIndex;
    private Long quizId; // only when kind=QUIZ (1 quiz per lesson)
}
