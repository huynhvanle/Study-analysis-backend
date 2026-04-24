package com.web.study_analysis.study_business.progress.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ProgressResponse {
    private Long id;
    private Long userId;
    private Long lessonId;
    private boolean completed;
    private LocalDateTime completedAt;
}
