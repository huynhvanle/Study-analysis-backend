package com.web.study_analysis.study_business.studylog.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StudyLogRequest {
    @NotNull
    private Long userId;
    @NotNull
    private Long lessonId;
    @NotNull
    private Integer timeSpent;
    private Float score;
    @NotNull
    private Integer attempt;
}
